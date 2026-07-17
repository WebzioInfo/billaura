import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "./styles/globals.css";


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Remove the global splash screen smoothly after app initialization
const splash = document.getElementById("splash");
if (splash) {
  setTimeout(() => {
    splash.classList.add("fade-out");
    setTimeout(() => {
      splash.remove();
    }, 300); // Wait for CSS transition (0.3s)
  }, 100);
}
