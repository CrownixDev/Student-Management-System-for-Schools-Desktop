import { HEALTH_INTERVAL, HEALTH_TIMEOUT } from "@/constraints";
import { listBackups, pruneBackups } from "./storage-manager";
import { spawn, type ChildProcess } from "node:child_process";
import { AppConfig, ServerStatus, ServerLog } from "@/types";
import { randomBytes } from "node:crypto";
import { app } from "electron";
import fs from "node:fs/promises";
import path from "node:path";

export class ServerManager {
  private process: ChildProcess | null = null;
  private status: ServerStatus = "stopped";
  private statusListeners = new Set<(status: ServerStatus) => void>();

  private config: AppConfig;
  private readonly internalToken = randomBytes(32).toString("hex");

  private logs: ServerLog[] = [];
  private logListeners = new Set<(log: ServerLog) => void>();

  private stopRequested = false;

  // Crash recovery properties
  private recoveryAttempts = 0;
  private recoveryWindowStartedAt = 0;
  private readonly maxRecoveryAttempts = 3;
  private readonly recoveryDelays = [1_000, 3_000, 8_000];
  private beforeRecovery?: () => Promise<void>;
  private stabilityTimer: NodeJS.Timeout | null = null;

  constructor(config: AppConfig, beforeRecovery?: () => Promise<void>) {
    this.config = config;
    this.beforeRecovery = beforeRecovery;
  }

  setBeforeRecovery(fn: () => Promise<void>) {
    this.beforeRecovery = fn;
  }

  getConfig(): AppConfig {
    return { ...this.config };
  }

  updateConfig(config: AppConfig) {
    this.config = config;
  }

  getMode() {
    return this.config.mode;
  }

  getPort() {
    return this.config.port;
  }

  getLocalUrl() {
    return `http://127.0.0.1:${this.config.port}`;
  }

  getBaseUrl() {
    return this.getLocalUrl();
  }

  getStatus(): ServerStatus {
    return this.status;
  }

  onStatusChange(listener: (status: ServerStatus) => void) {
    this.statusListeners.add(listener);

    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private setStatus(status: ServerStatus) {
    this.status = status;

    for (const listener of this.statusListeners) {
      listener(status);
    }
  }

  private getServerPaths() {
    const resourcesPath = app.isPackaged
      ? process.resourcesPath
      : path.resolve(app.getAppPath(), "resources");

    return {
      nodePath: path.join(
        resourcesPath,
        "runtime",
        process.platform === "win32" ? "node.exe" : "node",
      ),

      serverPath: path.join(resourcesPath, "server", "server.js"),
    };
  }

  private async waitForExit(
    child: ChildProcess,
    timeoutMs: number,
  ): Promise<boolean> {
    if (child.exitCode !== null || child.signalCode !== null) {
      return true;
    }

    return new Promise((resolve) => {
      let finished = false;

      const finish = (exited: boolean) => {
        if (finished) return;

        finished = true;
        clearTimeout(timer);
        child.removeListener("exit", onExit);

        resolve(exited);
      };

      const onExit = () => finish(true);

      const timer = setTimeout(() => finish(false), timeoutMs);

      child.once("exit", onExit);
    });
  }

  async start(): Promise<void> {
    if (this.status === "running") {
      return;
    }

    if (this.status === "starting" || this.status === "stopping") {
      throw new Error(`Cannot start server while it is ${this.status}.`);
    }

    this.stopRequested = false;
    this.setStatus("starting");

    try {
      const { nodePath, serverPath } = this.getServerPaths();

      const child = spawn(nodePath, [serverPath], {
        cwd: path.dirname(serverPath),

        env: {
          ...process.env,
          NODE_ENV: "production",
          HOSTNAME: this.config.mode === "server" ? "0.0.0.0" : "127.0.0.1",
          PORT: String(this.config.port),
          DATABASE_URL: `file:${this.config.databasePath.replace(/\\/g, "/")}`,
          CROWNIX_BACKUP_DIR: this.config.backupDirectory,
          CROWNIX_INTERNAL_TOKEN: this.internalToken,
        },

        stdio: ["ignore", "pipe", "pipe", "ipc"],
        windowsHide: true,
      });

      this.process = child;

      let stdoutBuffer = "";
      let stderrBuffer = "";

      child.stdout?.setEncoding("utf8");

      child.stdout?.on("data", (chunk: string) => {
        stdoutBuffer += chunk;

        const lines = stdoutBuffer.split(/\r?\n/);
        stdoutBuffer = lines.pop() ?? "";

        for (const line of lines) {
          this.emitLog("stdout", line);
        }
      });

      child.stderr?.setEncoding("utf8");

      child.stderr?.on("data", (chunk: string) => {
        stderrBuffer += chunk;

        const lines = stderrBuffer.split(/\r?\n/);
        stderrBuffer = lines.pop() ?? "";

        for (const line of lines) {
          this.emitLog("stderr", line);
        }
      });

      child.on("error", (error) => {
        console.error("[Server Process Error]", error);
        this.emitLog("stderr", `Server process error: ${String(error)}`);

        if (this.process === child) {
          this.process = null;
          this.setStatus("error");
        }
      });

      child.on("exit", (code, signal) => {
        if (stdoutBuffer.trim()) {
          this.emitLog("stdout", stdoutBuffer);
          stdoutBuffer = "";
        }

        if (stderrBuffer.trim()) {
          this.emitLog("stderr", stderrBuffer);
          stderrBuffer = "";
        }

        if (this.process === child) {
          const wasRunning = this.status === "running";
          this.handleUnexpectedExit(code, signal, wasRunning);
        }
      });

      await this.waitUntilReady(child);

      if (this.process !== child) {
        throw new Error("Server exited during startup.");
      }

      this.setStatus("running");

      // Stable run timer: reset recovery attempts after 2 minutes of stable operation
      if (this.stabilityTimer) {
        clearTimeout(this.stabilityTimer);
      }
      this.stabilityTimer = setTimeout(() => {
        this.recoveryAttempts = 0;
        this.recoveryWindowStartedAt = Date.now();
      }, 2 * 60_000);
    } catch (error) {
      if (this.process) {
        this.process.kill();
        this.process = null;
      }

      this.setStatus("error");

      throw error;
    }
  }

  private handleUnexpectedExit(
    code: number | null,
    signal: NodeJS.Signals | null,
    wasRunning: boolean,
  ) {
    this.process = null;

    if (this.stabilityTimer) {
      clearTimeout(this.stabilityTimer);
      this.stabilityTimer = null;
    }

    if (this.stopRequested) {
      this.setStatus("stopped");
      return;
    }

    this.setStatus("error");

    this.emitLog(
      "stderr",
      `Next.js exited unexpectedly. Code: ${code}, signal: ${signal}`,
    );

    // Do not retry a process that failed during initial startup.
    if (!wasRunning) return;

    const now = Date.now();

    if (now - this.recoveryWindowStartedAt > 10 * 60_000) {
      this.recoveryWindowStartedAt = now;
      this.recoveryAttempts = 0;
    }

    if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
      this.emitLog(
        "stderr",
        "Automatic recovery limit reached. Manual restart is required.",
      );
      return;
    }

    const delay = this.recoveryDelays[this.recoveryAttempts];

    this.recoveryAttempts += 1;

    this.emitLog(
      "stdout",
      `Server recovery attempt ${this.recoveryAttempts} in ${delay / 1000} seconds.`,
    );

    setTimeout(async () => {
      if (this.stopRequested || this.process) return;

      try {
        // Verify SQLite before attempting to restart.
        await this.beforeRecovery?.();

        await this.start();
      } catch (error) {
        this.emitLog(
          "stderr",
          `Automatic recovery failed: ${String(error)}`,
        );
      }
    }, delay);
  }

  async stop(): Promise<void> {
    const child = this.process;

    if (!child) {
      this.setStatus("stopped");
      return;
    }

    this.stopRequested = true;
    this.setStatus("stopping");

    if (this.stabilityTimer) {
      clearTimeout(this.stabilityTimer);
      this.stabilityTimer = null;
    }

    if (child.connected) {
      try {
        child.send({
          type: "CROWNIX_SHUTDOWN",
        });
      } catch (err) {
        console.error("Could not send shutdown IPC message:", err);
      }
    }

    // Give Next.js up to 20 seconds to drain and close gracefully.
    const exitedGracefully = await this.waitForExit(child, 20_000);

    if (!exitedGracefully) {
      this.emitLog(
        "stderr",
        "Graceful shutdown timed out. Force terminating the server.",
      );

      // Last resort only.
      child.kill();

      const exited = await this.waitForExit(child, 5_000);

      if (!exited) {
        throw new Error("Could not terminate the Next.js process.");
      }
    }

    this.process = null;
    this.setStatus("stopped");
  }

  async restart(): Promise<void> {
    if (this.process) {
      await this.stop();
    }

    await this.start();
  }

  private async waitUntilReady(child: ChildProcess): Promise<void> {
    const startedAt = Date.now();

    while (Date.now() - startedAt < HEALTH_TIMEOUT) {
      if (this.process !== child || child.exitCode !== null) {
        throw new Error("Next.js process exited before becoming ready.");
      }

      try {
        const response = await fetch(`${this.getLocalUrl()}/api/health`, {
          signal: AbortSignal.timeout(2000),
        });

        if (response.ok) {
          return;
        }
      } catch {
        // Server isn't ready yet.
      }

      await new Promise((resolve) => setTimeout(resolve, HEALTH_INTERVAL));
    }

    throw new Error("Next.js server did not become ready within 30 seconds.");
  }

  // -------------------------------------
  // DB features
  // -------------------------------------

  async getBackups() {
    return listBackups(this.config.backupDirectory);
  }

  async createBackup() {
    if (this.status !== "running") {
      throw new Error("The server must be running to create a backup.");
    }

    await fs.mkdir(this.config.backupDirectory, {
      recursive: true,
    });

    const timestamp = new Date()
      .toISOString()
      .replace(/:/g, "-")
      .replace(/\./g, "-");

    const fileName = `backup-${timestamp}.db`;

    const response = await fetch(`${this.getLocalUrl()}/api/internal/backup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.internalToken}`,
      },
      body: JSON.stringify({ fileName }),
      signal: AbortSignal.timeout(120_000),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error ?? "Could not create database backup.");
    }

    const backupPath = path.join(this.config.backupDirectory, fileName);

    const stat = await fs.stat(backupPath);

    if (!stat.isFile() || stat.size === 0) {
      throw new Error("The generated backup is empty or invalid.");
    }

    // Only prune old backups after the new backup has succeeded.
    await pruneBackups(this.config.backupDirectory, this.config.maxBackups);

    return {
      fileName,
      filePath: backupPath,
      createdAt: stat.mtime.toISOString(),
      size: stat.size,
    };
  }

  // -------------------------------------------
  // Logging Feature
  // -------------------------------------------

  onLog(listener: (log: ServerLog) => void) {
    this.logListeners.add(listener);

    return () => {
      this.logListeners.delete(listener);
    };
  }

  getLogs() {
    return [...this.logs];
  }

  private emitLog(source: "stdout" | "stderr", message: string) {
    if (!message.trim()) return;

    const log: ServerLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      level: source === "stderr" ? "error" : "info",
      source,
      message,
    };

    this.logs.push(log);

    // Prevent unlimited memory growth.
    if (this.logs.length > 1000) {
      this.logs.splice(0, this.logs.length - 1000);
    }

    for (const listener of this.logListeners) {
      listener(log);
    }
  }

  emitExternalLog(source: "stdout" | "stderr", message: string) {
    this.emitLog(source, message);
  }
}
