import { useEffect, useRef, useState } from "react";
import {
  PageLayoutContent,
  PageLayoutHeader,
} from "@renderer/components/ui/page/page-layout";
import { Button } from "@renderer/components/shadcn/button";
import {
  ArrowDownIcon,
  CopyIcon,
  CheckIcon,
  Trash2Icon,
  TerminalIcon,
} from "lucide-react";
import { cn } from "cn";
import type { ServerLog } from "../../../types";

export default function LogsPage() {
  const [logs, setLogs] = useState<ServerLog[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial fetch
    window.api.server
      .getLogs()
      .then((initialLogs) => {
        setLogs(initialLogs ?? []);
      })
      .catch((err) => {
        console.error("Failed to load logs:", err);
      });

    // Subscribe to new logs
    const cleanup = window.api.server.onLog((newLog) => {
      setLogs((prev) => [...prev, newLog]);
    });

    return cleanup;
  }, []);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
    setAutoScroll(isAtBottom);
  };

  const scrollToBottom = () => {
    setAutoScroll(true);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleCopy = async () => {
    const text = logs
      .map(
        (l) =>
          `[${new Date(l.timestamp).toLocaleTimeString()}] [${l.level.toUpperCase()}] ${l.message}`,
      )
      .join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setLogs([]);
  };

  return (
    <div className="flex h-full w-full flex-col">
      <PageLayoutHeader className="border-b border-border/60 px-8 py-5 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Server Logs
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time output stream from the NextJS server runtime
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!autoScroll && (
            <Button
              variant="outline"
              size="sm"
              onClick={scrollToBottom}
              className="gap-1.5 text-xs cursor-pointer text-muted-foreground hover:text-foreground"
            >
              <ArrowDownIcon className="size-3.5" />
              Scroll to bottom
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={logs.length === 0}
            className="gap-1.5 text-xs cursor-pointer"
          >
            {copied ? (
              <CheckIcon className="size-3.5 text-emerald-500" />
            ) : (
              <CopyIcon className="size-3.5" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={logs.length === 0}
            className="gap-1.5 text-xs cursor-pointer text-muted-foreground hover:text-destructive"
          >
            <Trash2Icon className="size-3.5" />
            Clear
          </Button>
        </div>
      </PageLayoutHeader>

      <PageLayoutContent className="flex-1 p-6 flex flex-col min-h-0 overflow-hidden">
        <div className="relative flex-1 min-h-0 w-full rounded-xl border border-border/80 bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden shadow-inner">
          {/* Top Console Bar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/80 bg-zinc-900/60 select-none shrink-0">
            <div className="flex items-center gap-2">
              <TerminalIcon className="size-3.5 text-zinc-400" />
              <span className="text-xs font-mono text-zinc-400">console</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-zinc-500">
                {logs.length} {logs.length === 1 ? "line" : "lines"}
              </span>
            </div>
          </div>

          {/* Logs List - scrollable, wrap text, no overflow */}
          <div
            ref={containerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto overflow-x-hidden p-4 font-mono text-xs leading-relaxed min-h-0"
          >
            {logs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-500 select-none py-16">
                <p>No log records received yet.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {logs.map((log) => {
                  const isErr =
                    log.level === "error" || log.source === "stderr";
                  const time = new Date(log.timestamp).toLocaleTimeString([], {
                    hour12: false,
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  });

                  return (
                    <div
                      key={log.id}
                      className={cn(
                        "flex items-start gap-2.5 rounded px-2 py-0.5 hover:bg-zinc-900/50 break-all whitespace-pre-wrap word-break",
                        isErr && "text-rose-400 bg-rose-950/20",
                      )}
                    >
                      <span className="text-zinc-500 select-none shrink-0 text-[11px]">
                        {time}
                      </span>
                      <span
                        className={cn(
                          "select-none shrink-0 rounded px-1 text-[10px] uppercase font-semibold leading-normal",
                          isErr
                            ? "bg-rose-500/20 text-rose-300"
                            : "bg-emerald-500/10 text-emerald-400",
                        )}
                      >
                        {log.source}
                      </span>
                      <span className="flex-1 min-w-0 wrap-break-word whitespace-pre-wrap">
                        {log.message}
                      </span>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            )}
          </div>
        </div>
      </PageLayoutContent>
    </div>
  );
}
