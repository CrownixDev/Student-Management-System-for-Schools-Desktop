import { useState } from "react";
import AppSidebar, { SidebarItem } from "./components/ui/app-sidebar";
import { PageLayout } from "./components/ui/page/page-layout";
import { ThemeProvider } from "./components/providers/theme-provider";
import ServerPage from "./pages/server";
import LogsPage from "./pages/logs";
import DatabasePage from "./pages/database";
import SettingsPage from "./pages/settings";

function App(): React.JSX.Element {
  const [sidebarItem, setSidebarItem] = useState<SidebarItem>("server");

  function renderPage(): React.ReactNode {
    switch (sidebarItem) {
      case "server":
        return <ServerPage />;
      case "log":
        return <LogsPage />;
      case "database":
        return <DatabasePage />;
      case "settings":
        return <SettingsPage />;

      default:
        <ServerPage />;
    }
    return null;
  }

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <PageLayout
        sidebar={
          <AppSidebar value={sidebarItem} onValueChange={setSidebarItem} />
        }
      >
        {renderPage()}
      </PageLayout>
    </ThemeProvider>
  );
}

export default App;
