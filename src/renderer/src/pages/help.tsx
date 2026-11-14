import {
  PageLayoutContent,
  PageLayoutHeader,
} from "@renderer/components/ui/page/page-layout";

export default function HelpPage() {
  return (
    <div className="flex h-full w-full flex-col">
      <PageLayoutHeader className="shrink-0 border-b border-border/60 px-8 py-5">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Help
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Known issues and the safest steps to resolve them.
        </p>
      </PageLayoutHeader>
      <PageLayoutContent className="flex-1 p-8">
        <div className="flex w-full h-full items-center justify-center">
          You can do it 👍
        </div>
      </PageLayoutContent>
    </div>
  );
}
