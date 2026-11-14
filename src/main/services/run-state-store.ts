import { CONFIG_FILE_NAME } from "@/constraints";
import { app } from "electron";
import fs from "node:fs/promises";
import path from "node:path";

export interface RunMarker {
  pid: number;
  startedAt: string;
  databasePath: string;
}

export class RunStateStore {
  private markerPath = path.join(
    app.getPath("userData"),
    CONFIG_FILE_NAME,
    "server-run.json",
  );

  async getPreviousRun(): Promise<RunMarker | null> {
    try {
      const raw = await fs.readFile(this.markerPath, "utf8");
      return JSON.parse(raw) as RunMarker;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }

      throw error;
    }
  }

  async markRunning(databasePath: string) {
    await fs.mkdir(path.dirname(this.markerPath), {
      recursive: true,
    });

    const marker: RunMarker = {
      pid: process.pid,
      startedAt: new Date().toISOString(),
      databasePath,
    };

    const temporaryPath = `${this.markerPath}.tmp`;

    await fs.writeFile(temporaryPath, JSON.stringify(marker, null, 2), "utf8");

    await fs.rename(temporaryPath, this.markerPath);
  }

  async markCleanStop() {
    try {
      await fs.unlink(this.markerPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }
}
