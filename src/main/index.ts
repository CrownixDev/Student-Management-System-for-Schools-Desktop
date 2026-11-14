import { app, BrowserWindow, Menu } from "electron";
import path from "node:path";

import {
  createSystemWindow,
  closeSystemWindow,
  getSystemWindow,
} from "./windows/system-window";

import {
  createManagerWindow,
  getManagerWindow,
} from "./windows/manager-window";

import { registerServerIPC } from "./ipc/server-ipc";
import { registerStorageIPC } from "./ipc/storage-ipc";

import { ServerManager } from "./services/server-manager";
import { ConfigStore } from "./services/config-store";
import { ensureDatabase } from "./services/database-recovery";
import { PrismaRunner } from "./services/prisma-runner";
import { RunStateStore } from "./services/run-state-store";
import { MigrationStateStore } from "./services/migration-state-store";
import {
  assertValidSQLiteDatabase,
  createDailyBackupIfNeeded,
  createMigrationSafetyBackupIfNeeded,
} from "./services/storage-manager";
import { registerUpdateIPC } from "./ipc/update-ipc";
import fs from "node:fs";

// Changing the default userdata path
const stableUserDataPath = path.join(
  app.getPath("appData"),
  "Crownix",
  "Student Management System Desktop",
);

fs.mkdirSync(stableUserDataPath, { recursive: true });

app.setPath("userData", stableUserDataPath);

const gotSingleInstanceLock = app.requestSingleInstanceLock();

export async function prepareForStart(
  manager: ServerManager,
  configStore: ConfigStore,
  prismaRunner: PrismaRunner,
  runStateStore: RunStateStore,
  migrationStateStore: MigrationStateStore,
) {
  let config = await configStore.load();

  // 1. Ensure database exists, is restored, located, or initialized
  const recoveredConfig = await ensureDatabase(
    getManagerWindow(),
    config,
    configStore,
  );

  if (!recoveredConfig) {
    createManagerWindow();
    return;
  }

  config = recoveredConfig;
  manager.updateConfig(config);

  // 2. Check previous run marker (unclean shutdown detection)
  const previousRun = await runStateStore.getPreviousRun();
  if (previousRun) {
    console.warn(
      "Unclean previous shutdown detected. Running SQLite integrity check...",
    );
    await assertValidSQLiteDatabase(config.databasePath);
  }

  // 3. Pre-migration safety backup if migration bundle has changed
  const currentMigrationHash = await createMigrationSafetyBackupIfNeeded(
    config,
    prismaRunner,
    migrationStateStore,
  );

  // 4. Run Prisma migrate deploy before starting Next.js
  await prismaRunner.deploy(config.databasePath, (log) => {
    manager.emitExternalLog(log.source, log.message);
  });

  // 5. Save the successfully deployed migration hash & mark database initialized
  await migrationStateStore.saveHash(currentMigrationHash);
  if (!config.databaseInitialized) {
    config = await configStore.update(config, { databaseInitialized: true });
    manager.updateConfig(config);
  }

  // 6. Daily automatic backup (if none exists today)
  try {
    const backup = await createDailyBackupIfNeeded(config, prismaRunner);
    if (backup) {
      config = await configStore.update(config, {
        lastBackupAt: backup.createdAt,
      });
      manager.updateConfig(config);
    }
  } catch (backupError) {
    console.error("Automatic daily backup failed:", backupError);
    manager.emitExternalLog(
      "stderr",
      `Automatic daily backup failed: ${String(backupError)}`,
    );
  }

  // 7. Mark running in runStateStore before spawning Next.js
  await runStateStore.markRunning(config.databasePath);

  return true;
}

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  const isDevelopment = !app.isPackaged;

  let serverManager: ServerManager | null = null;
  let runStateStore: RunStateStore | null = null;
  let isQuitting = false;

  // --------------------------------------------------
  // Single-instance handling: focus existing window
  // --------------------------------------------------
  app.on("second-instance", () => {
    const managerWindow = getManagerWindow();
    const systemWindow = getSystemWindow();

    const target = managerWindow ?? systemWindow;

    if (target && !target.isDestroyed()) {
      if (target.isMinimized()) {
        target.restore();
      }

      target.show();
      target.focus();
      return;
    }

    if (
      serverManager?.getMode() === "client" &&
      serverManager.getStatus() === "running"
    ) {
      createSystemWindow(serverManager.getBaseUrl());
    } else {
      createManagerWindow();
    }
  });

  // --------------------------------------------------
  // Application menu
  // --------------------------------------------------
  function createApplicationMenu() {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: "Crownix",
        submenu: [
          {
            label: "Management System",
            click: () => {
              if (serverManager?.getStatus() === "running") {
                createSystemWindow(serverManager.getLocalUrl());
              }
            },
          },
          {
            label: "Server Manager",
            click: () => {
              createManagerWindow();
            },
          },
          { type: "separator" },
          {
            role: "quit",
          },
        ],
      },

      {
        label: "Edit",
        submenu: [
          { role: "undo" },
          { role: "redo" },
          { type: "separator" },
          { role: "cut" },
          { role: "copy" },
          { role: "paste" },
          { role: "selectAll" },
        ],
      },

      {
        label: "View",
        submenu: [
          { role: "reload" },
          { role: "forceReload" },
          { type: "separator" },

          ...(isDevelopment
            ? [
                { role: "toggleDevTools" as const },
                { type: "separator" as const },
                { role: "resetZoom" as const },
                { role: "zoomIn" as const },
                { role: "zoomOut" as const },
                { type: "separator" as const },
              ]
            : []),

          { role: "togglefullscreen" },
        ],
      },
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  }

  // --------------------------------------------------
  // Server status handling
  // --------------------------------------------------
  function registerServerStatusListener(manager: ServerManager) {
    manager.onStatusChange((status) => {
      if (manager.getMode() === "client" && status === "running") {
        createSystemWindow(manager.getLocalUrl());
      }

      if (status === "stopped" || status === "stopping" || status === "error") {
        closeSystemWindow();
      }
    });
  }

  // --------------------------------------------------
  // Bootstrap Application
  // --------------------------------------------------
  async function bootstrapApplication() {
    const configStore = new ConfigStore();
    runStateStore = new RunStateStore();
    const prismaRunner = new PrismaRunner();

    const resourcesPath = app.isPackaged
      ? process.resourcesPath
      : path.resolve(app.getAppPath(), "resources");
    const migrationsDirectory = path.join(
      resourcesPath,
      "prisma",
      "migrations",
    );
    const migrationStateStore = new MigrationStateStore(migrationsDirectory);

    const config = await configStore.load();

    const manager = new ServerManager(config, async () => {
      // Verify SQLite before automatic crash recovery attempts
      await assertValidSQLiteDatabase(config.databasePath);
    });

    serverManager = manager;

    registerServerIPC(
      manager,
      configStore,
      prismaRunner,
      runStateStore,
      migrationStateStore,
    );
    registerStorageIPC(manager, configStore, prismaRunner);
    registerServerStatusListener(manager);
    registerUpdateIPC();

    createApplicationMenu();

    // Server mode opens the manager as its primary window.
    if (manager.getMode() === "server") {
      createManagerWindow();
    }

    // 1 to 7
    const goodToGo = await prepareForStart(
      manager,
      configStore,
      prismaRunner,
      runStateStore,
      migrationStateStore,
    );

    // 8. Start server and wait for readiness
    try {
      if (goodToGo) {
        await manager.start();
      }
    } catch (startError) {
      console.error("Could not start application server:", startError);
      createManagerWindow();
    }
  }

  // --------------------------------------------------
  // Application startup
  // --------------------------------------------------
  app.whenReady().then(async () => {
    try {
      await bootstrapApplication();
    } catch (error) {
      console.error("Application startup failed:", error);
      createManagerWindow();
    }
  });

  // --------------------------------------------------
  // Application activation
  // --------------------------------------------------
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length !== 0) {
      return;
    }

    if (!serverManager) {
      createManagerWindow();
      return;
    }

    if (serverManager.getMode() === "server") {
      createManagerWindow();
    } else if (serverManager.getStatus() === "running") {
      createSystemWindow(serverManager.getLocalUrl());
    } else {
      createManagerWindow();
    }
  });

  // --------------------------------------------------
  // Application shutdown
  // --------------------------------------------------
  app.on("before-quit", (event) => {
    if (isQuitting) return;

    if (!serverManager) return;

    event.preventDefault();
    isQuitting = true;

    const wasRunning = serverManager.getStatus() === "running";

    serverManager
      .stop()
      .then(async () => {
        // Only mark clean stop if server was actually running and shut down gracefully
        if (wasRunning && runStateStore) {
          await runStateStore.markCleanStop();
        }
      })
      .catch((error) => {
        console.error("Server shutdown failed:", error);
      })
      .finally(() => {
        app.quit();
      });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}
