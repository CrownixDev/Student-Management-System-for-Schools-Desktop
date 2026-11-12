import { useEffect, useState } from "react";
import {
  PageLayoutContent,
  PageLayoutHeader,
} from "@renderer/components/ui/page/page-layout";
import { Card, CardContent } from "@renderer/components/shadcn/card";
import {
  RadioGroup,
  RadioGroupItem,
} from "@renderer/components/shadcn/radio-group";
import { ServerIcon, MonitorIcon, CheckCircle2Icon } from "lucide-react";
import { cn } from "cn";
import type { AppMode } from "../../../types/app-config";

export default function SettingsPage() {
  const [mode, setMode] = useState<AppMode>("client");
  const [isUpdating, setIsUpdating] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    window.api.settings
      .getMode()
      .then((currentMode) => {
        if (currentMode) {
          setMode(currentMode);
        }
      })
      .catch((err) => {
        console.error("Failed to load app mode:", err);
      });
  }, []);

  const handleModeChange = async (value: unknown) => {
    const newMode = String(value) as AppMode;
    if (newMode !== "server" && newMode !== "client") return;
    setMode(newMode);
    try {
      setIsUpdating(true);
      await window.api.settings.setMode(newMode);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error("Failed to update app mode:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col">
      <PageLayoutHeader className="border-b border-border/60 px-8 py-5 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Settings
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure application startup parameters and runtime preferences
          </p>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-500 animate-in fade-in">
            <CheckCircle2Icon className="size-4" />
            <span>Settings saved</span>
          </div>
        )}
      </PageLayoutHeader>

      <PageLayoutContent className="flex-1 p-8">
        <div className="mx-auto max-w-2xl flex flex-col gap-6">
          <Card className="border border-border/80 bg-card/60 backdrop-blur-xs shadow-xs">
            <CardContent className="p-6">
              <div className="mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  Opening Mode
                </span>
                <p className="text-xs text-muted-foreground/80 mt-1">
                  Choose how the application launches when opened on this
                  machine.
                </p>
              </div>

              <RadioGroup
                value={mode}
                onValueChange={handleModeChange}
                disabled={isUpdating}
                className="grid grid-cols-1 gap-3 pt-2"
              >
                {/* Client Mode Option */}
                <label
                  htmlFor="mode-client"
                  className={cn(
                    "flex items-start gap-4 rounded-xl border p-4 transition-all cursor-pointer select-none",
                    mode === "client"
                      ? "border-primary/50 bg-primary/5 shadow-xs"
                      : "border-border/60 hover:border-border hover:bg-muted/30",
                  )}
                >
                  <RadioGroupItem
                    value="client"
                    id="mode-client"
                    className="mt-0.5 shrink-0 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <MonitorIcon className="size-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">
                        Client Mode
                      </span>
                      <span className="rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[10px] font-semibold">
                        Default
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Launches the full interactive student management desktop
                      window directly for daily staff operations and
                      administration.
                    </p>
                  </div>
                </label>

                {/* Server Mode Option */}
                <label
                  htmlFor="mode-server"
                  className={cn(
                    "flex items-start gap-4 rounded-xl border p-4 transition-all cursor-pointer select-none",
                    mode === "server"
                      ? "border-primary/50 bg-primary/5 shadow-xs"
                      : "border-border/60 hover:border-border hover:bg-muted/30",
                  )}
                >
                  <RadioGroupItem
                    value="server"
                    id="mode-server"
                    className="mt-0.5 shrink-0 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <ServerIcon className="size-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">
                        Server Mode
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Runs the application primarily as a headless or dedicated
                      host. Opens directly into this server management control
                      dashboard.
                    </p>
                  </div>
                </label>
              </RadioGroup>
            </CardContent>
          </Card>
        </div>
      </PageLayoutContent>
    </div>
  );
}
