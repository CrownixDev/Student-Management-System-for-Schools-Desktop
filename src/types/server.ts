import { AppMode } from "./app-config";

export type ServerStatus =
  | "stopped"
  | "starting"
  | "running"
  | "stopping"
  | "error";

export type ServerMode = "server" | "client";

export interface ServerInfo {
  mode: AppMode;
  port: number;
  status: ServerStatus;
  localUrl: string;
  usableUrls: string[];
}

export interface ServerLog {
  id: string;
  timestamp: string;
  level: "info" | "error";
  source: "stdout" | "stderr";
  message: string;
}
