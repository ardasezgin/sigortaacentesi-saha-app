import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import type { DashboardMetrics } from '@/lib/types/visit';
import { getDashboardMetrics } from '@/lib/services/visit-storage';
import { getClickUpTasks, testClickUpConnection } from '@/lib/services/clickup';
import type { ClickUpTask } from '@/lib/types/clickup';
import { isSyncCompleted, markSyncCompleted, getSyncMessage } from '@/lib/services/clickup-sync';
import { trpc } from '@/lib/trpc';

/**
 * Dashboard Ekranı - Satış Yöneticisi Performans Özeti
 */
export default function DashboardScreen() {
  const colors = useColors();
  
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [clickupTasks, setClickupTasks] = useState<ClickUpTask[]>([]);
  const [clickupConnected, setClickupConnected] = useState<boolean | null>(null);

  useEffect(() => {
    loadMetrics();
    syncClickUpUsersOnFirstLaunch();
  }, []);

  // Dashboard'a her geçişte metrikleri yenile
  useFocusEffect(
    useCallback(() => {
      loadMetrics();
    }, [])
  );

  // ClickUp kullanıcılarını ilk açılışta sync et
  const syncMutation = trpc.clickup.syncUsers.useMutation();

  const syncClickUpUsersOnFirstLaunch = async () => {
    try {
      const alreadySynced = await isSyncCompleted();
      if (alreadySynced) {
        console.log('[Dashboard] ClickUp users already synced');
        return;
      }

      console.log('[Dashboard] Syncing ClickUp users...');
      const result = await syncMutation.mutateAsync();
      
      if (result.success) {
        await markSyncCompleted();
        console.log('[Dashboard] Sync completed:', getSyncMessage(result));
      }
    } catch (error) {
      console.error('[Dashboard] Sync failed:', error);
    }
  };

  // Acente verileri artık PostgreSQL'de kalıcı olarak saklanıyor
  // Local storage yükleme kodları kaldırıldı

  const loadMetrics = async () => {
    try {
      // Backend'den tüm metrikleri çek (acente, ziyaret, talep)
      const backendMetrics = await getDashboardMetrics();
      setMetrics(backendMetrics);
    } catch (error) {
      console.error('Metrics yüklenirken hata:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadMetrics();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <ScreenContainer className="bg-background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="text-base text-muted mt-4">
            Yükleniyor...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!metrics) {
    return (
      <ScreenContainer className="bg-background">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-xl font-bold text-foreground mb-2">
            Veri yüklenemedi
          </Text>
          <TouchableOpacity
            onPress={loadMetrics}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 8,
              backgroundColor: colors.primary,
              marginTop: 16,
            }}
          >
            <Text className="text-white font-semibold">
              Tekrar Dene
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="bg-background">
      <ScrollView
        className="flex-1 px-4 bg-background"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View className="py-6 gap-6">
          {/* Başlık */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">
              Dashboard
            </Text>
            <Text className="text-base text-muted">
              Satış performansı ve genel durum
            </Text>
          </View>

          {/* Acente verileri PostgreSQL'de kalıcı olarak saklanıyor */}

          {/* Metrik Kartları */}
          <View className="gap-4">
            {/* Acente İstatistikleri */}
            <View className="bg-surface rounded-2xl p-5 border border-border">
              <Text className="text-lg font-bold text-foreground mb-4">
                📊 Acente İstatistikleri
              </Text>
              <View className="gap-3">
                <View className="flex-row justify-between items-center">
                  <Text className="text-base text-muted">Toplam Acente</Text>
                  <Text className="text-2xl font-bold text-foreground">
                    {metrics.totalAgencies.toLocaleString()}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-base text-success">Aktif</Text>
                  <Text className="text-xl font-semibold text-success">
                    {metrics.activeAgencies.toLocaleString()}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-base text-muted">Pasif</Text>
                  <Text className="text-xl font-semibold text-muted">
                    {metrics.passiveAgencies.toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>

            {/* Ziyaret İstatistikleri */}
            <View className="bg-surface rounded-2xl p-5 border border-border">
              <Text className="text-lg font-bold text-foreground mb-4">
                🚗 Ziyaret İstatistikleri
              </Text>
              <View className="gap-3">
                <View className="flex-row justify-between items-center">
                  <Text className="text-base text-muted">Bu Hafta</Text>
                  <Text className="text-2xl font-bold text-primary">
                    {metrics.totalVisitsThisWeek}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-base text-muted">Bu Ay</Text>
                  <Text className="text-xl font-semibold text-foreground">
                    {metrics.totalVisitsThisMonth}
                  </Text>
                </View>
              </View>
            </View>

            {/* İletişim & Talepler */}
            {/* Talepler */}
            <View className="bg-surface rounded-2xl p-5 border border-border">
              <Text className="text-lg font-bold text-foreground mb-4">
                📝 Talepler
              </Text>
              <View className="gap-3">
                <View className="flex-row justify-between items-center">
                  <Text className="text-base text-warning">Açık Talepler</Text>
                  <Text className="text-2xl font-bold text-warning">
                    {metrics.openRequests}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-base text-muted">Bu Ay Yeni Acente</Text>
                  <Text className="text-xl font-semibold text-foreground">
                    {metrics.newAgenciesThisMonth}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
