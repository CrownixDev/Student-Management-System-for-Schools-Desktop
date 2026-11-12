import { contextBridge, ipcRenderer } from "electron";
import { IPC_NAMES } from "@/lib/ipc-names";

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
  },
};

contextBridge.exposeInMainWorld("api", api);
