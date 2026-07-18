import { RouterProvider } from "react-router-dom";
import { AppProviders } from "./providers/AppProviders";
import { router } from "./router";

import { ReloadPrompt } from "../shared/components/pwa/ReloadPrompt";

import { SessionRestorationGuard } from "../features/auth/components/SessionRestorationGuard";

export function App() {
  return (
    <AppProviders>
      <SessionRestorationGuard>
        <RouterProvider router={router} />
      </SessionRestorationGuard>
      <ReloadPrompt />
    </AppProviders>
  );
}
