import { CONFIG_FILE_NAME } from "@/constraints";
import { app } from "electron";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

interface MigrationState {
  hash: string;
  lastSuccessfulAt: string;
}

export class MigrationStateStore {
  private statePath = path.join(
    app.getPath("userData"),
    CONFIG_FILE_NAME,
    "migration-state.json",
  );

  constructor(private migrationsDirectory: string) {}

  async calculateHash(): Promise<string> {
    const hash = crypto.createHash("sha256");

    async function visit(directory: string) {
      const entries = await fs.readdir(directory, {
        withFileTypes: true,
      });

      entries.sort((a, b) => a.name.localeCompare(b.name));

      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
          hash.update(`DIR:${entry.name}\n`);
          await visit(fullPath);
        } else if (entry.isFile()) {
          hash.update(`FILE:${entry.name}\n`);
          hash.update(await fs.readFile(fullPath));
        }
      }
    }

    try {
      await visit(this.migrationsDirectory);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return "";
      }
      throw error;
    }

    return hash.digest("hex");
  }

  async getSavedHash(): Promise<string | null> {
    try {
      const raw = await fs.readFile(this.statePath, "utf8");
      const state = JSON.parse(raw) as MigrationState;

      return state.hash;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }

      throw error;
    }
  }

  async saveHash(hash: string) {
    const state: MigrationState = {
      hash,
      lastSuccessfulAt: new Date().toISOString(),
    };

    await fs.mkdir(path.dirname(this.statePath), {
      recursive: true,
    });

    const temporaryPath = `${this.statePath}.tmp`;

    await fs.writeFile(temporaryPath, JSON.stringify(state, null, 2), "utf8");

    await fs.rename(temporaryPath, this.statePath);
  }
}
