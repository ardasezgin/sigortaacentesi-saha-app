import * as XLSX from 'xlsx';
import { getDb } from '../server/db.js';
import { agencies } from '../drizzle/schema.js';

async function importExcel() {
  console.log('📖 Reading Excel file...');
  const workbook = XLSX.readFile('/home/ubuntu/upload/KopyaAcenteListesi.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  console.log(`✅ Found ${data.length} records in Excel`);
  console.log('📋 First record:', JSON.stringify(data[0], null, 2));

  const db = await getDb();
  if (!db) {
    console.error('❌ Database not available');
    process.exit(1);
  }

  // Önce tabloyu temizle
  console.log('🗑️  Clearing existing data...');
  await db.delete(agencies);

  let inserted = 0;
  let failed = 0;
  const batchSize = 100;

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    
    try {
      const records = batch.map((row: any) => ({
        acenteTuru: row['Acente Turu'] || '',
        levhaNo: row['Levha No'] || '',
        levhaKayTar: row['Levha Kay. Tar.'] || null,
        levhaYenKayTar: row['Levha Yen. Kay.\r\nTar.'] || null,
        acenteUnvani: row['Acente Ünvanı'] || '',
        adres: row['Adres'] || '',
        il: row['İl'] || '',
        ilce: row['İlçe'] || '',
        telefon: row['Telefon'] || '',
        ePosta: row['E-Posta'] || '',
        teknikPersonel: row['Teknik Personel'] || '',
        isActive: 1,
      }));

      await db.insert(agencies).values(records);
      inserted += records.length;
      console.log(`✅ Progress: ${inserted}/${data.length} (${Math.round((inserted / data.length) * 100)}%)`);
    } catch (error) {
      failed += batch.length;
      console.error(`❌ Batch ${i}-${i + batchSize} failed:`, error);
    }
  }

  console.log('\n🎉 Import completed!');
  console.log(`✅ Inserted: ${inserted}`);
  console.log(`❌ Failed: ${failed}`);

  process.exit(0);
}

importExcel();
