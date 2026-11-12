export const IPC_NAMES = {
  server: {
    log: "server:log",
    getLogs: "server:get-logs",
    start: "server:start",
    stop: "server:stop",
    restart: "server:restart",
    status: "server:status",
    statusChanged: "server:status-changed",
    getInfo: "server:get-info",
  },
  storage: {
    getInfo: "storage:get-info",
    createBackup: "storage:create-backup",
    selectDatabaseDir: "storage:select-database-directory",
    selectBackupDir: "storage:select-backup-directory",
    openDirectory: "storage:open-directory",
    showItemInFolder: "storage:show-item-in-folder",
  },
  settings: {
    getMode: "settings:get-mode",
    setMode: "settings:set-mode",
  },
};
