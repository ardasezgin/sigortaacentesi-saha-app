import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ScrollView,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { getAgencyKarne, saveAgencyKarne } from '@/lib/services/agency-service';

// ============================================================
// TİP TANIMLARI
// ============================================================

interface KarneData {
  id: number;
  levhaNo: string;
  acenteUnvani: string;
  il: string | null;
  ilce: string | null;
  kurucuPersonel: string | null;
  kurulusTarihi: string | null;
  kurulusTarihiSacom: string | null;
  personelSayisi: string | null;
  subeMudurSayisi: string | null;
  organizasyoncu: string | null;
  subeSayisi: string | null;
  kacSirketleCalisiyor: string | null;
  acenteSegmenti: string | null;
  // Saha alanları
  yonetimIliskisi: string | null;
  acenteyeVerilenSoz: string | null;
  hayatHayatDisi: string | null;
  uretim2025: string | null;
  portfoyAgirligi: string | null;
  trafikYuzde: string | null;
  kaskoYuzde: string | null;
  otoDisiYuzde: string | null;
  saglikYuzde: string | null;
  cmYapilanmasi: string | null;
  acenteKararAlicisi: string | null;
  teknolojiIlgisi: string | null;
  hizliTeklifEkrani: string | null;
  hizliTeklifPartneri: string | null;
  whatsappKullanimi: string | null;
  whatsappPartneri: string | null;
  webSitesi: string | null;
  webPartneri: string | null;
  mobilUygulama: string | null;
  appPartneri: string | null;
  dijitalPazarlama: string | null;
  musteriNeredenGeliyor: string | null;
  operasyonelVerimlilik: string | null;
  leadYonlendirme: string | null;
  dijitallesmeHarcama: string | null;
  filoMusteriYogunlugu: string | null;
  galeriMusterisi: string | null;
  karneLastUpdated: string | null;
}

// ============================================================
// ALAN TANIMLARI (Acente Bilgileri sayfasından)
// ============================================================

type FieldType = 'readonly' | 'combo' | 'multi-combo' | 'free-text' | 'percent' | 'number';

interface FieldDef {
  key: keyof KarneData;
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
}

// Sistem alanları (satır 1-13) - readonly (personelSayisi, organizasyoncu, subeSayisi edit'e taşındı)
const SYSTEM_FIELDS: FieldDef[] = [
  { key: 'levhaNo', label: 'Levha No', type: 'readonly' },
  { key: 'acenteUnvani', label: 'Acente Adı', type: 'readonly' },
  { key: 'il', label: 'İl', type: 'readonly' },
  { key: 'ilce', label: 'İlçe', type: 'readonly' },
  { key: 'kurucuPersonel', label: 'Kurucu Personel', type: 'readonly' },
  { key: 'kurulusTarihi', label: 'Kuruluş Tarihi', type: 'readonly' },
  { key: 'kurulusTarihiSacom', label: 'Kuruluş Tarihi SA.com', type: 'readonly' },
  { key: 'subeMudurSayisi', label: 'Şube Müdürü Sayısı', type: 'readonly' },
  { key: 'kacSirketleCalisiyor', label: 'Kaç Şirketle Çalışıyor', type: 'readonly' },
  { key: 'acenteSegmenti', label: 'Acente Segmenti', type: 'readonly' },
];

// Saha giriş/edit alanları (satır 8-40, editlenebilir olanlar)
const EDIT_FIELDS: FieldDef[] = [
  { key: 'personelSayisi', label: 'Personel Sayısı', type: 'number' },
  { key: 'organizasyoncu', label: 'Organizasyoncu mu? Alt bayisi var mı?', type: 'combo', options: ['Evet', 'Hayır', 'Bilmiyorum'] },
  { key: 'subeSayisi', label: 'Şube Sayısı', type: 'number' },
  {
    key: 'yonetimIliskisi',
    label: 'Yönetim İlişkisi Var Mı?',
    type: 'combo',
    required: true,
    options: ['Ünal Ünaldı', 'Bilal Türkmen', 'Ezgi Özdemir', 'Okkan Nurikadıoğlu', 'Yok', 'Bilmiyorum'],
  },
  {
    key: 'acenteyeVerilenSoz',
    label: 'Acenteye Verilmiş Bir Söz Var Mı?',
    type: 'free-text',
    required: true,
  },
  {
    key: 'hayatHayatDisi',
    label: 'Hayat / Hayat Dışı',
    type: 'combo',
    required: true,
    options: ['Hayat / BES /Sağlık', 'Hayat Dışı', 'Karma'],
  },
  {
    key: 'uretim2025',
    label: '2025 Üretimi',
    type: 'number',
  },
  {
    key: 'portfoyAgirligi',
    label: 'Portföy Ağırlığı',
    type: 'combo',
    options: ['Oto', 'Oto Dışı', 'Sağlık', 'Dengeli', 'Hayat / BES'],
  },
  { key: 'trafikYuzde', label: 'Trafik %', type: 'percent' },
  { key: 'kaskoYuzde', label: 'Kasko %', type: 'percent' },
  { key: 'otoDisiYuzde', label: 'Oto Dışı %', type: 'percent' },
  { key: 'saglikYuzde', label: 'Sağlık %', type: 'percent' },
  {
    key: 'cmYapilanmasi',
    label: 'ÇM Yapılanması Var Mı?',
    type: 'combo',
    required: true,
    options: ['Var', 'Yok'],
  },
  {
    key: 'acenteKararAlicisi',
    label: 'Acente Karar Alıcısı Kim',
    type: 'free-text',
  },
  {
    key: 'teknolojiIlgisi',
    label: 'Teknoloji İlgisi Var Mı? Klasik Acente Mi?',
    type: 'combo',
    required: true,
    options: [
      'İlgisi yok, geleneksel model çalışıyor',
      'İlgisi var ama herhangi bir kullanımı yok',
      'Teknoloji ürünü kullanıyor',
      'Çok ilgili ve bilgili birden fazla teknolojik ürün kullanıyor',
    ],
  },
  {
    key: 'hizliTeklifEkrani',
    label: 'Hızlı Teklif Ekranı Kullanıyor Mu?',
    type: 'combo',
    required: true,
    options: ['Evet', 'Hayır'],
  },
  {
    key: 'hizliTeklifPartneri',
    label: 'Hızlı Teklif Partneri Kim',
    type: 'multi-combo',
    required: true,
    options: ['Open', 'İhsan', 'Doğanium', '2C', 'Polisoft', 'Acente 365', 'Polixir', 'Diğer'],
  },
  {
    key: 'whatsappKullanimi',
    label: 'WhatsApp Araçları Kullanıyor Mu?',
    type: 'combo',
    required: true,
    options: ['Evet', 'Hayır'],
  },
  {
    key: 'whatsappPartneri',
    label: 'WhatsApp Partneri Kim?',
    type: 'free-text',
  },
  {
    key: 'webSitesi',
    label: 'Web Sitesi Var Mı?',
    type: 'combo',
    required: true,
    options: ['Evet', 'Hayır'],
  },
  {
    key: 'webPartneri',
    label: 'Web Partneri Kim?',
    type: 'free-text',
  },
  {
    key: 'mobilUygulama',
    label: 'Mobil Uygulaması Var Mı?',
    type: 'combo',
    required: true,
    options: ['Evet', 'Hayır'],
  },
  {
    key: 'appPartneri',
    label: 'App Partneri Kim?',
    type: 'free-text',
  },
  {
    key: 'dijitalPazarlama',
    label: 'Dijital Pazarlama Faaliyeti Var Mı?',
    type: 'combo',
    required: true,
    options: ['Evet', 'Hayır'],
  },
  {
    key: 'musteriNeredenGeliyor',
    label: 'Müşteri Nereden Geliyor?',
    type: 'free-text',
  },
  {
    key: 'operasyonelVerimlilik',
    label: 'Operasyonel Verimlilik İçin Bir Şey Yapıyor Mu',
    type: 'combo',
    options: ['Evet', 'Hayır'],
  },
  {
    key: 'leadYonlendirme',
    label: 'Lead Yönlendirmeye Nasıl Bakıyor',
    type: 'combo',
    required: true,
    options: ['İstiyor', 'İlgisi var', 'İstemiyor'],
  },
  {
    key: 'dijitallesmeHarcama',
    label: 'Dijitalleşme İçin Para Harcamaya Hazır Mı?',
    type: 'combo',
    options: ['Evet', 'Hayır'],
  },
  {
    key: 'filoMusteriYogunlugu',
    label: 'Filo Müşteri Yoğunluğu Var Mı?',
    type: 'combo',
    required: true,
    options: ['Evet', 'Hayır'],
  },
  {
    key: 'galeriMusterisi',
    label: 'Galeri Müşterisi Var Mı?',
    type: 'combo',
    required: true,
    options: ['Evet', 'Hayır'],
  },
];

// ============================================================
// ANA EKRAN
// ============================================================

export default function AgencyKarneScreen() {
  const { levhaNo, agencyName } = useLocalSearchParams<{ levhaNo: string; agencyName: string }>();
  const colors = useColors();
  const router = useRouter();

  const [karne, setKarne] = useState<KarneData | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Karne verisini yükle
  useEffect(() => {
    if (!levhaNo) return;
    loadKarne();
  }, [levhaNo]);

  const loadKarne = async () => {
    setIsLoading(true);
    try {
      const data = await getAgencyKarne(levhaNo);
      if (data) {
        setKarne(data as KarneData);
        // Edit alanlarını mevcut değerlerle doldur
        const initial: Record<string, string> = {};
        EDIT_FIELDS.forEach((f) => {
          const val = (data as any)[f.key];
          initial[f.key] = val ?? '';
        });
        setEditValues(initial);
      }
    } catch (error) {
      console.error('[KarneScreen] loadKarne error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = useCallback((key: string, value: string) => {
    setEditValues((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  }, []);

  const handleSave = async () => {
    if (!karne) return;
    setIsSaving(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      // null'a dönüştür boş stringleri
      const payload: Record<string, string | null> = {};
      EDIT_FIELDS.forEach((f) => {
        const val = editValues[f.key] ?? '';
        payload[f.key] = val.trim() === '' ? null : val.trim();
      });
      await saveAgencyKarne(karne.levhaNo, payload);
      setIsDirty(false);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert('Kaydedildi', 'Acente karnesi başarıyla güncellendi.');
      // Reload to get updated karneLastUpdated
      await loadKarne();
    } catch (error) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert('Hata', 'Kaydetme sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>Karne yükleniyor...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!karne) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: colors.error }]}>Karne verisi bulunamadı.</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Başlık */}
        <View style={[styles.headerCard, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}>
          <Text style={[styles.headerTitle, { color: colors.primary }]} numberOfLines={2}>
            {karne.acenteUnvani}
          </Text>
          <Text style={[styles.headerSub, { color: colors.muted }]}>
            {karne.levhaNo}{karne.il ? ` · ${karne.il}` : ''}{karne.ilce ? ` / ${karne.ilce}` : ''}
          </Text>
          {karne.karneLastUpdated && (
            <Text style={[styles.lastUpdated, { color: colors.muted }]}>
              Son güncelleme: {karne.karneLastUpdated}
            </Text>
          )}
        </View>

        {/* SİSTEM ALANLARI */}
        <SectionHeader title="Sistem Bilgileri" subtitle="Otomatik dolan alanlar" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {SYSTEM_FIELDS.map((field, idx) => (
            <ReadonlyRow
              key={field.key}
              label={field.label}
              value={(karne as any)[field.key]}
              isLast={idx === SYSTEM_FIELDS.length - 1}
              colors={colors}
            />
          ))}
        </View>

        {/* SAHA GİRİŞ ALANLARI */}
        <SectionHeader title="Saha Bilgileri" subtitle="Doldurulup kaydedilebilir" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {EDIT_FIELDS.map((field, idx) => (
            <EditRow
              key={field.key}
              field={field}
              value={editValues[field.key] ?? ''}
              onChange={handleChange}
              isLast={idx === EDIT_FIELDS.length - 1}
              colors={colors}
            />
          ))}
        </View>

        {/* KAYDET BUTONU */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving || !isDirty}
          style={[
            styles.saveButton,
            {
              backgroundColor: isDirty ? colors.primary : colors.border,
              opacity: isSaving ? 0.7 : 1,
            },
          ]}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <Text style={[styles.saveButtonText, { color: isDirty ? colors.background : colors.muted }]}>
              {isDirty ? 'Kaydet' : 'Kaydedildi'}
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

// ============================================================
// YARDIMCI BİLEŞENLER
// ============================================================

function SectionHeader({
  title,
  subtitle,
  colors,
}: {
  title: string;
  subtitle: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>{subtitle}</Text>
    </View>
  );
}

function ReadonlyRow({
  label,
  value,
  isLast,
  colors,
}: {
  label: string;
  value: string | null | undefined;
  isLast: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.row, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
      <Text style={[styles.rowLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: value ? colors.foreground : colors.muted }]} numberOfLines={3}>
        {value || '—'}
      </Text>
    </View>
  );
}

function EditRow({
  field,
  value,
  onChange,
  isLast,
  colors,
}: {
  field: FieldDef;
  value: string;
  onChange: (key: string, value: string) => void;
  isLast: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.editRowContainer, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
      <Text style={[styles.editLabel, { color: colors.foreground }]}>
        {field.label}
        {field.required && <Text style={{ color: colors.error }}> *</Text>}
      </Text>
      <EditInput field={field} value={value} onChange={onChange} colors={colors} />
    </View>
  );
}

function EditInput({
  field,
  value,
  onChange,
  colors,
}: {
  field: FieldDef;
  value: string;
  onChange: (key: string, value: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  if (field.type === 'combo' && field.options) {
    return (
      <ComboBox
        options={field.options}
        value={value}
        onChange={(v) => onChange(field.key, v)}
        colors={colors}
      />
    );
  }

  if (field.type === 'multi-combo' && field.options) {
    return (
      <MultiComboBox
        options={field.options}
        value={value}
        onChange={(v) => onChange(field.key, v)}
        colors={colors}
      />
    );
  }

  if (field.type === 'percent') {
    return (
      <View style={styles.percentRow}>
        <TextInput
          style={[styles.percentInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
          value={value}
          onChangeText={(v) => {
            // Sadece sayı ve nokta/virgül
            const cleaned = v.replace(/[^0-9.,]/g, '');
            onChange(field.key, cleaned);
          }}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.muted}
          returnKeyType="done"
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
        />
        <Text style={[styles.percentSymbol, { color: colors.muted }]}>%</Text>
      </View>
    );
  }

  if (field.type === 'number') {
    return (
      <TextInput
        style={[styles.textInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
        value={value}
        onChangeText={(v) => {
          const cleaned = v.replace(/[^0-9.,]/g, '');
          onChange(field.key, cleaned);
        }}
        keyboardType="decimal-pad"
        placeholder="Sayı giriniz"
        placeholderTextColor={colors.muted}
        returnKeyType="done"
        autoCorrect={false}
        autoComplete="off"
        spellCheck={false}
      />
    );
  }

  // free-text
  return (
    <TextInput
      style={[styles.textInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
      value={value}
      onChangeText={(v) => onChange(field.key, v)}
      placeholder="Yazınız..."
      placeholderTextColor={colors.muted}
      multiline
      returnKeyType="done"
      autoCorrect={false}
      autoComplete="off"
      spellCheck={false}
    />
  );
}

function ComboBox({
  options,
  value,
  onChange,
  colors,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.comboWrap}>
      {options.map((opt) => {
        const isSelected = value === opt;
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              onChange(isSelected ? '' : opt);
            }}
            style={[
              styles.comboChip,
              {
                borderColor: isSelected ? colors.primary : colors.border,
                backgroundColor: isSelected ? colors.primary + '20' : colors.background,
              },
            ]}
          >
            <Text
              style={[
                styles.comboChipText,
                { color: isSelected ? colors.primary : colors.muted },
              ]}
            >
              {opt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function MultiComboBox({
  options,
  value,
  onChange,
  colors,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  // value is comma-separated
  const selected = value ? value.split(',').map((s) => s.trim()).filter(Boolean) : [];

  const toggle = (opt: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const newSelected = selected.includes(opt)
      ? selected.filter((s) => s !== opt)
      : [...selected, opt];
    onChange(newSelected.join(', '));
  };

  return (
    <View style={styles.comboWrap}>
      {options.map((opt) => {
        const isSelected = selected.includes(opt);
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => toggle(opt)}
            style={[
              styles.comboChip,
              {
                borderColor: isSelected ? colors.primary : colors.border,
                backgroundColor: isSelected ? colors.primary + '20' : colors.background,
              },
            ]}
          >
            <Text
              style={[
                styles.comboChipText,
                { color: isSelected ? colors.primary : colors.muted },
              ]}
            >
              {isSelected ? '✓ ' : ''}{opt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ============================================================
// STİLLER
// ============================================================

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  headerCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 4,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  headerSub: {
    fontSize: 13,
    lineHeight: 18,
  },
  lastUpdated: {
    fontSize: 11,
    marginTop: 4,
  },
  sectionHeader: {
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 12,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'flex-start',
    gap: 8,
  },
  rowLabel: {
    fontSize: 12,
    lineHeight: 18,
    flex: 0.45,
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    flex: 0.55,
    textAlign: 'right',
  },
  editRowContainer: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  editLabel: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 40,
  },
  percentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  percentInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    width: 100,
    textAlign: 'right',
  },
  percentSymbol: {
    fontSize: 16,
    fontWeight: '600',
  },
  comboWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  comboChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  comboChipText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
