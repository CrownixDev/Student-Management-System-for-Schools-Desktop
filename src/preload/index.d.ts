import {
  AppMode,
  ServerStatus,
  StorageInfo,
  ServerInfo,
  UpdateCheckResult,
} from "@/types";

declare global {
  interface Window {
    api: {
      server: {
        start: () => Promise<ServerStatus>;
        stop: () => Promise<ServerStatus>;
        restart: () => Promise<ServerStatus>;
        getStatus: () => Promise<ServerStatus>;

        onStatusChange: (
          callback: (status: ServerStatus) => void,
        ) => () => void;

        getInfo: () => Promise<ServerInfo>;
        getLogs: () => Promise<ServerLog[]>;
        onLog: (callback: (log: ServerLog) => void) => () => void;
      };

      storage: {
        getInfo: () => Promise<StorageInfo>;

        selectDatabaseDirectory: () => Promise<{
          databasePath: string;
          databaseDirectory: string;
        } | null>;

        selectBackupDirectory: () => Promise<{
          backupDirectory: string;
        } | null>;

        createBackup: () => Promise<{
          fileName: string;
          filePath: string;
          createdAt: string;
          size: number;
        }>;

        openDirectory: (path: string) => Promise<boolean>;
        showItemInFolder: (filePath: string) => Promise<boolean>;
      };

      settings: {
        getMode: () => Promise<AppMode>;
        setMode: (mode: AppMode) => Promise<AppMode>;
      };

      update: {
        check: () => Promise<UpdateCheckResult>;
        openRelease: () => Promise<void>;
      };
    };
  }
}
