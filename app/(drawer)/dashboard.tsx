import { useState, useEffect } from 'react';
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import type { DashboardMetrics } from '@/lib/types/visit';
import { getDashboardMetrics as getLocalDashboardMetrics } from '@/lib/services/visit-storage';
import { getAllAgencies } from '@/lib/services/agency-service';
import { initializeAgencies } from '@/lib/services/init-agencies';
import { getClickUpTasks, testClickUpConnection } from '@/lib/services/clickup';
import type { ClickUpTask } from '@/lib/types/clickup';
import { importAgenciesFromExcel, getAgencyCount } from '@/lib/services/agency-service';

/**
 * Dashboard Ekranı - Satış Yöneticisi Performans Özeti
 */
export default function DashboardScreen() {
  const colors = useColors();
  
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // isLoadingSample ve isLoadingExcel state'leri kaldırıldı (veri yükleme menüye taşındı)
  const [clickupTasks, setClickupTasks] = useState<ClickUpTask[]>([]);
  const [clickupConnected, setClickupConnected] = useState<boolean | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [backendAgencyCount, setBackendAgencyCount] = useState<number | null>(null);

  useEffect(() => {
    loadMetrics();
    // Otomatik Excel yükleme (ilk açılışta)
    autoLoadExcel();
    // Backend'deki acente sayısını kontrol et
    checkBackendData();
  }, []);

  const checkBackendData = async () => {
    try {
      const count = await getAgencyCount();
      setBackendAgencyCount(count);
    } catch (error) {
      console.error('Backend veri kontrolü hatası:', error);
    }
  };

  const autoLoadExcel = async () => {
    try {
      const result = await initializeAgencies();
      if (result.success) {
        console.log('Acente verileri yüklendi:', result.count);
      }
    } catch (error) {
      console.error('Otomatik Excel yükleme hatası:', error);
    }
  };

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
        
        const data: DashboardMetrics = {
          totalAgencies: backendCount,
          activeAgencies: activeCount,
          passiveAgencies: passiveCount,
          totalVisitsThisWeek: localMetrics.totalVisitsThisWeek,
          totalVisitsThisMonth: localMetrics.totalVisitsThisMonth,
          newAgenciesThisMonth: 0, // TODO: Backend'den hesapla
          openRequests: localMetrics.openRequests,
          recentVisits: localMetrics.recentVisits,
          recentRequests: localMetrics.recentRequests,
        };
        setMetrics(data);
        setBackendAgencyCount(backendCount);
      } else {
        // Backend boşsa local storage'dan çek
        const data = await getLocalDashboardMetrics();
        setMetrics(data);
        setBackendAgencyCount(0);
      }
      
      // ClickUp bağlantısını test et ve görevleri yükle
      const isConnected = await testClickUpConnection();
      setClickupConnected(isConnected);
      
      if (isConnected) {
        const tasks = await getClickUpTasks();
        // Sadece açık görevleri göster
        const openTasks = tasks.filter(task => 
          task.status.status.toLowerCase() !== 'complete' &&
          task.status.status.toLowerCase() !== 'closed'
        );
        setClickupTasks(openTasks.slice(0, 5)); // Son 5 açık görev
      }
    } catch (error) {
      console.error('Dashboard metrikleri yüklenirken hata:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadMetrics();
    await checkBackendData();
    setIsRefreshing(false);
  };

  // handleLoadExcel ve handleLoadSampleData fonksiyonları kaldırıldı (veri yükleme menüye taşındı)

  const handleMigrateToBackend = async () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      Alert.alert(
        'Verileri Backend\'e Taşı',
        `${metrics?.totalAgencies || 0} acente kaydı PostgreSQL\'e taşınacak. Tüm cihazlar bu veriyi kullanabilecek. Devam edilsin mi?`,
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Taşı',
            onPress: async () => {
              setIsMigrating(true);
              try {
                const result = await importAgenciesFromExcel();
                if (result.success) {
                  Alert.alert(
                    'Başarılı! 🎉',
                    `${result.count} acente kaydı PostgreSQL\'e taşındı. Artık tüm cihazlardan erişebilirsiniz.`,
                    [
                      {
                        text: 'Tamam',
                        onPress: async () => {
                          await checkBackendData();
                          await loadMetrics();
                        },
                      },
                    ]
                  );
                } else {
                  Alert.alert('Hata', result.message);
                }
              } catch (error) {
                Alert.alert(
                  'Hata',
                  `Migration sırasında hata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`
                );
              } finally {
                setIsMigrating(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Migration başlatma hatası:', error);
    }
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

  // showSampleDataButton kaldırıldı (veri yükleme menüye taşındı)

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

          {/* Veri yükleme butonları menüye taşındı */}

          {/* Backend Migration Butonu */}
          {(backendAgencyCount === null || backendAgencyCount === 0) && metrics.totalAgencies > 0 && (
            <View className="bg-warning/10 rounded-2xl p-4 border border-warning">
              <Text className="text-lg font-bold text-foreground mb-2">
                🚀 Verileri Backend'e Taşı
              </Text>
              <Text className="text-sm text-muted mb-4">
                {metrics.totalAgencies} acente kaydınız local storage'da. Tüm cihazlarda kullanmak için PostgreSQL'e taşıyın.
              </Text>
              <TouchableOpacity
                onPress={handleMigrateToBackend}
                disabled={isMigrating}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  borderRadius: 8,
                  backgroundColor: isMigrating ? colors.muted : colors.warning,
                  opacity: isMigrating ? 0.6 : 1,
                }}
              >
                {isMigrating ? (
                  <View className="flex-row items-center justify-center gap-2">
                    <ActivityIndicator size="small" color="white" />
                    <Text className="text-white font-semibold">Taşınıyor...</Text>
                  </View>
                ) : (
                  <Text className="text-white font-semibold text-center">
                    Backend'e Taşı
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Backend Migration Başarılı */}
          {backendAgencyCount !== null && backendAgencyCount > 0 && metrics.totalAgencies > 0 && (
            <View className="bg-success/10 rounded-2xl p-4 border border-success">
              <Text className="text-lg font-bold text-foreground mb-2">
                ✅ Backend Aktif
              </Text>
              <Text className="text-sm text-muted">
                {backendAgencyCount} acente kaydı PostgreSQL'de. Tüm cihazlar ortak veriyi kullanıyor.
              </Text>
            </View>
          )}

          {/* Özet Kartlar - Üst Satır */}
          <View className="flex-row gap-3">
            <MetricCard
              title="Toplam Acente"
              value={metrics.totalAgencies}
              color={colors.primary}
              flex={1}
            />
            <MetricCard
              title="Aktif"
              value={metrics.activeAgencies}
              color={colors.success}
              flex={1}
            />
            <MetricCard
              title="Pasif"
              value={metrics.passiveAgencies}
              color={colors.error}
              flex={1}
            />
          </View>

          {/* Ziyaret İstatistikleri */}
          <View className="bg-surface rounded-2xl p-4 border border-border shadow-sm">
            <Text className="text-lg font-bold text-foreground mb-4">
              Ziyaret İstatistikleri
            </Text>
            <View className="gap-3">
              <StatRow
                label="Bu Hafta"
                value={metrics.totalVisitsThisWeek}
                icon="📅"
              />
              <StatRow
                label="Bu Ay"
                value={metrics.totalVisitsThisMonth}
                icon="📊"
              />
              <StatRow
                label="Bu Ay Yeni Kayıt"
                value={metrics.newAgenciesThisMonth}
                icon="✨"
              />
            </View>
          </View>

          {/* Açık Talepler */}
          <View className="bg-surface rounded-2xl p-4 border border-border shadow-sm">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-lg font-bold text-foreground">
                Açık Talepler
              </Text>
              <View
                className="px-3 py-1 rounded-full"
                style={{
                  backgroundColor: metrics.openRequests > 0 ? colors.warning + '20' : colors.success + '20',
                }}
              >
                <Text
                  className="text-sm font-bold"
                  style={{
                    color: metrics.openRequests > 0 ? colors.warning : colors.success,
                  }}
                >
                  {metrics.openRequests}
                </Text>
              </View>
            </View>
            <Text className="text-sm text-muted">
              {metrics.openRequests === 0
                ? 'Tüm talepler çözüldü 🎉'
                : `${metrics.openRequests} talep bekliyor`}
            </Text>
          </View>

          {/* ClickUp Görevleri */}
          {clickupConnected && clickupTasks.length > 0 && (
            <View className="bg-surface rounded-2xl p-4 border border-border shadow-sm">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-lg font-bold text-foreground">
                  ClickUp Görevleri
                </Text>
                <View
                  className="px-2 py-1 rounded"
                  style={{ backgroundColor: colors.primary + '20' }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: colors.primary }}
                  >
                    {clickupTasks.length} açık
                  </Text>
                </View>
              </View>
              <View className="gap-2">
                {clickupTasks.map((task) => (
                  <TouchableOpacity
                    key={task.id}
                    onPress={async () => {
                      // ClickUp task URL'ini aç
                      if (Platform.OS !== 'web') {
                        try {
                          const WebBrowser = await import('expo-web-browser');
                          await WebBrowser.openBrowserAsync(task.url);
                        } catch (error) {
                          console.error('WebBrowser açılamadı:', error);
                          // Fallback: Linking API kullan
                          const { Linking } = await import('react-native');
                          await Linking.openURL(task.url);
                        }
                      } else {
                        window.open(task.url, '_blank');
                      }
                    }}
                    className="bg-background rounded-lg p-3 border border-border"
                  >
                    <View className="flex-row justify-between items-start">
                      <Text className="text-sm font-semibold text-foreground flex-1 mr-2">
                        {task.name}
                      </Text>
                      {task.priority && (
                        <View
                          className="px-2 py-1 rounded"
                          style={{ backgroundColor: task.priority.color + '20' }}
                        >
                          <Text
                            className="text-xs font-semibold"
                            style={{ color: task.priority.color }}
                          >
                            {task.priority.priority}
                          </Text>
                        </View>
                      )}
                    </View>
                    {task.tags && task.tags.length > 0 && (
                      <View className="flex-row gap-1 mt-2 flex-wrap">
                        {task.tags.map((tag, idx) => {
                          // Tag bir obje ise (name property'si varsa) name'i al, değilse string olarak kullan
                          const tagName = typeof tag === 'object' && tag !== null && 'name' in tag ? tag.name : String(tag);
                          return (
                            <View
                              key={idx}
                              className="px-2 py-1 rounded"
                              style={{ backgroundColor: colors.muted + '20' }}
                            >
                              <Text className="text-xs text-muted">
                                {tagName}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {clickupConnected === false && (
            <View className="bg-warning/10 rounded-2xl p-4 border border-warning/30">
              <Text className="text-sm font-semibold text-foreground mb-1">
                ⚠️ ClickUp Bağlantısı Yok
              </Text>
              <Text className="text-xs text-muted">
                ClickUp entegrasyonu şu anda çalışmıyor. Lütfen ayarları kontrol edin.
              </Text>
            </View>
          )}

          {/* Son Ziyaretler */}
          {metrics.recentVisits.length > 0 && (
            <View className="gap-3">
              <Text className="text-lg font-bold text-foreground">
                Son Ziyaretler
              </Text>
              {metrics.recentVisits.map((visit) => (
                <View
                  key={visit.id}
                  className="bg-surface rounded-xl p-4 border border-border"
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <Text className="text-base font-semibold text-foreground flex-1">
                      {visit.acenteAdi}
                    </Text>
                    <View
                      className="px-2 py-1 rounded"
                      style={{
                        backgroundColor: visit.iletisimTuru === 'Ziyaret'
                          ? colors.primary + '20'
                          : colors.success + '20',
                      }}
                    >
                      <Text
                        className="text-xs font-semibold"
                        style={{
                          color: visit.iletisimTuru === 'Ziyaret'
                            ? colors.primary
                            : colors.success,
                        }}
                      >
                        {visit.iletisimTuru === 'Ziyaret' ? '🏢' : '📞'}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-sm text-muted mb-1">
                    {new Date(visit.tarih).toLocaleDateString('tr-TR')} • {visit.detayAciklama} dk
                  </Text>
                  {visit.detayAciklama && (
                    <Text className="text-sm text-foreground mt-2">
                      {visit.detayAciklama.length > 80
                        ? visit.detayAciklama.substring(0, 80) + '...'
                        : visit.detayAciklama}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Son Talepler */}
          {metrics.recentRequests.length > 0 && (
            <View className="gap-3 pb-6">
              <Text className="text-lg font-bold text-foreground">
                Son Talepler
              </Text>
              {metrics.recentRequests.map((request) => (
                <View
                  key={request.id}
                  className="bg-surface rounded-xl p-4 border border-border"
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <Text className="text-base font-semibold text-foreground flex-1">
                      {request.subject}
                    </Text>
                    <View
                      className="px-2 py-1 rounded"
                      style={{
                        backgroundColor:
                          request.status === 'Çözüldü'
                            ? colors.success + '20'
                            : request.status === 'Devam Ediyor'
                            ? colors.warning + '20'
                            : colors.error + '20',
                      }}
                    >
                      <Text
                        className="text-xs font-semibold"
                        style={{
                          color:
                            request.status === 'Çözüldü'
                              ? colors.success
                              : request.status === 'Devam Ediyor'
                              ? colors.warning
                              : colors.error,
                        }}
                      >
                        {request.status}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-sm text-muted mb-1">
                    {request.acenteAdi} • {request.requestType}
                  </Text>
                  <Text className="text-xs text-muted">
                    {new Date(request.createdAt).toLocaleDateString('tr-TR')}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

/**
 * Metrik kartı bileşeni
 */
function MetricCard({
  title,
  value,
  color,
  flex,
}: {
  title: string;
  value: number;
  color: string;
  flex: number;
}) {
  return (
    <View
      className="bg-surface rounded-xl p-4 border border-border shadow-sm"
      style={{ flex }}
    >
      <Text className="text-xs text-muted mb-2">
        {title}
      </Text>
      <Text
        className="text-2xl font-bold"
        style={{ color }}
      >
        {value}
      </Text>
    </View>
  );
}

/**
 * İstatistik satırı bileşeni
 */
function StatRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  const colors = useColors();
  
  return (
    <View className="flex-row justify-between items-center py-2">
      <View className="flex-row items-center gap-2">
        <Text className="text-base">{icon}</Text>
        <Text className="text-sm text-foreground">
          {label}
        </Text>
      </View>
      <Text className="text-lg font-bold" style={{ color: colors.primary }}>
        {value}
      </Text>
    </View>
  );
}
