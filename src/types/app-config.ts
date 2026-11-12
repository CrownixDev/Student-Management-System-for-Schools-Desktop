export type AppMode = "server" | "client";

export interface AppConfig {
  version: 1;
  mode: AppMode;
  port: number;
  databasePath: string;
  backupDirectory: string;
  maxBackups: number;
  lastBackupAt: string | null;
}
