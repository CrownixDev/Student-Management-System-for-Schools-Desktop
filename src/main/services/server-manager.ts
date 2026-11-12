import {
  APP_MODE,
  SERVER_PORT,
  HEALTH_INTERVAL,
  HEALTH_TIMEOUT,
} from "@/constraints";
import { spawn, type ChildProcess } from "node:child_process";
import { ServerMode, ServerStatus } from "@/types";
import { app } from "electron";
import path from "node:path";

export class ServerManager {
  private process: ChildProcess | null = null;
  private status: ServerStatus = "stopped";
  private mode = APP_MODE;
  private statusListeners = new Set<(status: ServerStatus) => void>();
  private baseUrl = `http://127.0.0.1:${SERVER_PORT}`;

  getStatus(): ServerStatus {
    return this.status;
  }

  getMode(): ServerMode {
    return this.mode;
  }

  getBaseUrl(): string {
    return this.baseUrl;
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
      const hostname = this.mode === "server" ? "0.0.0.0" : "127.0.0.1";

      this.baseUrl = `http://127.0.0.1:${SERVER_PORT}`;

      const child = spawn(nodePath, [serverPath], {
        cwd: path.dirname(serverPath),

        env: {
          ...process.env,
          NODE_ENV: "production",
          HOSTNAME: hostname,
          PORT: String(SERVER_PORT),
        },

        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });

      this.process = child;

      child.stdout?.on("data", (data: Buffer) => {
        console.log("[Next.js]", data.toString().trimEnd());
      });

      child.stderr?.on("data", (data: Buffer) => {
        console.error("[Next.js]", data.toString().trimEnd());
      });

      child.on("error", (error) => {
        console.error("[Server Process Error]", error);

        if (this.process === child) {
          this.process = null;
          this.setStatus("error");
        }
      });

      child.on("exit", (code, signal) => {
        console.log(`[Next.js] Exited. Code: ${code}, Signal: ${signal}`);

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
        const response = await fetch(`${this.baseUrl}/api/health`, {
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
}
