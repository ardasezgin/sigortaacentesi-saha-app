import { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  FlatList,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Platform,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import type { Agency } from '@/lib/types/agency';
import { getAllAgencies, updateAgency } from '@/lib/services/agency-service';

const PAGE_SIZE = 50;

/**
 * Acentelerim Ekranı - Sayfalı yükleme, sunucu tarafı arama, sayfa numarası navigasyonu
 */
export default function AgenciesScreen() {
  const colors = useColors();

  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'Tümü' | 'Aktif' | 'Pasif'>('Tümü');
  const [updatingAgency, setUpdatingAgency] = useState<string | null>(null);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeSearchRef = useRef('');
  const activeFilterRef = useRef<'Tümü' | 'Aktif' | 'Pasif'>('Tümü');
  const listRef = useRef<FlatList>(null);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Veri yükle - sayfa ve arama parametreleriyle
  const loadPage = useCallback(async (page: number, search?: string, append = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      // Aktif/Pasif filtresi için limit artır (client-side filtreleme)
      const limit = PAGE_SIZE;
      const result = await getAllAgencies(page, limit, search || undefined);
      
      if (append) {
        setAgencies(prev => [...prev, ...result.agencies]);
      } else {
        setAgencies(result.agencies);
        // Sayfanın başına kaydır
        setTimeout(() => listRef.current?.scrollToOffset({ offset: 0, animated: false }), 50);
      }
      setTotal(result.total);
      setCurrentPage(page);
      console.log(`[agencies] Sayfa ${page}/${Math.ceil(result.total / PAGE_SIZE)}: ${result.agencies.length} acente (toplam ${result.total})`);
    } catch (error) {
      console.error('[agencies] Yükleme hatası:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  // İlk yükleme
  useEffect(() => {
    loadPage(1);
  }, []);

  // Arama: 600ms debounce ile sunucu tarafı arama (tüm 19.364 kayıtta)
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      activeSearchRef.current = searchQuery;
      loadPage(1, searchQuery || undefined);
    }, 600);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery]);

  // Sayfa değiştir
  const goToPage = useCallback((page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    loadPage(page, activeSearchRef.current || undefined);
  }, [totalPages, currentPage, loadPage]);

  // Sonsuz kaydırma: sonraki sayfayı yükle
  const loadMore = useCallback(() => {
    if (isLoadingMore || isLoading || currentPage >= totalPages) return;
    loadPage(currentPage + 1, activeSearchRef.current || undefined, true);
  }, [isLoadingMore, isLoading, currentPage, totalPages, loadPage]);

  const toggleAgencyStatus = async (agency: Agency) => {
    setUpdatingAgency(agency.levhaNo);
    try {
      const newStatus = agency.isActive === 0 ? 1 : 0;
      await updateAgency(agency.levhaNo, { isActive: newStatus });
      setAgencies(prev =>
        prev.map(a => a.levhaNo === agency.levhaNo ? { ...a, isActive: newStatus } : a)
      );
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('[agencies] Durum güncelleme hatası:', error);
    } finally {
      setUpdatingAgency(null);
    }
  };

  // Durum filtresi client-side (yüklü sayfa üzerinde)
  const filteredAgencies = filterStatus === 'Tümü'
    ? agencies
    : filterStatus === 'Aktif'
      ? agencies.filter(a => a.isActive !== 0)
      : agencies.filter(a => a.isActive === 0);

  if (isLoading) {
    return (
      <ScreenContainer className="bg-background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="text-base text-muted mt-4">
            {searchQuery ? `"${searchQuery}" aranıyor...` : 'Acenteler yükleniyor...'}
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  const renderHeader = () => (
    <View className="py-4 gap-3 px-4">
      {/* Arama - Tüm 19.364 kayıtta sunucu tarafı arama */}
      <TextInput
        className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground text-base"
        placeholder="Tüm acentelerde ara (ad, levha no, şehir)..."
        placeholderTextColor={colors.muted}
        value={searchQuery}
        onChangeText={setSearchQuery}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />

      {/* Toplam sayı */}
      <Text className="text-xs text-muted px-1">
        {searchQuery
          ? `"${searchQuery}" için ${total.toLocaleString('tr-TR')} sonuç`
          : `Toplam ${total.toLocaleString('tr-TR')} acente`}
        {totalPages > 1 && ` · Sayfa ${currentPage}/${totalPages}`}
      </Text>

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

      {/* Sayfa Numaraları */}
      {totalPages > 1 && (
        <PageNavigator
          currentPage={currentPage}
          totalPages={totalPages}
          onGoToPage={goToPage}
          colors={colors}
        />
      )}
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
          ? `"${searchQuery}" için sonuç yok`
          : 'Henüz kayıtlı acente bulunmuyor'}
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View className="py-4 items-center">
        <ActivityIndicator size="small" color={colors.primary} />
        <Text className="text-xs text-muted mt-2">Yükleniyor...</Text>
      </View>
    );
  };

  return (
    <ScreenContainer className="bg-background">
      <FlatList
        ref={listRef}
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
        ListFooterComponent={renderFooter}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
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
 * Sayfa numarası navigatörü - önceki/sonraki + yakın sayfalar
 */
function PageNavigator({
  currentPage,
  totalPages,
  onGoToPage,
  colors,
}: {
  currentPage: number;
  totalPages: number;
  onGoToPage: (page: number) => void;
  colors: ReturnType<typeof useColors>;
}) {
  // Gösterilecek sayfa numaralarını hesapla (max 7 buton)
  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);
    
    if (currentPage > 3) pages.push('...');
    
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    
    for (let i = start; i <= end; i++) pages.push(i);
    
    if (currentPage < totalPages - 2) pages.push('...');
    
    pages.push(totalPages);
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 6, paddingVertical: 2 }}
    >
      {/* Önceki */}
      <TouchableOpacity
        onPress={() => onGoToPage(currentPage - 1)}
        disabled={currentPage === 1}
        style={{
          paddingHorizontal: 10,
          paddingVertical: 7,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: currentPage === 1 ? colors.border : colors.primary,
          backgroundColor: colors.background,
          opacity: currentPage === 1 ? 0.4 : 1,
        }}
      >
        <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>‹ Önceki</Text>
      </TouchableOpacity>

      {/* Sayfa numaraları */}
      {pageNumbers.map((page, idx) =>
        page === '...' ? (
          <View
            key={`dots-${idx}`}
            style={{ paddingHorizontal: 6, paddingVertical: 7, justifyContent: 'center' }}
          >
            <Text style={{ color: colors.muted, fontSize: 13 }}>…</Text>
          </View>
        ) : (
          <TouchableOpacity
            key={page}
            onPress={() => onGoToPage(page)}
            style={{
              minWidth: 36,
              paddingHorizontal: 10,
              paddingVertical: 7,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: page === currentPage ? colors.primary : colors.border,
              backgroundColor: page === currentPage ? colors.primary : colors.background,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: page === currentPage ? colors.background : colors.foreground,
                fontSize: 13,
                fontWeight: page === currentPage ? '700' : '400',
              }}
            >
              {page}
            </Text>
          </TouchableOpacity>
        )
      )}

      {/* Sonraki */}
      <TouchableOpacity
        onPress={() => onGoToPage(currentPage + 1)}
        disabled={currentPage === totalPages}
        style={{
          paddingHorizontal: 10,
          paddingVertical: 7,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: currentPage === totalPages ? colors.border : colors.primary,
          backgroundColor: colors.background,
          opacity: currentPage === totalPages ? 0.4 : 1,
        }}
      >
        <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>Sonraki ›</Text>
      </TouchableOpacity>
    </ScrollView>
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
            <Text className="text-base font-bold text-foreground mb-1" numberOfLines={2}>
              {agency.acenteUnvani}
            </Text>
            <Text className="text-xs text-muted">
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
        <View className="gap-1 pt-2 border-t border-border">
          {agency.teknikPersonel && (
            <InfoRow icon="👤" label="Yetkili" value={agency.teknikPersonel} />
          )}
          {agency.telefon && (
            <InfoRow icon="📞" label="Telefon" value={agency.telefon} />
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
  return (
    <View className="flex-row items-center gap-2">
      <Text className="text-sm">{icon}</Text>
      <Text className="text-xs text-muted w-14">{label}:</Text>
      <Text className="text-xs text-foreground flex-1" numberOfLines={1}>{value}</Text>
    </View>
  );
}
