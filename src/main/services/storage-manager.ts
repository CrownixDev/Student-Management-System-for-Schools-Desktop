import fs from "node:fs/promises";
import path from "node:path";

export interface BackupInfo {
  fileName: string;
  filePath: string;
  createdAt: string;
  size: number;
}

const BACKUP_PATTERN = /^backup-[\w-]+\.db$/;

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
    await fs.unlink(backup.filePath);
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
