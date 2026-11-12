import { ServerStatus } from "@/types";

declare global {
  interface Window {
    api: {
      server: {
        start: () => Promise<ServerStatus>;
        stop: () => Promise<ServerStatus>;
        restart: () => Promise<ServerStatus>;
        getStatus: () => Promise<ServerStatus>;

        onStatusChange: (
          callback: (status: ServerStatus) => void,
        ) => () => void;
      };
    };
  }
}
