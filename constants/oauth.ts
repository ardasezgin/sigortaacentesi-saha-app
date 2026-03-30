import * as Linking from "expo-linking";
import * as ReactNative from "react-native";

// Extract scheme from bundle ID (last segment timestamp, prefixed with "manus")
const bundleId = "space.manus.sigortaacentesi.saha.app.t20260204062206";
const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
const schemeFromBundleId = `manus${timestamp}`;

const env = {
  // Production backend URL - HTTPS with Let's Encrypt SSL
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://aksiyonsaha.duckdns.org",
  deepLinkScheme: schemeFromBundleId,
};

export const API_BASE_URL = env.apiBaseUrl;
export const SESSION_TOKEN_KEY = "app_session_token";
export const USER_INFO_KEY = "manus-runtime-user-info";

/**
 * Get the API base URL, deriving from current hostname if not set.
 * Metro runs on 8081, API server runs on 3000.
 * URL pattern: https://PORT-sandboxid.region.domain
 */
export function getApiBaseUrl(): string {
  // On web (preview), derive from current hostname by replacing port 8081 with 3000
  if (ReactNative.Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    const { protocol, hostname } = window.location;
    // Pattern: 8081-sandboxid.region.domain -> 3000-sandboxid.region.domain
    const apiHostname = hostname.replace(/^8081-/, "3000-");
    if (apiHostname !== hostname) {
      return `${protocol}//${apiHostname}`;
    }
  }
  // On native (iOS/Android), use production HTTPS server
  if (API_BASE_URL) {
    return API_BASE_URL.replace(/\/$/, "");
  }
  return "";
}

/**
 * Get the ClickUp OAuth authorization URL.
 * Routes through our backend /api/clickup/auth which handles the redirect.
 */
export function getClickUpLoginUrl(): string {
  const apiBase = getApiBaseUrl();
  return `${apiBase}/api/clickup/auth`;
}

/**
 * Start ClickUp OAuth login flow.
 *
 * - Web (iframe preview): opens in a new tab, postMessage returns token to iframe
 * - Web (normal browser): redirects directly
 * - Native (iOS/Android): opens system browser, deep link returns to app
 */
export async function startOAuthLogin(): Promise<string | null> {
  const loginUrl = getClickUpLoginUrl();

  console.log("[OAuth] Starting ClickUp OAuth login:", loginUrl);

  if (ReactNative.Platform.OS === "web") {
    if (typeof window !== "undefined") {
      // Check if we're inside an iframe (Manus preview panel)
      // If so, open in a new tab to avoid the iframe black screen issue
      const isInIframe = window.self !== window.top;
      if (isInIframe) {
        window.open(loginUrl, "_blank");
      } else {
        window.location.href = loginUrl;
      }
    }
    return null;
  }

  // Native: open in system browser, deep link callback will handle the rest
  const supported = await Linking.canOpenURL(loginUrl);
  if (!supported) {
    console.warn("[OAuth] Cannot open login URL: URL scheme not supported");
    return null;
  }

  try {
    await Linking.openURL(loginUrl);
  } catch (error) {
    console.error("[OAuth] Failed to open login URL:", error);
  }

  return null;
}
