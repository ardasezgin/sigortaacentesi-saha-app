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
import type { Agency, AgencyLog } from '@/lib/types/agency';
import {
  findAgencyByLevhaNo,
  findAgencyByName,
} from '@/lib/services/agency-service';
import {
  saveAgency,
  addLog,
  getRecentLogs,
} from '@/lib/services/storage';

/**
 * Ana Form Ekranı - Saha Ziyareti Formu
 * 
 * Levha No girişi ile otomatik veri doldurma ve kaydetme
 */
export default function HomeScreen() {
  const colors = useColors();
  
  // Form state
  const [levhaNo, setLevhaNo] = useState('');
  const [acenteAdi, setAcenteAdi] = useState('');
  const [yetkiliAdiSoyadi, setYetkiliAdiSoyadi] = useState('');
  const [telefon, setTelefon] = useState('');
  const [eposta, setEposta] = useState('');
  const [adres, setAdres] = useState('');
  const [sehir, setSehir] = useState('');
  const [ilce, setIlce] = useState('');
  const [vergiNo, setVergiNo] = useState('');
  const [durum, setDurum] = useState<'Aktif' | 'Pasif'>('Aktif');
  
  // UI state
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoFilled, setIsAutoFilled] = useState(false);
  const [originalData, setOriginalData] = useState<Agency | null>(null);
  const [recentLogs, setRecentLogs] = useState<AgencyLog[]>([]);

  // Levha No değiştiğinde otomatik arama
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (levhaNo.trim().length >= 3) {
        await searchAgency(levhaNo.trim());
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(searchTimeout);
  }, [levhaNo]);

  // Sayfa yüklendiğinde son kayıtları getir
  useEffect(() => {
    loadRecentLogs();
  }, []);

  /**
   * Levha numarasına göre acente ara ve formu doldur
   */
  const searchAgency = async (searchLevhaNo: string) => {
    setIsSearching(true);
    try {
      // Önce levha no ile ara
      let agency = await findAgencyByLevhaNo(searchLevhaNo);
      
      // Bulunamadıysa ve 5+ karakter ise acente adı ile ara
      if (!agency && searchLevhaNo.length >= 5) {
        agency = await findAgencyByName(searchLevhaNo);
      }
      
      if (agency) {
        // Formu otomatik doldur
        setAcenteAdi(agency.acenteUnvani);
        setYetkiliAdiSoyadi(agency.teknikPersonel || '');
        setTelefon(agency.telefon || '');
        setEposta(agency.ePosta || agency.eposta || '');
        setAdres(agency.adres || '');
        setSehir(agency.il || '');
        setIlce(agency.ilce || '');
        setVergiNo(agency.notlar || "");
        setDurum(agency.isActive === 0 ? 'Pasif' : 'Aktif');
        setIsAutoFilled(true);
        setOriginalData(agency);
        
        // Haptic feedback
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        // Bulunamadı, formu temizle
        clearFormExceptLevhaNo();
      }
    } catch (error) {
      console.error('Arama hatası:', error);
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * Son kayıtları yükle
   */
  const loadRecentLogs = async () => {
    try {
      const logs = await getRecentLogs(10);
      setRecentLogs(logs);
    } catch (error) {
      console.error('Loglar yüklenirken hata:', error);
    }
  };

  /**
   * Formu temizle (Levha No hariç)
   */
  const clearFormExceptLevhaNo = () => {
    setAcenteAdi('');
    setYetkiliAdiSoyadi('');
    setTelefon('');
    setEposta('');
    setAdres('');
    setSehir('');
    setIlce('');
    setVergiNo('');
    setDurum('Aktif');
    setIsAutoFilled(false);
    setOriginalData(null);
  };

  /**
   * Tüm formu temizle
   */
  const clearForm = () => {
    setLevhaNo('');
    clearFormExceptLevhaNo();
  };

  /**
   * Form validasyonu
   */
  const validateForm = (): boolean => {
    if (!levhaNo.trim()) {
      Alert.alert('Hata', 'Levha No boş olamaz');
      return false;
    }
    if (!acenteAdi.trim()) {
      Alert.alert('Hata', 'Acente Adı boş olamaz');
      return false;
    }
    return true;
  };

  /**
   * Formu kaydet
   */
  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    
    try {
      const newAgency: Agency = {
        acenteTuru: 'TÜZEL',
        levhaNo: levhaNo.trim(),
        levhaKayitTarihi: new Date().toLocaleDateString('tr-TR'),
        levhaYenilemeTarihi: null,
        acenteUnvani: acenteAdi.trim(),
        adres: adres.trim(),
        il: sehir.trim(),
        ilce: ilce.trim(),
        telefon: telefon.trim(),
        eposta: eposta.trim(),
        teknikPersonel: yetkiliAdiSoyadi.trim(),
        durum,
        notlar: vergiNo.trim(),
      };

      // Acente kaydet
      const saved = await saveAgency(newAgency);
      
      if (!saved) {
        Alert.alert('Hata', 'Kayıt sırasında bir hata oluştu');
        return;
      }

      // Log kaydı oluştur
      const isUpdate = originalData !== null;
      const log: AgencyLog = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        levhaNo: newAgency.levhaNo,
        kayitTarihi: new Date().toISOString(),
        islemTipi: isUpdate ? 'Güncelleme' : 'Yeni',
        guncelleyenKullanici: 'Saha Personeli', // Şimdilik sabit
        oncekiVeri: isUpdate ? originalData : undefined,
        yeniVeri: newAgency,
      };

      await addLog(log);

      // Başarı bildirimi
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      Alert.alert(
        'Başarılı',
        isUpdate ? 'Acente bilgileri güncellendi' : 'Yeni acente kaydedildi',
        [
          {
            text: 'Tamam',
            onPress: () => {
              clearForm();
              loadRecentLogs();
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

  return (
    <ScreenContainer className="bg-background">
      <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled">
        <View className="py-6 gap-6">
          {/* Başlık */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">
              Saha Ziyareti Formu
            </Text>
            <Text className="text-base text-muted">
              Levha numarasını girerek acente bilgilerini otomatik doldurun
            </Text>
          </View>

          {/* Form */}
          <View className="bg-surface rounded-2xl p-4 gap-4 border border-border shadow-sm">
            {/* Levha No */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">
                Levha No *
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
              {isAutoFilled && (
                <Text className="text-xs text-success">
                  ✓ Kayıtlı acente bulundu, bilgiler otomatik dolduruldu
                </Text>
              )}
            </View>

            {/* Acente Adı */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">
                Acente Adı *
              </Text>
              <TextInput
                className="bg-background border border-border rounded-lg px-4 py-3 text-foreground"
                placeholder="Acente adını girin"
                placeholderTextColor={colors.muted}
                value={acenteAdi}
                onChangeText={setAcenteAdi}
                editable={!isSaving}
              />
            </View>

            {/* Yetkili Adı Soyadı */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">
                Yetkili Adı Soyadı
              </Text>
              <TextInput
                className="bg-background border border-border rounded-lg px-4 py-3 text-foreground"
                placeholder="Yetkili adını girin"
                placeholderTextColor={colors.muted}
                value={yetkiliAdiSoyadi}
                onChangeText={setYetkiliAdiSoyadi}
                editable={!isSaving}
              />
            </View>

            {/* Telefon */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">
                Telefon
              </Text>
              <TextInput
                className="bg-background border border-border rounded-lg px-4 py-3 text-foreground"
                placeholder="0532 123 45 67"
                placeholderTextColor={colors.muted}
                value={telefon}
                onChangeText={setTelefon}
                keyboardType="phone-pad"
                editable={!isSaving}
              />
            </View>

            {/* E-posta */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">
                E-posta
              </Text>
              <TextInput
                className="bg-background border border-border rounded-lg px-4 py-3 text-foreground"
                placeholder="ornek@email.com"
                placeholderTextColor={colors.muted}
                value={eposta}
                onChangeText={setEposta}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isSaving}
              />
            </View>

            {/* Adres */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">
                Adres
              </Text>
              <TextInput
                className="bg-background border border-border rounded-lg px-4 py-3 text-foreground"
                placeholder="Tam adres"
                placeholderTextColor={colors.muted}
                value={adres}
                onChangeText={setAdres}
                multiline
                numberOfLines={2}
                editable={!isSaving}
              />
            </View>

            {/* Şehir ve İlçe */}
            <View className="flex-row gap-4">
              <View className="flex-1 gap-2">
                <Text className="text-sm font-semibold text-foreground">
                  Şehir
                </Text>
                <TextInput
                  className="bg-background border border-border rounded-lg px-4 py-3 text-foreground"
                  placeholder="Şehir"
                  placeholderTextColor={colors.muted}
                  value={sehir}
                  onChangeText={setSehir}
                  editable={!isSaving}
                />
              </View>
              <View className="flex-1 gap-2">
                <Text className="text-sm font-semibold text-foreground">
                  İlçe
                </Text>
                <TextInput
                  className="bg-background border border-border rounded-lg px-4 py-3 text-foreground"
                  placeholder="İlçe"
                  placeholderTextColor={colors.muted}
                  value={ilce}
                  onChangeText={setIlce}
                  editable={!isSaving}
                />
              </View>
            </View>

            {/* Vergi No */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">
                Vergi No
              </Text>
              <TextInput
                className="bg-background border border-border rounded-lg px-4 py-3 text-foreground"
                placeholder="Vergi numarası"
                placeholderTextColor={colors.muted}
                value={vergiNo}
                onChangeText={setVergiNo}
                keyboardType="numeric"
                editable={!isSaving}
              />
            </View>

            {/* Durum */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">
                Durum
              </Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setDurum('Aktif')}
                  disabled={isSaving}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: durum === 'Aktif' ? colors.success : colors.border,
                    backgroundColor: durum === 'Aktif' ? colors.success + '20' : colors.background,
                  }}
                >
                  <Text
                    className="text-center font-semibold"
                    style={{ color: durum === 'Aktif' ? colors.success : colors.foreground }}
                  >
                    Aktif
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setDurum('Pasif')}
                  disabled={isSaving}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: durum === 'Pasif' ? colors.error : colors.border,
                    backgroundColor: durum === 'Pasif' ? colors.error + '20' : colors.background,
                  }}
                >
                  <Text
                    className="text-center font-semibold"
                    style={{ color: durum === 'Pasif' ? colors.error : colors.foreground }}
                  >
                    Pasif
                  </Text>
                </TouchableOpacity>
              </View>
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

          {/* Son Kayıtlar */}
          {recentLogs.length > 0 && (
            <View className="gap-3">
              <Text className="text-lg font-bold text-foreground">
                Son Ziyaretler
              </Text>
              {recentLogs.map((log) => (
                <View
                  key={log.id}
                  className="bg-surface rounded-xl p-4 border border-border"
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <Text className="text-base font-semibold text-foreground">
                      {log.yeniVeri.acenteUnvani}
                    </Text>
                    <View
                      className="px-2 py-1 rounded"
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
                  <Text className="text-sm text-muted mb-1">
                    Levha No: {log.levhaNo}
                  </Text>
                  <Text className="text-xs text-muted">
                    {new Date(log.kayitTarihi).toLocaleString('tr-TR')}
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
