import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";

const manifest: PaperclipPluginManifestV1 = {
  id: "servas-ai.paperclip-connector-marketplace",
  apiVersion: 1,
  version: "0.1.0",
  displayName: "Connector Marketplace",
  description: "OpenCLI-Connector-Marketplace von servas-ai: Liste, Suche, Details mit Routes, Installieren (Daten: index.json aus servas-ai/opencli-connectors main)",
  author: "servas-ai",
  categories: ["ui", "connector"],
  capabilities: [
    "http.outbound",
    "plugin.state.read",
    "plugin.state.write",
    "ui.page.register",
    "ui.sidebar.register",
    "ui.dashboardWidget.register",
  ],
  entrypoints: { worker: "./dist/worker.js", ui: "./dist/ui" },
  ui: {
    slots: [
      { type: "page", id: "connector-marketplace-page", displayName: "Connector Marketplace", exportName: "MarketplacePage", routePath: "connectors" },
      { type: "sidebar", id: "connector-marketplace-sidebar", displayName: "Connectors", exportName: "SidebarLink" },
      { type: "dashboardWidget", id: "connector-marketplace-widget", displayName: "Connector Marketplace", exportName: "DashboardWidget" },
    ],
  },
};

export default manifest;
