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
  ScrollView,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/use-colors";

export default function RegisterScreen() {
  const colors = useColors();
  const { isAuthenticated, loading, refresh } = useAuth({ autoFetch: true });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  
  const registerMutation = trpc.auth.register.useMutation();

  // Redirect to home if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/(drawer)");
    }
  }, [isAuthenticated, loading]);

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setError("Lütfen tüm alanları doldurun");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }

    if (password !== confirmPassword) {
      setError("Şifreler eşleşmiyor");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }

    if (password.length < 6) {
      setError("Şifre en az 6 karakter olmalı");
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

      // Call backend register endpoint
      const result = await registerMutation.mutateAsync({ name, email, password });
      
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
      const errorMessage = err instanceof Error ? err.message : "Kayıt olurken bir hata oluştu";
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
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View className="flex-1 px-6 justify-center py-8">
            {/* Logo Section */}
            <View className="items-center mb-8">
              <View className="w-20 h-20 rounded-3xl bg-primary items-center justify-center mb-3 shadow-lg">
                <Text className="text-3xl font-bold text-white">S</Text>
              </View>
              <Text className="text-2xl font-bold text-foreground mb-1">
                Hesap Oluştur
              </Text>
              <Text className="text-sm text-muted">Aksiyon Saha Uygulaması</Text>
            </View>

            {/* Register Form */}
            <View className="gap-3">
              {/* Name Input */}
              <View>
                <Text className="text-sm font-medium text-foreground mb-2">
                  Ad Soyad
                </Text>
                <TextInput
                  className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground text-base"
                  placeholder="Adınız Soyadınız"
                  placeholderTextColor={colors.muted}
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    setError("");
                  }}
                  autoCapitalize="words"
                  autoComplete="name"
                  editable={!registerMutation.isPending}
                />
              </View>

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
                  editable={!registerMutation.isPending}
                />
              </View>

              {/* Password Input */}
              <View>
                <Text className="text-sm font-medium text-foreground mb-2">
                  Şifre
                </Text>
                <TextInput
                  className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground text-base"
                  placeholder="En az 6 karakter"
                  placeholderTextColor={colors.muted}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setError("");
                  }}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password-new"
                  editable={!registerMutation.isPending}
                />
              </View>

              {/* Confirm Password Input */}
              <View>
                <Text className="text-sm font-medium text-foreground mb-2">
                  Şifre Tekrar
                </Text>
                <TextInput
                  className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground text-base"
                  placeholder="Şifrenizi tekrar girin"
                  placeholderTextColor={colors.muted}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    setError("");
                  }}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password-new"
                  editable={!registerMutation.isPending}
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
                />
              </View>

              {/* Error Message */}
              {error ? (
                <View className="bg-error/10 border border-error/20 rounded-xl px-4 py-3">
                  <Text className="text-error text-sm text-center">{error}</Text>
                </View>
              ) : null}

              {/* Register Button */}
              <Pressable
                onPress={handleRegister}
                disabled={registerMutation.isPending}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
              >
                <View className="bg-primary rounded-xl py-4 items-center mt-2 shadow-sm">
                {registerMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-white text-base font-semibold">
                    Kayıt Ol
                  </Text>
                )}
                </View>
              </Pressable>

              {/* Login Link */}
              <View className="mt-4">
                <Pressable
                  onPress={() => router.push("/login")}
                  disabled={registerMutation.isPending}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text className="text-sm text-muted text-center">
                    Zaten hesabınız var mı?{" "}
                    <Text className="text-primary font-semibold">Giriş Yap</Text>
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
