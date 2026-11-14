import { BrowserWindow, shell } from "electron";

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function protectSystemWindow(
  window: BrowserWindow,
  baseUrl: string,
) {
  const internalOrigin = new URL(baseUrl).origin;

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (!isHttpUrl(url)) {
      return { action: "deny" };
    }

    const target = new URL(url);

    if (target.origin === internalOrigin) {
      // Internal target=_blank or Ctrl-click:
      // navigate the existing System Window.
      void window.loadURL(url);
    } else {
      // External links use the default browser.
      void shell.openExternal(url).catch(console.error);
    }

    return { action: "deny" };
  });

  window.webContents.on("will-navigate", (event, url) => {
    if (!isHttpUrl(url)) {
      return;
    }

    const target = new URL(url);

    if (target.origin !== internalOrigin) {
      event.preventDefault();

      void shell.openExternal(url).catch(console.error);
    }
  });
}

export function protectManagerWindow(window: BrowserWindow) {
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isHttpUrl(url)) {
      void shell.openExternal(url).catch(console.error);
    }
    return { action: "deny" };
  });

  window.webContents.on("will-navigate", (event, url) => {
    if (isHttpUrl(url)) {
      const target = new URL(url);
      const isDevRenderer =
        process.env.ELECTRON_RENDERER_URL &&
        target.origin === new URL(process.env.ELECTRON_RENDERER_URL).origin;

      if (!isDevRenderer) {
        event.preventDefault();
        void shell.openExternal(url).catch(console.error);
      }
    }
  });
}
