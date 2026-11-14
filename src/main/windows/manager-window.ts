import { BrowserWindow } from "electron";
import path from "node:path";
import { protectManagerWindow } from "./window-policy";

let managerWindow: BrowserWindow | null = null;

export function createManagerWindow() {
  if (managerWindow && !managerWindow.isDestroyed()) {
    managerWindow.show();
    managerWindow.focus();

    return managerWindow;
  }

  managerWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 1100,
    minHeight: 750,

    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  protectManagerWindow(managerWindow);

  if (process.env.ELECTRON_RENDERER_URL) {
    managerWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    managerWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  managerWindow.on("closed", () => {
    managerWindow = null;
  });

  return managerWindow;
}

export function getManagerWindow() {
  return managerWindow;
}
