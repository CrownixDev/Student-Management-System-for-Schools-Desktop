export interface StorageInfo {
  databasePath: string;
  databaseDirectory: string;
  backupDirectory: string;
  maxBackups: number;
  lastBackupAt: string | null;
  backups: {
    fileName: string;
    filePath: string;
    createdAt: string;
    size: number;
  }[];
}
