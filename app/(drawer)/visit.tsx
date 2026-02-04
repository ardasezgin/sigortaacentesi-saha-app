import { useState, useEffect } from 'react';
import {
  ScrollView,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import type { Visit, VisitType } from '@/lib/types/visit';
import type { Agency } from '@/lib/types/agency';
import { getAllAgencies } from '@/lib/services/storage';
import { addVisit, getRecentVisits } from '@/lib/services/visit-storage';

/**
 * Ziyaret/Arama Girişi Ekranı
 */
export default function VisitScreen() {
  const colors = useColors();
  
  // Form state
  const [levhaNo, setLevhaNo] = useState('');
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [visitType, setVisitType] = useState<VisitType>('Fiziksel Ziyaret');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  
  // UI state
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [recentVisits, setRecentVisits] = useState<Visit[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (levhaNo.trim().length >= 3) {
        await searchAgency(levhaNo.trim());
      } else {
        setSelectedAgency(null);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [levhaNo]);

  const loadData = async () => {
    try {
      const [agenciesData, visitsData] = await Promise.all([
        getAllAgencies(),
        getRecentVisits(5),
      ]);
      setAgencies(agenciesData);
      setRecentVisits(visitsData);
    } catch (error) {
      console.error('Veri yüklenirken hata:', error);
    }
  };

  const searchAgency = async (searchLevhaNo: string) => {
    setIsSearching(true);
    try {
      const agency = agencies.find(a => a.levhaNo === searchLevhaNo);
      
      if (agency) {
        setSelectedAgency(agency);
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        setSelectedAgency(null);
      }
    } catch (error) {
      console.error('Arama hatası:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const validateForm = (): boolean => {
    if (!selectedAgency) {
      Alert.alert('Hata', 'Lütfen geçerli bir acente seçin');
      return false;
    }
    if (!duration.trim() || isNaN(Number(duration))) {
      Alert.alert('Hata', 'Lütfen geçerli bir süre girin (dakika)');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm() || !selectedAgency) return;

    setIsSaving(true);
    
    try {
      const visit: Visit = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        levhaNo: selectedAgency.levhaNo,
        acenteAdi: selectedAgency.acenteAdi,
        visitType,
        visitDate: new Date().toISOString(),
        duration: Number(duration),
        notes: notes.trim(),
        createdBy: 'Saha Personeli',
        createdAt: new Date().toISOString(),
      };

      const saved = await addVisit(visit);
      
      if (!saved) {
        Alert.alert('Hata', 'Kayıt sırasında bir hata oluştu');
        return;
      }

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      Alert.alert(
        'Başarılı',
        'Ziyaret kaydı oluşturuldu',
        [
          {
            text: 'Tamam',
            onPress: () => {
              clearForm();
              loadData();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      Alert.alert('Hata', 'Kayıt sırasında bir hata oluştu');
    } finally {
      setIsSaving(false);
    }
  };

  const clearForm = () => {
    setLevhaNo('');
    setSelectedAgency(null);
    setVisitType('Fiziksel Ziyaret');
    setDuration('');
    setNotes('');
  };

  return (
    <ScreenContainer className="bg-background">
      <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled">
        <View className="py-6 gap-6">
          {/* Başlık */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">
              Ziyaret/Arama Girişi
            </Text>
            <Text className="text-base text-muted">
              Saha ziyareti veya telefon araması kaydedin
            </Text>
          </View>

          {/* Form */}
          <View className="bg-surface rounded-2xl p-4 gap-4 border border-border shadow-sm">
            {/* Levha No */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">
                Acente Levha No *
              </Text>
              <View className="flex-row items-center">
                <TextInput
                  className="flex-1 bg-background border border-border rounded-lg px-4 py-3 text-foreground"
                  placeholder="Örn: T091014-SAN3"
                  placeholderTextColor={colors.muted}
                  value={levhaNo}
                  onChangeText={setLevhaNo}
                  autoCapitalize="characters"
                  editable={!isSaving}
                />
                {isSearching && (
                  <ActivityIndicator
                    size="small"
                    color={colors.primary}
                    style={{ marginLeft: 8 }}
                  />
                )}
              </View>
              {selectedAgency && (
                <View className="bg-success/10 rounded-lg p-3 mt-2">
                  <Text className="text-sm font-semibold text-foreground">
                    {selectedAgency.acenteAdi}
                  </Text>
                  <Text className="text-xs text-muted mt-1">
                    {selectedAgency.sehir} / {selectedAgency.ilce}
                  </Text>
                </View>
              )}
            </View>

            {/* Ziyaret Türü */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">
                Ziyaret Türü *
              </Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setVisitType('Fiziksel Ziyaret')}
                  disabled={isSaving}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: visitType === 'Fiziksel Ziyaret' ? colors.primary : colors.border,
                    backgroundColor: visitType === 'Fiziksel Ziyaret' ? colors.primary + '20' : colors.background,
                  }}
                >
                  <Text
                    className="text-center font-semibold"
                    style={{ color: visitType === 'Fiziksel Ziyaret' ? colors.primary : colors.foreground }}
                  >
                    🏢 Fiziksel Ziyaret
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setVisitType('Telefon Araması')}
                  disabled={isSaving}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: visitType === 'Telefon Araması' ? colors.success : colors.border,
                    backgroundColor: visitType === 'Telefon Araması' ? colors.success + '20' : colors.background,
                  }}
                >
                  <Text
                    className="text-center font-semibold"
                    style={{ color: visitType === 'Telefon Araması' ? colors.success : colors.foreground }}
                  >
                    📞 Telefon Araması
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Süre */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">
                Süre (Dakika) *
              </Text>
              <TextInput
                className="bg-background border border-border rounded-lg px-4 py-3 text-foreground"
                placeholder="Örn: 30"
                placeholderTextColor={colors.muted}
                value={duration}
                onChangeText={setDuration}
                keyboardType="numeric"
                editable={!isSaving}
              />
            </View>

            {/* Notlar */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">
                Notlar
              </Text>
              <TextInput
                className="bg-background border border-border rounded-lg px-4 py-3 text-foreground"
                placeholder="Ziyaret detayları, görüşme notları..."
                placeholderTextColor={colors.muted}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!isSaving}
              />
            </View>

            {/* Butonlar */}
            <View className="flex-row gap-3 mt-2">
              <TouchableOpacity
                onPress={clearForm}
                disabled={isSaving}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                }}
              >
                <Text className="text-center font-semibold text-foreground">
                  Temizle
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={isSaving}
                style={{
                  flex: 2,
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: colors.primary,
                  opacity: isSaving ? 0.6 : 1,
                }}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-center font-bold text-white">
                    Kaydet
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Son Ziyaretler */}
          {recentVisits.length > 0 && (
            <View className="gap-3 pb-6">
              <Text className="text-lg font-bold text-foreground">
                Son Ziyaretler
              </Text>
              {recentVisits.map((visit) => (
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
                        backgroundColor: visit.visitType === 'Fiziksel Ziyaret'
                          ? colors.primary + '20'
                          : colors.success + '20',
                      }}
                    >
                      <Text
                        className="text-xs font-semibold"
                        style={{
                          color: visit.visitType === 'Fiziksel Ziyaret'
                            ? colors.primary
                            : colors.success,
                        }}
                      >
                        {visit.visitType === 'Fiziksel Ziyaret' ? '🏢' : '📞'}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-sm text-muted">
                    {new Date(visit.visitDate).toLocaleDateString('tr-TR')} • {visit.duration} dk
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
