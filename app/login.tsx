import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { startOAuthLogin, getApiBaseUrl } from "@/constants/oauth";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/use-colors";
import * as Auth from "@/lib/_core/auth";

/** Generate a random nonce string */
function generateNonce(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function LoginScreen() {
  const colors = useColors();
  const { isAuthenticated, loading } = useAuth({ autoFetch: true });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Redirect to home if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/(drawer)");
    }
  }, [isAuthenticated, loading]);

  // Listen for OAuth callback postMessage (may work in some browser configs)
  useEffect(() => {
    if (Platform.OS !== "web") return;

    const handleMessage = async (event: MessageEvent) => {
      if (!event.data || event.data.type !== "OAuthCallback") return;
      const { sessionToken, user: userBase64 } = event.data;
      if (!sessionToken) return;

      console.log("[Login] postMessage received, token present:", !!sessionToken);
      // Stop polling since we got token via postMessage
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      await handleTokenReceived(sessionToken, userBase64);
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const handleTokenReceived = async (sessionToken: string, userBase64?: string) => {
    try {
      setIsLoggingIn(true);

      // Store token in localStorage (web only)
      if (Platform.OS === "web") {
        try { window.localStorage.setItem("app_session_token", sessionToken); } catch (e) {}
      }

      // Fetch user info from API
      const apiBase = getApiBaseUrl();
      try {
        const response = await fetch(`${apiBase}/api/auth/me`, {
          headers: { Authorization: `Bearer ${sessionToken}` },
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            await Auth.setUserInfo({
              id: data.user.id,
              openId: data.user.openId,
              name: data.user.name,
              email: data.user.email,
              loginMethod: data.user.loginMethod,
              lastSignedIn: new Date(data.user.lastSignedIn || Date.now()),
            });
            console.log("[Login] User fetched from API:", data.user.email);
          }
        }
      } catch (e) {
        // Fallback: parse user from base64 payload
        if (userBase64) {
          try {
            const userData = JSON.parse(atob(userBase64));
            await Auth.setUserInfo({
              id: userData.id,
              openId: userData.openId,
              name: userData.name,
              email: userData.email,
              loginMethod: userData.loginMethod,
              lastSignedIn: new Date(userData.lastSignedIn || Date.now()),
            });
          } catch (_) {}
        }
      }

      router.replace("/(drawer)");
    } catch (err) {
      console.error("[Login] handleTokenReceived failed:", err);
      setError("Giriş tamamlanamadı, lütfen tekrar deneyin.");
      setIsLoggingIn(false);
    }
  };

  /**
   * Poll the server for the pending token using the nonce.
   * The nonce was embedded in the OAuth URL before the popup was opened,
   * so the server stores the token under this nonce when the callback completes.
   * This works regardless of cross-domain localStorage/postMessage restrictions.
   */
  const startServerPolling = (nonce: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    let attempts = 0;
    const maxAttempts = 24; // 12 seconds total (500ms interval)
    const apiBase = getApiBaseUrl();

    console.log(`[Login] Starting server polling for nonce=${nonce}`);

    pollingRef.current = setInterval(async () => {
      attempts++;
      try {
        const response = await fetch(
          `${apiBase}/api/auth/pending-token?nonce=${encodeURIComponent(nonce)}`,
          { credentials: "include" },
        );

        if (response.ok) {
          const data = await response.json();
          if (data.sessionToken) {
            clearInterval(pollingRef.current!);
            pollingRef.current = null;
            console.log("[Login] Server polling: token found on attempt", attempts);
            await handleTokenReceived(data.sessionToken, data.user);
            return;
          }
        }
        // 404 = not yet available, keep polling
      } catch (e) {
        console.error("[Login] Server polling error:", e);
      }

      if (attempts >= maxAttempts) {
        clearInterval(pollingRef.current!);
        pollingRef.current = null;
        console.log("[Login] Server polling exhausted after", attempts, "attempts");
        setError("Giriş tamamlanamadı. Lütfen tekrar deneyin.");
        setIsLoggingIn(false);
      }
    }, 500);
  };

  const handleClickUpLogin = async () => {
    try {
      setError("");
      setIsLoggingIn(true);

      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      if (Platform.OS === "web") {
        // Generate nonce BEFORE opening popup - embed in URL so server can store token under it
        const nonce = generateNonce();
        console.log("[Login] Generated nonce:", nonce);

        await startOAuthLogin(
          (_token, _user) => {
            // Called when popup closes
            // Start server polling - the server stored the token under our nonce
            console.log("[Login] Popup closed, starting server polling");
            startServerPolling(nonce);
          },
          nonce,
        );
      } else {
        // Native: ASWebAuthenticationSession (in-app auth sheet)
        // Token is returned directly via onSuccess callback when auth completes
        const result = await startOAuthLogin(
          async (token, userBase64) => {
            // Auth session completed successfully, process token
            await handleTokenReceived(token, userBase64 ?? undefined);
          },
        );
        // If result is null and we're still logging in, user cancelled
        if (!result) {
          setIsLoggingIn(false);
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Giriş başlatılırken bir hata oluştu";
      setError(errorMessage);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      setIsLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="bg-background">
      <View className="flex-1 px-6 justify-center">
        {/* Logo Section */}
        <View className="items-center mb-16">
          <View
            className="w-28 h-28 rounded-3xl items-center justify-center mb-6 shadow-lg"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-5xl font-bold text-white">A</Text>
          </View>
          <Text className="text-3xl font-bold text-foreground mb-2">Aksiyon</Text>
          <Text className="text-base text-muted">Saha Uygulaması</Text>
        </View>

        {/* Login Section */}
        <View className="gap-4">
          {/* Error Message */}
          {error ? (
            <View className="bg-error/10 border border-error/20 rounded-xl px-4 py-3 mb-2">
              <Text className="text-error text-sm text-center">{error}</Text>
            </View>
          ) : null}

          {/* ClickUp Login Button */}
          <Pressable
            onPress={handleClickUpLogin}
            disabled={isLoggingIn}
            style={({ pressed }) => ({
              opacity: isLoggingIn ? 0.7 : pressed ? 0.9 : 1,
              transform: [{ scale: pressed && !isLoggingIn ? 0.98 : 1 }],
            })}
          >
            <View
              className="rounded-2xl py-4 px-6 items-center flex-row justify-center gap-3 shadow-sm"
              style={{ backgroundColor: "#7B68EE" }}
            >
              {isLoggingIn ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View className="w-6 h-6 rounded-full bg-white/20 items-center justify-center">
                  <Text className="text-white text-xs font-bold">C</Text>
                </View>
              )}
              <Text className="text-white text-base font-semibold">
                {isLoggingIn ? "Yönlendiriliyor..." : "ClickUp ile Giriş Yap"}
              </Text>
            </View>
          </Pressable>

          {/* Info text */}
          <Text className="text-muted text-xs text-center mt-2 leading-5">
            ClickUp hesabınızla güvenli giriş yapın.{"\n"}
            Hesabınız yoksa yöneticinizle iletişime geçin.
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}
