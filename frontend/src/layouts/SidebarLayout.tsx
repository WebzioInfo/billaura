import { PropsWithChildren } from "react";
import { useRecentItemsStore } from "@/store/recentItemsStore";
import { useFavoritesStore } from "@/store/favoritesStore";
import { useNavigate } from "react-router-dom";
import { Star, Clock, FileText, Users, Building2, BookOpen, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

export function SidebarLayout({ children }: PropsWithChildren) {
  const recentItems = useRecentItemsStore((state) => state.items);
  const favorites = useFavoritesStore((state) => state.items);
  const navigate = useNavigate();

  const getIcon = (type: string) => {
    switch (type) {
      case 'Customer': return <Users className="w-3.5 h-3.5" />;
      case 'Vendor': return <Building2 className="w-3.5 h-3.5" />;
      case 'Invoice': return <FileText className="w-3.5 h-3.5" />;
      case 'Ledger': return <BookOpen className="w-3.5 h-3.5" />;
      default: return <LayoutDashboard className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="grid min-h-[calc(100vh-56px)] grid-cols-[240px_1fr]">
      <aside className="border-r border-border bg-surface px-4 py-5 flex flex-col gap-6 overflow-y-auto">
        <nav className="space-y-1 text-sm">
          <div className="font-medium text-foreground mb-2 px-2 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> Favorites
          </div>
          {favorites.length === 0 ? (
            <div className="text-muted-foreground/60 text-xs px-2 italic">No favorites yet</div>
          ) : (
            favorites.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(item.path)}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded-md cursor-pointer text-muted-foreground hover:text-foreground transition-colors group"
              >
                <div className="opacity-70 group-hover:opacity-100">{getIcon(item.type)}</div>
                <div className="truncate flex-1">{item.title}</div>
              </div>
            ))
          )}
        </nav>

        <nav className="space-y-1 text-sm">
          <div className="font-medium text-foreground mb-2 px-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" /> Recent
          </div>
          {recentItems.length === 0 ? (
            <div className="text-muted-foreground/60 text-xs px-2 italic">No recent items</div>
          ) : (
            recentItems.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(item.path)}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded-md cursor-pointer text-muted-foreground hover:text-foreground transition-colors group"
              >
                <div className="opacity-70 group-hover:opacity-100">{getIcon(item.type)}</div>
                <div className="truncate flex-1">{item.title}</div>
              </div>
            ))
          )}
        </nav>
      </aside>
      <main className="min-w-0 p-6 flex flex-col">{children}</main>
    </div>
  );
}
