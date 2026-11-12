import { useEffect, useState } from "react";
import {
  PageLayoutContent,
  PageLayoutHeader,
} from "@renderer/components/ui/page/page-layout";
import { Button } from "@renderer/components/shadcn/button";
import { Input } from "@renderer/components/shadcn/input";
import { Card, CardContent } from "@renderer/components/shadcn/card";
import {
  DatabaseIcon,
  FolderOpenIcon,
  FolderSyncIcon,
  HardDriveIcon,
  PlusIcon,
  Loader2Icon,
  ClockIcon,
  ArchiveIcon,
  FileArchiveIcon,
  AlertTriangleIcon,
} from "lucide-react";
import { getErrorMessage } from "@renderer/lib/utils";
import { StorageInfo } from "../../../types";

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default function DatabasePage() {
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchInfo = async () => {
    try {
      setErrorMsg(null);
      const info = await window.api.storage.getInfo();
      setStorageInfo(info);
    } catch (err: unknown) {
      console.error("Failed to load storage info:", err);
      setErrorMsg(getErrorMessage(err, "Failed to load database storage info"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInfo();
  }, []);

  const handleChangeDbDir = async () => {
    try {
      setErrorMsg(null);
      const res = await window.api.storage.selectDatabaseDirectory();
      if (res) {
        await fetchInfo();
      }
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err, "Failed to change database directory"));
    }
  };

  const handleChangeBackupDir = async () => {
    try {
      setErrorMsg(null);
      const res = await window.api.storage.selectBackupDirectory();
      if (res) {
        await fetchInfo();
      }
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err, "Failed to change backup directory"));
    }
  };

  const handleOpenDir = async (dirPath: string) => {
    try {
      await window.api.storage.openDirectory(dirPath);
    } catch (err) {
      console.error("Failed to open directory:", err);
    }
  };

  const handleLocateFile = async (filePath: string) => {
    try {
      await window.api.storage.showItemInFolder(filePath);
    } catch (err) {
      console.error("Failed to show file in folder:", err);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setIsBackingUp(true);
      setErrorMsg(null);
      await window.api.storage.createBackup();
      await fetchInfo();
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err, "Failed to create backup"));
    } finally {
      setIsBackingUp(false);
    }
  };

  const backups = storageInfo?.backups ?? [];

  return (
    <div className="flex h-full w-full flex-col">
      <PageLayoutHeader className="border-b border-border/60 px-8 py-5 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Database & Backups
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage SQLite storage locations and database backup snapshots
          </p>
        </div>

        <Button
          variant="default"
          size="sm"
          onClick={handleCreateBackup}
          disabled={isBackingUp || isLoading}
          className="gap-1.5 cursor-pointer"
        >
          {isBackingUp ? (
            <Loader2Icon className="size-3.5 animate-spin" />
          ) : (
            <PlusIcon className="size-3.5" />
          )}
          {isBackingUp ? "Creating Backup..." : "Create Backup Now"}
        </Button>
      </PageLayoutHeader>

      <PageLayoutContent className="flex-1 p-8">
        <div className="mx-auto max-w-3xl flex flex-col gap-6">
          {errorMsg && (
            <div className="flex items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertTriangleIcon className="size-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Directory Configuration Card */}
          <Card className="border border-border/80 bg-card/60 backdrop-blur-xs shadow-xs">
            <CardContent className="p-6 flex flex-col gap-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Storage Directories
              </span>

              {/* Database Directory Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <DatabaseIcon className="size-3.5 text-muted-foreground" />
                  Database Directory
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    disabled
                    value={storageInfo?.databaseDirectory ?? ""}
                    placeholder="Loading database path..."
                    className="font-mono text-xs text-muted-foreground bg-muted/40 cursor-default"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleChangeDbDir}
                    className="shrink-0 gap-1.5 cursor-pointer text-xs"
                  >
                    <FolderSyncIcon className="size-3.5" />
                    Change
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      storageInfo?.databaseDirectory &&
                      handleOpenDir(storageInfo.databaseDirectory)
                    }
                    disabled={!storageInfo?.databaseDirectory}
                    className="shrink-0 gap-1.5 cursor-pointer text-xs"
                  >
                    <FolderOpenIcon className="size-3.5" />
                    Open
                  </Button>
                </div>
              </div>

              {/* Backup Directory Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <HardDriveIcon className="size-3.5 text-muted-foreground" />
                  Backup Directory
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    disabled
                    value={storageInfo?.backupDirectory ?? ""}
                    placeholder="Loading backup path..."
                    className="font-mono text-xs text-muted-foreground bg-muted/40 cursor-default"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleChangeBackupDir}
                    className="shrink-0 gap-1.5 cursor-pointer text-xs"
                  >
                    <FolderSyncIcon className="size-3.5" />
                    Change
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      storageInfo?.backupDirectory &&
                      handleOpenDir(storageInfo.backupDirectory)
                    }
                    disabled={!storageInfo?.backupDirectory}
                    className="shrink-0 gap-1.5 cursor-pointer text-xs"
                  >
                    <FolderOpenIcon className="size-3.5" />
                    Open
                  </Button>
                </div>
              </div>

              {/* Backup Stats Overview */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/60">
                <div className="rounded-lg bg-muted/30 p-3 border border-border/40 flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <ClockIcon className="size-4" />
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                      Last Backup Time
                    </span>
                    <span className="text-xs font-semibold text-foreground mt-0.5 block truncate">
                      {storageInfo?.lastBackupAt
                        ? new Date(storageInfo.lastBackupAt).toLocaleString()
                        : "Never"}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg bg-muted/30 p-3 border border-border/40 flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <ArchiveIcon className="size-4" />
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                      Max Backup Counts
                    </span>
                    <span className="text-xs font-semibold font-mono text-foreground mt-0.5 block">
                      {storageInfo?.maxBackups ?? 5} snapshots retained
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Backup Snapshots List Card */}
          <Card className="border border-border/80 bg-card/60 backdrop-blur-xs shadow-xs flex flex-col">
            <CardContent className="p-6 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                    All Backups
                  </span>
                  <span className="text-xs text-muted-foreground/80 mt-0.5 block">
                    {backups.length} snapshot{backups.length === 1 ? "" : "s"}{" "}
                    available
                  </span>
                </div>
              </div>

              {/* Scrollable list of backups */}
              <div className="mt-2 max-h-72 min-h-36 overflow-y-auto rounded-lg border border-border/60 bg-muted/20 divide-y divide-border/40">
                {isLoading ? (
                  <div className="flex items-center justify-center p-8 text-xs text-muted-foreground gap-2">
                    <Loader2Icon className="size-4 animate-spin" />
                    <span>Loading backup snapshots...</span>
                  </div>
                ) : backups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                    <FileArchiveIcon className="size-8 opacity-40 mb-2" />
                    <p className="text-xs font-medium">No backups found</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                      Create your first backup using the button above.
                    </p>
                  </div>
                ) : (
                  backups.map((b) => (
                    <div
                      key={b.fileName}
                      className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                          <FileArchiveIcon className="size-3.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-mono font-medium text-foreground block truncate">
                            {b.fileName}
                          </span>
                          <span className="text-[11px] text-muted-foreground block mt-0.5">
                            {new Date(b.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-mono font-medium text-muted-foreground">
                          {formatBytes(b.size)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleLocateFile(b.filePath)}
                          title="Locate in folder"
                          className="text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <FolderOpenIcon className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </PageLayoutContent>
    </div>
  );
}
