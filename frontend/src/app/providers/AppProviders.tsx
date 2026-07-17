import { PropsWithChildren } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from 'react-hot-toast';
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
              position="top-right"
              toastOptions={{
                className: 'flex items-start w-full max-w-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-lg rounded-lg px-4 py-3 text-sm text-slate-800 dark:text-slate-100',
                duration: 4000,
              }} 
            />
          </SessionProvider>
        </NetworkProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
