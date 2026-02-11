import { Drawer } from 'expo-router/drawer';
import { useColors } from '@/hooks/use-colors';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function DrawerLayout() {
  const colors = useColors();

  return (
    <Drawer
      initialRouteName="dashboard"
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
      <Drawer.Screen
        name="data-upload"
        options={{
          title: 'Veri Yükle',
          drawerLabel: 'Veri Yükle',
          drawerIcon: ({ color, size }) => (
            <IconSymbol name="arrow.up.doc.fill" color={color} size={size} />
          ),
        }}
      />
    </Drawer>
  );
}
