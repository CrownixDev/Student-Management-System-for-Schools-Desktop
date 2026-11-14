import { dialog, BrowserWindow } from "electron";
import { ConfigStore } from "./config-store";
import fs from "node:fs/promises";
import path from "node:path";

import {
  databaseExists,
  listBackups,
  restoreBackup,
  assertValidSQLiteDatabase,
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
  const isFirstInstall = !config.databaseInitialized && backups.length === 0;

  let buttons: string[];
  let detail: string;

  if (isFirstInstall) {
    buttons = ["Initialize a new database", "Locate existing database", "Cancel"];
    detail =
      "No existing database was found. You can initialize a new database or locate an existing database file.";
  } else if (latestBackup) {
    buttons = ["Restore latest backup", "Locate existing database", "Cancel"];
    detail = `The previously configured database is missing.\n\nLatest backup: ${latestBackup.fileName}\n\nYou can restore it or locate an existing database.`;
  } else {
    buttons = ["Locate existing database", "Initialize fresh database", "Cancel"];
    detail =
      "The previously configured database is missing and no backups were found. You can locate your existing database file, or initialize a fresh database.";
  }

  const messageBoxOptions = {
    type: "warning" as const,
    title: "Database Not Found",
    message: "The configured database could not be found.",
    detail,
    buttons,
    defaultId: 0,
    cancelId: buttons.length - 1,
    noLink: true,
  };

  const result = parentWindow
    ? await dialog.showMessageBox(parentWindow, messageBoxOptions)
    : await dialog.showMessageBox(messageBoxOptions);

  const selectedButton = buttons[result.response];

  if (selectedButton === "Restore latest backup" && latestBackup) {
    try {
      await restoreBackup(latestBackup.filePath, config.databasePath);
      await assertValidSQLiteDatabase(config.databasePath);

      return await configStore.update(config, {
        databaseInitialized: true,
      });
    } catch (err: unknown) {
      const errorOptions = {
        type: "error" as const,
        title: "Restore Failed",
        message: "Failed to restore database from backup.",
        detail: String(err),
      };
      if (parentWindow) {
        await dialog.showMessageBox(parentWindow, errorOptions);
      } else {
        await dialog.showMessageBox(errorOptions);
      }
      return null;
    }
  }

  if (selectedButton === "Locate existing database") {
    const openDialogOptions = {
      title: "Select Student Management Database File",
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

    try {
      await assertValidSQLiteDatabase(selectedPath);
    } catch (err: unknown) {
      const errorOptions = {
        type: "error" as const,
        title: "Invalid Database",
        message: "The selected file is not a valid SQLite database.",
        detail: String(err),
      };
      if (parentWindow) {
        await dialog.showMessageBox(parentWindow, errorOptions);
      } else {
        await dialog.showMessageBox(errorOptions);
      }

      return null;
    }

    return await configStore.update(config, {
      databasePath: selectedPath,
      databaseInitialized: true,
    });
  }

  if (
    selectedButton === "Initialize a new database" ||
    selectedButton === "Initialize fresh database"
  ) {
    if (config.databaseInitialized) {
      // Confirm intentional reset
      const confirmResult = parentWindow
        ? await dialog.showMessageBox(parentWindow, {
            type: "question",
            title: "Confirm Fresh Database Initialization",
            message:
              "Are you sure you want to initialize a fresh database? Any previous data that was not backed up will be lost.",
            buttons: ["Initialize Fresh Database", "Cancel"],
            defaultId: 1,
            cancelId: 1,
            noLink: true,
          })
        : await dialog.showMessageBox({
            type: "question",
            title: "Confirm Fresh Database Initialization",
            message:
              "Are you sure you want to initialize a fresh database? Any previous data that was not backed up will be lost.",
            buttons: ["Initialize Fresh Database", "Cancel"],
            defaultId: 1,
            cancelId: 1,
            noLink: true,
          });

      if (confirmResult.response !== 0) {
        return null;
      }
    }

    await fs.mkdir(path.dirname(config.databasePath), { recursive: true });

    return await configStore.update(config, {
      databaseInitialized: true,
    });
  }

  return null;
}
