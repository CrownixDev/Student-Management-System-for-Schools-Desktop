import { spawn } from "node:child_process";
import { app } from "electron";
import path from "node:path";
import fs from "node:fs/promises";

type PrismaLog = {
  source: "stdout" | "stderr";
  message: string;
};

export class PrismaRunner {
  private resourcesPath = app.isPackaged
    ? process.resourcesPath
    : path.resolve(app.getAppPath(), "resources");

  private prismaDirectory = path.join(this.resourcesPath, "prisma");
  private configPath = path.join(this.prismaDirectory, "prisma7.config.ts");
  private nodePath = path.join(
    this.resourcesPath,
    "runtime",
    process.platform === "win32" ? "node.exe" : "node",
  );

  private async getCliPath(): Promise<string> {
    const packageDirectory = path.join(
      this.prismaDirectory,
      "node_modules",
      "prisma",
    );

    const packageJson = JSON.parse(
      await fs.readFile(path.join(packageDirectory, "package.json"), "utf8"),
    );

    const bin =
      typeof packageJson.bin === "string"
        ? packageJson.bin
        : packageJson.bin?.prisma;

    if (!bin) {
      throw new Error("Prisma CLI executable was not found.");
    }

    return path.resolve(packageDirectory, bin);
  }

  private databaseUrl(databasePath: string): string {
    return `file:${path.resolve(databasePath).replace(/\\/g, "/")}`;
  }

  async run(
    args: string[],
    databasePath: string,
    stdin?: string,
    onLog?: (log: PrismaLog) => void,
  ): Promise<void> {
    const cliPath = await this.getCliPath();

    const child = spawn(
      this.nodePath,
      [cliPath, ...args, "--config", this.configPath],
      {
        cwd: this.prismaDirectory,
        env: {
          ...process.env,
          DATABASE_URL: this.databaseUrl(databasePath),
        },
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
      },
    );

    let stdout = "";
    let stderr = "";

    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");

    child.stdout?.on("data", (chunk: string) => {
      stdout += chunk;
      onLog?.({ source: "stdout", message: chunk });
    });

    child.stderr?.on("data", (chunk: string) => {
      stderr += chunk;
      onLog?.({ source: "stderr", message: chunk });
    });

    child.stdin?.end(stdin ?? "");

    await new Promise<void>((resolve, reject) => {
      child.once("error", reject);

      child.once("close", (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(
          new Error(
            `Prisma command failed (exit code ${code}).\n` +
              `${stderr || stdout}`,
          ),
        );
      });
    });
  }

  async deploy(databasePath: string, onLog?: (log: PrismaLog) => void) {
    await fs.mkdir(path.dirname(databasePath), {
      recursive: true,
    });

    await this.run(["migrate", "deploy"], databasePath, undefined, onLog);
  }

  async snapshot(
    sourceDatabasePath: string,
    destinationPath: string,
    onLog?: (log: PrismaLog) => void,
  ) {
    await fs.mkdir(path.dirname(destinationPath), {
      recursive: true,
    });

    // VACUUM INTO requires the destination not to exist.
    try {
      await fs.access(destinationPath);
      throw new Error("The snapshot destination already exists.");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    const sqlPath = path
      .resolve(destinationPath)
      .replace(/\\/g, "/")
      .replace(/'/g, "''");

    await this.run(
      ["db", "execute", "--stdin"],
      sourceDatabasePath,
      `VACUUM INTO '${sqlPath}';`,
      onLog,
    );
  }
}
