import { useState, useEffect, useRef } from 'react';
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
import { useAuth } from '@/hooks/use-auth';
import { trpc } from '@/lib/trpc';
import type { Request, RequestType, RequestStatus, Priority } from '@/lib/types/visit';
import type { Agency } from '@/lib/types/agency';
import { findAgencyByLevhaNo, findAgencyByName } from '@/lib/services/agency-service';
import { addRequest, getAllRequests, updateRequest } from '@/lib/services/visit-storage';
import { getConfig, mapPriorityToClickUp, mapStatusToClickUp } from '@/lib/services/clickup';

/**
 * Talep/İstek/Şikayet Ekranı
 */
export default function RequestsScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const createTaskMutation = trpc.clickup.createTask.useMutation();
  
  // Form state
  const [kimden, setKimden] = useState<'Acente' | 'Diğer'>('Acente');
  const [levhaNo, setLevhaNo] = useState('');
  const [acenteAdi, setAcenteAdi] = useState('');
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [isAutoFilled, setIsAutoFilled] = useState(false);
  const [requestType, setRequestType] = useState<RequestType>('Talep');
  const [priority, setPriority] = useState<Priority>('Orta');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const acenteSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [acenteSuggestions, setAcenteSuggestions] = useState<Agency[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // UI state
  const [isSearchingLevha, setIsSearchingLevha] = useState(false);
  const [isSearchingName, setIsSearchingName] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [requests, setRequests] = useState<Request[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'Tümü' | RequestStatus>('Tümü');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Levha no değiştiğinde otomatik arama
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (levhaNo.trim().length >= 3) {
        await searchByLevhaNo(levhaNo.trim());
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(searchTimeout);
  }, [levhaNo]);

  // Acente adı değiştiğinde otomatik arama
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (acenteAdi.trim().length >= 5) {
        await searchByName(acenteAdi.trim());
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(searchTimeout);
  }, [acenteAdi]);

  const searchByLevhaNo = async (searchLevhaNo: string) => {
    setIsSearchingLevha(true);
    try {
      const agency = await findAgencyByLevhaNo(searchLevhaNo);
      
      if (agency) {
        setAcenteAdi(agency.acenteUnvani);
        setSelectedAgency(agency);
        setIsAutoFilled(true);
        
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        setIsAutoFilled(false);
        setSelectedAgency(null);
      }
    } catch (error) {
      console.error('Levha no arama hatası:', error);
    } finally {
      setIsSearchingLevha(false);
    }
  };

  const searchByName = async (searchName: string) => {
    setIsSearchingName(true);
    try {
      const agency = await findAgencyByName(searchName);
      
      if (agency) {
        setLevhaNo(agency.levhaNo);
        setSelectedAgency(agency);
        setIsAutoFilled(true);
        
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        setIsAutoFilled(false);
        setSelectedAgency(null);
      }
    } catch (error) {
      console.error('Acente adı arama hatası:', error);
    } finally {
      setIsSearchingName(false);
    }
  };

  const loadData = async () => {
    try {
      const requestsData = await getAllRequests();
      setRequests(requestsData);
    } catch (error) {
      console.error('Veri yüklenirken hata:', error);
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
    // Mesajları temizle
    setSuccessMessage(null);
    setErrorMessage(null);
    
    console.log('[requests] handleSave başlatıldı');
    
    if (!validateForm() || !selectedAgency) {
      console.log('[requests] Validation başarısız veya acente seçili değil');
      setErrorMessage('Lütfen tüm zorunlu alanları doldurun');
      return;
    }

    setIsSaving(true);
    
    try {
      console.log('[requests] Request oluşturuluyor...');
      const request: Request = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        levhaNo: selectedAgency.levhaNo,
        acenteUnvani: selectedAgency.acenteUnvani,
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
      console.log('[requests] addRequest sonuç:', saved);
      
      if (!saved) {
        console.log('[requests] addRequest false döndü');
        Alert.alert('Hata', 'Kayıt sırasında bir hata oluştu');
        return;
      }
      
      console.log('[requests] Request başarıyla kaydedildi');

      // ClickUp'ta task oluştur (otomatik assignee ataması ile)
      console.log('[requests] Sending to ClickUp...');
      let clickupSuccess = false;
      
      try {
        const config = getConfig();
        const result = await createTaskMutation.mutateAsync({
          listId: config.listId,
          name: `[${requestType}] ${subject.trim()}`,
          description: `**Acente:** ${selectedAgency.acenteUnvani} (${selectedAgency.levhaNo})\n\n**Açıklama:**\n${description.trim()}\n\n**Oluşturan:** ${user?.name || user?.email || 'Saha Personeli'}`,
          priority: mapPriorityToClickUp(priority),
          tags: ['Talep', requestType, selectedAgency.il || 'Bilinmeyen'],
          assigneeEmail: user?.email || undefined, // Giriş yapan kullanıcının emaili (otomatik ClickUp'a assign edilecek)
        });
        console.log('[requests] ClickUp task created successfully:', result);
        clickupSuccess = true;
      } catch (clickupError) {
        console.error('[requests] ClickUp task creation failed:', clickupError);
        // ClickUp hatası uygulamanın durdurmasın
      }

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // Başarı mesajı
      const message = clickupSuccess 
        ? 'Talep kaydedildi ve ClickUp\'a gönderildi \u2705'
        : 'Talep kaydedildi ancak ClickUp\'a gönderilemedi \u26a0\ufe0f';
      
      console.log('[requests] Başarı mesajı gösteriliyor:', message);
      
      if (clickupSuccess) {
        setSuccessMessage(message);
      } else {
        setErrorMessage(message);
      }
      
      // Formu temizle (5 saniye sonra)
      setTimeout(() => {
        clearForm();
        loadData();
        setShowForm(false);
      }, 5000);
      
      // Mesajı 10 saniye sonra temizle
      setTimeout(() => {
        setSuccessMessage(null);
        setErrorMessage(null);
      }, 10000);
    } catch (error) {
      console.error('[requests] Kaydetme hatası:', error);
      setErrorMessage('Kayıt sırasında bir hata oluştu \u274c');
    } finally {
      setIsSaving(false);
    }
  };

  const clearForm = () => {
    setKimden('Acente');
    setLevhaNo('');
    setAcenteAdi('');
    setSelectedAgency(null);
    setIsAutoFilled(false);
    setAcenteSuggestions([]);
    setShowSuggestions(false);
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

          {/* Success/Error Messages */}
          {successMessage && (
            <View className="bg-green-50 dark:bg-green-900/20 border border-green-500 rounded-lg p-4">
              <Text className="text-green-700 dark:text-green-300 font-medium text-center">
                {successMessage}
              </Text>
            </View>
          )}
          {errorMessage && (
            <View className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-500 rounded-lg p-4">
              <Text className="text-yellow-700 dark:text-yellow-300 font-medium text-center">
                {errorMessage}
              </Text>
            </View>
          )}

          {/* Form */}
          {showForm && (
            <View className="bg-surface rounded-2xl p-4 gap-4 border border-border shadow-sm">
              {/* Kimden */}
              <View className="gap-2">
                <Text className="text-sm font-semibold text-foreground">Kimden *</Text>
                <View className="flex-row gap-2">
                  {(['Acente', 'Diğer'] as const).map((k) => (
                    <TouchableOpacity
                      key={k}
                      onPress={() => {
                        setKimden(k);
                        // Acente'den Diğer'e geçince acente alanlarını temizle
                        if (k === 'Diğer') {
                          setLevhaNo('');
                          setAcenteAdi('');
                          setSelectedAgency(null);
                          setIsAutoFilled(false);
                        }
                      }}
                      disabled={isSaving}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: kimden === k ? colors.primary : colors.border,
                        backgroundColor: kimden === k ? colors.primary + '20' : colors.background,
                      }}
                    >
                      <Text
                        className="text-center font-semibold text-sm"
                        style={{ color: kimden === k ? colors.primary : colors.foreground }}
                      >
                        {k}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Levha No - sadece Kimden=Acente ise göster */}
              {kimden === 'Acente' && (
              <View className="gap-2">
                <Text className="text-sm font-semibold text-foreground">
                  Acente Levha No (isteğe bağlı)
                </Text>
                <View className="flex-row items-center">
                  <TextInput
                    className="flex-1 bg-background border border-border rounded-lg px-4 py-3 text-foreground"
                    placeholder="Örn: T091014-SAN3"
                    placeholderTextColor={colors.muted}
                    value={levhaNo}
                    onChangeText={async (text) => {
                      setLevhaNo(text);
                      
                      // 5 karakterden az ise state'leri sıfırla
                      if (text.length < 5) {
                        setSelectedAgency(null);
                        setIsAutoFilled(false);
                        setAcenteAdi('');
                        return;
                      }
                      
                      // 5+ karakter girildiğinde otomatik ara
                      setIsSearchingLevha(true);
                      try {
                        console.log('[requests] Levha no araması başlatıldı:', text);
                        const found = await findAgencyByLevhaNo(text);
                        console.log('[requests] Levha no arama sonucu:', found ? found.acenteUnvani : 'Bulunamadı');
                        
                        if (found) {
                          setSelectedAgency(found);
                          setAcenteAdi(found.acenteUnvani);
                          setIsAutoFilled(true);
                          if (Platform.OS !== 'web') {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }
                        } else {
                          setSelectedAgency(null);
                          setIsAutoFilled(false);
                        }
                      } catch (error) {
                        console.error('Levha no arama hatası:', error);
                        setSelectedAgency(null);
                        setIsAutoFilled(false);
                      } finally {
                        setIsSearchingLevha(false);
                      }
                    }}
                    autoCapitalize="characters"
                    editable={!isSaving}
                  />
                  {isSearchingLevha && (
                    <ActivityIndicator
                      size="small"
                      color={colors.primary}
                      style={{ marginLeft: 8 }}
                    />
                  )}
                </View>
                {!isSearchingLevha && levhaNo.length >= 5 && (
                  isAutoFilled ? (
                    <Text className="text-xs text-success mt-1">
                      ✓ Acente bilgileri otomatik dolduruldu
                    </Text>
                  ) : (
                    <Text className="text-xs text-error mt-1">
                      ✗ Acente bulunamadı. Lütfen levha numarasını kontrol edin.
                    </Text>
                  )
                )}
              </View>
              )}

              {/* Acente Adı - sadece Kimden=Acente ise göster */}
              {kimden === 'Acente' && (
              <View className="gap-2">
                <Text className="text-sm font-semibold text-foreground">
                  Acente Adı *
                </Text>
                <View className="flex-row items-center">
                  <TextInput
                    className="flex-1 bg-background border border-border rounded-lg px-4 py-3 text-foreground"
                    placeholder="Acente ünvanı (en az 5 harf)"
                    placeholderTextColor={colors.muted}
                    value={acenteAdi}
                    autoCorrect={false}
                    autoComplete="off"
                    spellCheck={false}
                    onChangeText={(text) => {
                      setAcenteAdi(text);
                      setIsAutoFilled(false);
                      setSelectedAgency(null);
                      setShowSuggestions(false);
                      setAcenteSuggestions([]);
                      if (acenteSearchTimer.current) clearTimeout(acenteSearchTimer.current);
                      if (text.trim().length < 5) return;
                      acenteSearchTimer.current = setTimeout(async () => {
                        setIsSearchingName(true);
                        try {
                          const { getAllAgencies } = await import('@/lib/services/agency-service');
                          const result = await getAllAgencies(1, 8, text.trim());
                          setAcenteSuggestions(result.agencies);
                          setShowSuggestions(result.agencies.length > 0);
                        } catch (error) {
                          console.error('Acente adı arama hatası:', error);
                        } finally {
                          setIsSearchingName(false);
                        }
                      }, 600);
                    }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    editable={!isSaving}
                  />
                  {isSearchingName && (
                    <ActivityIndicator
                      size="small"
                      color={colors.primary}
                      style={{ marginLeft: 8 }}
                    />
                  )}
                </View>
                {showSuggestions && acenteSuggestions.length > 0 && (
                  <View className="mt-1 border border-border rounded-lg bg-background" style={{ maxHeight: 200 }}>
                    {acenteSuggestions.map((agency) => (
                      <TouchableOpacity
                        key={agency.levhaNo}
                        onPress={() => {
                          setAcenteAdi(agency.acenteUnvani);
                          setLevhaNo(agency.levhaNo);
                          setSelectedAgency(agency);
                          setIsAutoFilled(true);
                          setShowSuggestions(false);
                          setAcenteSuggestions([]);
                          if (Platform.OS !== 'web') {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }
                        }}
                        className="p-3 border-b border-border"
                      >
                        <Text className="text-foreground text-sm font-medium">{agency.acenteUnvani}</Text>
                        <Text className="text-muted text-xs">{agency.levhaNo} • {agency.il}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {isAutoFilled && (
                  <Text className="text-xs text-success mt-1">✓ Acente seçildi: {selectedAgency?.levhaNo}</Text>
                )}
              </View>
              )}

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
                        {request.acenteUnvani}
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
