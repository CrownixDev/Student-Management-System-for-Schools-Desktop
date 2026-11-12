import { cn } from "cn";

interface PageLayoutProps extends React.ComponentProps<"div"> {
  sidebar?: React.ReactNode;
}

export function PageLayout({ sidebar, children, className, ...props }: PageLayoutProps) {
  return (
    <div className={cn("flex h-svh min-h-0 w-full min-w-0 overflow-hidden", className)} {...props}>
      {sidebar != null && <div className="h-full min-h-0 shrink-0 overflow-hidden">{sidebar}</div>}
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}

export function PageLayoutHeader({ children, className, ...props }: React.ComponentProps<"header">) {
  return (
    <header className={cn("shrink-0", className)} {...props}>
      {children}
    </header>
  );
}

export function PageLayoutContent({ children, className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain", className)} {...props}>
      {children}
    </div>
  );
}

export function PageLayoutFooter({ children, className, ...props }: React.ComponentProps<"footer">) {
  return (
    <footer className={cn("shrink-0", className)} {...props}>
      {children}
    </footer>
  );
}
