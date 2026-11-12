import { dialog, BrowserWindow } from "electron";
import { ConfigStore } from "./config-store";
import fs from "node:fs/promises";
import path from "node:path";

import {
  databaseExists,
  isSQLiteDatabase,
  listBackups,
  restoreBackup,
} from "./storage-manager";
import { AppConfig } from "@/types";

export async function ensureDatabase(
  parentWindow: BrowserWindow | null,
  config: AppConfig,
  configStore: ConfigStore,
): Promise<AppConfig | null> {
  if (await databaseExists(config.databasePath)) {
    return config;
  }

  const backups = await listBackups(config.backupDirectory);
  const latestBackup = backups[0];

  const buttons = latestBackup
    ? ["Restore latest backup", "Locate existing database", "Cancel"]
    : ["Locate existing database", "Initialize a new database", "Cancel"];

  const messageBoxOptions = {
    type: "warning" as const,
    title: "Database not found",
    message: "The configured database could not be found.",
    detail: latestBackup
      ? `Latest backup: ${latestBackup.fileName}\n\nYou can restore it or locate an existing database.`
      : "No backups were found. You can locate an existing database or initialize a new one.",
    buttons,
    defaultId: 0,
    cancelId: buttons.length - 1,
    noLink: true,
  };
  const result = parentWindow
    ? await dialog.showMessageBox(parentWindow, messageBoxOptions)
    : await dialog.showMessageBox(messageBoxOptions);

  if (latestBackup && result.response === 0) {
    await restoreBackup(latestBackup.filePath, config.databasePath);

    return config;
  }

  const locateIndex = latestBackup ? 1 : 0;

  if (result.response === locateIndex) {
    const openDialogOptions = {
      title: "Select Student Management Database",
      properties: ["openFile" as const],
      filters: [
        {
          name: "SQLite Database",
          extensions: ["db", "sqlite", "sqlite3"],
        },
      ],
    };
    const selected = parentWindow
      ? await dialog.showOpenDialog(parentWindow, openDialogOptions)
      : await dialog.showOpenDialog(openDialogOptions);

    if (selected.canceled || !selected.filePaths[0]) {
      return null;
    }

    const selectedPath = selected.filePaths[0];

    if (!(await isSQLiteDatabase(selectedPath))) {
      const errorOptions = {
        type: "error" as const,
        title: "Invalid database",
        message: "The selected file is not a valid SQLite database.",
      };
      if (parentWindow) {
        await dialog.showMessageBox(parentWindow, errorOptions);
      } else {
        await dialog.showMessageBox(errorOptions);
      }

      return null;
    }

    return configStore.update(config, {
      databasePath: selectedPath,
    });
  }

  // The new database option is only available when no backup exists.
  if (!latestBackup && result.response === 1) {
    await fs.mkdir(path.dirname(config.databasePath), { recursive: true });

    // The actual database is created by your Prisma migrations.
    return config;
  }

  return null;
}
