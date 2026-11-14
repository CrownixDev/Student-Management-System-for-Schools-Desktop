import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { app } from "electron";
import { AppConfig } from "@/types";
import type { PrismaRunner } from "./prisma-runner";
import type { MigrationStateStore } from "./migration-state-store";

export interface BackupInfo {
  fileName: string;
  filePath: string;
  createdAt: string;
  size: number;
}

const BACKUP_PATTERN = /^(backup|pre-migration)-[\w-]+\.db$/;

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getBackupTimestamp(date = new Date()) {
  const datePart = getLocalDateKey(date);

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${datePart}_${hours}${minutes}${seconds}`;
}

export async function databaseExists(databasePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(databasePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

export async function listBackups(
  backupDirectory: string,
): Promise<BackupInfo[]> {
  try {
    const entries = await fs.readdir(backupDirectory, {
      withFileTypes: true,
    });

    const backups: BackupInfo[] = [];

    for (const entry of entries) {
      if (!entry.isFile() || !BACKUP_PATTERN.test(entry.name)) {
        continue;
      }

      const filePath = path.join(backupDirectory, entry.name);
      const stat = await fs.stat(filePath);

      backups.push({
        fileName: entry.name,
        filePath,
        createdAt: stat.mtime.toISOString(),
        size: stat.size,
      });
    }

    return backups.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

export async function pruneBackups(
  backupDirectory: string,
  maxBackups: number,
): Promise<void> {
  const backups = await listBackups(backupDirectory);

  // listBackups returns newest first.
  const oldBackups = backups.slice(maxBackups);

  for (const backup of oldBackups) {
    try {
      await fs.unlink(backup.filePath);
    } catch (err) {
      console.error(`Failed to prune backup ${backup.filePath}:`, err);
    }
  }
}

export async function restoreBackup(
  backupPath: string,
  databasePath: string,
): Promise<void> {
  if (!(await databaseExists(backupPath))) {
    throw new Error("The selected backup does not exist.");
  }

  if (await databaseExists(databasePath)) {
    throw new Error("A database already exists at the destination.");
  }

  await fs.mkdir(path.dirname(databasePath), { recursive: true });

  const temporaryPath = `${databasePath}.restore-tmp`;

  await fs.copyFile(backupPath, temporaryPath);
  await fs.rename(temporaryPath, databasePath);
}

export async function isSQLiteDatabase(filePath: string): Promise<boolean> {
  let handle: Awaited<ReturnType<typeof fs.open>> | undefined;

  try {
    handle = await fs.open(filePath, "r");

    const buffer = Buffer.alloc(16);
    const { bytesRead } = await handle.read(buffer, 0, 16, 0);

    return (
      bytesRead === 16 && buffer.toString("utf8") === "SQLite format 3\u0000"
    );
  } catch {
    return false;
  } finally {
    await handle?.close();
  }
}

export async function assertValidSQLiteDatabase(
  databasePath: string,
): Promise<void> {
  const exists = await databaseExists(databasePath);
  if (!exists) {
    throw new Error(`Database file not found: ${databasePath}`);
  }

  const validHeader = await isSQLiteDatabase(databasePath);
  if (!validHeader) {
    throw new Error(
      "The file is not a valid SQLite database (header mismatch).",
    );
  }

  const resourcesPath = app.isPackaged
    ? process.resourcesPath
    : path.resolve(app.getAppPath(), "resources");

  const nodePath = path.join(
    resourcesPath,
    "runtime",
    process.platform === "win32" ? "node.exe" : "node",
  );

  const serverDirectory = path.join(resourcesPath, "server");
  const sqliteCheckPath = path.join(serverDirectory, "sqlite-check.cjs");

  await new Promise<void>((resolve, reject) => {
    const child = spawn(nodePath, [sqliteCheckPath, databasePath], {
      cwd: serverDirectory,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    let stdout = "";

    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");

    child.stdout?.on("data", (chunk: string) => {
      stdout += chunk;
    });

    child.stderr?.on("data", (chunk: string) => {
      stderr += chunk;
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `SQLite integrity check failed (exit code ${code}): ${stderr || stdout}`,
          ),
        );
      }
    });
  });
}

export async function createDailyBackupIfNeeded(
  config: AppConfig,
  prismaRunner: PrismaRunner,
) {
  await fs.mkdir(config.backupDirectory, {
    recursive: true,
  });

  const today = getLocalDateKey();
  const backups = await listBackups(config.backupDirectory);

  const alreadyBackedUpToday = backups.some((backup) =>
    backup.fileName.startsWith(`backup-${today}_`),
  );

  if (alreadyBackedUpToday) {
    return null;
  }

  const fileName = `backup-${getBackupTimestamp()}.db`;
  const destination = path.join(config.backupDirectory, fileName);

  await prismaRunner.snapshot(config.databasePath, destination);

  const stat = await fs.stat(destination);

  if (stat.size === 0) {
    throw new Error("The automatic backup is empty.");
  }

  await pruneBackups(config.backupDirectory, config.maxBackups);

  return {
    fileName,
    filePath: destination,
    createdAt: new Date().toISOString(),
    size: stat.size,
  };
}

export async function createMigrationSafetyBackupIfNeeded(
  config: AppConfig,
  prismaRunner: PrismaRunner,
  migrationState: MigrationStateStore,
): Promise<string> {
  const databaseIsPresent = await databaseExists(config.databasePath);
  const currentHash = await migrationState.calculateHash();
  const previousHash = await migrationState.getSavedHash();

  if (!databaseIsPresent || previousHash === currentHash) {
    return currentHash;
  }

  await fs.mkdir(config.backupDirectory, { recursive: true });

  const fileName = `pre-migration-${getBackupTimestamp()}.db`;
  const destination = path.join(config.backupDirectory, fileName);

  await prismaRunner.snapshot(config.databasePath, destination);

  const stat = await fs.stat(destination);
  if (stat.size === 0) {
    throw new Error("The pre-migration safety backup is empty.");
  }

  // Counted toward the overall retention limit
  await pruneBackups(config.backupDirectory, config.maxBackups);

  return currentHash;
}
