import type { ServerManager } from "../services/server-manager";
import { DATABASE_FILENAME } from "@/constraints";
import type { ConfigStore } from "../services/config-store";
import { dialog, ipcMain, shell } from "electron";
import { listBackups } from "../services/storage-manager";
import { IPC_NAMES } from "@/lib/ipc-names";
import path from "node:path";
import fs from "node:fs/promises";

export function registerStorageIPC(
  serverManager: ServerManager,
  configStore: ConfigStore,
) {
  // -----------------------------------------------
  // Get storage information
  // -----------------------------------------------

  ipcMain.handle(IPC_NAMES.storage.getInfo, async () => {
    const config = await configStore.load();

    return {
      databasePath: config.databasePath,
      databaseDirectory: path.dirname(config.databasePath),
      backupDirectory: config.backupDirectory,
      maxBackups: config.maxBackups,
      lastBackupAt: config.lastBackupAt,
      backups: await listBackups(config.backupDirectory),
    };
  });

  // -----------------------------------------------
  // Choose database directory
  // -----------------------------------------------

  ipcMain.handle(IPC_NAMES.storage.selectDatabaseDir, async () => {
    if (serverManager.getStatus() !== "stopped") {
      throw new Error(
        "Stop the application server before changing the database location.",
      );
    }

    const config = await configStore.load();

    const result = await dialog.showOpenDialog({
      title: "Choose Database Location",
      defaultPath: path.dirname(config.databasePath),
      properties: ["openDirectory", "createDirectory"],
    });

    if (result.canceled || !result.filePaths[0]) {
      return null;
    }

    const selectedDirectory = result.filePaths[0];

    await fs.access(selectedDirectory);

    const newDatabasePath = path.join(selectedDirectory, DATABASE_FILENAME);

    // Do not silently overwrite or replace an existing database.
    try {
      await fs.access(newDatabasePath);

      throw new Error("A database already exists in the selected directory.");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    const updatedConfig = await configStore.update(config, {
      databasePath: newDatabasePath,
    });

    serverManager.updateConfig(updatedConfig);

    return {
      databasePath: updatedConfig.databasePath,
      databaseDirectory: path.dirname(updatedConfig.databasePath),
    };
  });

  // -----------------------------------------------
  // Choose backup directory
  // -----------------------------------------------

  ipcMain.handle(IPC_NAMES.storage.selectBackupDir, async () => {
    if (serverManager.getStatus() !== "stopped") {
      throw new Error(
        "Stop the application server before changing the backup location.",
      );
    }
    const config = await configStore.load();

    const result = await dialog.showOpenDialog({
      title: "Choose Backup Location",
      defaultPath: config.backupDirectory,
      properties: ["openDirectory", "createDirectory"],
    });

    if (result.canceled || !result.filePaths[0]) {
      return null;
    }

    const selectedDirectory = result.filePaths[0];

    await fs.mkdir(selectedDirectory, { recursive: true });

    const updatedConfig = await configStore.update(config, {
      backupDirectory: selectedDirectory,
    });

    serverManager.updateConfig(updatedConfig);

    return {
      backupDirectory: updatedConfig.backupDirectory,
    };
  });

  // -----------------------------------------------
  // Create manual backup
  // -----------------------------------------------

  ipcMain.handle(IPC_NAMES.storage.createBackup, async () => {
    const backup = await serverManager.createBackup();

    const config = await configStore.load();

    const updatedConfig = await configStore.update(config, {
      lastBackupAt: backup.createdAt,
    });

    serverManager.updateConfig(updatedConfig);

    return backup;
  });

  // -----------------------------------------------
  // Open directory in native file explorer
  // -----------------------------------------------

  ipcMain.handle(
    IPC_NAMES.storage.openDirectory,
    async (_event, targetPath: string) => {
      if (!targetPath) return false;
      const error = await shell.openPath(targetPath);
      if (error) {
        console.error("Failed to open directory:", error);
        return false;
      }
      return true;
    },
  );

  // -----------------------------------------------
  // Show file in directory and select it
  // -----------------------------------------------

  ipcMain.handle(
    IPC_NAMES.storage.showItemInFolder,
    async (_event, filePath: string) => {
      if (!filePath) return false;
      shell.showItemInFolder(filePath);
      return true;
    },
  );
}
