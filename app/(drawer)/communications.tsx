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
  Linking,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import type { Communication } from '@/lib/types/visit';
import type { Agency } from '@/lib/types/agency';
import { getAllAgencies } from '@/lib/services/storage';
import { addCommunication, getAllCommunications } from '@/lib/services/visit-storage';

/**
 * Acente İletişimleri Ekranı
 */
export default function CommunicationsScreen() {
  const colors = useColors();
  
  // Form state
  const [levhaNo, setLevhaNo] = useState('');
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [communicationType, setCommunicationType] = useState<'Telefon' | 'E-posta' | 'WhatsApp' | 'Diğer'>('Telefon');
  const [subject, setSubject] = useState('');
  const [notes, setNotes] = useState('');
  
  // UI state
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [showForm, setShowForm] = useState(false);

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
      const [agenciesData, commsData] = await Promise.all([
        getAllAgencies(),
        getAllCommunications(),
      ]);
      setAgencies(agenciesData);
      setCommunications(commsData);
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
    if (!subject.trim()) {
      Alert.alert('Hata', 'Lütfen konu girin');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm() || !selectedAgency) return;

    setIsSaving(true);
    
    try {
      const communication: Communication = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        levhaNo: selectedAgency.levhaNo,
        acenteAdi: selectedAgency.acenteAdi,
        type: communicationType,
        subject: subject.trim(),
        notes: notes.trim(),
        createdBy: 'Saha Personeli',
        createdAt: new Date().toISOString(),
      };

      const saved = await addCommunication(communication);
      
      if (!saved) {
        Alert.alert('Hata', 'Kayıt sırasında bir hata oluştu');
        return;
      }

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      Alert.alert(
        'Başarılı',
        'İletişim kaydı oluşturuldu',
        [
          {
            text: 'Tamam',
            onPress: () => {
              clearForm();
              loadData();
              setShowForm(false);
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
    setCommunicationType('Telefon');
    setSubject('');
    setNotes('');
  };

  const handlePhoneCall = (phone: string) => {
    if (Platform.OS !== 'web') {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  return (
    <ScreenContainer className="bg-background">
      <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled">
        <View className="py-6 gap-6">
          {/* Başlık */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">
              Acente İletişimleri
            </Text>
            <Text className="text-base text-muted">
              İletişim geçmişi ve yeni kayıt
            </Text>
          </View>

          {/* Yeni İletişim Butonu */}
          {!showForm && (
            <TouchableOpacity
              onPress={() => setShowForm(true)}
              style={{
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: colors.primary,
              }}
            >
              <Text className="text-center font-bold text-white">
                + Yeni İletişim Kaydı
              </Text>
            </TouchableOpacity>
          )}

          {/* Form */}
          {showForm && (
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
                      {selectedAgency.telefon} • {selectedAgency.eposta}
                    </Text>
                  </View>
                )}
              </View>

              {/* İletişim Türü */}
              <View className="gap-2">
                <Text className="text-sm font-semibold text-foreground">
                  İletişim Türü *
                </Text>
                <View className="flex-row gap-2 flex-wrap">
                  {(['Telefon', 'E-posta', 'WhatsApp', 'Diğer'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setCommunicationType(type)}
                      disabled={isSaving}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 16,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: communicationType === type ? colors.primary : colors.border,
                        backgroundColor: communicationType === type ? colors.primary + '20' : colors.background,
                      }}
                    >
                      <Text
                        className="text-center font-semibold text-sm"
                        style={{ color: communicationType === type ? colors.primary : colors.foreground }}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Konu */}
              <View className="gap-2">
                <Text className="text-sm font-semibold text-foreground">
                  Konu *
                </Text>
                <TextInput
                  className="bg-background border border-border rounded-lg px-4 py-3 text-foreground"
                  placeholder="İletişim konusu"
                  placeholderTextColor={colors.muted}
                  value={subject}
                  onChangeText={setSubject}
                  editable={!isSaving}
                />
              </View>

              {/* Notlar */}
              <View className="gap-2">
                <Text className="text-sm font-semibold text-foreground">
                  Detaylar
                </Text>
                <TextInput
                  className="bg-background border border-border rounded-lg px-4 py-3 text-foreground"
                  placeholder="İletişim detayları..."
                  placeholderTextColor={colors.muted}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={!isSaving}
                />
              </View>

              {/* Butonlar */}
              <View className="flex-row gap-3 mt-2">
                <TouchableOpacity
                  onPress={() => {
                    clearForm();
                    setShowForm(false);
                  }}
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
                    İptal
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
          )}

          {/* İletişim Geçmişi */}
          <View className="gap-3 pb-6">
            <Text className="text-lg font-bold text-foreground">
              İletişim Geçmişi ({communications.length})
            </Text>
            {communications.length === 0 ? (
              <View className="items-center justify-center py-12">
                <Text className="text-6xl mb-4">📞</Text>
                <Text className="text-lg font-bold text-foreground mb-2">
                  Henüz kayıt yok
                </Text>
                <Text className="text-sm text-muted text-center">
                  İlk iletişim kaydınızı oluşturun
                </Text>
              </View>
            ) : (
              communications.map((comm) => (
                <View
                  key={comm.id}
                  className="bg-surface rounded-xl p-4 border border-border"
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1 mr-3">
                      <Text className="text-base font-semibold text-foreground mb-1">
                        {comm.acenteAdi}
                      </Text>
                      <Text className="text-sm text-foreground">
                        {comm.subject}
                      </Text>
                    </View>
                    <View
                      className="px-2 py-1 rounded"
                      style={{ backgroundColor: colors.primary + '20' }}
                    >
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: colors.primary }}
                      >
                        {comm.type}
                      </Text>
                    </View>
                  </View>
                  {comm.notes && (
                    <Text className="text-sm text-muted mt-2">
                      {comm.notes}
                    </Text>
                  )}
                  <Text className="text-xs text-muted mt-2">
                    {new Date(comm.createdAt).toLocaleString('tr-TR')}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
