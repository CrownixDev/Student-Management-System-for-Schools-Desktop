export function PageSidebar({ children }: { children: React.ReactNode }) {
  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar/80 backdrop-blur-xs select-none">
      {children}
    </aside>
  );
}

export function PageSidebarHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="shrink-0 p-4 pb-2 border-b border-sidebar-border/60">{children}</div>;
}

export function PageSidebarContent({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 space-y-1">{children}</div>;
}

export function PageSidebarFooter({ children }: { children: React.ReactNode }) {
  return <div className="shrink-0 p-3.5 border-t border-sidebar-border/60">{children}</div>;
}
