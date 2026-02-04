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
import type { Request, RequestType, RequestStatus, Priority } from '@/lib/types/visit';
import type { Agency } from '@/lib/types/agency';
import { getAllAgencies } from '@/lib/services/storage';
import { addRequest, getAllRequests, updateRequest } from '@/lib/services/visit-storage';

/**
 * Talep/İstek/Şikayet Ekranı
 */
export default function RequestsScreen() {
  const colors = useColors();
  
  // Form state
  const [levhaNo, setLevhaNo] = useState('');
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [requestType, setRequestType] = useState<RequestType>('Talep');
  const [priority, setPriority] = useState<Priority>('Orta');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  
  // UI state
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'Tümü' | RequestStatus>('Tümü');

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
      const [agenciesData, requestsData] = await Promise.all([
        getAllAgencies(),
        getAllRequests(),
      ]);
      setAgencies(agenciesData);
      setRequests(requestsData);
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
    if (!description.trim()) {
      Alert.alert('Hata', 'Lütfen açıklama girin');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm() || !selectedAgency) return;

    setIsSaving(true);
    
    try {
      const request: Request = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        levhaNo: selectedAgency.levhaNo,
        acenteAdi: selectedAgency.acenteAdi,
        requestType,
        priority,
        status: 'Açık',
        subject: subject.trim(),
        description: description.trim(),
        createdBy: 'Saha Personeli',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const saved = await addRequest(request);
      
      if (!saved) {
        Alert.alert('Hata', 'Kayıt sırasında bir hata oluştu');
        return;
      }

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      Alert.alert(
        'Başarılı',
        'Talep kaydı oluşturuldu',
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
    setRequestType('Talep');
    setPriority('Orta');
    setSubject('');
    setDescription('');
  };

  const filteredRequests = filterStatus === 'Tümü'
    ? requests
    : requests.filter(r => r.status === filterStatus);

  return (
    <ScreenContainer className="bg-background">
      <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled">
        <View className="py-6 gap-6">
          {/* Başlık */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">
              Talep/İstek/Şikayet
            </Text>
            <Text className="text-base text-muted">
              Talep yönetimi ve takip
            </Text>
          </View>

          {/* Yeni Talep Butonu */}
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
                + Yeni Talep Oluştur
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
                  </View>
                )}
              </View>

              {/* Talep Türü */}
              <View className="gap-2">
                <Text className="text-sm font-semibold text-foreground">
                  Talep Türü *
                </Text>
                <View className="flex-row gap-2">
                  {(['Talep', 'İstek', 'Şikayet'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setRequestType(type)}
                      disabled={isSaving}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: requestType === type ? colors.primary : colors.border,
                        backgroundColor: requestType === type ? colors.primary + '20' : colors.background,
                      }}
                    >
                      <Text
                        className="text-center font-semibold text-sm"
                        style={{ color: requestType === type ? colors.primary : colors.foreground }}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Öncelik */}
              <View className="gap-2">
                <Text className="text-sm font-semibold text-foreground">
                  Öncelik *
                </Text>
                <View className="flex-row gap-2">
                  {(['Düşük', 'Orta', 'Yüksek'] as const).map((p) => (
                    <TouchableOpacity
                      key={p}
                      onPress={() => setPriority(p)}
                      disabled={isSaving}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: priority === p ? colors.warning : colors.border,
                        backgroundColor: priority === p ? colors.warning + '20' : colors.background,
                      }}
                    >
                      <Text
                        className="text-center font-semibold text-sm"
                        style={{ color: priority === p ? colors.warning : colors.foreground }}
                      >
                        {p}
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
                  placeholder="Talep konusu"
                  placeholderTextColor={colors.muted}
                  value={subject}
                  onChangeText={setSubject}
                  editable={!isSaving}
                />
              </View>

              {/* Açıklama */}
              <View className="gap-2">
                <Text className="text-sm font-semibold text-foreground">
                  Açıklama *
                </Text>
                <TextInput
                  className="bg-background border border-border rounded-lg px-4 py-3 text-foreground"
                  placeholder="Detaylı açıklama..."
                  placeholderTextColor={colors.muted}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
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

          {/* Durum Filtreleri */}
          <View className="flex-row gap-2">
            {(['Tümü', 'Açık', 'Devam Ediyor', 'Çözüldü'] as const).map((status) => (
              <TouchableOpacity
                key={status}
                onPress={() => setFilterStatus(status)}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: filterStatus === status ? colors.primary : colors.border,
                  backgroundColor: filterStatus === status ? colors.primary + '20' : colors.background,
                }}
              >
                <Text
                  className="text-center font-semibold text-xs"
                  style={{ color: filterStatus === status ? colors.primary : colors.foreground }}
                >
                  {status}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Talep Listesi */}
          <View className="gap-3 pb-6">
            <Text className="text-lg font-bold text-foreground">
              Talepler ({filteredRequests.length})
            </Text>
            {filteredRequests.length === 0 ? (
              <View className="items-center justify-center py-12">
                <Text className="text-6xl mb-4">📋</Text>
                <Text className="text-lg font-bold text-foreground mb-2">
                  Talep bulunamadı
                </Text>
                <Text className="text-sm text-muted text-center">
                  {filterStatus === 'Tümü'
                    ? 'Henüz talep kaydı yok'
                    : `${filterStatus} durumunda talep yok`}
                </Text>
              </View>
            ) : (
              filteredRequests.map((request) => (
                <View
                  key={request.id}
                  className="bg-surface rounded-xl p-4 border border-border"
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1 mr-3">
                      <Text className="text-base font-semibold text-foreground mb-1">
                        {request.subject}
                      </Text>
                      <Text className="text-sm text-muted">
                        {request.acenteAdi}
                      </Text>
                    </View>
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
                  <View className="flex-row gap-2 mb-2">
                    <View
                      className="px-2 py-1 rounded"
                      style={{ backgroundColor: colors.primary + '20' }}
                    >
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: colors.primary }}
                      >
                        {request.requestType}
                      </Text>
                    </View>
                    <View
                      className="px-2 py-1 rounded"
                      style={{ backgroundColor: colors.warning + '20' }}
                    >
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: colors.warning }}
                      >
                        {request.priority}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-sm text-foreground mt-2">
                    {request.description}
                  </Text>
                  <Text className="text-xs text-muted mt-2">
                    {new Date(request.createdAt).toLocaleString('tr-TR')}
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
