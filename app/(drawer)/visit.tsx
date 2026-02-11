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
import * as DocumentPicker from 'expo-document-picker';

import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
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
  
  // Dropdown visibility
  const [showIletisimTuruDropdown, setShowIletisimTuruDropdown] = useState(false);
  const [showIsOrtagiDropdown, setShowIsOrtagiDropdown] = useState(false);
  const [showGundemDropdown, setShowGundemDropdown] = useState(false);

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
    // Validasyon
    if (!levhaNo.trim()) {
      Alert.alert('Uyarı', 'Levha No zorunludur');
      return;
    }
    if (!acenteAdi.trim()) {
      Alert.alert('Uyarı', 'Acente Adı zorunludur');
      return;
    }
    if (!kimleGorusuldu.trim()) {
      Alert.alert('Uyarı', 'Kimle Görüşüldü alanı zorunludur');
      return;
    }

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
        createdBy: 'Kullanıcı', // TODO: Gerçek kullanıcı adı
        createdAt: new Date().toISOString(),
      };

      // Ziyaret kaydet
      await addVisit(newVisit);

      // Eğer acente bilgileri güncellendiyse, acente kaydını da güncelle
      if (selectedAgency && isAutoFilled) {
        const updatedAgency: Agency = {
          ...selectedAgency,
          teknikPersonel: kimleGorusuldu.trim(),
        };
        await saveAgency(updatedAgency);
      }

      // ClickUp'a gönder (opsiyonel)
      try {
        await createClickUpTask({
          name: `[Ziyaret] ${acenteAdi} - ${gundem}`,
          description: `**İletişim Türü:** ${iletisimTuru}\n**İş Ortağı:** ${isOrtagi}\n**Levha No:** ${levhaNo}\n**Kimle Görüşüldü:** ${kimleGorusuldu}\n**Tarih:** ${tarih}\n**Gündem:** ${gundem}\n\n**Detay:**\n${detayAciklama}`,
          tags: ['Ziyaret', iletisimTuru, isOrtagi, gundem],
        });
      } catch (clickupError) {
        console.warn('ClickUp gönderimi başarısız:', clickupError);
      }

      // Haptic feedback
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      Alert.alert('Başarılı', 'Ziyaret kaydedildi', [
        {
          text: 'Tamam',
          onPress: () => {
            // Formu temizle
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
          },
        },
      ]);
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      Alert.alert('Hata', 'Ziyaret kaydedilirken bir hata oluştu');
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
      <ScrollView showsVerticalScrollIndicator={false}>
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

            {/* Levha No */}
            <View>
              <Text className="text-sm font-medium text-foreground mb-2">
                Levha No *
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
                  onChangeText={async (text) => {
                    setAcenteAdi(text);
                    
                    // 5 karakterden az ise sadece state güncelle
                    if (text.length < 5) {
                      return;
                    }
                    
                    // 5+ karakter girildiğinde acente adına göre ara
                    setIsSearchingName(true);
                    try {
                      console.log('[visit] Acente adı araması başlatıldı:', text);
                      const found = await findAgencyByName(text);
                      console.log('[visit] Acente adı arama sonucu:', found ? found.levhaNo : 'Bulunamadı');
                      
                      if (found) {
                        setSelectedAgency(found);
                        setLevhaNo(found.levhaNo);
                        setAcenteAdi(found.acenteUnvani);
                        setIsAutoFilled(true);
                        if (Platform.OS !== 'web') {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                      }
                      // Bulunamadıysa hiçbir şey yapma (kullanıcı manuel yazıyor)
                    } catch (error) {
                      console.error('Acente adı arama hatası:', error);
                    } finally {
                      setIsSearchingName(false);
                    }
                  }}
                  placeholder="Acente ünvanı"
                  placeholderTextColor={colors.muted}
                  className="flex-1 border border-border rounded-lg p-3 text-foreground bg-background"
                />
                {isSearchingName && (
                  <ActivityIndicator
                    size="small"
                    color={colors.primary}
                    style={{ marginLeft: 8 }}
                  />
                )}
              </View>
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
