export { cn } from "cn";

export function getErrorMessage(err: unknown, fallback = "An unexpected error occurred."): string {
  if (!err) return fallback;
  let raw = "";
  if (typeof err === "string") {
    raw = err;
  } else if (err instanceof Error) {
    raw = err.message;
  } else if (typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    raw = (err as { message: string }).message;
  } else {
    raw = String(err);
  }

  // Remove Electron's IPC wrapper prefixes, e.g.:
  // "Error invoking remote method '...': Error: Actual message"
  // or "Error: Actual message"
  return raw
    .replace(/^Error invoking remote method '[^']+':\s*/i, "")
    .replace(/^Error:\s*/i, "")
    .trim() || fallback;
}

