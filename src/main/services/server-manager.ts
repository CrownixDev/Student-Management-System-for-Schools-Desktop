import { HEALTH_INTERVAL, HEALTH_TIMEOUT } from "@/constraints";
import { listBackups, pruneBackups } from "./storage-manager";
import { spawn, type ChildProcess } from "node:child_process";
import { AppConfig, ServerStatus } from "@/types";
import { randomBytes } from "node:crypto";
import { ServerLog } from "@/types";
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

  constructor(config: AppConfig) {
    this.config = config;
  }

  getConfig() {
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

  async start(): Promise<void> {
    if (this.status === "running") {
      return;
    }

    if (this.status === "starting" || this.status === "stopping") {
      throw new Error(`Cannot start server while it is ${this.status}.`);
    }

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

        stdio: ["ignore", "pipe", "pipe"],
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

        if (this.process === child) {
          this.process = null;
          this.setStatus("error");
        }
      });

      child.on("exit", () => {
        if (stdoutBuffer.trim()) {
          this.emitLog("stdout", stdoutBuffer);
          stdoutBuffer = "";
        }

        if (stderrBuffer.trim()) {
          this.emitLog("stderr", stderrBuffer);
          stderrBuffer = "";
        }

        if (this.process === child) {
          this.process = null;
          this.setStatus(this.status === "stopping" ? "stopped" : "error");
        }
      });

      await this.waitUntilReady(child);

      if (this.process !== child) {
        throw new Error("Server exited during startup.");
      }

      this.setStatus("running");
    } catch (error) {
      if (this.process) {
        this.process.kill();
        this.process = null;
      }

      this.setStatus("error");

      throw error;
    }
  }

  async stop(): Promise<void> {
    const child = this.process;

    if (!child) {
      this.setStatus("stopped");
      return;
    }

    this.setStatus("stopping");

    await new Promise<void>((resolve, reject) => {
      const forceKillTimer = setTimeout(() => {
        if (child.exitCode === null) {
          child.kill();
        }
      }, 5000);

      child.once("exit", () => {
        clearTimeout(forceKillTimer);

        if (this.process === child) {
          this.process = null;
        }

        this.setStatus("stopped");
        resolve();
      });

      child.once("error", (error) => {
        clearTimeout(forceKillTimer);
        reject(error);
      });

      // Windows process termination.
      // The operating system releases its database handles.
      child.kill();
    });
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
}
