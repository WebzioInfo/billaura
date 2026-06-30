import { PropsWithChildren } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { queryClient } from "@/services/query/queryClient";
import { SessionProvider } from "@/features/auth/providers/SessionProvider";
import { ThemeProvider } from "@/features/theme/ThemeProvider";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SessionProvider>
          {children}
          <Toaster richColors closeButton position="top-right" />
        </SessionProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
