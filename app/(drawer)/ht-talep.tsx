import { useState, useCallback } from 'react';
import {
  ScrollView,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  FlatList,
  Pressable,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { trpc } from '@/lib/trpc';

/**
 * HT Talep Formu Ekranı
 * ClickUp'taki ilgili listeye yeni görev oluşturur.
 */
export default function HtTalepScreen() {
  const colors = useColors();

  // Form state
  const [talepGirenId, setTalepGirenId] = useState<number | null>(null);
  const [talepGirenAdi, setTalepGirenAdi] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [showMemberList, setShowMemberList] = useState(false);

  const [acenteAdi, setAcenteAdi] = useState('');
  const [levhaNo, setLevhaNo] = useState('');
  const [acenteKullaniciSayisi, setAcenteKullaniciSayisi] = useState('');
  const [hizliTeklifSayisi, setHizliTeklifSayisi] = useState('');
  const [smsOtorizasyon, setSmsOtorizasyon] = useState<'Evet' | 'Hayir' | null>(null);

  const [acentechDosyaAdi, setAcentechDosyaAdi] = useState('');
  const [acentechDosyaBase64, setAcentechDosyaBase64] = useState('');
  const [acentechDosyaMime, setAcentechDosyaMime] = useState('');
  const [acentechUrl, setAcentechUrl] = useState('');

  const [sigortaDosyaAdi, setSigortaDosyaAdi] = useState('');
  const [sigortaDosyaBase64, setSigortaDosyaBase64] = useState('');
  const [sigortaDosyaMime, setSigortaDosyaMime] = useState('');
  const [sigortaUrl, setSigortaUrl] = useState('');

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // tRPC hooks
  const membersQuery = trpc.htTalep.getMembers.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  const uploadFileMutation = trpc.htTalep.uploadFile.useMutation();
  const createTaskMutation = trpc.htTalep.createTask.useMutation();

  const SEARCH_MIN_CHARS = 5;

  // Üye arama filtresi — en az 5 karakter girilince çalışır
  const filteredMembers = memberSearch.trim().length >= SEARCH_MIN_CHARS
    ? (membersQuery.data || []).filter((m) => {
        const q = memberSearch.toLowerCase();
        return (
          m.username.toLowerCase().includes(q) ||
          (m.email && m.email.toLowerCase().includes(q))
        );
      })
    : [];

  // Arama metnini güncelleyince liste görünürlüğünü de yönet
  const handleMemberSearchChange = (text: string) => {
    setMemberSearch(text);
    if (text.trim().length >= SEARCH_MIN_CHARS) {
      setShowMemberList(true);
    } else {
      setShowMemberList(false);
    }
  };

  // Dosya seç ve base64'e çevir
  const pickFile = useCallback(async (
    setAdi: (v: string) => void,
    setBase64: (v: string) => void,
    setMime: (v: string) => void,
    setUrl: (v: string) => void,
  ) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      setAdi(asset.name);
      setMime(asset.mimeType || 'application/octet-stream');
      setUrl(''); // sıfırla, yeni yükleme bekliyor
      if (Platform.OS !== 'web') {
        const base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        setBase64(base64);
      }
    } catch (e) {
      console.error('Dosya seçme hatası:', e);
    }
  }, []);

  // Dosya yükle (S3)
  const uploadFile = useCallback(async (
    dosyaAdi: string,
    dosyaBase64: string,
    dosyaMime: string,
    setUrl: (v: string) => void,
  ): Promise<string | null> => {
    if (!dosyaAdi || !dosyaBase64) return null;
    try {
      const result = await uploadFileMutation.mutateAsync({
        fileName: dosyaAdi,
        fileBase64: dosyaBase64,
        mimeType: dosyaMime,
      });
      setUrl(result.url);
      return result.url;
    } catch (e) {
      console.error('Dosya yükleme hatası:', e);
      return null;
    }
  }, [uploadFileMutation]);

  // Form doğrulama
  const validate = () => {
    if (!talepGirenId) return 'Lütfen talebi gireni seçiniz.';
    if (!acenteAdi.trim()) return 'Lütfen acente adını giriniz.';
    if (!smsOtorizasyon) return 'Lütfen SMS otorizasyon durumunu seçiniz.';
    return null;
  };

  const handleSubmit = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSuccessMsg('');
    setErrorMsg('');

    const validationError = validate();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    try {
      // Dosyaları yükle
      let finalAcentechUrl = acentechUrl;
      let finalSigortaUrl = sigortaUrl;

      if (acentechDosyaBase64 && !acentechUrl) {
        finalAcentechUrl = (await uploadFile(acentechDosyaAdi, acentechDosyaBase64, acentechDosyaMime, setAcentechUrl)) || '';
      }
      if (sigortaDosyaBase64 && !sigortaUrl) {
        finalSigortaUrl = (await uploadFile(sigortaDosyaAdi, sigortaDosyaBase64, sigortaDosyaMime, setSigortaUrl)) || '';
      }

      // ClickUp görevi oluştur
      await createTaskMutation.mutateAsync({
        talepGirenClickUpId: talepGirenId!,
        acenteAdi: acenteAdi.trim(),
        levhaNo: levhaNo.trim() || undefined,
        acenteKullaniciSayisi: acenteKullaniciSayisi ? parseInt(acenteKullaniciSayisi) : undefined,
        hizliTeklifSayisi: hizliTeklifSayisi ? parseInt(hizliTeklifSayisi) : undefined,
        smsOtorizasyon: smsOtorizasyon!,
        acentechTabloUrl: finalAcentechUrl || undefined,
        sigortaSirketleriTabloUrl: finalSigortaUrl || undefined,
      });

      setSuccessMsg('HT Talep başarıyla oluşturuldu ve ClickUp\'a gönderildi ✅');
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Formu sıfırla
      setTalepGirenId(null);
      setTalepGirenAdi('');
      setMemberSearch('');
      setAcenteAdi('');
      setLevhaNo('');
      setAcenteKullaniciSayisi('');
      setHizliTeklifSayisi('');
      setSmsOtorizasyon(null);
      setAcentechDosyaAdi('');
      setAcentechDosyaBase64('');
      setAcentechUrl('');
      setSigortaDosyaAdi('');
      setSigortaDosyaBase64('');
      setSigortaUrl('');
    } catch (e: any) {
      console.error('HT Talep gönderme hatası:', e);
      setErrorMsg('Gönderim sırasında bir hata oluştu: ' + (e?.message || String(e)));
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  };

  const isLoading = createTaskMutation.isPending || uploadFileMutation.isPending;

  return (
    <ScreenContainer>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>HT Talep Formu</Text>

        {/* Talebi Giren */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.foreground }]}>
            Talebi Giren <Text style={{ color: colors.error }}>*</Text>
          </Text>
          {/* Seçili kişi gösterimi */}
          {talepGirenAdi ? (
            <TouchableOpacity
              style={[styles.selectButton, { backgroundColor: colors.surface, borderColor: colors.primary }]}
              onPress={() => {
                setTalepGirenId(null);
                setTalepGirenAdi('');
                setMemberSearch('');
                setShowMemberList(false);
              }}
            >
              <Text style={{ color: colors.foreground }}>{talepGirenAdi}</Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>Değiştirmek için dokun</Text>
            </TouchableOpacity>
          ) : (
            <TextInput
              style={[styles.textInput, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
              placeholder={`En az ${SEARCH_MIN_CHARS} karakter girin...`}
              placeholderTextColor={colors.muted}
              value={memberSearch}
              onChangeText={handleMemberSearchChange}
              autoCorrect={false}
              autoComplete="off"
              autoCapitalize="none"
            />
          )}

          {/* En az 5 karakter girilince liste açılır */}
          {showMemberList && !talepGirenAdi && (
            <View style={[styles.dropdownContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {membersQuery.isLoading ? (
                <ActivityIndicator style={{ padding: 12 }} color={colors.primary} />
              ) : (
                <FlatList
                  data={filteredMembers}
                  keyExtractor={(item) => String(item.id)}
                  keyboardShouldPersistTaps="always"
                  style={{ maxHeight: 220 }}
                  renderItem={({ item }) => (
                    <Pressable
                      style={({ pressed }) => [
                        styles.memberItem,
                        { borderBottomColor: colors.border },
                        pressed && { backgroundColor: colors.border },
                      ]}
                      onPress={() => {
                        setTalepGirenId(item.id);
                        setTalepGirenAdi(item.username);
                        setShowMemberList(false);
                        setMemberSearch('');
                      }}
                    >
                      <Text style={[styles.memberName, { color: colors.foreground }]}>{item.username}</Text>
                      {item.email ? (
                        <Text style={[styles.memberEmail, { color: colors.muted }]}>{item.email}</Text>
                      ) : null}
                    </Pressable>
                  )}
                  ListEmptyComponent={
                    <Text style={[styles.emptyText, { color: colors.muted }]}>Sonuç bulunamadı</Text>
                  }
                />
              )}
            </View>
          )}

          {/* Karakter sayısı ipucu */}
          {!talepGirenAdi && memberSearch.length > 0 && memberSearch.length < SEARCH_MIN_CHARS && (
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
              {SEARCH_MIN_CHARS - memberSearch.length} karakter daha girin...
            </Text>
          )}
        </View>

        {/* Acente Adı */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.foreground }]}>
            Acente Adını Giriniz <Text style={{ color: colors.error }}>*</Text>
          </Text>
          <TextInput
            style={[styles.textInput, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
            placeholder="Acente adı..."
            placeholderTextColor={colors.muted}
            value={acenteAdi}
            onChangeText={setAcenteAdi}
            autoCorrect={false}
            autoComplete="off"
          />
        </View>

        {/* Levha No */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.foreground }]}>Levha No</Text>
          <TextInput
            style={[styles.textInput, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
            placeholder="Levha numarası..."
            placeholderTextColor={colors.muted}
            value={levhaNo}
            onChangeText={setLevhaNo}
            autoCorrect={false}
            autoComplete="off"
          />
        </View>

        {/* Acente Kullanıcı Sayısı */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.foreground }]}>Acente Kullanıcı Sayısı</Text>
          <TextInput
            style={[styles.textInput, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
            placeholder="0"
            placeholderTextColor={colors.muted}
            value={acenteKullaniciSayisi}
            onChangeText={setAcenteKullaniciSayisi}
            keyboardType="numeric"
          />
        </View>

        {/* Hızlı Teklif Talep Eden Kullanıcı Sayısı */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.foreground }]}>Hızlı Teklif Talep Eden Kullanıcı Sayısı</Text>
          <TextInput
            style={[styles.textInput, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
            placeholder="0"
            placeholderTextColor={colors.muted}
            value={hizliTeklifSayisi}
            onChangeText={setHizliTeklifSayisi}
            keyboardType="numeric"
          />
        </View>

        {/* SMS Otorizasyon */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.foreground }]}>
            Acenteye SMS Otorizasyonu Kuruldu Mu? <Text style={{ color: colors.error }}>*</Text>
          </Text>
          <View style={styles.radioRow}>
            {(['Evet', 'Hayir'] as const).map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.radioButton,
                  {
                    borderColor: smsOtorizasyon === opt ? colors.primary : colors.border,
                    backgroundColor: smsOtorizasyon === opt ? colors.primary : colors.surface,
                  },
                ]}
                onPress={() => setSmsOtorizasyon(opt)}
              >
                <Text style={{ color: smsOtorizasyon === opt ? '#fff' : colors.foreground, fontWeight: '500' }}>
                  {opt === 'Hayir' ? 'Hayır' : opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Acentech Kullanıcı Oluşturma Tablosu */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.foreground }]}>
            Acentech Kullanıcı Oluşturma Tablosunu Ekleyiniz <Text style={{ color: colors.error }}>*</Text>
          </Text>
          <TouchableOpacity
            style={[styles.fileButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => pickFile(setAcentechDosyaAdi, setAcentechDosyaBase64, setAcentechDosyaMime, setAcentechUrl)}
          >
            <Text style={{ color: acentechDosyaAdi ? colors.primary : colors.muted }}>
              {acentechDosyaAdi || '📎  Dosya seç...'}
            </Text>
          </TouchableOpacity>
          {acentechUrl ? (
            <Text style={[styles.uploadedText, { color: colors.success }]}>✅ Yüklendi</Text>
          ) : acentechDosyaAdi ? (
            <Text style={[styles.uploadedText, { color: colors.muted }]}>Seçildi, gönderimde yüklenecek</Text>
          ) : null}
        </View>

        {/* Sigorta Şirketleri Kullanıcı Adı - Şifre Tablosu */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.foreground }]}>
            Sigorta Şirketleri Kullanıcı Adı - Şifre Tablosu <Text style={{ color: colors.error }}>*</Text>
          </Text>
          <TouchableOpacity
            style={[styles.fileButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => pickFile(setSigortaDosyaAdi, setSigortaDosyaBase64, setSigortaDosyaMime, setSigortaUrl)}
          >
            <Text style={{ color: sigortaDosyaAdi ? colors.primary : colors.muted }}>
              {sigortaDosyaAdi || '📎  Dosya seç...'}
            </Text>
          </TouchableOpacity>
          {sigortaUrl ? (
            <Text style={[styles.uploadedText, { color: colors.success }]}>✅ Yüklendi</Text>
          ) : sigortaDosyaAdi ? (
            <Text style={[styles.uploadedText, { color: colors.muted }]}>Seçildi, gönderimde yüklenecek</Text>
          ) : null}
        </View>

        {/* Hata / Başarı mesajları */}
        {errorMsg ? (
          <View style={[styles.messageBox, { backgroundColor: colors.error + '20', borderColor: colors.error }]}>
            <Text style={{ color: colors.error }}>{errorMsg}</Text>
          </View>
        ) : null}
        {successMsg ? (
          <View style={[styles.messageBox, { backgroundColor: colors.success + '20', borderColor: colors.success }]}>
            <Text style={{ color: colors.success }}>{successMsg}</Text>
          </View>
        ) : null}

        {/* Gönder Butonu */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: isLoading ? colors.muted : colors.primary },
          ]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Gönder</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  selectButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dropdownContainer: {
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 4,
    overflow: 'hidden',
  },
  searchInput: {
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  memberItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '500',
  },
  memberEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyText: {
    padding: 12,
    textAlign: 'center',
    fontSize: 13,
  },
  radioRow: {
    flexDirection: 'row',
    gap: 12,
  },
  radioButton: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  fileButton: {
    borderWidth: 1,
    borderRadius: 10,
    borderStyle: 'dashed',
    paddingHorizontal: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  uploadedText: {
    fontSize: 12,
    marginTop: 4,
  },
  messageBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
