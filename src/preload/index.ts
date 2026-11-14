import { contextBridge, ipcRenderer } from "electron";
import { IPC_NAMES } from "@/lib/ipc-names";
import { ServerLog } from "@/types";

const api = {
  server: {
    start: () => ipcRenderer.invoke(IPC_NAMES.server.start),
    stop: () => ipcRenderer.invoke(IPC_NAMES.server.stop),
    restart: () => ipcRenderer.invoke(IPC_NAMES.server.restart),
    getStatus: () => ipcRenderer.invoke(IPC_NAMES.server.status),

    onStatusChange: (callback: (status: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, status: string) => {
        callback(status);
      };

      ipcRenderer.on(IPC_NAMES.server.statusChanged, listener);

      return () => {
        ipcRenderer.removeListener(IPC_NAMES.server.statusChanged, listener);
      };
    },

    getInfo: () => ipcRenderer.invoke(IPC_NAMES.server.getInfo),
    getLogs: () => ipcRenderer.invoke(IPC_NAMES.server.getLogs),
    onLog: (callback: (log: ServerLog) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, log: ServerLog) => {
        callback(log);
      };

      ipcRenderer.on(IPC_NAMES.server.log, listener);

      return () => {
        ipcRenderer.removeListener(IPC_NAMES.server.log, listener);
      };
    },
  },

  storage: {
    getInfo: () => ipcRenderer.invoke(IPC_NAMES.storage.getInfo),

    selectDatabaseDirectory: () =>
      ipcRenderer.invoke(IPC_NAMES.storage.selectDatabaseDir),

    selectBackupDirectory: () =>
      ipcRenderer.invoke(IPC_NAMES.storage.selectBackupDir),

    createBackup: () => ipcRenderer.invoke(IPC_NAMES.storage.createBackup),
    openDirectory: (path: string) =>
      ipcRenderer.invoke(IPC_NAMES.storage.openDirectory, path),
    showItemInFolder: (filePath: string) =>
      ipcRenderer.invoke(IPC_NAMES.storage.showItemInFolder, filePath),
  },

  settings: {
    getMode: () => ipcRenderer.invoke(IPC_NAMES.settings.getMode),
    setMode: (mode: string) =>
      ipcRenderer.invoke(IPC_NAMES.settings.setMode, mode),
  },

  update: {
    check: () => ipcRenderer.invoke(IPC_NAMES.update.check),
    openRelease: () => ipcRenderer.invoke(IPC_NAMES.update.openRelease),
  },
};

contextBridge.exposeInMainWorld("api", api);
