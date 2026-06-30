import { Outlet } from "react-router-dom";
import { SidebarLayout } from "./SidebarLayout";
import { TopNavigation } from "./TopNavigation";

export function AppShell() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNavigation />
      <SidebarLayout>
        <Outlet />
      </SidebarLayout>
    </div>
  );
}
