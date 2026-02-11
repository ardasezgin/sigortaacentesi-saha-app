/**
 * One-time script to seed agencies data into PostgreSQL
 * Run with: tsx scripts/seed-agencies.ts
 */
import { getDb } from '../server/db';
import { agencies } from '../drizzle/schema';
import agenciesData from '../assets/agencies.json';

async function seedAgencies() {
  try {
    console.log('🚀 Starting agencies seed...');
    console.log(`📊 Total records to insert: ${agenciesData.length}`);
    
    const db = await getDb();
    if (!db) {
      console.error('❌ Database not available');
      process.exit(1);
    }
    
    // Check if agencies already exist
    const existingCount = await db.select().from(agencies);
    if (existingCount.length > 0) {
      console.log(`⚠️  Database already has ${existingCount.length} agencies`);
      console.log('❓ Do you want to continue? This will skip duplicates.');
    }
    
    // Insert in batches to avoid memory issues
    const BATCH_SIZE = 500;
    let inserted = 0;
    let skipped = 0;
    
    for (let i = 0; i < agenciesData.length; i += BATCH_SIZE) {
      const batch = agenciesData.slice(i, i + BATCH_SIZE);
      
      for (const agency of batch) {
        try {
          await db.insert(agencies).values({
            levhaNo: agency.levhaNo,
            acenteTuru: agency.acenteTuru || null,
            acenteUnvani: agency.acenteUnvani,
            adres: agency.adres || null,
            il: agency.il || null,
            ilce: agency.ilce || null,
            telefon: agency.telefon || null,
            ePosta: agency.eposta || null,
            teknikPersonel: agency.teknikPersonel || null,
            levhaKayTar: agency.levhaKayitTarihi || null,
            levhaYenKayTar: agency.levhaYeniKayitTarihi || null,
            isActive: 1, // Default active
            notlar: null,
          });
          inserted++;
        } catch (error: any) {
          // Skip duplicates (unique constraint violation)
          if (error.code === 'ER_DUP_ENTRY' || error.message?.includes('Duplicate')) {
            skipped++;
          } else {
            console.error(`❌ Error inserting ${agency.levhaNo}:`, error.message);
          }
        }
      }
      
      console.log(`✅ Progress: ${Math.min(i + BATCH_SIZE, agenciesData.length)}/${agenciesData.length}`);
    }
    
    console.log('\n🎉 Seed completed!');
    console.log(`✅ Inserted: ${inserted}`);
    console.log(`⏭️  Skipped (duplicates): ${skipped}`);
    
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seedAgencies();
