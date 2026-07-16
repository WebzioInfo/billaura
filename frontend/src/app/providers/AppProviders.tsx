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
            <Toaster richColors closeButton position="top-right" />
          </SessionProvider>
        </NetworkProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
