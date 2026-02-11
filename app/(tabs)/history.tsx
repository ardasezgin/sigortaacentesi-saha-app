import { useState, useEffect } from 'react';
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import type { AgencyLog } from '@/lib/types/agency';
import { getAllLogs } from '@/lib/services/storage';

/**
 * Geçmiş Ekranı
 * 
 * Tüm saha ziyareti kayıtlarını görüntüleme
 */
export default function HistoryScreen() {
  const colors = useColors();
  
  const [logs, setLogs] = useState<AgencyLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  /**
   * Tüm logları yükle
   */
  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const allLogs = await getAllLogs();
      setLogs(allLogs);
    } catch (error) {
      console.error('Loglar yüklenirken hata:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Log detayını aç/kapat
   */
  const toggleLogDetail = (logId: string) => {
    setExpandedLogId(expandedLogId === logId ? null : logId);
  };

  /**
   * Tarih formatla
   */
  const formatDate = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <ScreenContainer className="bg-background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="text-base text-muted mt-4">
            Kayıtlar yükleniyor...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  if (logs.length === 0) {
    return (
      <ScreenContainer className="bg-background">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-6xl mb-4">📋</Text>
          <Text className="text-xl font-bold text-foreground mb-2">
            Henüz kayıt yok
          </Text>
          <Text className="text-base text-muted text-center">
            Saha ziyareti formunu doldurarak ilk kaydınızı oluşturun
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="bg-background">
      <ScrollView className="flex-1 px-4">
        <View className="py-6 gap-6">
          {/* Başlık */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">
              Ziyaret Geçmişi
            </Text>
            <Text className="text-base text-muted">
              Toplam {logs.length} kayıt
            </Text>
          </View>

          {/* Log Listesi */}
          <View className="gap-3">
            {logs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              
              return (
                <TouchableOpacity
                  key={log.id}
                  onPress={() => toggleLogDetail(log.id)}
                  activeOpacity={0.7}
                >
                  <View className="bg-surface rounded-xl p-4 border border-border">
                    {/* Başlık Satırı */}
                    <View className="flex-row justify-between items-start mb-2">
                      <View className="flex-1 mr-3">
                        <Text className="text-base font-semibold text-foreground mb-1">
                          {log.yeniVeri.acenteUnvani}
                        </Text>
                        <Text className="text-sm text-muted">
                          Levha No: {log.levhaNo}
                        </Text>
                      </View>
                      <View
                        className="px-3 py-1 rounded-full"
                        style={{
                          backgroundColor:
                            log.islemTipi === 'Yeni'
                              ? colors.success + '20'
                              : colors.warning + '20',
                        }}
                      >
                        <Text
                          className="text-xs font-semibold"
                          style={{
                            color:
                              log.islemTipi === 'Yeni'
                                ? colors.success
                                : colors.warning,
                          }}
                        >
                          {log.islemTipi}
                        </Text>
                      </View>
                    </View>

                    {/* Tarih ve Kullanıcı */}
                    <View className="gap-1 mb-2">
                      <Text className="text-xs text-muted">
                        📅 {formatDate(log.kayitTarihi)}
                      </Text>
                      <Text className="text-xs text-muted">
                        👤 {log.guncelleyenKullanici}
                      </Text>
                    </View>

                    {/* Detay Göstergesi */}
                    <View className="flex-row items-center justify-center mt-2 pt-2 border-t border-border">
                      <Text className="text-xs text-muted">
                        {isExpanded ? '▲ Detayı Gizle' : '▼ Detayı Göster'}
                      </Text>
                    </View>

                    {/* Genişletilmiş Detay */}
                    {isExpanded && (
                      <View className="mt-4 pt-4 border-t border-border gap-3">
                        <Text className="text-sm font-bold text-foreground mb-2">
                          Güncel Bilgiler:
                        </Text>
                        
                        <View className="gap-2">
                          <DetailRow
                            label="Yetkili"
                            value={log.yeniVeri.teknikPersonel}
                          />
                          <DetailRow
                            label="Telefon"
                            value={log.yeniVeri.telefon}
                          />
                          <DetailRow
                            label="E-posta"
                            value={log.yeniVeri.eposta}
                          />
                          <DetailRow
                            label="Adres"
                            value={log.yeniVeri.adres}
                          />
                          <DetailRow
                            label="Şehir/İlçe"
                            value={`${log.yeniVeri.il} / ${log.yeniVeri.ilce}`}
                          />
                          <DetailRow
                            label="Vergi No"
                            value={log.yeniVeri.notlar || ""}
                          />
                          <DetailRow
                            label="Durum"
                            value={log.yeniVeri.durum || "Aktif"}
                            valueColor={
                              log.yeniVeri.durum === 'Aktif'
                                ? colors.success
                                : colors.error
                            }
                          />
                        </View>

                        {/* Önceki Veri (Güncelleme durumunda) */}
                        {log.islemTipi === 'Güncelleme' && log.oncekiVeri && (
                          <View className="mt-4 pt-4 border-t border-border">
                            <Text className="text-sm font-bold text-muted mb-2">
                              Önceki Bilgiler:
                            </Text>
                            <View className="gap-2 opacity-60">
                              {log.oncekiVeri.teknikPersonel && (
                                <DetailRow
                                  label="Yetkili"
                                  value={log.oncekiVeri.teknikPersonel}
                                />
                              )}
                              {log.oncekiVeri.telefon && (
                                <DetailRow
                                  label="Telefon"
                                  value={log.oncekiVeri.telefon}
                                />
                              )}
                              {log.oncekiVeri.durum && (
                                <DetailRow
                                  label="Durum"
                                  value={log.oncekiVeri.durum}
                                />
                              )}
                            </View>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

/**
 * Detay satırı bileşeni
 */
function DetailRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string | null | undefined;
  valueColor?: string;
}) {
  const colors = useColors();
  
  return (
    <View className="flex-row justify-between items-start">
      <Text className="text-xs text-muted flex-shrink-0 w-24">
        {label}:
      </Text>
      <Text
        className="text-xs flex-1 text-right"
        style={{ color: valueColor || colors.foreground }}
      >
        {value || '-'}
      </Text>
    </View>
  );
}
