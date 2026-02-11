import { Redirect } from 'expo-router';

/**
 * Index route - Dashboard'a yönlendir
 * Bu dosya Expo Router'ın düzgün çalışması için gerekli
 * Menüde görünmemesi için _layout.tsx'te drawerItemStyle ile gizleniyor
 */
export default function Index() {
  return <Redirect href="/(drawer)/dashboard" />;
}
