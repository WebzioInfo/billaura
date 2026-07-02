import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "./styles/globals.css";

import { env } from "./config/env";

console.groupCollapsed('[ENVIRONMENT]');
console.log(`NODE_ENV: ${import.meta.env.NODE_ENV || 'development'}`);
console.log(`MODE: ${import.meta.env.MODE}`);
console.log(`Current Origin: ${window.location.origin}`);
console.log(`Current URL: ${window.location.href}`);
console.log(`VITE_API_URL: ${import.meta.env.VITE_API_URL}`);
console.log(`Resolved Backend URL: ${env.API_BASE_URL}`);
console.log(`API Prefix: /api`);
console.groupEnd();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
