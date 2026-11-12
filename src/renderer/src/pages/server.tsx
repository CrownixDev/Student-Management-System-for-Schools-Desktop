import {
  PlayIcon,
  RotateCcwIcon,
  SquareIcon,
  ServerIcon,
  Loader2Icon,
  AlertCircleIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  PageLayoutContent,
  PageLayoutHeader,
} from "@renderer/components/ui/page/page-layout";
import { Button } from "@renderer/components/shadcn/button";
import { Card, CardContent } from "@renderer/components/shadcn/card";
import { cn } from "cn";

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

export default function ServerPage() {
  const [status, setStatus] = useState<ServerStatus>("stopped");
  const [isActionPending, setIsActionPending] = useState(false);

  useEffect(() => {
    window.api.server.getStatus().then((s) => {
      setStatus((s as ServerStatus) ?? "stopped");
    });
    const cleanup = window.api.server.onStatusChange((s) => {
      setStatus((s as ServerStatus) ?? "stopped");
      setIsActionPending(false);
    });
    return cleanup;
  }, []);

  const handleStart = async () => {
    try {
      setIsActionPending(true);
      await window.api.server.start();
    } catch {
      setIsActionPending(false);
    }
  };

  const handleStop = async () => {
    try {
      setIsActionPending(true);
      await window.api.server.stop();
    } catch {
      setIsActionPending(false);
    }
  };

  const handleRestart = async () => {
    try {
      setIsActionPending(true);
      await window.api.server.restart();
    } catch {
      setIsActionPending(false);
    }
  };

  const current = statusConfig[status] ?? statusConfig.stopped;
  const isTransitioning =
    isActionPending || status === "starting" || status === "stopping";

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

              {/* Server Details Grid */}
              <div className="mt-6 grid grid-cols-2 gap-3 pt-5 border-t border-border/60">
                <div className="rounded-lg bg-muted/30 p-3 border border-border/40">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                    Port
                  </span>
                  <span className="text-sm font-semibold font-mono text-foreground mt-0.5 block">
                    3223
                  </span>
                </div>
                <div className="rounded-lg bg-muted/30 p-3 border border-border/40">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                    Target Address
                  </span>
                  <span className="text-sm font-semibold font-mono text-foreground mt-0.5 block">
                    127.0.0.1:3223
                  </span>
                </div>
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
                  <RotateCcwIcon
                    className={cn("size-4", isTransitioning && "animate-spin")}
                  />
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
