import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router";
import "./index.css";
import { TRPCProvider } from "@/providers/trpc";
import { NotificationProvider } from "@/providers/notification";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import App from "./App.tsx";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

// Use HashRouter for static hosts (e.g. GitHub Pages) where server-side SPA
// fallback is not available. Default to BrowserRouter for integrated deployments.
const Router =
  import.meta.env.VITE_ROUTER_TYPE === "hash" ? HashRouter : BrowserRouter;

createRoot(rootElement).render(
  <StrictMode>
    <Router>
      <TRPCProvider>
        <NotificationProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </NotificationProvider>
      </TRPCProvider>
    </Router>
  </StrictMode>
);
