import os from "node:os";

export function getUsableUrls(
  mode: "server" | "client",
  port: number,
): string[] {
  if (mode === "client") {
    return [`http://127.0.0.1:${port}`];
  }

  const interfaces = os.networkInterfaces();

  const addresses = Object.values(interfaces)
    .flat()
    .filter((item) => {
      if (!item || item.internal) return false;
      return item.family === "IPv4";
    })
    .map((item) => item?.address);

  return [...new Set(addresses)].map((address) => `http://${address}:${port}`);
}
