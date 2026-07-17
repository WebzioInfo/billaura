import { PropsWithChildren } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { queryClient } from "@/services/query/queryClient";
import { SessionProvider } from "@/features/auth/providers/SessionProvider";
import { ThemeProvider } from "@/features/theme/ThemeProvider";
import { NetworkProvider } from "@/providers/NetworkProvider";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <NetworkProvider>
          <SessionProvider>
            {children}
            <Toaster 
              position="top-center" 
              toastOptions={{
                className: 'group flex items-start gap-3 w-full bg-white/70 dark:bg-black/70 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 shadow-xl shadow-slate-200/20 dark:shadow-black/40 rounded-xl px-4 py-3',
                descriptionClassName: 'text-[13px] text-slate-500 dark:text-slate-400 mt-0.5',
                
                
                classNames: {
                  error: 'bg-red-50/80 dark:bg-red-950/30 border-red-200/50 dark:border-red-900/30 text-red-700 dark:text-red-400',
                  success: 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200/50 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400',
                  warning: 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200/50 dark:border-amber-900/30 text-amber-700 dark:text-amber-400',
                  info: 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-200/50 dark:border-blue-900/30 text-blue-700 dark:text-blue-400',
                }
              }} 
            />
          </SessionProvider>
        </NetworkProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
