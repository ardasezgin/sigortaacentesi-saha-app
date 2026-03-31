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
 * @param nonce Optional nonce for server-side token polling
 */
export function getClickUpLoginUrl(nonce?: string): string {
  const apiBase = getApiBaseUrl();
  const base = `${apiBase}/api/clickup/auth`;
  if (nonce) return `${base}?nonce=${encodeURIComponent(nonce)}`;
  return base;
}

/**
 * Start ClickUp OAuth login flow.
 *
 * - Web (iframe preview): opens popup, polls for token via /api/auth/me after popup closes
 * - Web (normal browser): redirects directly
 * - Native (iOS/Android): opens system browser, deep link returns to app
 */
export async function startOAuthLogin(
  onSuccess?: (token: string, user: any) => void,
  nonce?: string,
): Promise<string | null> {
  const loginUrl = getClickUpLoginUrl(nonce);

  console.log("[OAuth] Starting ClickUp OAuth login:", loginUrl);

  if (ReactNative.Platform.OS === "web") {
    if (typeof window !== "undefined") {
      // Check if we're inside an iframe (Manus preview panel)
      const isInIframe = window.self !== window.top;
      if (isInIframe) {
        // Open popup and poll for completion
        const popup = window.open(
          loginUrl,
          "clickup_oauth",
          "width=600,height=700,scrollbars=yes,resizable=yes",
        );
        if (popup && onSuccess) {
          // Poll until popup closes, then check if we got a token via postMessage
          // The postMessage listener in login.tsx handles the token
          // This just monitors popup state
          const pollInterval = setInterval(() => {
            try {
              if (popup.closed) {
                clearInterval(pollInterval);
                console.log("[OAuth] Popup closed");
                // Signal that popup closed (login.tsx will check localStorage)
                onSuccess("", null);
              }
            } catch (e) {
              clearInterval(pollInterval);
            }
          }, 500);
        }
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
