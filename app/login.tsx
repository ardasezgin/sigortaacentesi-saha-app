import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { startOAuthLogin } from "@/constants/oauth";
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
import { establishSession } from "@/lib/_core/api";

export default function LoginScreen() {
  const colors = useColors();
  const { isAuthenticated, loading } = useAuth({ autoFetch: true });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState("");

  // Redirect to home if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/(drawer)");
    }
  }, [isAuthenticated, loading]);

  // Listen for OAuth callback postMessage from popup window (web preview iframe scenario)
  useEffect(() => {
    if (Platform.OS !== "web") return;

    const handleMessage = async (event: MessageEvent) => {
      if (!event.data || event.data.type !== "OAuthCallback") return;

      const { sessionToken, user: userBase64 } = event.data;
      if (!sessionToken) return;

      try {
        setIsLoggingIn(true);

        // Establish session cookie on the backend (3000-xxx domain)
        await establishSession(sessionToken);

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
          } catch (e) {
            console.error("[Login] Failed to parse user data from postMessage:", e);
          }
        }

        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        router.replace("/(drawer)");
      } catch (err) {
        console.error("[Login] postMessage auth failed:", err);
        setError("Giriş tamamlanamadı, lütfen tekrar deneyin.");
        setIsLoggingIn(false);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleClickUpLogin = async () => {
    try {
      setError("");
      setIsLoggingIn(true);

      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      await startOAuthLogin();

      // Native: browser açıldı, deep link ile geri dönecek
      // Web: yönlendirme yapıldı
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Giriş başlatılırken bir hata oluştu";
      setError(errorMessage);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      // Native'de browser açık olduğu için loading'i sıfırla
      if (Platform.OS !== "web") {
        setTimeout(() => setIsLoggingIn(false), 2000);
      }
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
