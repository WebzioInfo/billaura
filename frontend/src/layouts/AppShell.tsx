import { Outlet } from "react-router-dom";
import { SidebarLayout } from "./SidebarLayout";
import { TopNavigation } from "./TopNavigation";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { HelpDrawer } from "@/components/ui/HelpDrawer";
import { useGlobalKeyboardShortcuts } from "@/hooks/useGlobalKeyboardShortcuts";

export function AppShell() {
  useGlobalKeyboardShortcuts();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNavigation />
      <SidebarLayout>
        <Outlet />
      </SidebarLayout>
      <CommandPalette />
      <HelpDrawer />
    </div>
  );
}
