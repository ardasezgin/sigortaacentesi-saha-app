import { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { trpc } from '@/lib/trpc';
import * as Auth from '@/lib/_core/auth';
import { useColors } from '@/hooks/use-colors';

/**
 * Logout Screen - Automatically logs out the user when navigated to
 */
export default function LogoutScreen() {
  const colors = useColors();
  const logoutMutation = trpc.auth.logout.useMutation();

  useEffect(() => {
    const performLogout = async () => {
      console.log('[Logout] Starting logout process...');
      
      try {
        // Backend logout (cookie temizleme)
        console.log('[Logout] Calling backend logout...');
        await logoutMutation.mutateAsync();
        console.log('[Logout] Backend logout successful');
      } catch (error) {
        console.error('[Logout] Backend logout error:', error);
      }

      // Local session temizleme (her durumda çalışmalı)
      console.log('[Logout] Clearing local session...');
      await Auth.removeSessionToken();
      await Auth.clearUserInfo();
      console.log('[Logout] Local session cleared');

      // Login sayfasına yönlendir
      console.log('[Logout] Redirecting to login...');
      router.replace('/login');
    };

    performLogout();
  }, []);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
      }}
    >
      <ActivityIndicator size="large" color={colors.primary} />
      <Text
        style={{
          marginTop: 16,
          fontSize: 16,
          color: colors.foreground,
        }}
      >
        Çıkış yapılıyor...
      </Text>
    </View>
  );
}
