import { ipcMain } from "electron";
import {
  checkForUpdates,
  openCheckedRelease,
} from "../services/update-service";
import { IPC_NAMES } from "@/lib/ipc-names";

export function registerUpdateIPC() {
  ipcMain.handle(IPC_NAMES.update.check, async () => checkForUpdates());
  ipcMain.handle(IPC_NAMES.update.openRelease, async () =>
    openCheckedRelease(),
  );
}
