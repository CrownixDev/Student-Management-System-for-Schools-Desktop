import { cn } from "cn";

type SidebarListItemProps = React.ComponentPropsWithoutRef<"button"> & {
  isActive?: boolean;
};

export function SidebarListItem({
  isActive = false,
  className,
  type = "button",
  ...props
}: SidebarListItemProps) {
  return (
    <button
      type={type}
      data-active={isActive}
      className={cn(
        "group flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
        "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-foreground data-[active=true]:font-semibold shadow-xs data-[active=false]:shadow-none",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarListItemIcon({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"span">) {
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-md transition-colors",
        "text-muted-foreground group-hover:text-sidebar-foreground group-data-[active=true]:text-sidebar-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarListItemContent({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"span">) {
  return (
    <span className={cn("min-w-0 flex-1 truncate", className)} {...props} />
  );
}

export function SidebarListItemTitle({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"span">) {
  return (
    <span
      className={cn("block truncate text-sm leading-none", className)}
      {...props}
    />
  );
}

export function SidebarListItemDescription({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"span">) {
  return (
    <span
      className={cn(
        "block truncate text-xs text-muted-foreground mt-0.5",
        className,
      )}
      {...props}
    />
  );
}
