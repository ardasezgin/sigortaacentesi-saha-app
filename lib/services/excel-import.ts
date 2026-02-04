/**
 * Excel dosyalarından acente verilerini içe aktarma servisi
 */

import * as XLSX from 'xlsx';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import type { Agency, ExcelImportResult } from '../types/agency';
import { saveMultipleAgencies } from './storage';

/**
 * Excel dosyası seç ve içe aktar
 */
export async function importFromExcel(): Promise<ExcelImportResult> {
  try {
    // Dosya seçici aç
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ],
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return {
        success: false,
        importedCount: 0,
        errorCount: 0,
        errors: ['Dosya seçimi iptal edildi'],
      };
    }

    const file = result.assets[0];
    
    // Dosyayı oku
    const fileContent = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Excel'i parse et
    const workbook = XLSX.read(fileContent, { type: 'base64' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

    // Parse edilen verileri işle
    const parseResult = parseExcelData(jsonData);
    
    if (parseResult.agencies.length === 0) {
      return {
        success: false,
        importedCount: 0,
        errorCount: parseResult.errors.length,
        errors: parseResult.errors,
      };
    }

    // Veritabanına kaydet
    const saved = await saveMultipleAgencies(parseResult.agencies);
    
    if (!saved) {
      return {
        success: false,
        importedCount: 0,
        errorCount: parseResult.agencies.length,
        errors: ['Veriler kaydedilirken hata oluştu'],
      };
    }

    return {
      success: true,
      importedCount: parseResult.agencies.length,
      errorCount: parseResult.errors.length,
      errors: parseResult.errors,
    };
  } catch (error) {
    console.error('Excel import hatası:', error);
    return {
      success: false,
      importedCount: 0,
      errorCount: 1,
      errors: [error instanceof Error ? error.message : 'Bilinmeyen hata'],
    };
  }
}

/**
 * Excel verilerini Agency tipine dönüştür
 */
function parseExcelData(data: any[][]): { agencies: Agency[]; errors: string[] } {
  const agencies: Agency[] = [];
  const errors: string[] = [];

  // İlk satır başlık olarak kabul edilir, 2. satırdan itibaren veri
  if (data.length < 2) {
    errors.push('Excel dosyası boş veya geçersiz');
    return { agencies, errors };
  }

  // Başlık satırını kontrol et (opsiyonel)
  const headers = data[0];
  
  // Veri satırlarını işle
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // Boş satırları atla
    if (!row || row.length === 0 || !row[0]) {
      continue;
    }

    try {
      // Excel sütun sırası:
      // A: Levha No, B: Acente Adı, C: Yetkili, D: Telefon, E: E-posta
      // F: Adres, G: Şehir, H: İlçe, I: Vergi No, J: Durum
      
      const agency: Agency = {
        levhaNo: String(row[0] || '').trim(),
        acenteAdi: String(row[1] || '').trim(),
        yetkiliAdiSoyadi: String(row[2] || '').trim(),
        telefon: String(row[3] || '').trim(),
        eposta: String(row[4] || '').trim(),
        adres: String(row[5] || '').trim(),
        sehir: String(row[6] || '').trim(),
        ilce: String(row[7] || '').trim(),
        vergiNo: String(row[8] || '').trim(),
        durum: String(row[9] || 'Aktif').trim() === 'Pasif' ? 'Pasif' : 'Aktif',
      };

      // Levha No zorunlu
      if (!agency.levhaNo) {
        errors.push(`Satır ${i + 1}: Levha No boş olamaz`);
        continue;
      }

      agencies.push(agency);
    } catch (error) {
      errors.push(`Satır ${i + 1}: ${error instanceof Error ? error.message : 'Parse hatası'}`);
    }
  }

  return { agencies, errors };
}

/**
 * Örnek Excel verisi oluştur (test için)
 */
export function generateSampleExcelData(): Agency[] {
  return [
    {
      levhaNo: 'T091014-SAN3',
      acenteAdi: 'ABC Sigorta Acentesi',
      yetkiliAdiSoyadi: 'Ahmet Yılmaz',
      telefon: '0532 123 45 67',
      eposta: 'ahmet@abcsigorta.com',
      adres: 'Atatürk Caddesi No:123',
      sehir: 'İstanbul',
      ilce: 'Kadıköy',
      vergiNo: '1234567890',
      durum: 'Aktif',
    },
    {
      levhaNo: 'T091015-IST1',
      acenteAdi: 'XYZ Sigorta Danışmanlık',
      yetkiliAdiSoyadi: 'Ayşe Demir',
      telefon: '0533 987 65 43',
      eposta: 'ayse@xyzsigorta.com',
      adres: 'İstiklal Caddesi No:456',
      sehir: 'İstanbul',
      ilce: 'Beyoğlu',
      vergiNo: '9876543210',
      durum: 'Aktif',
    },
    {
      levhaNo: 'T091016-ANK2',
      acenteAdi: 'Güven Sigorta Acentesi',
      yetkiliAdiSoyadi: 'Mehmet Kaya',
      telefon: '0534 555 66 77',
      eposta: 'mehmet@guvensigorta.com',
      adres: 'Kızılay Meydanı No:789',
      sehir: 'Ankara',
      ilce: 'Çankaya',
      vergiNo: '5555666677',
      durum: 'Pasif',
    },
  ];
}
