import { Drawer } from 'expo-router/drawer';
import { useColors } from '@/hooks/use-colors';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AuthGuard } from '@/components/auth-guard';
import {
  DrawerContentScrollView,
  DrawerItemList,
  DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { View, Text, Pressable, Alert, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import * as Auth from '@/lib/_core/auth';
import { trpc } from '@/lib/trpc';

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const colors = useColors();
  const logoutMutation = trpc.auth.logout.useMutation();

  const handleLogout = async () => {
    Alert.alert(
      'Çıkış Yap',
      'Çıkış yapmak istediğinize emin misiniz?',
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
              // Haptic feedback
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }

              // Backend logout (cookie temizleme)
              await logoutMutation.mutateAsync();

              // Local session temizleme
              await Auth.removeSessionToken();
              await Auth.clearUserInfo();

              // Login sayfasına yönlendir
              router.replace('/login');
            } catch (error) {
              console.error('Logout error:', error);
              // Hata olsa bile login'e yönlendir
              await Auth.removeSessionToken();
              await Auth.clearUserInfo();
              router.replace('/login');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <DrawerContentScrollView {...props}>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      {/* Logout Button */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.border,
          padding: 16,
        }}
      >
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            padding: 12,
            borderRadius: 8,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <IconSymbol
            name="arrow.right.square.fill"
            color={colors.error}
            size={24}
          />
          <Text
            style={{
              marginLeft: 12,
              fontSize: 16,
              color: colors.error,
              fontWeight: '500',
            }}
          >
            Çıkış Yap
          </Text>
        </Pressable>
      </View>
    </View>
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
      
      {/* Data Upload - menüde gizli */}
      <Drawer.Screen
        name="data-upload"
        options={{
          drawerItemStyle: { display: 'none' },
          title: 'Veri Yükleme',
        }}
      />

    </Drawer>
    </AuthGuard>
  );
}
