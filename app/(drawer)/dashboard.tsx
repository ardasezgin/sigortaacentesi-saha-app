import { useState, useEffect } from 'react';
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
import { getDashboardMetrics as getLocalDashboardMetrics } from '@/lib/services/visit-storage';
import { getAllAgencies } from '@/lib/services/agency-service';
import { getClickUpTasks, testClickUpConnection } from '@/lib/services/clickup';
import type { ClickUpTask } from '@/lib/types/clickup';

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
  }, []);

  // Acente verileri artık PostgreSQL'de kalıcı olarak saklanıyor
  // Local storage yükleme kodları kaldırıldı

  const loadMetrics = async () => {
    try {
      // Backend'den acente verilerini çek
      const agencies = await getAllAgencies();
      const backendCount = agencies.length;
      
      // Eğer backend'de veri varsa backend'den metrik hesapla
      if (backendCount > 0) {
        const activeCount = agencies.filter(a => a.isActive !== 0).length;
        const passiveCount = agencies.filter(a => a.isActive === 0).length;
        
        // Local storage'dan ziyaret ve talep verilerini al (bunlar henüz backend'de değil)
        const localMetrics = await getLocalDashboardMetrics();
        
        setMetrics({
          totalAgencies: backendCount,
          activeAgencies: activeCount,
          passiveAgencies: passiveCount,
          totalVisitsThisWeek: localMetrics.totalVisitsThisWeek,
          totalVisitsThisMonth: localMetrics.totalVisitsThisMonth,
          newAgenciesThisMonth: localMetrics.newAgenciesThisMonth,
          openRequests: localMetrics.openRequests,
          recentVisits: localMetrics.recentVisits,
          recentRequests: localMetrics.recentRequests,
        });
      } else {
        // Backend'de veri yoksa local metrics kullan
        const localMetrics = await getLocalDashboardMetrics();
        setMetrics(localMetrics);
      }
    } catch (error) {
      console.error('Metrics yüklenirken hata:', error);
      // Hata durumunda local metrics'i dene
      try {
        const localMetrics = await getLocalDashboardMetrics();
        setMetrics(localMetrics);
      } catch (localError) {
        console.error('Local metrics yüklenemedi:', localError);
      }
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
        className="flex-1 px-4"
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
