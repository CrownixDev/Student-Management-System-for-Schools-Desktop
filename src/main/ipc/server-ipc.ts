import { ipcMain, BrowserWindow } from "electron";
import { MigrationStateStore } from "../services/migration-state-store";
import { getManagerWindow } from "../windows/manager-window";
import { prepareForStart } from "..";
import { RunStateStore } from "../services/run-state-store";
import { ServerManager } from "@/main/services/server-manager";
import { getUsableUrls } from "../services/network-info";
import { PrismaRunner } from "../services/prisma-runner";
import { IPC_NAMES } from "@/lib/ipc-names";
import type { ConfigStore } from "../services/config-store";
import type { AppMode } from "@/types";

export function registerServerIPC(
  serverManager: ServerManager,
  configStore: ConfigStore,
  prismaRunner: PrismaRunner,
  runStateStore: RunStateStore,
  migrationStateStore: MigrationStateStore,
) {
  ipcMain.handle(IPC_NAMES.server.start, async () => {
    if (configStore) {
      const goodToGo = await prepareForStart(
        serverManager,
        configStore,
        prismaRunner,
        runStateStore,
        migrationStateStore,
      );
      if (goodToGo) {
        await serverManager.start();
        return serverManager.getStatus();
      } else {
        throw new Error("Server could not start");
      }
    } else {
      throw new Error("Server could not start");
    }
  });

  ipcMain.handle(IPC_NAMES.server.stop, async () => {
    const wasRunning = serverManager.getStatus() === "running";

    try {
      await serverManager.stop();
      if (wasRunning && runStateStore) {
        await runStateStore.markCleanStop();
      }
    } catch (error) {
      console.error("Server shutdown failed:", error);
    }

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
        if (serverManager.getStatus() !== "stopped") {
          throw new Error(
            "You cannot change the application mode while server running.",
          );
        }
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
