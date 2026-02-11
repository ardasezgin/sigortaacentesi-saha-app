import { useAuth } from "@/hooks/use-auth";
import { router } from "expo-router";
import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * AuthGuard component that protects routes requiring authentication.
 * Redirects to login screen if user is not authenticated.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const colors = useColors();
  const { isAuthenticated, loading } = useAuth({ autoFetch: true });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, loading]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
