import { BrowserWindow } from "electron";
import { protectSystemWindow } from "./window-policy";

let systemWindow: BrowserWindow | null = null;

export function createSystemWindow(url: string) {
  if (systemWindow && !systemWindow.isDestroyed()) {
    systemWindow.show();
    systemWindow.focus();

    return systemWindow;
  }

  systemWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1200,
    minHeight: 800,

    webPreferences: {
      // No Electron preload because this window only displays Next.js.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  protectSystemWindow(systemWindow, url);

  systemWindow.loadURL(url);

  systemWindow.on("closed", () => {
    systemWindow = null;
  });

  return systemWindow;
}

export function getSystemWindow(): BrowserWindow | null {
  return systemWindow;
}

export function closeSystemWindow() {
  if (systemWindow && !systemWindow.isDestroyed()) {
    systemWindow.close();
  }
}
