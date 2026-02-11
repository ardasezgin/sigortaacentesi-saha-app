/**
 * Excel dosyalarından acente verilerini içe aktarma servisi
 * Excel: KopyaAcenteListesi.xlsx (19,364 kayıt)
 */

import * as XLSX from 'xlsx';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import type { Agency, ExcelImportResult } from '../types/agency';
import { saveMultipleAgencies } from './storage';

/**
 * Excel dosyası seç ve içe aktar
 */
export async function importFromExcel(
  onProgress?: (current: number, total: number) => void
): Promise<ExcelImportResult> {
  const startTime = Date.now();
  
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
        skippedCount: 0,
        errors: ['Dosya seçimi iptal edildi'],
        duration: Date.now() - startTime,
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
    const parseResult = parseExcelData(jsonData, onProgress);
    
    if (parseResult.agencies.length === 0) {
      return {
        success: false,
        importedCount: 0,
        errorCount: parseResult.errors.length,
        skippedCount: parseResult.skippedCount,
        errors: parseResult.errors,
        duration: Date.now() - startTime,
      };
    }

    // Veritabanına kaydet (batch olarak)
    const batchSize = 500; // Her seferde 500 kayıt
    let savedCount = 0;
    
    for (let i = 0; i < parseResult.agencies.length; i += batchSize) {
      const batch = parseResult.agencies.slice(i, i + batchSize);
      const saved = await saveMultipleAgencies(batch);
      
      if (saved) {
        savedCount += batch.length;
        onProgress?.(savedCount, parseResult.agencies.length);
      }
    }

    return {
      success: true,
      importedCount: savedCount,
      errorCount: parseResult.errors.length,
      skippedCount: parseResult.skippedCount,
      errors: parseResult.errors,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    console.error('Excel import hatası:', error);
    return {
      success: false,
      importedCount: 0,
      errorCount: 1,
      skippedCount: 0,
      errors: [error instanceof Error ? error.message : 'Bilinmeyen hata'],
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Excel verilerini Agency tipine dönüştür
 * Excel sütun sırası:
 * A: Acente Turu, B: Levha No, C: Levha Kay. Tar., D: Levha Yen. Kay. Tar.
 * E: Acente Ünvanı, F: Adres, G: İl, H: İlçe, I: Telefon, J: E-Posta, K: Teknik Personel
 */
function parseExcelData(
  data: any[][],
  onProgress?: (current: number, total: number) => void
): { agencies: Agency[]; errors: string[]; skippedCount: number } {
  const agencies: Agency[] = [];
  const errors: string[] = [];
  let skippedCount = 0;

  // İlk satır başlık olarak kabul edilir, 2. satırdan itibaren veri
  if (data.length < 2) {
    errors.push('Excel dosyası boş veya geçersiz');
    return { agencies, errors, skippedCount };
  }

  // Başlık satırını kontrol et
  const headers = data[0];
  console.log('Excel başlıkları:', headers);
  
  // Veri satırlarını işle
  const totalRows = data.length - 1;
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // Progress callback
    if (i % 100 === 0) {
      onProgress?.(i, totalRows);
    }
    
    // Boş satırları atla
    if (!row || row.length === 0 || !row[1]) { // Levha No (index 1) boş ise atla
      skippedCount++;
      continue;
    }

    try {
      const agency: Agency = {
        acenteTuru: (String(row[0] || 'TÜZEL').trim().toUpperCase() === 'GERÇEK' ? 'GERÇEK' : 'TÜZEL'),
        levhaNo: String(row[1] || '').trim(),
        levhaKayitTarihi: String(row[2] || '').trim(),
        levhaYenilemeTarihi: row[3] ? String(row[3]).trim() : null,
        acenteUnvani: String(row[4] || '').trim(),
        adres: String(row[5] || '').trim(),
        il: String(row[6] || '').trim(),
        ilce: String(row[7] || '').trim(),
        telefon: String(row[8] || '').trim(),
        eposta: String(row[9] || '').trim(),
        teknikPersonel: String(row[10] || '').trim(),
        isActive: 1, // Varsayılan
      };

      // Levha No zorunlu
      if (!agency.levhaNo) {
        errors.push(`Satır ${i + 1}: Levha No boş olamaz`);
        skippedCount++;
        continue;
      }

      agencies.push(agency);
    } catch (error) {
      errors.push(`Satır ${i + 1}: ${error instanceof Error ? error.message : 'Parse hatası'}`);
      skippedCount++;
    }
  }

  return { agencies, errors, skippedCount };
}

/**
 * Hazır Excel dosyasını yükle (assets/KopyaAcenteListesi.xlsx)
 */
export async function loadPreloadedExcel(
  onProgress?: (current: number, total: number) => void
): Promise<ExcelImportResult> {
  const startTime = Date.now();
  
  try {
    // Asset'ten Excel dosyasını oku
    const asset = require('../../assets/KopyaAcenteListesi.xlsx');
    const response = await fetch(asset);
    const arrayBuffer = await response.arrayBuffer();
    
    // Excel'i parse et
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

    // Parse edilen verileri işle
    const parseResult = parseExcelData(jsonData, onProgress);
    
    if (parseResult.agencies.length === 0) {
      return {
        success: false,
        importedCount: 0,
        errorCount: parseResult.errors.length,
        skippedCount: parseResult.skippedCount,
        errors: parseResult.errors,
        duration: Date.now() - startTime,
      };
    }

    // Veritabanına kaydet (batch olarak)
    const batchSize = 500;
    let savedCount = 0;
    
    for (let i = 0; i < parseResult.agencies.length; i += batchSize) {
      const batch = parseResult.agencies.slice(i, i + batchSize);
      const saved = await saveMultipleAgencies(batch);
      
      if (saved) {
        savedCount += batch.length;
        onProgress?.(savedCount, parseResult.agencies.length);
      }
    }

    return {
      success: true,
      importedCount: savedCount,
      errorCount: parseResult.errors.length,
      skippedCount: parseResult.skippedCount,
      errors: parseResult.errors,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    console.error('Preloaded Excel import hatası:', error);
    return {
      success: false,
      importedCount: 0,
      errorCount: 1,
      skippedCount: 0,
      errors: [error instanceof Error ? error.message : 'Bilinmeyen hata'],
      duration: Date.now() - startTime,
    };
  }
}
