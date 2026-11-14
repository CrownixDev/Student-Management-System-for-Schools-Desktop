export interface UpdateCheckResult {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;

  releaseName: string;
  releaseNotes: string;
  publishedAt: string | null;

  releaseUrl: string;

  installer: {
    name: string;
    size: number;
    downloadUrl: string;
  } | null;
}
