import { RouterProvider } from "react-router-dom";
import { AppProviders } from "./providers/AppProviders";
import { router } from "./router";

import { ReloadPrompt } from "../components/pwa/ReloadPrompt";

export function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
      <ReloadPrompt />
    </AppProviders>
  );
}
