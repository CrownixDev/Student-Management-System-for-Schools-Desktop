import { ipcMain, BrowserWindow } from "electron";
import { ServerManager } from "@/main/services/server-manager";
import { IPC_NAMES } from "@/lib/ipc-names";
import { getUsableUrls } from "../services/network-info";
import { getManagerWindow } from "../windows/manager-window";
import type { ConfigStore } from "../services/config-store";
import type { AppMode } from "@/types";

export function registerServerIPC(
  serverManager: ServerManager,
  configStore?: ConfigStore,
) {
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

  ipcMain.handle(IPC_NAMES.server.getInfo, async () => {
    const config = serverManager.getConfig();

    return {
      mode: config.mode,
      port: config.port,
      status: serverManager.getStatus(),
      localUrl: serverManager.getLocalUrl(),
      usableUrls: getUsableUrls(config.mode, config.port),
    };
  });

  ipcMain.handle(IPC_NAMES.server.getLogs, () => {
    return serverManager.getLogs();
  });

  serverManager.onStatusChange((status) => {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send(IPC_NAMES.server.statusChanged, status);
    }
  });

  serverManager.onLog((log) => {
    const window = getManagerWindow();

    if (window && !window.isDestroyed()) {
      window.webContents.send(IPC_NAMES.server.log, log);
    }
  });

  if (configStore) {
    ipcMain.handle(IPC_NAMES.settings.getMode, async () => {
      const config = await configStore.load();
      return config.mode;
    });

    ipcMain.handle(
      IPC_NAMES.settings.setMode,
      async (_event, newMode: AppMode) => {
        if (newMode !== "server" && newMode !== "client") {
          throw new Error("Invalid application mode.");
        }
        const current = await configStore.load();
        const updated = await configStore.update(current, { mode: newMode });
        serverManager.updateConfig(updated);
        return updated.mode;
      },
    );
  }
}
