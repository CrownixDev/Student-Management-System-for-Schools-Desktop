import { marked } from "marked";
import { useState } from "react";
import {
  PageLayoutContent,
  PageLayoutHeader,
} from "@renderer/components/ui/page/page-layout";
import { Button } from "@renderer/components/shadcn/button";
import { Card, CardContent } from "@renderer/components/shadcn/card";
import { ScrollArea } from "@renderer/components/shadcn/scroll-area";
import { getErrorMessage } from "@renderer/lib/utils";
import {
  CheckCircle2Icon,
  DownloadIcon,
  ExternalLinkIcon,
  Loader2Icon,
  RefreshCcwIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useUpdateStore } from "@renderer/store/update-store";

function formatPublishedDate(date: string | null) {
  if (!date) return null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(date),
  );
}

export default function UpdatePage() {
  const { fetchedUpdate, setFetchedUpdate } = useUpdateStore();
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckForUpdates = async () => {
    try {
      setIsChecking(true);
      setError(null);
      setFetchedUpdate(await window.api.update.check());
    } catch (err: unknown) {
      setFetchedUpdate(null);
      setError(getErrorMessage(err, "Unable to check for updates."));
    } finally {
      setIsChecking(false);
    }
  };

  const handleOpenRelease = async () => {
    try {
      await window.api.update.openRelease();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Unable to open the download page."));
    }
  };

  const releaseNotesHtml = fetchedUpdate?.releaseNotes
    ? marked.parse(fetchedUpdate.releaseNotes, { async: false })
    : "<p>No release notes were provided for this version.</p>";

  return (
    <div className="flex h-full w-full flex-col">
      <PageLayoutHeader className="flex shrink-0 items-center justify-between border-b border-border/60 px-8 py-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Updates
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Check for the latest improvements and fixes.
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleCheckForUpdates}
          disabled={isChecking || !!fetchedUpdate}
          className="cursor-pointer gap-1.5"
        >
          {isChecking && <Loader2Icon className="size-3.5 animate-spin" />}
          {isChecking ? "Checking..." : "Check for updates"}
        </Button>
      </PageLayoutHeader>

      <PageLayoutContent className="flex-1 p-8">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
          {!fetchedUpdate && !error && !isChecking && (
            <Card className="border border-border/80 bg-card/60 shadow-xs">
              <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
                <RefreshCcwIcon className="size-8 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold">Check for updates</p>
                </div>
              </CardContent>
            </Card>
          )}

          {isChecking && (
            <Card className="border border-border/80 bg-card/60 shadow-xs">
              <CardContent className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
                <Loader2Icon className="size-4 animate-spin" />
                Checking for the latest version...
              </CardContent>
            </Card>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm"
            >
              <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div>
                <p className="font-semibold text-foreground">
                  Couldn&apos;t check for updates
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {error}
                </p>
              </div>
            </div>
          )}

          {fetchedUpdate && !fetchedUpdate.updateAvailable && (
            <Card className="border border-border/80 bg-card/60 shadow-xs">
              <CardContent className="flex items-start gap-3 p-6">
                <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-emerald-500" />
                <div>
                  <p className="text-sm font-semibold">
                    You&apos;re up to date
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Currently running version {fetchedUpdate.currentVersion}.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {fetchedUpdate?.updateAvailable && (
            <Card className="border border-border/80 bg-card/60 shadow-xs">
              <CardContent className="flex flex-col gap-5 p-6">
                <div className="flex items-start gap-3">
                  <DownloadIcon className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">Update available</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      A newer version is ready to download.
                    </p>
                    {formatPublishedDate(fetchedUpdate.publishedAt) && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Published{" "}
                        {formatPublishedDate(fetchedUpdate.publishedAt)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 border-y border-border/60 py-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                      Installed version
                    </p>
                    <p className="mt-1 font-mono text-sm font-medium">
                      {fetchedUpdate.currentVersion}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                      Latest version
                    </p>
                    <p className="mt-1 font-mono text-sm font-medium">
                      {fetchedUpdate.latestVersion}
                    </p>
                  </div>
                </div>
                <section aria-labelledby="release-notes-heading">
                  <ScrollArea className="h-64 rounded-lg border border-border/60 bg-muted/20">
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none p-4 text-md prose-headings:mt-0 prose-headings:text-sm prose-p:leading-relaxed prose-li:my-0.5"
                      dangerouslySetInnerHTML={{ __html: releaseNotesHtml }}
                    />
                  </ScrollArea>
                </section>
                <Button
                  variant="secondary"
                  onClick={handleOpenRelease}
                  className="w-full cursor-pointer gap-1.5"
                >
                  <ExternalLinkIcon className="size-4" />
                  View download page
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </PageLayoutContent>
    </div>
  );
}
