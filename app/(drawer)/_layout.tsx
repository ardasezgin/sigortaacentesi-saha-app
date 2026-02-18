import { Drawer } from 'expo-router/drawer';
import { useColors } from '@/hooks/use-colors';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AuthGuard } from '@/components/auth-guard';
import { DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { useRouter } from 'expo-router';
import { Alert, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { trpc } from '@/lib/trpc';

function CustomDrawerContent(props: any) {
  const colors = useColors();
  const router = useRouter();
  const logoutMutation = trpc.auth.logout.useMutation();

  const handleLogout = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    Alert.alert(
      'Çıkış Yap',
      'Çıkış yapmak istediğinizden emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            try {
              await logoutMutation.mutateAsync();
              router.replace('/login');
            } catch (error) {
              console.error('Logout error:', error);
              // Hata olsa bile login'e yönlendir
              router.replace('/login');
            }
          },
        },
      ]
    );
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
