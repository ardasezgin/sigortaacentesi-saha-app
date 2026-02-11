import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { Platform } from "react-native";

/**
 * ClickUp OAuth configuration
 * 
 * To use ClickUp OAuth, you need to:
 * 1. Create an OAuth app in ClickUp (Settings → Apps → Create new app)
 * 2. Set the redirect URI to match your app's OAuth callback
 * 3. Get your client_id and client_secret
 * 4. Store them in environment variables or app config
 */

// ClickUp OAuth endpoints
const CLICKUP_AUTH_URL = "https://app.clickup.com/api";
const CLICKUP_TOKEN_URL = "https://api.clickup.com/api/v2/oauth/token";

// Get OAuth config from environment or constants
// TODO: Replace these with your actual ClickUp OAuth credentials
const CLICKUP_CLIENT_ID = process.env.CLICKUP_CLIENT_ID || "YOUR_CLICKUP_CLIENT_ID";
const CLICKUP_CLIENT_SECRET = process.env.CLICKUP_CLIENT_SECRET || "YOUR_CLICKUP_CLIENT_SECRET";

/**
 * Generate a random state parameter for OAuth security
 */
function generateState(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Get the OAuth redirect URI based on the platform
 */
export function getRedirectUri(): string {
  if (Platform.OS === "web") {
    // For web, use the current origin + /oauth/callback
    if (typeof window !== "undefined") {
      return `${window.location.origin}/oauth/callback`;
    }
    return "http://localhost:8081/oauth/callback";
  } else {
    // For native, use the app's custom scheme
    const scheme = Linking.createURL("/oauth/callback");
    return scheme;
  }
}

/**
 * Build the ClickUp OAuth authorization URL
 */
export function buildClickUpAuthUrl(): string {
  const redirectUri = getRedirectUri();
  const state = generateState();
  
  // Store state for validation (in a real app, use secure storage)
  if (Platform.OS === "web" && typeof sessionStorage !== "undefined") {
    sessionStorage.setItem("clickup_oauth_state", state);
  }
  
  const params = new URLSearchParams({
    client_id: CLICKUP_CLIENT_ID,
    redirect_uri: redirectUri,
    state: state,
  });
  
  return `${CLICKUP_AUTH_URL}?${params.toString()}`;
}

/**
 * Start the ClickUp OAuth flow
 * Opens the authorization URL in a browser
 */
export async function startClickUpOAuth(): Promise<void> {
  const authUrl = buildClickUpAuthUrl();
  
  console.log("[ClickUp OAuth] Starting OAuth flow");
  console.log("[ClickUp OAuth] Auth URL:", authUrl);
  console.log("[ClickUp OAuth] Redirect URI:", getRedirectUri());
  
  if (Platform.OS === "web") {
    // For web, redirect directly
    window.location.href = authUrl;
  } else {
    // For native, use WebBrowser
    const result = await WebBrowser.openAuthSessionAsync(
      authUrl,
      getRedirectUri()
    );
    
    console.log("[ClickUp OAuth] WebBrowser result:", result);
    
    if (result.type === "success" && result.url) {
      // The OAuth callback will handle the code exchange
      console.log("[ClickUp OAuth] Success, callback URL:", result.url);
    } else if (result.type === "cancel") {
      console.log("[ClickUp OAuth] User cancelled");
      throw new Error("OAuth cancelled by user");
    } else {
      console.log("[ClickUp OAuth] Failed:", result);
      throw new Error("OAuth failed");
    }
  }
}

/**
 * Exchange authorization code for access token
 * This should be called from your backend server for security
 */
export async function exchangeClickUpCode(
  code: string,
  redirectUri: string
): Promise<{ access_token: string }> {
  console.log("[ClickUp OAuth] Exchanging code for token");
  
  const response = await fetch(CLICKUP_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: CLICKUP_CLIENT_ID,
      client_secret: CLICKUP_CLIENT_SECRET,
      code: code,
      redirect_uri: redirectUri,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error("[ClickUp OAuth] Token exchange failed:", error);
    throw new Error(`Failed to exchange code: ${error}`);
  }
  
  const data = await response.json();
  console.log("[ClickUp OAuth] Token received");
  
  return data;
}

/**
 * Get ClickUp user info using access token
 */
export async function getClickUpUser(accessToken: string): Promise<{
  id: number;
  username: string;
  email: string;
  color: string;
  profilePicture: string | null;
}> {
  console.log("[ClickUp OAuth] Fetching user info");
  
  const response = await fetch("https://api.clickup.com/api/v2/user", {
    headers: {
      Authorization: accessToken,
    },
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error("[ClickUp OAuth] Failed to get user info:", error);
    throw new Error(`Failed to get user info: ${error}`);
  }
  
  const data = await response.json();
  console.log("[ClickUp OAuth] User info received");
  
  return data.user;
}
