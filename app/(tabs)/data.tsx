import { useState, useEffect } from 'react';
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { importFromExcel, generateSampleExcelData } from '@/lib/services/excel-import';
import { getAllAgencies, saveMultipleAgencies } from '@/lib/services/storage';

/**
 * Veri Yönetimi Ekranı
 * 
 * Excel import ve veri tabanı yönetimi
 */
export default function DataManagementScreen() {
  const colors = useColors();
  
  const [isImporting, setIsImporting] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [agencyCount, setAgencyCount] = useState(0);

  useEffect(() => {
    loadAgencyCount();
  }, []);

  /**
   * Veri tabanındaki acente sayısını yükle
   */
  const loadAgencyCount = async () => {
    try {
      const agencies = await getAllAgencies();
      setAgencyCount(agencies.length);
    } catch (error) {
      console.error('Acente sayısı yüklenirken hata:', error);
    }
  };

  /**
   * Excel dosyasından import et
   */
  const handleImportExcel = async () => {
    setIsImporting(true);
    
    try {
      const result = await importFromExcel();
      
      if (result.success) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        
        let message = `${result.importedCount} acente başarıyla içe aktarıldı.`;
        if (result.errorCount > 0) {
          message += `\n\n${result.errorCount} satırda hata oluştu.`;
        }
        
        Alert.alert('Başarılı', message, [
          {
            text: 'Tamam',
            onPress: () => loadAgencyCount(),
          },
        ]);
      } else {
        Alert.alert(
          'Hata',
          result.errors.join('\n') || 'İçe aktarma sırasında bir hata oluştu'
        );
      }
    } catch (error) {
      console.error('Import hatası:', error);
      Alert.alert('Hata', 'İçe aktarma sırasında bir hata oluştu');
    } finally {
      setIsImporting(false);
    }
  };

  /**
   * Örnek veri yükle (test için)
   */
  const handleLoadSampleData = async () => {
    Alert.alert(
      'Örnek Veri Yükle',
      'Bu işlem 3 örnek acente kaydı ekleyecektir. Devam etmek istiyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet',
          onPress: async () => {
            setIsLoadingSample(true);
            try {
              const sampleData = generateSampleExcelData();
              const saved = await saveMultipleAgencies(sampleData);
              
              if (saved) {
                if (Platform.OS !== 'web') {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
                Alert.alert(
                  'Başarılı',
                  `${sampleData.length} örnek acente kaydı eklendi`,
                  [
                    {
                      text: 'Tamam',
                      onPress: () => loadAgencyCount(),
                    },
                  ]
                );
              } else {
                Alert.alert('Hata', 'Örnek veriler eklenirken bir hata oluştu');
              }
            } catch (error) {
              console.error('Örnek veri yükleme hatası:', error);
              Alert.alert('Hata', 'Örnek veriler eklenirken bir hata oluştu');
            } finally {
              setIsLoadingSample(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer className="bg-background">
      <ScrollView className="flex-1 px-4">
        <View className="py-6 gap-6">
          {/* Başlık */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">
              Veri Yönetimi
            </Text>
            <Text className="text-base text-muted">
              Excel dosyasından acente verilerini içe aktarın
            </Text>
          </View>

          {/* Veri Tabanı Durumu */}
          <View className="bg-surface rounded-2xl p-6 border border-border shadow-sm">
            <Text className="text-lg font-bold text-foreground mb-4">
              Veri Tabanı Durumu
            </Text>
            <View className="flex-row items-center justify-between">
              <Text className="text-base text-muted">
                Kayıtlı Acente Sayısı
              </Text>
              <View className="bg-primary rounded-full px-4 py-2">
                <Text className="text-lg font-bold text-white">
                  {agencyCount}
                </Text>
              </View>
            </View>
          </View>

          {/* Excel Import */}
          <View className="bg-surface rounded-2xl p-6 border border-border shadow-sm gap-4">
            <View className="gap-2">
              <Text className="text-lg font-bold text-foreground">
                Excel İçe Aktarma
              </Text>
              <Text className="text-sm text-muted leading-relaxed">
                Excel dosyanızda aşağıdaki sütun sıralaması olmalıdır:{'\n'}
                A: Levha No{'\n'}
                B: Acente Adı{'\n'}
                C: Yetkili Adı Soyadı{'\n'}
                D: Telefon{'\n'}
                E: E-posta{'\n'}
                F: Adres{'\n'}
                G: Şehir{'\n'}
                H: İlçe{'\n'}
                I: Vergi No{'\n'}
                J: Durum (Aktif/Pasif)
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleImportExcel}
              disabled={isImporting}
              style={{
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: colors.primary,
                opacity: isImporting ? 0.6 : 1,
              }}
            >
              {isImporting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-center font-bold text-white">
                  📄 Excel Dosyası Seç ve İçe Aktar
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Örnek Veri */}
          <View className="bg-surface rounded-2xl p-6 border border-border shadow-sm gap-4">
            <View className="gap-2">
              <Text className="text-lg font-bold text-foreground">
                Test Verisi
              </Text>
              <Text className="text-sm text-muted leading-relaxed">
                Uygulamayı test etmek için örnek acente kayıtları yükleyebilirsiniz.
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleLoadSampleData}
              disabled={isLoadingSample}
              style={{
                paddingVertical: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.background,
                opacity: isLoadingSample ? 0.6 : 1,
              }}
            >
              {isLoadingSample ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text
                  className="text-center font-bold"
                  style={{ color: colors.primary }}
                >
                  🧪 Örnek Veri Yükle (3 Kayıt)
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Bilgi Notu */}
          <View className="bg-warning/10 rounded-xl p-4 border border-warning/30">
            <Text className="text-sm text-foreground leading-relaxed">
              <Text className="font-bold">💡 Not:</Text> İçe aktarılan veriler mevcut kayıtlarla birleştirilir. 
              Aynı levha numarasına sahip kayıtlar güncellenir.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
