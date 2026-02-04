import { useState, useEffect } from 'react';
import {
  ScrollView,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import type { Agency } from '@/lib/types/agency';
import { getAllAgencies } from '@/lib/services/storage';

/**
 * Acentelerim Ekranı - Tüm acenteleri listeleme ve arama
 */
export default function AgenciesScreen() {
  const colors = useColors();
  
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [filteredAgencies, setFilteredAgencies] = useState<Agency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'Tümü' | 'Aktif' | 'Pasif'>('Tümü');

  useEffect(() => {
    loadAgencies();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, filterStatus, agencies]);

  const loadAgencies = async () => {
    setIsLoading(true);
    try {
      const data = await getAllAgencies();
      setAgencies(data);
      setFilteredAgencies(data);
    } catch (error) {
      console.error('Acenteler yüklenirken hata:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...agencies];

    // Durum filtresi
    if (filterStatus !== 'Tümü') {
      filtered = filtered.filter(a => a.durum === filterStatus);
    }

    // Arama filtresi
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        a =>
          a.acenteAdi.toLowerCase().includes(query) ||
          a.levhaNo.toLowerCase().includes(query) ||
          a.sehir.toLowerCase().includes(query) ||
          a.ilce.toLowerCase().includes(query)
      );
    }

    setFilteredAgencies(filtered);
  };

  if (isLoading) {
    return (
      <ScreenContainer className="bg-background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="text-base text-muted mt-4">
            Acenteler yükleniyor...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="bg-background">
      <View className="flex-1 px-4">
        <View className="py-4 gap-4">
          {/* Arama */}
          <TextInput
            className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
            placeholder="Acente adı, levha no, şehir ara..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {/* Durum Filtreleri */}
          <View className="flex-row gap-2">
            <FilterButton
              label="Tümü"
              count={agencies.length}
              isActive={filterStatus === 'Tümü'}
              onPress={() => setFilterStatus('Tümü')}
              color={colors.primary}
            />
            <FilterButton
              label="Aktif"
              count={agencies.filter(a => a.durum === 'Aktif').length}
              isActive={filterStatus === 'Aktif'}
              onPress={() => setFilterStatus('Aktif')}
              color={colors.success}
            />
            <FilterButton
              label="Pasif"
              count={agencies.filter(a => a.durum === 'Pasif').length}
              isActive={filterStatus === 'Pasif'}
              onPress={() => setFilterStatus('Pasif')}
              color={colors.error}
            />
          </View>
        </View>

        {/* Acente Listesi */}
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="gap-3 pb-6">
            {filteredAgencies.length === 0 ? (
              <View className="items-center justify-center py-12">
                <Text className="text-6xl mb-4">🏢</Text>
                <Text className="text-lg font-bold text-foreground mb-2">
                  Acente bulunamadı
                </Text>
                <Text className="text-sm text-muted text-center">
                  {searchQuery
                    ? 'Arama kriterlerinize uygun acente yok'
                    : 'Henüz kayıtlı acente bulunmuyor'}
                </Text>
              </View>
            ) : (
              filteredAgencies.map((agency) => (
                <TouchableOpacity
                  key={agency.levhaNo}
                  activeOpacity={0.7}
                >
                  <View className="bg-surface rounded-xl p-4 border border-border">
                    {/* Başlık */}
                    <View className="flex-row justify-between items-start mb-3">
                      <View className="flex-1 mr-3">
                        <Text className="text-lg font-bold text-foreground mb-1">
                          {agency.acenteAdi}
                        </Text>
                        <Text className="text-sm text-muted">
                          Levha No: {agency.levhaNo}
                        </Text>
                      </View>
                      <View
                        className="px-3 py-1 rounded-full"
                        style={{
                          backgroundColor:
                            agency.durum === 'Aktif'
                              ? colors.success + '20'
                              : colors.error + '20',
                        }}
                      >
                        <Text
                          className="text-xs font-semibold"
                          style={{
                            color:
                              agency.durum === 'Aktif'
                                ? colors.success
                                : colors.error,
                          }}
                        >
                          {agency.durum}
                        </Text>
                      </View>
                    </View>

                    {/* Detaylar */}
                    <View className="gap-2 pt-2 border-t border-border">
                      {agency.yetkiliAdiSoyadi && (
                        <InfoRow
                          icon="👤"
                          label="Yetkili"
                          value={agency.yetkiliAdiSoyadi}
                        />
                      )}
                      {agency.telefon && (
                        <InfoRow
                          icon="📞"
                          label="Telefon"
                          value={agency.telefon}
                        />
                      )}
                      {agency.sehir && (
                        <InfoRow
                          icon="📍"
                          label="Konum"
                          value={`${agency.sehir}${agency.ilce ? ' / ' + agency.ilce : ''}`}
                        />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

/**
 * Filtre butonu bileşeni
 */
function FilterButton({
  label,
  count,
  isActive,
  onPress,
  color,
}: {
  label: string;
  count: number;
  isActive: boolean;
  onPress: () => void;
  color: string;
}) {
  const colors = useColors();
  
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: isActive ? color : colors.border,
        backgroundColor: isActive ? color + '20' : colors.background,
      }}
    >
      <Text
        className="text-center font-semibold text-sm"
        style={{ color: isActive ? color : colors.foreground }}
      >
        {label} ({count})
      </Text>
    </TouchableOpacity>
  );
}

/**
 * Bilgi satırı bileşeni
 */
function InfoRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  const colors = useColors();
  
  return (
    <View className="flex-row items-center gap-2">
      <Text className="text-base">{icon}</Text>
      <Text className="text-xs text-muted w-16">{label}:</Text>
      <Text className="text-sm text-foreground flex-1">{value}</Text>
    </View>
  );
}
