export type AppMode = "demonstration" | "live";

export function appMode(): AppMode {
  return process.env.APP_MODE === "live" ? "live" : "demonstration";
}

export function externalCallsAllowed() {
  return appMode() === "live";
}

export function graphApiVersion() {
  return process.env.WHATSAPP_GRAPH_API_VERSION || "v26.0";
}
