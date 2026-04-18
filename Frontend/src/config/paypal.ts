export type PayPalMode = "disabled" | "sandbox" | "live" | "mock";

const ENABLED_VALUES = new Set(["1", "true", "yes", "on"]);
const DISABLED_VALUES = new Set(["0", "false", "no", "off"]);

const parseBooleanFlag = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (ENABLED_VALUES.has(normalized)) {
    return true;
  }
  if (DISABLED_VALUES.has(normalized)) {
    return false;
  }
  return fallback;
};

const parseMode = (value: string | undefined): PayPalMode => {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "disabled" || normalized === "sandbox" || normalized === "live" || normalized === "mock") {
    return normalized;
  }
  return "sandbox";
};

const rawMode = parseMode(import.meta.env.VITE_PAYPAL_MODE as string | undefined);
const rawEnabled = parseBooleanFlag(import.meta.env.VITE_PAYPAL_ENABLED as string | undefined, true);
const clientId = (import.meta.env.VITE_PAYPAL_CLIENT_ID as string | undefined)?.trim() || undefined;

const effectiveMode: PayPalMode = rawEnabled ? rawMode : "disabled";

export const paypalConfig = {
  mode: effectiveMode,
  clientId,
  isDisabled: effectiveMode === "disabled",
  isMock: effectiveMode === "mock",
  isLive: effectiveMode === "live",
  isSandbox: effectiveMode === "sandbox",
  isSdkRequired: effectiveMode === "sandbox" || effectiveMode === "live",
  isSdkReady: (effectiveMode === "sandbox" || effectiveMode === "live") && Boolean(clientId),
  isPayPalButtonEnabled: effectiveMode === "mock" || ((effectiveMode === "sandbox" || effectiveMode === "live") && Boolean(clientId)),
} as const;
