import { app, shell } from "electron";
import { gt, valid } from "semver";

const OWNER = "CrownixDev";
const REPOSITORY = "Student-Management-System-for-Schools-Desktop";

const RELEASE_API = `https://api.github.com/repos/${OWNER}/${REPOSITORY}/releases/latest`;

interface GitHubReleaseAsset {
  name: string;
  size: number;
  browser_download_url: string;
}

interface GitHubRelease {
  tag_name: string;
  name: string | null;
  body: string | null;
  html_url: string;
  published_at: string | null;
  prerelease: boolean;
  draft: boolean;
  assets: GitHubReleaseAsset[];
}

let checkedReleaseUrl: string | null = null;

export async function checkForUpdates() {
  const response = await fetch(RELEASE_API, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2026-03-10",
      "User-Agent": "Crownix-Student-Management",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (response.status === 404) {
    throw new Error("No published release was found.");
  }

  if (response.status === 403) {
    throw new Error("GitHub API rate limit reached. Please try again later.");
  }

  if (!response.ok) {
    throw new Error(`GitHub returned an error (${response.status}).`);
  }

  const release = (await response.json()) as GitHubRelease;

  if (release.draft || release.prerelease) {
    throw new Error("The returned release is not a stable release.");
  }

  const currentVersion = valid(app.getVersion());

  const latestVersion = valid(release.tag_name.replace(/^v/i, ""));

  if (!currentVersion || !latestVersion) {
    throw new Error("Invalid application or release version.");
  }

  const updateAvailable = gt(latestVersion, currentVersion);

  // Use only the GitHub release URL returned by the API.
  const releaseUrl = new URL(release.html_url);

  if (
    releaseUrl.protocol !== "https:" ||
    releaseUrl.hostname !== "github.com"
  ) {
    throw new Error("Invalid GitHub release URL.");
  }

  checkedReleaseUrl = releaseUrl.href;

  const installer = release.assets.find(
    (asset) =>
      asset.name.toLowerCase().endsWith(".exe") &&
      /setup|installer/i.test(asset.name),
  );

  return {
    currentVersion,
    latestVersion,
    updateAvailable,

    releaseName: release.name ?? `Version ${latestVersion}`,
    releaseNotes: release.body ?? "",
    publishedAt: release.published_at,

    releaseUrl: releaseUrl.href,

    installer: installer
      ? {
          name: installer.name,
          size: installer.size,
          downloadUrl: installer.browser_download_url,
        }
      : null,
  };
}

export async function openCheckedRelease() {
  if (!checkedReleaseUrl) {
    throw new Error("Check for updates before opening a release.");
  }

  await shell.openExternal(checkedReleaseUrl);
}
