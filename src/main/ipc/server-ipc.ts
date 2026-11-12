import { ipcMain, BrowserWindow } from "electron";
import { ServerManager } from "@/main/services/server-manager";
import { IPC_NAMES } from "@/lib/ipc-names";

export function registerServerIPC(serverManager: ServerManager) {
  ipcMain.handle(IPC_NAMES.server.start, async () => {
    await serverManager.start();
    return serverManager.getStatus();
  });

  ipcMain.handle(IPC_NAMES.server.stop, async () => {
    await serverManager.stop();
    return serverManager.getStatus();
  });

  ipcMain.handle(IPC_NAMES.server.restart, async () => {
    await serverManager.restart();
    return serverManager.getStatus();
  });

  ipcMain.handle(IPC_NAMES.server.status, () => {
    return serverManager.getStatus();
  });

  serverManager.onStatusChange((status) => {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send(IPC_NAMES.server.statusChanged, status);
    }
  });
}
