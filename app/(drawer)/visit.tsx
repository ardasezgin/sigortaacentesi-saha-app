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
  FlatList,
  Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';

import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { trpc } from '@/lib/trpc';
import type { Visit, CommunicationType, PartnerType, AgendaType } from '@/lib/types/visit';
import type { Agency } from '@/lib/types/agency';
import { saveAgency } from '@/lib/services/storage';
import { findAgencyByLevhaNo, findAgencyByName } from '@/lib/services/agency-service';
import { addVisit, getRecentVisits } from '@/lib/services/visit-storage';
import { createClickUpTask } from '@/lib/services/clickup';
import { cn } from '@/lib/utils';

/**
 * Ziyaret/Arama Girişi Ekranı (Yeni Form)
 */
export default function VisitScreen() {
  const colors = useColors();
  const { user } = useAuth();
  // Form state
  const [iletisimTuru, setIletisimTuru] = useState<CommunicationType>('Ziyaret');
  const [isOrtagi, setIsOrtagi] = useState<PartnerType>('Mevcut Acente');
  const [levhaNo, setLevhaNo] = useState('');
  const [acenteAdi, setAcenteAdi] = useState('');
  const [kimleGorusuldu, setKimleGorusuldu] = useState('');
  const [tarih, setTarih] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
  const [gundem, setGundem] = useState<AgendaType>('Genel Performans');
  const [detayAciklama, setDetayAciklama] = useState('');
  const [hatirlatma, setHatirlatma] = useState('');
  const [hatirlatmaTarihi, setHatirlatmaTarihi] = useState('');
  const [dosyalar, setDosyalar] = useState<string[]>([]);
  
  // Otomatik doldurma için
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [isAutoFilled, setIsAutoFilled] = useState(false);
  
  // UI state
  const [isSearchingLevha, setIsSearchingLevha] = useState(false);
  const [isSearchingName, setIsSearchingName] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [recentVisits, setRecentVisits] = useState<Visit[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Acente adı öneri listesi
  const [acenteSuggestions, setAcenteSuggestions] = useState<Agency[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const acenteSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSelectingFromDropdown = useRef(false);

  // Dropdown visibility
  const [showIletisimTuruDropdown, setShowIletisimTuruDropdown] = useState(false);
  const [showIsOrtagiDropdown, setShowIsOrtagiDropdown] = useState(false);
  const [showGundemDropdown, setShowGundemDropdown] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Levha no değiştiğinde otomatik arama
  useEffect(() => {
    if (isSelectingFromDropdown.current) return;
    const searchTimeout = setTimeout(async () => {
      if (isSelectingFromDropdown.current) return;
      if (levhaNo.trim().length >= 3) {
        await searchByLevhaNo(levhaNo.trim());
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(searchTimeout);
  }, [levhaNo]);

  // Acente adı değiştiğinde otomatik arama
  useEffect(() => {
    if (isSelectingFromDropdown.current) return;
    const searchTimeout = setTimeout(async () => {
      if (isSelectingFromDropdown.current) return;
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
        isSelectingFromDropdown.current = true;
        setAcenteAdi(agency.acenteUnvani);
        setSelectedAgency(agency);
        setIsAutoFilled(true);
        setTimeout(() => { isSelectingFromDropdown.current = false; }, 1000);

        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        setIsAutoFilled(false);
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
        isSelectingFromDropdown.current = true;
        setLevhaNo(agency.levhaNo);
        setSelectedAgency(agency);
        setIsAutoFilled(true);
        setTimeout(() => { isSelectingFromDropdown.current = false; }, 1000);

        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        setIsAutoFilled(false);
      }
    } catch (error) {
      console.error('Acente adı arama hatası:', error);
    } finally {
      setIsSearchingName(false);
    }
  };

  const loadData = async () => {
    try {
      const visits = await getRecentVisits(10);
      setRecentVisits(visits);
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    }
  };

  // searchAgency fonksiyonu kaldırıldı - artık onChangeText içinde IndexedDB araması yapılıyor

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.assets && result.assets.length > 0) {
        const fileUri = result.assets[0].uri;
        setDosyalar([...dosyalar, fileUri]);

        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        Alert.alert('Başarılı', 'Dosya yüklendi');
      }
    } catch (error) {
      console.error('Dosya seçme hatası:', error);
      Alert.alert('Hata', 'Dosya yüklenirken bir hata oluştu');
    }
  };

  const handleSave = async () => {
    // Mesajları temizle
    setSuccessMessage(null);
    setErrorMessage(null);
    
    console.log('[Form] handleSave called');
    console.log('[Form] levhaNo:', levhaNo);
    console.log('[Form] acenteAdi:', acenteAdi);
    console.log('[Form] kimleGorusuldu:', kimleGorusuldu);
    console.log('[Form] user:', user);
    
    // Levha no zorunluluk kontrolü: sadece Aday Acente ve Mevcut Acente için zorunlu
    const levhaNoRequired = isOrtagi === 'Aday Acente' || isOrtagi === 'Mevcut Acente';
    
    // Validasyon
    if (levhaNoRequired && !levhaNo.trim()) {
      console.log('[Form] Validation failed: Levha No empty (required for', isOrtagi, ')');
      Alert.alert('Uyarı', 'Levha No zorunludur');
      return;
    }
    if (!acenteAdi.trim()) {
      console.log('[Form] Validation failed: Acente Adı empty');
      Alert.alert('Uyarı', 'Acente Adı zorunludur');
      return;
    }
    if (!kimleGorusuldu.trim()) {
      console.log('[Form] Validation failed: Kimle Görüşüldü empty');
      Alert.alert('Uyarı', 'Kimle Görüşüldü alanı zorunludur');
      return;
    }

    console.log('[Form] Validation passed, starting save...');
    setIsSaving(true);

    try {
      const newVisit: Visit = {
        id: `visit_${Date.now()}`,
        iletisimTuru,
        isOrtagi,
        levhaNo: levhaNo.trim(),
        acenteAdi: acenteAdi.trim(),
        kimleGorusuldu: kimleGorusuldu.trim(),
        tarih,
        gundem,
        detayAciklama: detayAciklama.trim(),
        hatirlatma: hatirlatma.trim() || undefined,
        hatirlatmaTarihi: hatirlatmaTarihi || undefined,
        dosyalar: dosyalar.length > 0 ? dosyalar : undefined,
        createdBy: user?.name || user?.email || 'Kullanıcı',
        createdAt: new Date().toISOString(),
      };

      // Ziyaret kaydet
      console.log('[Form] Saving visit to local storage...');
      await addVisit(newVisit);
      console.log('[Form] Visit saved successfully');

      // Eğer acente bilgileri güncellendiyse, acente kaydını da güncelle
      if (selectedAgency && isAutoFilled) {
        const updatedAgency: Agency = {
          ...selectedAgency,
          teknikPersonel: kimleGorusuldu.trim(),
        };
        await saveAgency(updatedAgency);
      }

      // ClickUp'a gönder (opsiyonel, otomatik assignee ataması ile)
      console.log('[Form] Sending to ClickUp...');
      let clickupSuccess = false;
      let clickupError: any = null;
      
      try {
        // SahaAPP listesi custom field ID'leri
        const SAHA_FIELDS = {
          LEVHA_NO: '155b2b1c-80ee-43b8-8bc1-42cc32e9b508',
          ILETISIM_TURU: '15ac37b6-2ad8-4a09-b6b4-5b913a1058de',
          IS_ORTAGI: '1d529f91-4013-45f7-b24c-ce3b71e5e90e',
          KIMLE_GORUSULDU: '27b85be1-a731-41c0-aff8-9156a25210da',
          DETAY_ACIKLAMA: '388ac137-e8a4-4ae8-a5e6-8b82c6b10757',
          ZIYARET_TARIHI: '871f911e-fe4c-4ee8-82fb-ad1ce7b357cc',
          GUNDEM: '9423c508-aa96-4c2d-95a5-2231305da6bc',
          ADINIZ: '9f55713e-7cd3-4fc2-bbb0-4000da7302bf',
          HATIRLATMA: 'a8955f99-03ee-4b06-9d7f-41ed9fb753ff',
          HATIRLATMA_TARIHI: '1ebaea87-6bae-41a2-a584-5ece36887e67',
        };
        // İletişim Türü dropdown option ID'leri
        const ILETISIM_OPTIONS: Record<string, string> = {
          'Arama': '61b74056-6558-491d-ae41-1623203558f0',
          'Ziyaret': 'e5cdb717-56e7-4b14-8034-727b419e2fda',
          'Online Toplantı': '18124ef0-9685-4ec8-b786-e25fc81368e6',
          'Fuar/Etkinlik': '0a3eccfb-fc10-49aa-9bec-c0b7dc792e55',
        };
        // İş Ortağı dropdown option ID'leri
        const IS_ORTAGI_OPTIONS: Record<string, string> = {
          'Aday Acente': '46a11581-b068-4c79-9727-6570bd002929',
          'Mevcut Acente': '705da81d-63f7-4f8d-b04a-6298ee8629d1',
          'Sigorta Şirketi': '25d00b69-9c33-4bd4-ab7b-e1c9137707cb',
          'Dernek / Komite': 'c9bacb7f-0591-4d2a-a29c-f302db953eb8',
          'RS Grup Şirketleri': '05c73ab6-864a-4608-8c95-93c0fb4f0997',
          'Galeri': '6ffa3f20-1515-4aad-bb46-05448e7cbff8',
          'Diğer': '9630db3b-906d-4d08-bae1-dcabc46c9f82',
        };
        // Gündem dropdown option ID'leri
        const GUNDEM_OPTIONS: Record<string, string> = {
          'Yol Yardım Satış': 'fec35fd1-6f33-497c-ab61-537c91958b20',
          'Yol Yardım Proje': '7f184158-c378-48c0-95b4-1a057f8800c9',
          'Genel Performans': '2848c944-3fe6-4724-954b-dd2de97c4e93',
          'Hızlı Teklif Ekranları': 'ae71b626-8b56-48cc-9dc9-25848a826d8b',
          'Müşteri Yönlendirme Projesi': 'd35ea4c5-e0fb-478d-9a29-c1907122dbc8',
          'Diğer Teknoloji Konuları': 'e2bdc4d5-a95f-4aff-893f-a350d2701f08',
          'Acente Segmentasyon Konuları': '63524646-791d-49b4-baa1-c1bc9e0c4fcd',
          'Aday Görüşmesi': 'd5363705-f07a-4860-8196-5f2f0ceefe96',
          'Tanışma Toplantısı': 'a02e8fd3-0a57-4f49-884f-7bb066f42ee6',
          'Dernek / Komite Toplantısı': 'ffd21d7d-db1a-4733-84cc-4f7c28a06b41',
          'Otokonfor': '5f896c2d-43f9-4551-8a23-b9852fb4dcc4',
          'GOS': '56d6fb23-0e62-4812-9deb-6129dcc58f61',
          'RS Oto Ekspertiz': '1f038d6d-00e5-4bfa-95b2-5bf83c594a65',
          'RS Servis Hasar': 'b14d91a3-2b96-4b8c-a4e4-d649977e57d0',
          'RS Boyasz Onarım': '35647c61-97c2-4e12-8731-eb753506dc21',
          'Carshine': '93b464cb-c4db-482d-bee3-4a77955c21f6',
          'İhale Portal': 'ad883be6-4f39-4f25-8607-87d7cf5ad9b2',
          'RS Diğer Şirketler': '9ac02534-86b7-446d-8a85-3ffda6aa33b9',
          'Diğer Gündemler': 'b528d873-e714-4da6-a66e-bf7812d816a5',
        };

        const visitCustomFields: Array<{ id: string; value: string | number }> = [
          { id: SAHA_FIELDS.LEVHA_NO, value: levhaNo || '' },
          { id: SAHA_FIELDS.KIMLE_GORUSULDU, value: kimleGorusuldu || '' },
          { id: SAHA_FIELDS.DETAY_ACIKLAMA, value: detayAciklama || '' },
          { id: SAHA_FIELDS.ADINIZ, value: user?.name || user?.email || '' },
        ];

        // Dropdown field'lar - option ID'si ile gönder
        if (ILETISIM_OPTIONS[iletisimTuru]) {
          visitCustomFields.push({ id: SAHA_FIELDS.ILETISIM_TURU, value: ILETISIM_OPTIONS[iletisimTuru] });
        }
        if (IS_ORTAGI_OPTIONS[isOrtagi]) {
          visitCustomFields.push({ id: SAHA_FIELDS.IS_ORTAGI, value: IS_ORTAGI_OPTIONS[isOrtagi] });
        }
        if (GUNDEM_OPTIONS[gundem]) {
          visitCustomFields.push({ id: SAHA_FIELDS.GUNDEM, value: GUNDEM_OPTIONS[gundem] });
        }

        // Tarih field'ları (Unix timestamp ms)
        if (tarih) {
          const ts = new Date(tarih).getTime();
          if (!isNaN(ts)) visitCustomFields.push({ id: SAHA_FIELDS.ZIYARET_TARIHI, value: ts });
        }
        if (hatirlatmaTarihi) {
          const ts = new Date(hatirlatmaTarihi).getTime();
          if (!isNaN(ts)) visitCustomFields.push({ id: SAHA_FIELDS.HATIRLATMA_TARIHI, value: ts });
        }
        if (hatirlatma) {
          visitCustomFields.push({ id: SAHA_FIELDS.HATIRLATMA, value: hatirlatma });
        }

        const result = await createClickUpTask({
          name: `[Ziyaret] ${acenteAdi} - ${gundem}`,
          tags: ['Ziyaret', iletisimTuru, isOrtagi, gundem],
          custom_fields: visitCustomFields,
        });
        console.log('[Form] ClickUp task created successfully:', result);
        clickupSuccess = true;
      } catch (error) {
        console.error('[Form] ClickUp gönderimi başarısız:', error);
        clickupError = error;
      }

      // Haptic feedback
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      console.log('[Form] All operations completed, showing success message');
      
      // Kullanıcıya ClickUp durumu hakkında bilgi ver
      const message = clickupSuccess 
        ? 'Ziyaret kaydedildi ve ClickUp\'a gönderildi \u2705'
        : 'Ziyaret kaydedildi ancak ClickUp\'a gönderilemedi \u26a0\ufe0f';
      
      console.log('[Form] Setting message:', message);
      console.log('[Form] clickupSuccess:', clickupSuccess);
      
      if (clickupSuccess) {
        console.log('[Form] Setting success message');
        setSuccessMessage(message);
      } else {
        console.log('[Form] Setting error message');
        setErrorMessage(message);
      }
      
      console.log('[Form] Message state updated');
      
      // Formu temizle (5 saniye sonra)
      setTimeout(() => {
        console.log('[Form] Clearing form...');
        setLevhaNo('');
        setAcenteAdi('');
        setKimleGorusuldu('');
        setDetayAciklama('');
        setHatirlatma('');
        setHatirlatmaTarihi('');
        setDosyalar([]);
        setSelectedAgency(null);
        setIsAutoFilled(false);
        
        // Veriyi yenile
        loadData();
      }, 5000);
      
      // Mesajı 10 saniye sonra temizle
      setTimeout(() => {
        console.log('[Form] Clearing message...');
        setSuccessMessage(null);
        setErrorMessage(null);
      }, 10000);
    } catch (error) {
      console.error('[Form] Kaydetme hatası:', error);
      setErrorMessage('Ziyaret kaydedilirken bir hata oluştu \u274c');
    } finally {
      setIsSaving(false);
    }
  };

  const iletisimTuruOptions: CommunicationType[] = ['Arama', 'Ziyaret', 'Online Toplantı', 'Fuar/Etkinlik'];
  const isOrtagiOptions: PartnerType[] = [
    'Aday Acente',
    'Mevcut Acente',
    'Sigorta Şirketi',
    'Dernek / Komite',
    'RS Grup Şirketleri',
    'Galeri',
    'Diğer',
  ];
  const gundemOptions: AgendaType[] = [
    'Yol Yardım Satış',
    'Yol Yardım Proje',
    'Genel Performans',
    'Hızlı Teklif Ekranları',
    'Müşteri Yönlendirme Projesi',
    'Diğer Teknoloji Konuları',
    'Acente Segmentasyon Konuları',
    'Aday Görüşmesi',
    'Tanışma Toplantısı',
    'Dernek / Komite Toplantısı',
    'Oto Konfor',
    'GOS',
    'Ekspertiz',
    'RS Hasar',
    'RS Boyasız Onarım',
    'Carshine',
    'İhale Portal',
    'RS Diğer Şirketler',
    'Diğer Gündemler',
  ];

  return (
    <ScreenContainer className="p-4">
      <ScrollView showsVerticalScrollIndicator={false} className="bg-background" keyboardShouldPersistTaps="always">
        <View className="gap-6">
          {/* Başlık */}
          <View>
            <Text className="text-2xl font-bold text-foreground">
              Ziyaret / Arama Girişi
            </Text>
            <Text className="text-sm text-muted mt-1">
              Saha ziyareti veya arama kaydı oluşturun
            </Text>
          </View>

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
          <View className="bg-surface rounded-xl p-4 gap-4">
            {/* İletişim Türü */}
            <View>
              <Text className="text-sm font-medium text-foreground mb-2">
                İletişim Türü *
              </Text>
              <TouchableOpacity
                onPress={() => setShowIletisimTuruDropdown(!showIletisimTuruDropdown)}
                className="border border-border rounded-lg p-3 bg-background"
              >
                <Text className="text-foreground">{iletisimTuru}</Text>
              </TouchableOpacity>
              {showIletisimTuruDropdown && (
                <View className="mt-2 border border-border rounded-lg bg-background">
                  {iletisimTuruOptions.map((option) => (
                    <TouchableOpacity
                      key={option}
                      onPress={() => {
                        setIletisimTuru(option);
                        setShowIletisimTuruDropdown(false);
                      }}
                      className="p-3 border-b border-border"
                    >
                      <Text className={cn(
                        "text-foreground",
                        option === iletisimTuru && "font-bold text-primary"
                      )}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* İş Ortağı */}
            <View>
              <Text className="text-sm font-medium text-foreground mb-2">
                İş Ortağı *
              </Text>
              <TouchableOpacity
                onPress={() => setShowIsOrtagiDropdown(!showIsOrtagiDropdown)}
                className="border border-border rounded-lg p-3 bg-background"
              >
                <Text className="text-foreground">{isOrtagi}</Text>
              </TouchableOpacity>
              {showIsOrtagiDropdown && (
                <View className="mt-2 border border-border rounded-lg bg-background max-h-60">
                  <ScrollView>
                    {isOrtagiOptions.map((option) => (
                      <TouchableOpacity
                        key={option}
                        onPress={() => {
                          setIsOrtagi(option);
                          setShowIsOrtagiDropdown(false);
                        }}
                        className="p-3 border-b border-border"
                      >
                        <Text className={cn(
                          "text-foreground",
                          option === isOrtagi && "font-bold text-primary"
                        )}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Levha No - Aday/Mevcut Acente için zorunlu, diğerlerinde isteğe bağlı */}
            <View>
              <Text className="text-sm font-medium text-foreground mb-2">
                Levha No {(isOrtagi === 'Aday Acente' || isOrtagi === 'Mevcut Acente') ? '*' : '(isteğe bağlı)'}
              </Text>
              <View className="flex-row items-center">
                <TextInput
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
                      console.log('[visit] Levha no araması başlatıldı:', text);
                      const found = await findAgencyByLevhaNo(text);
                      console.log('[visit] Levha no arama sonucu:', found ? found.acenteUnvani : 'Bulunamadı');
                      
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
                  placeholder="Örn: T091014-SAN3"
                  placeholderTextColor={colors.muted}
                  className="flex-1 border border-border rounded-lg p-3 text-foreground bg-background"
                  autoCapitalize="characters"
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

            {/* Acente Adı */}
            <View>
              <Text className="text-sm font-medium text-foreground mb-2">
                Acente Adı *
              </Text>
              <View className="flex-row items-center">
                <TextInput
                  value={acenteAdi}
                  onChangeText={(text) => {
                    setAcenteAdi(text);
                    setIsAutoFilled(false);
                    setSelectedAgency(null);
                    setShowSuggestions(false);
                    setAcenteSuggestions([]);
                    if (!text.trim()) setLevhaNo('');

                    if (acenteSearchTimer.current) clearTimeout(acenteSearchTimer.current);

                    // 5 karakterden az ise aramayı durdur
                    if (text.trim().length < 5) return;

                    // 600ms debounce ile sunucu tarafı arama
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
                  onBlur={() => {
                    // Kısa gecikme ile kapat (seçim için zaman tanı)
                    setTimeout(() => setShowSuggestions(false), 500);
                  }}
                  placeholder="Acente ünvanı (en az 5 harf)"
                  placeholderTextColor={colors.muted}
                  className="flex-1 border border-border rounded-lg p-3 text-foreground bg-background"
                  autoCorrect={false}
                  autoComplete="off"
                  spellCheck={false}
                />
                {isSearchingName && (
                  <ActivityIndicator
                    size="small"
                    color={colors.primary}
                    style={{ marginLeft: 8 }}
                  />
                )}
              </View>
              {/* Öneri listesi */}
              {showSuggestions && acenteSuggestions.length > 0 && (
                <View className="mt-1 border border-border rounded-lg bg-background overflow-hidden" style={{ maxHeight: 200 }}>
                  <FlatList
                    data={acenteSuggestions}
                    keyExtractor={(item) => item.levhaNo}
                    keyboardShouldPersistTaps="always"
                    scrollEnabled={acenteSuggestions.length > 4}
                    renderItem={({ item: agency }) => (
                      <Pressable
                        onPressIn={() => {
                          isSelectingFromDropdown.current = true;
                          if (acenteSearchTimer.current) clearTimeout(acenteSearchTimer.current);
                          setAcenteAdi(agency.acenteUnvani);
                          setLevhaNo(agency.levhaNo);
                          setSelectedAgency(agency);
                          setIsAutoFilled(true);
                          setShowSuggestions(false);
                          setAcenteSuggestions([]);
                          if (Platform.OS !== 'web') {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }
                          setTimeout(() => { isSelectingFromDropdown.current = false; }, 1000);
                        }}
                        style={({ pressed }) => ({
                          padding: 12,
                          borderBottomWidth: 0.5,
                          borderBottomColor: '#E5E7EB',
                          backgroundColor: pressed ? 'rgba(0,0,0,0.05)' : 'transparent',
                        })}
                      >
                        <Text className="text-foreground text-sm font-medium">{agency.acenteUnvani}</Text>
                        <Text className="text-muted text-xs">{agency.levhaNo} • {agency.il}</Text>
                      </Pressable>
                    )}
                  />
                </View>
              )}
              {isAutoFilled && (
                <Text className="text-xs text-success mt-1">✓ Acente seçildi: {selectedAgency?.levhaNo}</Text>
              )}
            </View>

            {/* Kimle Görüşüldü */}
            <View>
              <Text className="text-sm font-medium text-foreground mb-2">
                Kimle Görüşüldü *
              </Text>
              <TextInput
                value={kimleGorusuldu}
                onChangeText={setKimleGorusuldu}
                placeholder="Yetkili adı soyadı"
                placeholderTextColor={colors.muted}
                className="border border-border rounded-lg p-3 text-foreground bg-background"
              />
            </View>

            {/* Tarih */}
            <View>
              <Text className="text-sm font-medium text-foreground mb-2">
                Tarih *
              </Text>
              <TextInput
                value={tarih}
                onChangeText={setTarih}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.muted}
                className="border border-border rounded-lg p-3 text-foreground bg-background"
              />
            </View>

            {/* Gündem */}
            <View>
              <Text className="text-sm font-medium text-foreground mb-2">
                Gündem *
              </Text>
              <TouchableOpacity
                onPress={() => setShowGundemDropdown(!showGundemDropdown)}
                className="border border-border rounded-lg p-3 bg-background"
              >
                <Text className="text-foreground">{gundem}</Text>
              </TouchableOpacity>
              {showGundemDropdown && (
                <View className="mt-2 border border-border rounded-lg bg-background max-h-60">
                  <ScrollView>
                    {gundemOptions.map((option) => (
                      <TouchableOpacity
                        key={option}
                        onPress={() => {
                          setGundem(option);
                          setShowGundemDropdown(false);
                        }}
                        className="p-3 border-b border-border"
                      >
                        <Text className={cn(
                          "text-foreground",
                          option === gundem && "font-bold text-primary"
                        )}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Detay Açıklama */}
            <View>
              <Text className="text-sm font-medium text-foreground mb-2">
                Detay Açıklama
              </Text>
              <TextInput
                value={detayAciklama}
                onChangeText={setDetayAciklama}
                placeholder="Ziyaret detayları..."
                placeholderTextColor={colors.muted}
                className="border border-border rounded-lg p-3 text-foreground bg-background"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Hatırlatma */}
            <View>
              <Text className="text-sm font-medium text-foreground mb-2">
                Hatırlatma
              </Text>
              <TextInput
                value={hatirlatma}
                onChangeText={setHatirlatma}
                placeholder="Hatırlatma notu"
                placeholderTextColor={colors.muted}
                className="border border-border rounded-lg p-3 text-foreground bg-background"
              />
            </View>

            {/* Hatırlatma Tarihi */}
            <View>
              <Text className="text-sm font-medium text-foreground mb-2">
                Hatırlatma Tarihi
              </Text>
              <TextInput
                value={hatirlatmaTarihi}
                onChangeText={setHatirlatmaTarihi}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.muted}
                className="border border-border rounded-lg p-3 text-foreground bg-background"
              />
            </View>

            {/* Dosya Yükleme */}
            <View>
              <Text className="text-sm font-medium text-foreground mb-2">
                Dosya Yükleme
              </Text>
              <TouchableOpacity
                onPress={handleFilePick}
                className="border border-dashed border-border rounded-lg p-4 items-center bg-background"
              >
                <Text className="text-primary font-medium">+ Dosya Seç</Text>
              </TouchableOpacity>
              {dosyalar.length > 0 && (
                <View className="mt-2">
                  {dosyalar.map((file, index) => (
                    <Text key={index} className="text-xs text-muted">
                      {index + 1}. {file.split('/').pop()}
                    </Text>
                  ))}
                </View>
              )}
            </View>

            {/* Kaydet Butonu */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving}
              className={cn(
                "bg-primary rounded-lg p-4 items-center",
                isSaving && "opacity-50"
              )}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-white font-semibold text-base">
                  Kaydet
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Son Ziyaretler */}
          {recentVisits.length > 0 && (
            <View>
              <Text className="text-lg font-semibold text-foreground mb-3">
                Son Ziyaretler
              </Text>
              <View className="gap-3">
                {recentVisits.map((visit) => (
                  <View
                    key={visit.id}
                    className="bg-surface rounded-lg p-4 border border-border"
                  >
                    <View className="flex-row justify-between items-start mb-2">
                      <Text className="text-base font-semibold text-foreground flex-1">
                        {visit.acenteAdi}
                      </Text>
                      <Text className="text-xs text-muted">
                        {new Date(visit.tarih).toLocaleDateString('tr-TR')}
                      </Text>
                    </View>
                    <Text className="text-sm text-muted mb-1">
                      {visit.iletisimTuru} • {visit.gundem}
                    </Text>
                    {visit.detayAciklama && (
                      <Text className="text-sm text-foreground" numberOfLines={2}>
                        {visit.detayAciklama}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
