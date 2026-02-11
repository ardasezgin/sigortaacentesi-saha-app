import { useState } from 'react';
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
import { loadSampleAgencies, loadSampleVisits } from '@/lib/services/sample-data';
import { initializeAgencies } from '@/lib/services/init-agencies';

/**
 * Veri Yükleme Ekranı
 * Excel ve örnek veri yükleme işlemleri
 */
export default function DataUploadScreen() {
  const colors = useColors();
  
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [isLoadingExcel, setIsLoadingExcel] = useState(false);

  const handleLoadExcel = async () => {
    Alert.alert(
      'Excel Verilerini Yükle',
      '19,364 acente kaydı IndexedDB/AsyncStorage\'a yüklenecek. Bu işlem birkaç saniye sürebilir. Devam etmek istiyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Yükle',
          onPress: async () => {
            setIsLoadingExcel(true);
            try {
              const result = await initializeAgencies();
              
              if (result.success) {
                if (Platform.OS !== 'web') {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
                Alert.alert('Başarılı', result.message);
              } else {
                Alert.alert('Hata', result.message);
              }
            } catch (error) {
              console.error('Excel yükleme hatası:', error);
              Alert.alert('Hata', 'Bir hata oluştu');
            } finally {
              setIsLoadingExcel(false);
            }
          },
        },
      ]
    );
  };

  const handleLoadSampleData = async () => {
    Alert.alert(
      'Örnek Veri Yükle',
      'Örnek acente ve ziyaret verileri yüklenecek. Devam etmek istiyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Yükle',
          onPress: async () => {
            setIsLoadingSample(true);
            try {
              const agenciesLoaded = await loadSampleAgencies();
              const visitsLoaded = await loadSampleVisits();
              
              if (agenciesLoaded && visitsLoaded) {
                if (Platform.OS !== 'web') {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
                Alert.alert('Başarılı', 'Örnek veriler yüklendi');
              } else {
                Alert.alert('Hata', 'Örnek veriler yüklenirken bir sorun oluştu');
              }
            } catch (error) {
              console.error('Örnek veri yükleme hatası:', error);
              Alert.alert('Hata', 'Bir hata oluştu');
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
              Veri Yükle
            </Text>
            <Text className="text-base text-muted">
              Excel veya örnek veri yükleyerek uygulamayı kullanmaya başlayın
            </Text>
          </View>

          {/* Excel Veri Yükleme */}
          <View className="bg-success/10 rounded-2xl p-4 border border-success/30">
            <View className="flex-row items-center mb-3">
              <Text className="text-2xl mr-2">📊</Text>
              <Text className="text-lg font-semibold text-foreground">
                Excel Verilerini Yükle
              </Text>
            </View>
            <Text className="text-sm text-muted mb-4">
              19,364 acente kaydını uygulamaya yükleyin. Veriler cihazınızda güvenli şekilde saklanır (Web: IndexedDB, Mobil: AsyncStorage).
            </Text>
            <View className="bg-background/50 rounded-lg p-3 mb-4">
              <Text className="text-xs text-muted mb-1">
                📁 Kaynak Dosya
              </Text>
              <Text className="text-sm font-medium text-foreground">
                KopyaAcenteListesi.xlsx
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleLoadExcel}
              disabled={isLoadingExcel}
              style={{
                paddingVertical: 14,
                borderRadius: 10,
                backgroundColor: colors.success,
                opacity: isLoadingExcel ? 0.6 : 1,
              }}
            >
              {isLoadingExcel ? (
                <View className="flex-row items-center justify-center">
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text className="text-center font-bold text-white ml-2">
                    Yükleniyor...
                  </Text>
                </View>
              ) : (
                <Text className="text-center font-bold text-white">
                  Excel Yükle
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Örnek Veri Yükleme */}
          <View className="bg-primary/10 rounded-2xl p-4 border border-primary/30">
            <View className="flex-row items-center mb-3">
              <Text className="text-2xl mr-2">🧪</Text>
              <Text className="text-lg font-semibold text-foreground">
                Örnek Veri Yükle
              </Text>
            </View>
            <Text className="text-sm text-muted mb-4">
              Uygulamayı test etmek için örnek acente ve ziyaret verileri yükleyebilirsiniz. Bu veriler gerçek değildir.
            </Text>
            <View className="bg-background/50 rounded-lg p-3 mb-4">
              <Text className="text-xs text-muted mb-2">
                📦 İçerik
              </Text>
              <Text className="text-sm text-foreground">
                • 5 örnek acente{'\n'}
                • 10 örnek ziyaret kaydı
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleLoadSampleData}
              disabled={isLoadingSample}
              style={{
                paddingVertical: 14,
                borderRadius: 10,
                backgroundColor: colors.primary,
                opacity: isLoadingSample ? 0.6 : 1,
              }}
            >
              {isLoadingSample ? (
                <View className="flex-row items-center justify-center">
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text className="text-center font-bold text-white ml-2">
                    Yükleniyor...
                  </Text>
                </View>
              ) : (
                <Text className="text-center font-bold text-white">
                  Örnek Veri Yükle
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Bilgilendirme */}
          <View className="bg-surface rounded-2xl p-4 border border-border">
            <Text className="text-sm font-semibold text-foreground mb-2">
              ℹ️ Önemli Notlar
            </Text>
            <Text className="text-sm text-muted leading-relaxed">
              • Excel verileri sadece bir kez yüklenir, tekrar yükleme gerektirmez{'\n'}
              • Veriler cihazınızda yerel olarak saklanır{'\n'}
              • Örnek veriler test amaçlıdır, gerçek veri değildir{'\n'}
              • Veri yükleme işlemi birkaç saniye sürebilir
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
