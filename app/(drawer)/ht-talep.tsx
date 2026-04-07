import { useState, useCallback, useRef, useEffect } from 'react';
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
import { getClickUpMembers, createClickUpTask } from '@/lib/services/clickup';
import type { Agency } from '@/lib/types/agency';

// HT Talep ClickUp List ID
const HT_TALEP_LIST_ID = '901816410790'; // Acentech HT Talep Formu listesi

/**
 * HT Talep Formu Ekranı
 * ClickUp'taki ilgili listeye yeni görev oluşturur.
 * Acente Adı ve Levha No alanları tüm acente datasından arama ile seçilebilir.
 * ClickUp API çağrıları doğrudan client-side'dan yapılır.
 */
export default function HtTalepScreen() {
  const colors = useColors();

  // Form state
  const [talepGirenId, setTalepGirenId] = useState<number | null>(null);
  const [talepGirenAdi, setTalepGirenAdi] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [showMemberList, setShowMemberList] = useState(false);

  // ClickUp üyeleri state (client-side)
  const [members, setMembers] = useState<Array<{ id: number; username: string; email: string }>>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersLoaded, setMembersLoaded] = useState(false);

  const [acenteAdi, setAcenteAdi] = useState('');
  const [levhaNo, setLevhaNo] = useState('');
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [isAgencyAutoFilled, setIsAgencyAutoFilled] = useState(false);

  // Acente adı arama state
  const [acenteSuggestions, setAcenteSuggestions] = useState<Agency[]>([]);
  const [showAcenteSuggestions, setShowAcenteSuggestions] = useState(false);
  const [isSearchingName, setIsSearchingName] = useState(false);
  const acenteSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Levha no arama state
  const [isSearchingLevha, setIsSearchingLevha] = useState(false);

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // S3 dosya yükleme için tRPC (sunucu üzerinden S3'e yükleme devam ediyor)
  const uploadFileMutation = trpc.htTalep.uploadFile.useMutation();

  const SEARCH_MIN_CHARS = 5;

  // ClickUp üyelerini yükle (5+ karakter girilince)
  const loadMembers = useCallback(async () => {
    if (membersLoaded || membersLoading) return;
    setMembersLoading(true);
    try {
      const data = await getClickUpMembers();
      setMembers(data);
      setMembersLoaded(true);
    } catch (error) {
      console.error('Üye listesi yükleme hatası:', error);
    } finally {
      setMembersLoading(false);
    }
  }, [membersLoaded, membersLoading]);

  // Üye arama filtresi
  const filteredMembers = memberSearch.trim().length >= SEARCH_MIN_CHARS
    ? members.filter((m) => {
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
      loadMembers();
    } else {
      setShowMemberList(false);
    }
  };

  // Levha no değiştiğinde otomatik acente arama (3+ karakter)
  useEffect(() => {
    if (isAgencyAutoFilled) return;
    const searchTimeout = setTimeout(async () => {
      if (levhaNo.trim().length >= 3) {
        await searchByLevhaNo(levhaNo.trim());
      }
    }, 300);
    return () => clearTimeout(searchTimeout);
  }, [levhaNo]);

  const searchByLevhaNo = async (searchLevhaNo: string) => {
    setIsSearchingLevha(true);
    try {
      const { findAgencyByLevhaNo } = await import('@/lib/services/agency-service');
      const agency = await findAgencyByLevhaNo(searchLevhaNo);
      if (agency) {
        setAcenteAdi(agency.acenteUnvani);
        setSelectedAgency(agency);
        setIsAgencyAutoFilled(true);
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        setIsAgencyAutoFilled(false);
      }
    } catch (error) {
      console.error('Levha no arama hatası:', error);
    } finally {
      setIsSearchingLevha(false);
    }
  };

  // Acente adı değiştiğinde öneri listesi (5+ karakter, 600ms debounce)
  const handleAcenteAdiChange = (text: string) => {
    setAcenteAdi(text);
    setIsAgencyAutoFilled(false);
    setSelectedAgency(null);
    setShowAcenteSuggestions(false);
    setAcenteSuggestions([]);
    if (acenteSearchTimer.current) clearTimeout(acenteSearchTimer.current);
    if (text.trim().length < 5) return;
    acenteSearchTimer.current = setTimeout(async () => {
      setIsSearchingName(true);
      try {
        const { getAllAgencies } = await import('@/lib/services/agency-service');
        const result = await getAllAgencies(1, 8, text.trim());
        setAcenteSuggestions(result.agencies);
        setShowAcenteSuggestions(result.agencies.length > 0);
      } catch (error) {
        console.error('Acente adı arama hatası:', error);
      } finally {
        setIsSearchingName(false);
      }
    }, 600);
  };

  // Öneriden acente seç
  const handleSelectAgency = (agency: Agency) => {
    setAcenteAdi(agency.acenteUnvani);
    setLevhaNo(agency.levhaNo);
    setSelectedAgency(agency);
    setIsAgencyAutoFilled(true);
    setShowAcenteSuggestions(false);
    setAcenteSuggestions([]);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      setUrl('');
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

  // Dosya yükle (S3 - sunucu üzerinden)
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

    setIsSubmitting(true);
    try {
      // Dosyaları S3'e yükle
      let finalAcentechUrl = acentechUrl;
      let finalSigortaUrl = sigortaUrl;

      if (acentechDosyaBase64 && !acentechUrl) {
        finalAcentechUrl = (await uploadFile(acentechDosyaAdi, acentechDosyaBase64, acentechDosyaMime, setAcentechUrl)) || '';
      }
      if (sigortaDosyaBase64 && !sigortaUrl) {
        finalSigortaUrl = (await uploadFile(sigortaDosyaAdi, sigortaDosyaBase64, sigortaDosyaMime, setSigortaUrl)) || '';
      }

      // ClickUp'a doğrudan görev oluştur
      const descLines: string[] = [
        `Acente Adı: ${acenteAdi.trim()}`,
        `Levha No: ${levhaNo.trim() || '-'}`,
        `Acente Kullanıcı Sayısı: ${acenteKullaniciSayisi || '-'}`,
        `Hızlı Teklif Talep Eden Kullanıcı Sayısı: ${hizliTeklifSayisi || '-'}`,
        `SMS Otorizasyonu Kuruldu Mu: ${smsOtorizasyon}`,
        `Acentech Kullanıcı Oluşturma Tablosu: ${finalAcentechUrl || 'Yüklenmedi'}`,
        `Sigorta Şirketleri Kullanıcı Adı - Şifre Tablosu: ${finalSigortaUrl || 'Yüklenmedi'}`,
      ];

      const task = await createClickUpTask({
        name: `HT Talep - ${acenteAdi.trim()}`,
        description: descLines.join('\n'),
        assigneeIds: talepGirenId ? [talepGirenId] : undefined,
        listId: HT_TALEP_LIST_ID,
      });

      if (!task) {
        throw new Error('ClickUp görevi oluşturulamadı');
      }

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
      setSelectedAgency(null);
      setIsAgencyAutoFilled(false);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isSubmitting || uploadFileMutation.isPending;

  return (
    <ScreenContainer>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.background }]}
        keyboardShouldPersistTaps="always"
      >
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>HT Talep Formu</Text>

        {/* Talebi Giren */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.foreground }]}>
            Talebi Giren <Text style={{ color: colors.error }}>*</Text>
          </Text>
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

          {showMemberList && !talepGirenAdi && (
            <View style={[styles.dropdownContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {membersLoading ? (
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
                    <Text style={[styles.emptyText, { color: colors.muted }]}>Eşleşen üye bulunamadı</Text>
                  }
                />
              )}
            </View>
          )}

          {!talepGirenAdi && memberSearch.length > 0 && memberSearch.length < SEARCH_MIN_CHARS && (
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
              {SEARCH_MIN_CHARS - memberSearch.length} karakter daha girin...
            </Text>
          )}
        </View>

        {/* Acente Adı — arama yapılabilir */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.foreground }]}>
            Acente Adını Giriniz <Text style={{ color: colors.error }}>*</Text>
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextInput
              style={[styles.textInput, { flex: 1, color: colors.foreground, backgroundColor: colors.surface, borderColor: isAgencyAutoFilled ? colors.primary : colors.border }]}
              placeholder="Acente ünvanı (en az 5 harf)"
              placeholderTextColor={colors.muted}
              value={acenteAdi}
              onChangeText={handleAcenteAdiChange}
              onBlur={() => {
                setTimeout(() => setShowAcenteSuggestions(false), 200);
              }}
              autoCorrect={false}
              autoComplete="off"
              spellCheck={false}
            />
            {isSearchingName && (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />
            )}
          </View>

          {/* Öneri listesi */}
          {showAcenteSuggestions && acenteSuggestions.length > 0 && (
            <View style={[styles.dropdownContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <FlatList
                data={acenteSuggestions}
                keyExtractor={(item) => item.levhaNo}
                keyboardShouldPersistTaps="always"
                style={{ maxHeight: 200 }}
                scrollEnabled={acenteSuggestions.length > 4}
                renderItem={({ item: agency }) => (
                  <Pressable
                    onPressIn={() => handleSelectAgency(agency)}
                    style={({ pressed }) => ({
                      padding: 12,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border,
                      backgroundColor: pressed ? colors.border : 'transparent',
                    })}
                  >
                    <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '500' }}>{agency.acenteUnvani}</Text>
                    <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{agency.levhaNo} • {agency.il}</Text>
                  </Pressable>
                )}
              />
            </View>
          )}

          {isAgencyAutoFilled && selectedAgency && (
            <Text style={{ color: colors.success, fontSize: 12, marginTop: 4 }}>
              ✓ Acente seçildi: {selectedAgency.levhaNo}
            </Text>
          )}
        </View>

        {/* Levha No — girilince otomatik acente arama */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.foreground }]}>Levha No</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextInput
              style={[styles.textInput, { flex: 1, color: colors.foreground, backgroundColor: colors.surface, borderColor: isAgencyAutoFilled ? colors.primary : colors.border }]}
              placeholder="Levha numarası..."
              placeholderTextColor={colors.muted}
              value={levhaNo}
              onChangeText={(text) => {
                setLevhaNo(text);
                if (!text.trim()) {
                  setIsAgencyAutoFilled(false);
                  setSelectedAgency(null);
                }
              }}
              autoCorrect={false}
              autoComplete="off"
              autoCapitalize="characters"
            />
            {isSearchingLevha && (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />
            )}
          </View>
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 3 }}>
            3+ karakter girilince acente adı otomatik dolar
          </Text>
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
