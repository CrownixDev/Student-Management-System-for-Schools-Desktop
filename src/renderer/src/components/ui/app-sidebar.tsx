import {
  PageSidebar,
  PageSidebarContent,
  PageSidebarFooter,
} from "./page/page-sidebar";
import {
  SidebarListItem,
  SidebarListItemContent,
  SidebarListItemIcon,
  SidebarListItemTitle,
} from "./page/sidebar-list-item";
import {
  CircleQuestionMarkIcon,
  DatabaseIcon,
  FileTextIcon,
  LucideIcon,
  RefreshCcwIcon,
  ServerIcon,
  SettingsIcon,
} from "lucide-react";

export type SidebarItem =
  | "server"
  | "log"
  | "database"
  | "settings"
  | "update"
  | "help";

export default function AppSidebar({
  value,
  onValueChange,
}: {
  value: SidebarItem;
  onValueChange: (value: SidebarItem) => void;
}) {
  const sidebarItems = [
    { icon: ServerIcon, label: "Server", value: "server" },
    { icon: FileTextIcon, label: "Logs", value: "log" },
    { icon: DatabaseIcon, label: "Database", value: "database" },
    { icon: SettingsIcon, label: "Settings", value: "settings" },
    { icon: RefreshCcwIcon, label: "Update", value: "update" },
    { icon: CircleQuestionMarkIcon, label: "Help", value: "help" },
  ] satisfies { icon: LucideIcon; label: string; value: SidebarItem }[];

  return (
    <PageSidebar>
      <PageSidebarContent>
        {sidebarItems.map((item) => (
          <SidebarListItem
            key={item.label}
            onClick={() => onValueChange(item.value)}
            isActive={item.value === value}
          >
            <SidebarListItemIcon>
              <item.icon className="size-4" />
            </SidebarListItemIcon>
            <SidebarListItemContent>
              <SidebarListItemTitle>{item.label}</SidebarListItemTitle>
            </SidebarListItemContent>
          </SidebarListItem>
        ))}
      </PageSidebarContent>

      <PageSidebarFooter>
        <div className="px-2 py-1 text-center">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground/70 uppercase">
            A Project by CROWNIX
          </p>
        </div>
      </PageSidebarFooter>
    </PageSidebar>
  );
}
