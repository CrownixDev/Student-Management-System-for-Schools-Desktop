import { createSystemWindow, closeSystemWindow } from "./windows/system-window";
import { app, BrowserWindow, Menu } from "electron";
import { createManagerWindow } from "./windows/manager-window";
import { registerServerIPC } from "./ipc/server-ipc";
import { ServerManager } from "./services/server-manager";
import { APP_MODE } from "@/constraints";

const isDevelopment = !app.isPackaged;
const serverManager = new ServerManager();
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
            if (serverManager.getStatus() === "running") {
              createSystemWindow(serverManager.getBaseUrl());
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

serverManager.onStatusChange((status) => {
  if (APP_MODE === "client") {
    if (status === "running") {
      createSystemWindow(serverManager.getBaseUrl());
    }
  }
  if (status === "stopped" || status === "stopping" || status === "error") {
    closeSystemWindow();
  }
});

// --------------------------------------------------
// Application startup
// --------------------------------------------------

app.whenReady().then(async () => {
  registerServerIPC(serverManager);

  createApplicationMenu();

  if (APP_MODE === "server") {
    createManagerWindow();
  }

  try {
    await serverManager.start();
  } catch (error) {
    console.error("Application startup failed:", error);
    createManagerWindow();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      if (APP_MODE === "server") {
        createManagerWindow();
      } else if (serverManager.getStatus() === "running") {
        createSystemWindow(serverManager.getBaseUrl());
      } else {
        createManagerWindow();
      }
    }
  });
});

// --------------------------------------------------
// Application shutdown
// --------------------------------------------------

app.on("before-quit", (event) => {
  if (isQuitting) return;

  event.preventDefault();

  isQuitting = true;

  serverManager
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
