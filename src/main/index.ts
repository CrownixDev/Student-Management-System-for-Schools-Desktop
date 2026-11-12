import { app, BrowserWindow, Menu } from "electron";

import { createSystemWindow, closeSystemWindow } from "./windows/system-window";

import {
  createManagerWindow,
  getManagerWindow,
} from "./windows/manager-window";

import { registerServerIPC } from "./ipc/server-ipc";
import { registerStorageIPC } from "./ipc/storage-ipc";

import { ServerManager } from "./services/server-manager";
import { ConfigStore } from "./services/config-store";
import { ensureDatabase } from "./services/database-recovery";

const isDevelopment = !app.isPackaged;

let serverManager: ServerManager | null = null;
let isQuitting = false;

// --------------------------------------------------
// Application menu
// --------------------------------------------------

function createApplicationMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "Crownix",
      submenu: [
        {
          label: "System",
          click: () => {
            const manager = serverManager;

            if (manager?.getStatus() === "running") {
              createSystemWindow(manager.getBaseUrl());
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
      createSystemWindow(manager.getBaseUrl());
    }

    if (status === "stopped" || status === "stopping" || status === "error") {
      closeSystemWindow();
    }
  });
}

// --------------------------------------------------
// Application startup
// --------------------------------------------------

app.whenReady().then(async () => {
  try {
    const configStore = new ConfigStore();
    let config = await configStore.load();
    const manager = new ServerManager(config);

    serverManager = manager;

    registerServerIPC(manager, configStore);
    registerStorageIPC(manager, configStore);

    registerServerStatusListener(manager);

    createApplicationMenu();

    // Server mode opens the manager as its primary window.
    if (manager.getMode() === "server") {
      createManagerWindow();
    }

    // Check database availability before starting Next.js.
    const recoveredConfig = await ensureDatabase(
      getManagerWindow(),
      config,
      configStore,
    );

    if (!recoveredConfig) {
      // User cancelled database recovery.
      createManagerWindow();
      return;
    }

    config = recoveredConfig;
    manager.updateConfig(config);

    try {
      await manager.start();
    } catch (error) {
      console.error("Could not start the application server:", error);
      createManagerWindow();
    }
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

  const manager = serverManager;

  if (!manager) {
    createManagerWindow();
    return;
  }

  if (manager.getMode() === "server") {
    createManagerWindow();
  } else if (manager.getStatus() === "running") {
    createSystemWindow(manager.getBaseUrl());
  } else {
    createManagerWindow();
  }
});

// --------------------------------------------------
// Application shutdown
// --------------------------------------------------

app.on("before-quit", (event) => {
  if (isQuitting) return;

  const manager = serverManager;

  // Allow Electron to quit normally if initialization hasn't completed.
  if (!manager) return;

  event.preventDefault();

  isQuitting = true;

  manager
    .stop()
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
