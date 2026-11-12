import {
  PlayIcon,
  RotateCcwIcon,
  SquareIcon,
  ServerIcon,
  Loader2Icon,
  AlertCircleIcon,
  CopyIcon,
  CheckIcon,
  GlobeIcon,
  LaptopIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  PageLayoutContent,
  PageLayoutHeader,
} from "@renderer/components/ui/page/page-layout";
import { Button } from "@renderer/components/shadcn/button";
import { Card, CardContent } from "@renderer/components/shadcn/card";
import { cn } from "cn";
import type { ServerInfo } from "../../../types";

type ServerStatus = "stopped" | "starting" | "running" | "stopping" | "error";

const statusConfig: Record<
  ServerStatus,
  {
    label: string;
    dotClass: string;
    badgeBg: string;
    badgeText: string;
    description: string;
  }
> = {
  running: {
    label: "Running",
    dotClass: "bg-emerald-500 shadow-xs shadow-emerald-500/50 animate-pulse",
    badgeBg: "bg-emerald-500/10 border-emerald-500/25",
    badgeText: "text-emerald-500 dark:text-emerald-400",
    description:
      "Server is online and responding to network requests normally.",
  },
  starting: {
    label: "Starting...",
    dotClass: "bg-amber-500 animate-ping",
    badgeBg: "bg-amber-500/10 border-amber-500/25",
    badgeText: "text-amber-500 dark:text-amber-400",
    description:
      "Initializing runtime environment and spinning up server process.",
  },
  stopping: {
    label: "Stopping...",
    dotClass: "bg-amber-500 animate-pulse",
    badgeBg: "bg-amber-500/10 border-amber-500/25",
    badgeText: "text-amber-500 dark:text-amber-400",
    description: "Shutting down services and terminating connections.",
  },
  stopped: {
    label: "Stopped",
    dotClass: "bg-muted-foreground/40",
    badgeBg: "bg-muted/60 border-border",
    badgeText: "text-muted-foreground",
    description: "Server is currently offline. Click start to activate.",
  },
  error: {
    label: "Error",
    dotClass: "bg-rose-500 shadow-xs shadow-rose-500/50",
    badgeBg: "bg-rose-500/10 border-rose-500/25",
    badgeText: "text-rose-500 dark:text-rose-400",
    description:
      "An unexpected error occurred during execution. Check logs for details.",
  },
};

function UrlItem({
  label,
  url,
  icon: Icon,
}: {
  label: string;
  url: string;
  icon: typeof LaptopIcon;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/30 px-3.5 py-2.5 transition-colors hover:bg-muted/40">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon className="size-3.5" />
        </div>
        <div className="min-w-0">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block leading-tight">
            {label}
          </span>
          <span className="text-xs font-mono font-medium text-foreground truncate block mt-0.5 select-all">
            {url}
          </span>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={handleCopy}
        title="Copy URL"
        className="shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
      >
        {copied ? (
          <CheckIcon className="size-3.5 text-emerald-500" />
        ) : (
          <CopyIcon className="size-3.5" />
        )}
      </Button>
    </div>
  );
}

export default function ServerPage() {
  const [status, setStatus] = useState<ServerStatus>("stopped");
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [isActionPending, setIsActionPending] = useState(false);

  const refreshInfo = () => {
    window.api.server
      .getInfo()
      .then((info) => {
        setServerInfo(info);
        if (info.status) {
          setStatus(info.status);
        }
      })
      .catch((err) => {
        console.error("Failed to load server info:", err);
      });
  };

  useEffect(() => {
    window.api.server.getStatus().then((s) => {
      setStatus((s as ServerStatus) ?? "stopped");
    });
    refreshInfo();

    const cleanup = window.api.server.onStatusChange((s) => {
      setStatus((s as ServerStatus) ?? "stopped");
      setIsActionPending(false);
      refreshInfo();
    });
    return cleanup;
  }, []);

  const handleStart = async () => {
    try {
      setIsActionPending(true);
      await window.api.server.start();
      refreshInfo();
    } catch {
      setIsActionPending(false);
    }
  };

  const handleStop = async () => {
    try {
      setIsActionPending(true);
      await window.api.server.stop();
      refreshInfo();
    } catch {
      setIsActionPending(false);
    }
  };

  const handleRestart = async () => {
    try {
      setIsActionPending(true);
      await window.api.server.restart();
      refreshInfo();
    } catch {
      setIsActionPending(false);
    }
  };

  const current = statusConfig[status] ?? statusConfig.stopped;
  const isTransitioning =
    isActionPending || status === "starting" || status === "stopping";

  // Derive network URLs from usableUrls excluding local 127.0.0.1
  const localUrl =
    serverInfo?.localUrl ?? `http://127.0.0.1:${serverInfo?.port ?? 3223}`;
  const networkUrls = (serverInfo?.usableUrls ?? []).filter(
    (u) => !u.includes("127.0.0.1") && !u.includes("localhost"),
  );

  return (
    <div className="flex h-full w-full flex-col">
      <PageLayoutHeader className="border-b border-border/60 px-8 py-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Server Management
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor state and control the local backend server process
          </p>
        </div>
      </PageLayoutHeader>

      <PageLayoutContent className="flex-1 p-8">
        <div className="mx-auto max-w-2xl flex flex-col gap-6">
          {/* Status Card */}
          <Card className="border border-border/80 bg-card/60 backdrop-blur-xs shadow-xs">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div
                    className={cn(
                      "flex size-12 shrink-0 items-center justify-center rounded-xl border transition-colors",
                      status === "running"
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
                        : status === "error"
                          ? "border-rose-500/20 bg-rose-500/10 text-rose-500"
                          : "border-border bg-muted/50 text-muted-foreground",
                    )}
                  >
                    {isTransitioning ? (
                      <Loader2Icon className="size-6 animate-spin text-primary" />
                    ) : status === "error" ? (
                      <AlertCircleIcon className="size-6" />
                    ) : (
                      <ServerIcon className="size-6" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-base font-medium text-foreground">
                        NextJS Server
                      </h2>
                      <div
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide select-none",
                          current.badgeBg,
                          current.badgeText,
                        )}
                      >
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            current.dotClass,
                          )}
                        />
                        {current.label}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {current.description}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Connection URLs Card */}
          <Card className="border border-border/80 bg-card/60 backdrop-blur-xs shadow-xs">
            <CardContent className="p-6">
              <div className="mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  Access URLs
                </span>
                <span className="text-xs text-muted-foreground/80 mt-0.5 block">
                  Use these URLs to connect to the server interface
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                <UrlItem
                  label="Local Address"
                  url={localUrl}
                  icon={LaptopIcon}
                />

                {networkUrls.length > 0
                  ? networkUrls.map((netUrl) => (
                      <UrlItem
                        key={netUrl}
                        label="Network Address"
                        url={netUrl}
                        icon={GlobeIcon}
                      />
                    ))
                  : serverInfo?.mode === "server" && (
                      <div className="rounded-lg border border-dashed border-border/70 p-3 text-center">
                        <p className="text-xs text-muted-foreground">
                          No additional network IPv4 addresses detected.
                        </p>
                      </div>
                    )}
              </div>
            </CardContent>
          </Card>

          {/* Controls Card */}
          <Card className="border border-border/80 bg-card/60 backdrop-blur-xs shadow-xs">
            <CardContent className="p-6">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-4">
                Service Controls
              </span>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  onClick={handleStart}
                  disabled={status === "running" || isTransitioning}
                  className="h-11 cursor-pointer font-medium gap-2 disabled:bg-muted"
                >
                  <PlayIcon className="size-4 fill-current" />
                  Start
                </Button>

                <Button
                  onClick={handleStop}
                  disabled={status === "stopped" || isTransitioning}
                  variant="danger"
                  className="h-11 cursor-pointer font-medium gap-2 disabled:bg-muted"
                >
                  <SquareIcon className="size-4 fill-current" />
                  Stop
                </Button>

                <Button
                  onClick={handleRestart}
                  disabled={status === "stopped" || isTransitioning}
                  variant="outline"
                  className="h-11 cursor-pointer font-medium gap-2"
                >
                  <RotateCcwIcon className="size-4" />
                  Restart
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageLayoutContent>
    </div>
  );
}
