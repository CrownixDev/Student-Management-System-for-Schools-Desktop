export type AppMode = "server" | "client";

export interface AppConfig {
  version: 1;
  mode: AppMode;
  port: number;
  databasePath: string;
  databaseInitialized: boolean;
  backupDirectory: string;
  maxBackups: number;
  lastBackupAt: string | null;
}
