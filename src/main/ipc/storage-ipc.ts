import { dialog, ipcMain, shell, app } from "electron";
import path from "node:path";
import fs from "node:fs/promises";
import type { ServerManager } from "../services/server-manager";
import { DATABASE_FILENAME } from "@/constraints";
import type { ConfigStore } from "../services/config-store";
import type { PrismaRunner } from "../services/prisma-runner";
import {
  listBackups,
  databaseExists,
  assertValidSQLiteDatabase,
} from "../services/storage-manager";
import { IPC_NAMES } from "@/lib/ipc-names";

type DatabaseSelection =
  | { type: "file"; databasePath: string }
  | { type: "folder"; directoryPath: string }
  | null;

function isInsideResources(targetPath: string): boolean {
  const resourcesPath = app.isPackaged
    ? process.resourcesPath
    : path.resolve(app.getAppPath(), "resources");

  const relative = path.relative(resourcesPath, path.resolve(targetPath));
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}

async function chooseDatabaseLocation(): Promise<DatabaseSelection> {
  const choice = await dialog.showMessageBox({
    type: "question",
    title: "Change Database Location",
    message: "How would you like to select the database location?",
    buttons: [
      "Select an existing database file",
      "Select an empty folder",
      "Cancel",
    ],
    defaultId: 0,
    cancelId: 2,
    noLink: true,
  });

  if (choice.response === 2) {
    return null;
  }

  if (choice.response === 0) {
    const result = await dialog.showOpenDialog({
      title: "Select Database File",
      properties: ["openFile"],
      filters: [
        {
          name: "SQLite Database",
          extensions: ["db", "sqlite", "sqlite3"],
        },
      ],
    });

    if (result.canceled || !result.filePaths[0]) {
      return null;
    }

    return {
      type: "file",
      databasePath: result.filePaths[0],
    };
  }

  const result = await dialog.showOpenDialog({
    title: "Select Empty Database Folder",
    properties: ["openDirectory", "createDirectory"],
  });

  if (result.canceled || !result.filePaths[0]) {
    return null;
  }

  return {
    type: "folder",
    directoryPath: result.filePaths[0],
  };
}

export function registerStorageIPC(
  serverManager: ServerManager,
  configStore: ConfigStore,
  prismaRunner: PrismaRunner,
) {
  // -----------------------------------------------
  // Get storage information
  // -----------------------------------------------
  ipcMain.handle(IPC_NAMES.storage.getInfo, async () => {
    const config = await configStore.load();

    return {
      databasePath: config.databasePath,
      databaseDirectory: path.dirname(config.databasePath),
      backupDirectory: config.backupDirectory,
      maxBackups: config.maxBackups,
      lastBackupAt: config.lastBackupAt,
      backups: await listBackups(config.backupDirectory),
    };
  });

  // -----------------------------------------------
  // Choose database directory or file (Safe Switch)
  // -----------------------------------------------
  ipcMain.handle(IPC_NAMES.storage.selectDatabaseDir, async () => {
    const previousConfig = serverManager.getConfig();
    const wasRunning = serverManager.getStatus() === "running";

    if (wasRunning) {
      const choice = await dialog.showMessageBox({
        type: "warning",
        message:
          "Changing the database location will stop the server. Do you want to continue?",
        buttons: ["Continue", "Cancel"],
        defaultId: 0,
        cancelId: 1,
      });
      if (choice.response === 1) {
        return;
      }
    }

    const selection = await chooseDatabaseLocation();
    if (!selection) return null;

    const targetDatabasePath =
      selection.type === "file"
        ? path.resolve(selection.databasePath)
        : path.resolve(path.join(selection.directoryPath, DATABASE_FILENAME));

    if (
      path.resolve(targetDatabasePath) ===
      path.resolve(previousConfig.databasePath)
    ) {
      return {
        databasePath: previousConfig.databasePath,
        databaseDirectory: path.dirname(previousConfig.databasePath),
      };
    }

    // Check restrictions
    if (isInsideResources(targetDatabasePath)) {
      throw new Error(
        "Cannot place the database inside the application resources directory.",
      );
    }

    if (
      path.dirname(targetDatabasePath).toLowerCase() ===
      path.resolve(previousConfig.backupDirectory).toLowerCase()
    ) {
      throw new Error(
        "Database directory cannot be the same as the backup directory.",
      );
    }

    if (selection.type === "folder") {
      const entries = await fs.readdir(selection.directoryPath);
      if (entries.length > 0) {
        throw new Error("The selected folder must be empty.");
      }
    }

    // Stop Next.js before touching the database location.
    if (wasRunning) {
      await serverManager.stop();
    }

    try {
      if (selection.type === "file") {
        await assertValidSQLiteDatabase(targetDatabasePath);
      } else {
        // Empty folder: If previous database exists, take snapshot into target
        if (await databaseExists(previousConfig.databasePath)) {
          await prismaRunner.snapshot(
            previousConfig.databasePath,
            targetDatabasePath,
          );
          await assertValidSQLiteDatabase(targetDatabasePath);
        } else {
          await fs.mkdir(path.dirname(targetDatabasePath), { recursive: true });
        }
      }

      const nextConfig = {
        ...previousConfig,
        databasePath: targetDatabasePath,
        databaseInitialized: true,
      };

      // Run migrations on the new target before committing
      await prismaRunner.deploy(targetDatabasePath);

      await configStore.save(nextConfig);
      serverManager.updateConfig(nextConfig);

      if (wasRunning) {
        await serverManager.start();
      }

      return {
        databasePath: nextConfig.databasePath,
        databaseDirectory: path.dirname(nextConfig.databasePath),
      };
    } catch (error) {
      // Rollback configuration
      await configStore.save(previousConfig);
      serverManager.updateConfig(previousConfig);

      if (wasRunning) {
        try {
          await serverManager.start();
        } catch (restartError) {
          console.error(
            "Could not restart using the previous database:",
            restartError,
          );
        }
      }

      throw error;
    }
  });

  // -----------------------------------------------
  // Choose backup directory
  // -----------------------------------------------
  ipcMain.handle(IPC_NAMES.storage.selectBackupDir, async () => {
    if (serverManager.getStatus() !== "stopped") {
      throw new Error(
        "Stop the application server before changing the backup location.",
      );
    }

    const config = await configStore.load();

    const result = await dialog.showOpenDialog({
      title: "Choose Backup Location",
      defaultPath: config.backupDirectory,
      properties: ["openDirectory", "createDirectory"],
    });

    if (result.canceled || !result.filePaths[0]) {
      return null;
    }

    const selectedDirectory = path.resolve(result.filePaths[0]);

    if (isInsideResources(selectedDirectory)) {
      throw new Error(
        "Cannot place backups inside the application resources directory.",
      );
    }

    if (
      selectedDirectory.toLowerCase() ===
      path.dirname(config.databasePath).toLowerCase()
    ) {
      throw new Error(
        "Backup directory cannot be the same as the database directory.",
      );
    }

    await fs.mkdir(selectedDirectory, { recursive: true });

    const updatedConfig = await configStore.update(config, {
      backupDirectory: selectedDirectory,
    });

    serverManager.updateConfig(updatedConfig);

    return {
      backupDirectory: updatedConfig.backupDirectory,
    };
  });

  // -----------------------------------------------
  // Create manual backup
  // -----------------------------------------------
  ipcMain.handle(IPC_NAMES.storage.createBackup, async () => {
    const backup = await serverManager.createBackup();

    const config = await configStore.load();

    const updatedConfig = await configStore.update(config, {
      lastBackupAt: backup.createdAt,
    });

    serverManager.updateConfig(updatedConfig);

    return backup;
  });

  // -----------------------------------------------
  // Open directory in native file explorer
  // -----------------------------------------------
  ipcMain.handle(
    IPC_NAMES.storage.openDirectory,
    async (_event, targetPath: string) => {
      if (!targetPath) return false;
      const error = await shell.openPath(targetPath);
      if (error) {
        console.error("Failed to open directory:", error);
        return false;
      }
      return true;
    },
  );

  // -----------------------------------------------
  // Show file in directory and select it
  // -----------------------------------------------
  ipcMain.handle(
    IPC_NAMES.storage.showItemInFolder,
    async (_event, filePath: string) => {
      if (!filePath) return false;
      shell.showItemInFolder(filePath);
      return true;
    },
  );
}
