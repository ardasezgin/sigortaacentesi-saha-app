import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/use-colors";

export default function LoginScreen() {
  const colors = useColors();
  const { isAuthenticated, loading, refresh } = useAuth({ autoFetch: true });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  
  const loginMutation = trpc.auth.login.useMutation();

  // Redirect to home if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/(drawer)");
    }
  }, [isAuthenticated, loading]);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Lütfen email ve şifrenizi girin");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }

    try {
      setError("");

      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      // Call backend login endpoint (hardcoded: test@demo.com / 123123123)
      const result = await loginMutation.mutateAsync({ email, password });
      
      if (result.success) {
        // Store session token and user info for native platforms
        if (Platform.OS !== "web") {
          const Auth = await import("@/lib/_core/auth");
          await Auth.setSessionToken(result.sessionToken);
          await Auth.setUserInfo({
            id: result.user.id,
            openId: result.user.openId,
            name: result.user.name,
            email: result.user.email,
            loginMethod: result.user.loginMethod,
            lastSignedIn: new Date(result.user.lastSignedIn),
          });
        }
        // Web platform: cookie is automatically set by backend
        
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        
        // Refresh auth state
        await refresh();
        
        router.replace("/(drawer)");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Giriş yapılırken bir hata oluştu";
      setError(errorMessage);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View className="flex-1 px-6 justify-center">
          {/* Logo Section */}
          <View className="items-center mb-12">
            <View className="w-24 h-24 rounded-3xl bg-primary items-center justify-center mb-4 shadow-lg">
              <Text className="text-4xl font-bold text-white">S</Text>
            </View>
            <Text className="text-3xl font-bold text-foreground mb-2">
              Sigorta Acentesi
            </Text>
            <Text className="text-base text-muted">Saha Uygulaması</Text>
          </View>

          {/* Login Form */}
          <View className="gap-4">
            {/* Email Input */}
            <View>
              <Text className="text-sm font-medium text-foreground mb-2">
                Email
              </Text>
              <TextInput
                className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground text-base"
                placeholder="ornek@sigorta.com"
                placeholderTextColor={colors.muted}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setError("");
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!loginMutation.isPending}
              />
            </View>

            {/* Password Input */}
            <View>
              <Text className="text-sm font-medium text-foreground mb-2">
                Şifre
              </Text>
              <TextInput
                className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground text-base"
                placeholder="••••••••"
                placeholderTextColor={colors.muted}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setError("");
                }}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                editable={!loginMutation.isPending}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
            </View>

            {/* Error Message */}
            {error ? (
              <View className="bg-error/10 border border-error/20 rounded-xl px-4 py-3">
                <Text className="text-error text-sm text-center">{error}</Text>
              </View>
            ) : null}

            {/* Login Button */}
            <Pressable
              onPress={handleLogin}
              disabled={loginMutation.isPending}
              style={({ pressed }) => ({
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <View className="bg-primary rounded-xl py-4 items-center mt-2 shadow-sm">
              {loginMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white text-base font-semibold">
                  Giriş Yap
                </Text>
              )}
              </View>
            </Pressable>

            {/* Demo Info */}
            <View className="mt-6 p-4 bg-surface/50 rounded-xl border border-border">
              <Text className="text-xs text-muted text-center mb-2">
                Demo Hesap Bilgileri:
              </Text>
              <Text className="text-xs text-foreground text-center font-mono">
                Email: test@demo.com
              </Text>
              <Text className="text-xs text-foreground text-center font-mono">
                Şifre: 123123123
              </Text>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
