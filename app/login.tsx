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

export default function LoginScreen() {
  const colors = useColors();
  const { isAuthenticated, loading, refresh } = useAuth({ autoFetch: true });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Redirect to home if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/(drawer)");
    }
  }, [isAuthenticated, loading]);

  // Listen for OAuth callback postMessage from popup window
  useEffect(() => {
    if (Platform.OS !== "web") return;

    const handleMessage = async (event: MessageEvent) => {
      if (!event.data || event.data.type !== "OAuthCallback") return;

      const { sessionToken, user: userBase64 } = event.data;
      if (!sessionToken) return;

      console.log("[Login] OAuthCallback postMessage received");
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

      // Store token in localStorage
      try {
        window.localStorage.setItem("app_session_token", sessionToken);
        console.log("[Login] Token stored in localStorage");
      } catch (e) {
        console.error("[Login] localStorage write failed:", e);
      }

      // Store user info if available
      if (userBase64) {
        try {
          const userJson = atob(userBase64);
          const userData = JSON.parse(userJson);
          await Auth.setUserInfo({
            id: userData.id,
            openId: userData.openId,
            name: userData.name,
            email: userData.email,
            loginMethod: userData.loginMethod,
            lastSignedIn: new Date(userData.lastSignedIn || Date.now()),
          });
          console.log("[Login] User info stored:", userData.email);
        } catch (e) {
          console.error("[Login] Failed to parse user data:", e);
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
   * After popup closes, poll /api/auth/me with the token from localStorage.
   * This handles the case where postMessage didn't reach the iframe.
   */
  const startPollingAfterPopupClose = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    let attempts = 0;
    const maxAttempts = 10; // 5 seconds total

    pollingRef.current = setInterval(async () => {
      attempts++;
      console.log(`[Login] Polling attempt ${attempts}/${maxAttempts}`);

      try {
        // Check if token was stored in localStorage by the callback page
        const storedToken = window.localStorage.getItem("app_session_token");
        if (storedToken) {
          console.log("[Login] Token found in localStorage after popup close");
          clearInterval(pollingRef.current!);
          pollingRef.current = null;

          // Try to get user info from the callback page's stored data
          const storedUser = window.localStorage.getItem("oauth_callback_user");
          if (storedUser) {
            window.localStorage.removeItem("oauth_callback_user");
          }

          // Fetch user from API using the token
          const apiBase = getApiBaseUrl();
          const response = await fetch(`${apiBase}/api/auth/me`, {
            headers: { Authorization: `Bearer ${storedToken}` },
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

          router.replace("/(drawer)");
          return;
        }
      } catch (e) {
        console.error("[Login] Polling error:", e);
      }

      if (attempts >= maxAttempts) {
        clearInterval(pollingRef.current!);
        pollingRef.current = null;
        console.log("[Login] Polling exhausted, no token found");
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

      // Clear any stale token before starting
      if (Platform.OS === "web") {
        try { window.localStorage.removeItem("app_session_token"); } catch (e) {}
      }

      await startOAuthLogin((token, _user) => {
        // Called when popup closes
        if (Platform.OS === "web") {
          if (token) {
            // Got token directly from postMessage
            handleTokenReceived(token, _user);
          } else {
            // Popup closed, check localStorage (set by callback page)
            startPollingAfterPopupClose();
          }
        }
      });

      // Native: browser açıldı, deep link ile geri dönecek
      if (Platform.OS !== "web") {
        setTimeout(() => setIsLoggingIn(false), 2000);
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
