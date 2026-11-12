import { AppConfig } from "@/types";
import { app } from "electron";
import path from "node:path";
import fs from "node:fs/promises";

export class ConfigStore {
  private configPath = path.join(app.getPath("userData"), "config.json");

  getConfigPath() {
    return this.configPath;
  }

  getUserDataPath() {
    return app.getPath("userData");
  }

  private getDefaultConfig(): AppConfig {
    const dataRoot =
      process.platform === "win32"
        ? path.join(
            process.env.ProgramData ?? "C:\\ProgramData",
            "Crownix",
            "StudentManagement",
          )
        : path.join(app.getPath("userData"), "data");

    return {
      version: 1,
      mode: "client",
      port: 3223,
      databasePath: path.join(dataRoot, "database", "student-management.db"),
      backupDirectory: path.join(dataRoot, "backups"),
      maxBackups: 5,
      lastBackupAt: null,
    };
  }

  private validateConfig(value: unknown): AppConfig | null {
    if (!value || typeof value !== "object") return null;

    const config = value as Partial<AppConfig>;

    if (config.version !== 1) return null;

    if (config.mode !== "server" && config.mode !== "client") {
      return null;
    }

    if (
      typeof config.port !== "number" ||
      !Number.isInteger(config.port) ||
      config.port < 1 ||
      config.port > 65535
    ) {
      return null;
    }

    if (
      typeof config.databasePath !== "string" ||
      !path.isAbsolute(config.databasePath)
    ) {
      return null;
    }

    if (
      typeof config.backupDirectory !== "string" ||
      !path.isAbsolute(config.backupDirectory)
    ) {
      return null;
    }

    if (
      typeof config.maxBackups !== "number" ||
      !Number.isInteger(config.maxBackups) ||
      config.maxBackups < 1
    ) {
      return null;
    }

    return {
      version: 1,
      mode: config.mode,
      port: config.port,
      databasePath: path.resolve(config.databasePath),
      backupDirectory: path.resolve(config.backupDirectory),
      maxBackups: config.maxBackups,
      lastBackupAt:
        typeof config.lastBackupAt === "string" ? config.lastBackupAt : null,
    };
  }

  async load(): Promise<AppConfig> {
    await fs.mkdir(path.dirname(this.configPath), { recursive: true });

    try {
      const raw = await fs.readFile(this.configPath, "utf8");
      const parsed: unknown = JSON.parse(raw);
      const config = this.validateConfig(parsed);

      if (config) return config;

      // Preserve an invalid configuration for inspection.
      await fs.rename(
        this.configPath,
        `${this.configPath}.invalid-${Date.now()}`,
      );
    } catch (error) {
      // ENOENT means first launch. Other errors are handled below.
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error("Could not load application config:", error);
      }
    }

    const defaultConfig = this.getDefaultConfig();
    await this.save(defaultConfig);

    return defaultConfig;
  }

  async save(config: AppConfig): Promise<void> {
    const validated = this.validateConfig(config);

    if (!validated) {
      throw new Error("Invalid application configuration.");
    }

    await fs.mkdir(path.dirname(this.configPath), { recursive: true });

    const temporaryPath = `${this.configPath}.tmp`;

    await fs.writeFile(
      temporaryPath,
      JSON.stringify(validated, null, 2),
      "utf8",
    );

    await fs.rename(temporaryPath, this.configPath);
  }

  async update(
    current: AppConfig,
    changes: Partial<AppConfig>,
  ): Promise<AppConfig> {
    const next: AppConfig = {
      ...current,
      ...changes,
      version: 1,
    };

    await this.save(next);

    return next;
  }
}
