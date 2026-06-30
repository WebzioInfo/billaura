import { PropsWithChildren } from "react";

export function SidebarLayout({ children }: PropsWithChildren) {
  return (
    <div className="grid min-h-[calc(100vh-56px)] grid-cols-[240px_1fr]">
      <aside className="border-r border-border bg-surface px-4 py-5">
        <nav className="space-y-1 text-sm">
          <div className="font-medium text-foreground">Foundation</div>
          <div className="text-muted-foreground">No migrated modules yet</div>
        </nav>
      </aside>
      <main className="min-w-0 p-6">{children}</main>
    </div>
  );
}
