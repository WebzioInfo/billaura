import { Outlet } from "react-router-dom";
import { SidebarLayout } from "./SidebarLayout";
import { TopNavigation } from "./TopNavigation";
import { CommandPalette } from "@/shared/components/ui/CommandPalette";
import { HelpDrawer } from "@/shared/components/ui/HelpDrawer";
import { useGlobalKeyboardShortcuts } from "@/shared/hooks/useGlobalKeyboardShortcuts";

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

