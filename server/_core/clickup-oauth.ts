/**
 * ClickUp OAuth Handler
 *
 * Handles the full ClickUp OAuth flow:
 * 1. /api/clickup/auth  - Redirects user to ClickUp authorization page
 * 2. /api/clickup/callback - Handles ClickUp callback, exchanges code for token,
 *    creates session, and returns user to the app
 */

import type { Express, Request, Response } from "express";
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const.js";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { upsertUser } from "../db";

const CLICKUP_CLIENT_ID = process.env.CLICKUP_CLIENT_ID ?? "";
const CLICKUP_CLIENT_SECRET = process.env.CLICKUP_CLIENT_SECRET ?? "";
const CLICKUP_TOKEN_URL = "https://api.clickup.com/api/v2/oauth/token";
const CLICKUP_USER_URL = "https://api.clickup.com/api/v2/user";

// In-memory store for pending OAuth tokens (keyed by nonce, TTL 5 min)
// Used by Manus preview iframe scenario: login.tsx polls /api/auth/pending-token
export const pendingOAuthTokens = new Map<string, { token: string; user: string; createdAt: number }>();

// Cleanup expired tokens every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of pendingOAuthTokens.entries()) {
    if (now - val.createdAt > 5 * 60 * 1000) pendingOAuthTokens.delete(key);
  }
}, 60_000);

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

// Production redirect URI - must be registered in ClickUp OAuth app settings
// ClickUp OAuth app: Settings → Apps → Sigorta Acentesi Saha App → Redirect URL
const PRODUCTION_REDIRECT_URI = "https://aksiyonsaha.duckdns.org/api/clickup/callback";

// Production frontend URL for redirects after OAuth
const PRODUCTION_FRONTEND_URL = "https://aksiyonsaha.duckdns.org";

// Mobile deep link scheme for the app
const MOBILE_DEEP_LINK_SCHEME = "manus20260204062206";

/**
 * Get the frontend URL for redirects.
 * In production, always use the production domain.
 * In development, fall back to EXPO env vars or localhost.
 */
function getFrontendUrl(_req: Request): string {
  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_FRONTEND_URL;
  }
  return (
    process.env.EXPO_WEB_PREVIEW_URL ||
    process.env.EXPO_PACKAGER_PROXY_URL ||
    "http://localhost:8081"
  );
}

/**
 * Get the ClickUp OAuth redirect URI.
 * Always uses the production URL so it matches the registered redirect URI in ClickUp.
 * This is required because ClickUp OAuth only accepts pre-registered redirect URIs.
 */
function getClickUpRedirectUri(_req: Request): string {
  return PRODUCTION_REDIRECT_URI;
}

/**
 * Exchange ClickUp authorization code for access token
 */
async function exchangeClickUpCode(
  code: string,
  redirectUri: string,
): Promise<{ access_token: string }> {
  const response = await fetch(CLICKUP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: CLICKUP_CLIENT_ID,
      client_secret: CLICKUP_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ClickUp token exchange failed: ${error}`);
  }

  return response.json() as Promise<{ access_token: string }>;
}

/**
 * Get ClickUp user info using access token
 */
async function getClickUpUserInfo(accessToken: string): Promise<{
  id: number;
  username: string;
  email: string;
  color: string;
  profilePicture: string | null;
}> {
  const response = await fetch(CLICKUP_USER_URL, {
    headers: { Authorization: accessToken },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ClickUp user info failed: ${error}`);
  }

  const data = (await response.json()) as { user: any };
  return data.user;
}

export function registerClickUpOAuthRoutes(app: Express) {
  /**
   * Initiate ClickUp OAuth flow
   * Frontend calls this endpoint to start the OAuth process
   */
  app.get("/api/clickup/auth", (req: Request, res: Response) => {
    if (!CLICKUP_CLIENT_ID) {
      res.status(500).json({ error: "ClickUp OAuth not configured" });
      return;
    }

    const redirectUri = getClickUpRedirectUri(req);
    // Embed nonce in state so we can pass it through the OAuth flow
    const nonce = getQueryParam(req, "nonce") ?? "";
    const statePayload = JSON.stringify({ redirectUri, nonce });
    const state = Buffer.from(statePayload).toString("base64");

    const authUrl = new URL("https://app.clickup.com/api");
    authUrl.searchParams.set("client_id", CLICKUP_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", state);

    console.log("[ClickUp OAuth] Redirecting to ClickUp auth, nonce:", nonce || "(none)");
    res.redirect(302, authUrl.toString());
  });

  /**
   * ClickUp OAuth callback
   * ClickUp redirects here after user authorizes the app
   */
  app.get("/api/clickup/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const error = getQueryParam(req, "error");

    if (error) {
      console.error("[ClickUp OAuth] Authorization error:", error);
      const frontendUrl = getFrontendUrl(req);
      res.redirect(302, `${frontendUrl}/login?error=${encodeURIComponent(error)}`);
      return;
    }

    if (!code) {
      res.status(400).json({ error: "Authorization code is required" });
      return;
    }

    // Extract nonce from state parameter
    let nonce = "";
    try {
      const stateParam = getQueryParam(req, "state") ?? "";
      if (stateParam) {
        const decoded = JSON.parse(Buffer.from(stateParam, "base64").toString("utf8"));
        nonce = decoded.nonce ?? "";
      }
    } catch (_) {}
    console.log("[ClickUp OAuth] Callback received, nonce:", nonce || "(none)");

    try {
      const redirectUri = getClickUpRedirectUri(req);
      console.log("[ClickUp OAuth] Exchanging code for token, redirectUri:", redirectUri);

      // Exchange code for access token
      const tokenData = await exchangeClickUpCode(code, redirectUri);
      console.log("[ClickUp OAuth] Token received");

      // Get ClickUp user info
      const clickupUser = await getClickUpUserInfo(tokenData.access_token);
      console.log("[ClickUp OAuth] User info received:", clickupUser.email);

      // Find or create user in our database by email
      const openId = `clickup_${clickupUser.id}`;
      await upsertUser({
        openId,
        name: clickupUser.username,
        email: clickupUser.email,
        loginMethod: "clickup",
        lastSignedIn: new Date(),
        clickupUserId: String(clickupUser.id),
      });

      // Create session token
      const sessionToken = await sdk.createSessionToken(openId, {
        name: clickupUser.username,
        expiresInMs: ONE_YEAR_MS,
      });

      // Set session cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Build user data for postMessage / deep link
      const userData = {
        id: null,
        openId,
        name: clickupUser.username,
        email: clickupUser.email,
        loginMethod: "clickup",
        lastSignedIn: new Date().toISOString(),
        clickupUserId: String(clickupUser.id),
      };
      const userBase64 = Buffer.from(JSON.stringify(userData)).toString("base64");

      // Determine frontend URL
      const frontendUrl = getFrontendUrl(req);

      // Mobile deep link URL - used when opened from native app browser
      const deepLink = `${MOBILE_DEEP_LINK_SCHEME}://oauth/callback?sessionToken=${encodeURIComponent(sessionToken)}&user=${encodeURIComponent(userBase64)}`;

      // Web redirect URL - used when opened in regular browser
      // Redirect to the Expo web app's oauth/callback route with the session token
      const webRedirectUrl = `${frontendUrl}/oauth/callback?sessionToken=${encodeURIComponent(sessionToken)}&user=${encodeURIComponent(userBase64)}`;

      // If nonce is present, store token server-side for polling
      // This is the primary mechanism for Manus preview iframe scenario
      if (nonce) {
        pendingOAuthTokens.set(nonce, { token: sessionToken, user: userBase64, createdAt: Date.now() });
        console.log(`[ClickUp OAuth] Stored pending token for nonce=${nonce}`);
      }

      // Detect if request comes from native app (ASWebAuthenticationSession)
      // Native apps send the nonce in state but NOT as a popup (no window.opener)
      // ASWebAuthenticationSession only intercepts HTTP 302 redirects, not JS redirects
      // So for native: redirect directly to deep link via 302
      // For web popup (Manus preview): send HTML with postMessage + window.close()
      // For web browser: redirect to web app

      const userAgent = req.headers['user-agent'] ?? '';
      const isMobileUA = /iPhone|iPad|iPod|Android/i.test(userAgent);

      console.log('[ClickUp OAuth] User-Agent:', userAgent.substring(0, 80));
      console.log('[ClickUp OAuth] isMobileUA:', isMobileUA);

      // Return HTML page for all scenarios.
      // For mobile (openBrowserAsync + Linking.addEventListener approach):
      //   - JS triggers window.location.href = deepLink
      //   - iOS intercepts the deep link and fires Linking event in the app
      //   - Linking.addEventListener catches it and processes the token
      // For Manus preview iframe:
      //   - postMessage + window.close()
      // For regular browser:
      //   - redirect to web app
      res.send(`<!DOCTYPE html>
<html>
<head><title>Giriş Yapılıyor...</title>
<meta charset="utf-8">
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f5f5f5;}
  .box{text-align:center;padding:2.5rem 3rem;background:white;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.1);max-width:320px;}
  .icon{font-size:3rem;margin-bottom:1rem;}
  h2{color:#1a1a1a;margin:0 0 0.5rem;font-size:1.25rem;}
  p{color:#666;margin:0;font-size:0.9rem;}
</style>
</head>
<body>
<div class="box">
  <div class="icon">✅</div>
  <h2>Giriş Başarılı</h2>
  <p id="msg">Uygulama açılıyor...</p>
</div>
<script>
(function() {
  var token = ${JSON.stringify(sessionToken)};
  var user = ${JSON.stringify(userBase64)};
  var nonce = ${JSON.stringify(nonce)};
  var deepLink = ${JSON.stringify(deepLink)};
  var webRedirect = ${JSON.stringify(webRedirectUrl)};
  var msg = { type: 'OAuthCallback', sessionToken: token, user: user, nonce: nonce };

  // Always try postMessage first (may work in some iframe configs)
  function sendMsg(target) {
    try { if (target) target.postMessage(msg, '*'); } catch(e) {}
  }
  sendMsg(window.opener);
  sendMsg(window.opener && window.opener.parent);
  sendMsg(window.opener && window.opener.top);
  sendMsg(window.parent);
  sendMsg(window.top);

  // IMPORTANT: iPadOS 13+ sends desktop user-agent (Mac), so we cannot rely on UA for iPad detection.
  // Instead, always try the deep link first. If the app is installed, iOS/iPadOS will intercept it.
  // If not (e.g. Manus preview browser), it will fail silently and we fall back to window.close() or web redirect.
  var userAgent = navigator.userAgent || '';
  var isLikelyMobile = /iPhone|iPod|Android/i.test(userAgent) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);

  // Always try deep link - works for both iPhone and iPad (even with desktop UA)
  // The deep link will be intercepted by iOS if the app is installed
  document.getElementById('msg').textContent = 'Uygulama açılıyor...';
  window.location.href = deepLink;

  setTimeout(function() {
    // If we're still here after 1.5s, deep link wasn't intercepted
    // This means we're in a browser (not the app's in-app browser)
    if (window.opener) {
      // Manus preview popup scenario
      document.getElementById('msg').textContent = 'Giriş tamamlandı, pencere kapanıyor...';
      window.close();
    } else if (isLikelyMobile) {
      document.getElementById('msg').textContent = 'Uygulamaya dönebilirsiniz.';
    } else {
      document.getElementById('msg').textContent = 'Yönlendiriliyor...';
      window.location.href = webRedirect;
    }
  }, 1500);
})();
</script>
</body>
</html>`);
    } catch (err) {
      console.error("[ClickUp OAuth] Callback failed:", err);
      const frontendUrl = getFrontendUrl(req);
      res.redirect(302, `${frontendUrl}/login?error=oauth_failed`);
    }
  });
}
