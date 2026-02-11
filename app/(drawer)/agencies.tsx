import { useState, useEffect, memo } from 'react';
import {
  FlatList,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import type { Agency } from '@/lib/types/agency';
import { getAllAgencies, updateAgency, searchAgencies as searchAgenciesAPI } from '@/lib/services/agency-service';

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
  const [updatingAgency, setUpdatingAgency] = useState<string | null>(null);

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
      console.log('[agencies] Acenteler backend\'den yüklendi:', data.length);
    } catch (error) {
      console.error('Acenteler yüklenirken hata:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAgencyStatus = async (agency: Agency) => {
    setUpdatingAgency(agency.levhaNo);
    try {
      const newStatus = agency.isActive === 0 ? 1 : 0;
      
      await updateAgency(agency.levhaNo, { isActive: newStatus });
      
      // Local state güncelle
      setAgencies(prev => 
        prev.map(a => a.levhaNo === agency.levhaNo ? { ...a, isActive: newStatus } : a)
      );
      
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      console.log('[agencies] Acente durumu güncellendi:', agency.levhaNo, newStatus);
    } catch (error) {
      console.error('Acente durumu güncellenirken hata:', error);
    } finally {
      setUpdatingAgency(null);
    }
  };

  const applyFilters = () => {
    let filtered = [...agencies];

    // Durum filtresi (isActive kullan: 1=active, 0=inactive)
    if (filterStatus === 'Aktif') {
      filtered = filtered.filter(a => a.isActive !== 0);
    } else if (filterStatus === 'Pasif') {
      filtered = filtered.filter(a => a.isActive === 0);
    }

    // Arama filtresi
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        a =>
          a.acenteUnvani?.toLowerCase().includes(query) ||
          a.levhaNo?.toLowerCase().includes(query) ||
          a.il?.toLowerCase().includes(query) ||
          a.ilce?.toLowerCase().includes(query)
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
  const renderHeader = () => (
    <View className="py-4 gap-4 px-4">
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
          count={agencies.filter(a => a.isActive !== 0).length}
          isActive={filterStatus === 'Aktif'}
          onPress={() => setFilterStatus('Aktif')}
          color={colors.success}
        />
        <FilterButton
          label="Pasif"
          count={agencies.filter(a => a.isActive === 0).length}
          isActive={filterStatus === 'Pasif'}
          onPress={() => setFilterStatus('Pasif')}
          color={colors.error}
        />
      </View>
    </View>
  );

  const renderEmpty = () => (
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
  );

  return (
    <ScreenContainer className="bg-background">
      <FlatList
        data={filteredAgencies}
        keyExtractor={(item) => item.levhaNo}
        renderItem={({ item }) => (
          <AgencyCard
            agency={item}
            onToggle={toggleAgencyStatus}
            isUpdating={updatingAgency === item.levhaNo}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 16, gap: 12 }}
        initialNumToRender={20}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={50}
      />
    </ScreenContainer>
  );
}

/**
 * Acente kartı bileşeni (memoized)
 */
interface AgencyCardProps {
  agency: Agency;
  onToggle: (agency: Agency) => void;
  isUpdating: boolean;
}

const AgencyCard = memo(({ agency, onToggle, isUpdating }: AgencyCardProps) => {
  const colors = useColors();
  
  return (
    <TouchableOpacity activeOpacity={0.7}>
      <View className="bg-surface rounded-xl p-4 border border-border">
        {/* Başlık */}
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1 mr-3">
            <Text className="text-lg font-bold text-foreground mb-1">
              {agency.acenteUnvani}
            </Text>
            <Text className="text-sm text-muted">
              Levha No: {agency.levhaNo}
            </Text>
          </View>
          {/* Aktif/Pasif Toggle */}
          <View className="flex-row items-center gap-2">
            <Text 
              className="text-xs font-semibold"
              style={{ color: agency.isActive !== 0 ? colors.success : colors.muted }}
            >
              {agency.isActive !== 0 ? 'Aktif' : 'Pasif'}
            </Text>
            <Switch
              value={agency.isActive !== 0}
              onValueChange={() => onToggle(agency)}
              disabled={isUpdating}
              trackColor={{ false: colors.border, true: colors.success }}
              thumbColor={Platform.OS === 'android' ? colors.background : undefined}
              ios_backgroundColor={colors.border}
            />
          </View>
        </View>

        {/* Detaylar */}
        <View className="gap-2 pt-2 border-t border-border">
          {agency.teknikPersonel && (
            <InfoRow
              icon="👤"
              label="Yetkili"
              value={agency.teknikPersonel}
            />
          )}
          {agency.telefon && (
            <InfoRow
              icon="📞"
              label="Telefon"
              value={agency.telefon}
            />
          )}
          {agency.il && (
            <InfoRow
              icon="📍"
              label="Konum"
              value={`${agency.il}${agency.ilce ? ' / ' + agency.ilce : ''}`}
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

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
