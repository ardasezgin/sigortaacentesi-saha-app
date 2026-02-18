import { Drawer } from 'expo-router/drawer';
import { useColors } from '@/hooks/use-colors';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AuthGuard } from '@/components/auth-guard';
import { DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { useRouter } from 'expo-router';
import { Alert, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Auth from '@/lib/_core/auth';
import { trpc } from '@/lib/trpc';

function CustomDrawerContent(props: any) {
  const colors = useColors();
  const router = useRouter();
  const utils = trpc.useUtils();

  const handleLogout = async () => {
    console.log('[Logout] Button pressed!');
    
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    try {
      // Backend logout (cookie temizleme)
      await utils.client.auth.logout.mutate();
      console.log('[Logout] Backend logout successful');
    } catch (error) {
      console.error('[Logout] Backend logout failed:', error);
    }
    
    // Local session'u temizle
    await Auth.removeSessionToken();
    await Auth.clearUserInfo();
    console.log('[Logout] Local session cleared');
    
    // tRPC cache'i temizle
    utils.auth.me.reset();
    console.log('[Logout] Cache cleared, navigating to login...');
    
    // Login sayfasına yönlendir
    router.replace('/login');
  };

  return (
    <DrawerContentScrollView {...props}>
      <DrawerItemList {...props} />
      <DrawerItem
        label="Çıkış Yap"
        onPress={handleLogout}
        icon={({ color, size }) => (
          <IconSymbol name="arrow.right.square.fill" color={color} size={size} />
        )}
        inactiveTintColor={colors.error}
        style={{ marginTop: 20 }}
      />
    </DrawerContentScrollView>
  );
}

export default function DrawerLayout() {
  const colors = useColors();

  return (
    <AuthGuard>
    <Drawer
      initialRouteName="dashboard"
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.foreground,
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.muted,
        drawerStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      {/* Index route - menüde görünmez, sadece redirect için */}
      <Drawer.Screen
        name="index"
        options={{
          drawerItemStyle: { display: 'none' },
        }}
      />
      <Drawer.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          drawerLabel: 'Dashboard',
          drawerIcon: ({ color, size }) => (
            <IconSymbol name="chart.bar.fill" color={color} size={size} />
          ),
        }}
      />
      <Drawer.Screen
        name="agencies"
        options={{
          title: 'Acentelerim',
          drawerLabel: 'Acentelerim',
          drawerIcon: ({ color, size }) => (
            <IconSymbol name="building.2.fill" color={color} size={size} />
          ),
        }}
      />
      <Drawer.Screen
        name="visit"
        options={{
          title: 'Ziyaret/Arama Girişi',
          drawerLabel: 'Ziyaret/Arama Girişi',
          drawerIcon: ({ color, size }) => (
            <IconSymbol name="calendar.badge.plus" color={color} size={size} />
          ),
        }}
      />
      <Drawer.Screen
        name="requests"
        options={{
          title: 'Talep/İstek/Şikayet',
          drawerLabel: 'Talep/İstek/Şikayet',
          drawerIcon: ({ color, size }) => (
            <IconSymbol name="exclamationmark.bubble.fill" color={color} size={size} />
          ),
        }}
      />

    </Drawer>
    </AuthGuard>
  );
}
