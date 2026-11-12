export type ServerStatus =
  | "stopped"
  | "starting"
  | "running"
  | "stopping"
  | "error";

export type ServerMode = "server" | "client";
