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

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

// Production redirect URI - must be registered in ClickUp OAuth app settings
// ClickUp OAuth app: Settings → Apps → Sigorta Acentesi Saha App → Redirect URL
const PRODUCTION_REDIRECT_URI = "https://aksiyonsaha.duckdns.org/api/clickup/callback";

// Production frontend URL for redirects after OAuth
const PRODUCTION_FRONTEND_URL = "https://aksiyonsaha.duckdns.org";

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
    const state = Buffer.from(redirectUri).toString("base64");

    const authUrl = new URL("https://app.clickup.com/api");
    authUrl.searchParams.set("client_id", CLICKUP_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", state);

    console.log("[ClickUp OAuth] Redirecting to ClickUp auth:", authUrl.toString());
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
      });

      // Create session token
      const sessionToken = await sdk.createSessionToken(openId, {
        name: clickupUser.username,
        expiresInMs: ONE_YEAR_MS,
      });

      // Set session cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Build user data for postMessage
      const userData = {
        id: null,
        openId,
        name: clickupUser.username,
        email: clickupUser.email,
        loginMethod: "clickup",
        lastSignedIn: new Date().toISOString(),
      };
      const userBase64 = Buffer.from(JSON.stringify(userData)).toString("base64");

      // Determine frontend URL
      const frontendUrl = getFrontendUrl(req);

      // Return HTML page that:
      // 1. Sends token via postMessage to opener window (iframe preview scenario)
      // 2. Falls back to redirect if no opener (normal browser flow)
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
  <p>Uygulama yükleniyor...</p>
</div>
<script>
(function() {
  var token = ${JSON.stringify(sessionToken)};
  var user = ${JSON.stringify(userBase64)};
  var frontendUrl = ${JSON.stringify(frontendUrl)};

  function tryPostMessage() {
    if (window.opener) {
      try {
        window.opener.postMessage({
          type: 'OAuthCallback',
          sessionToken: token,
          user: user
        }, '*');
        setTimeout(function() { window.close(); }, 800);
        return true;
      } catch(e) {
        console.error('postMessage failed:', e);
      }
    }
    return false;
  }

  if (!tryPostMessage()) {
    // No opener - direct redirect (normal browser or mobile flow)
    window.location.href = frontendUrl + '/oauth/callback?sessionToken=' + encodeURIComponent(token) + '&user=' + encodeURIComponent(user);
  }
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
