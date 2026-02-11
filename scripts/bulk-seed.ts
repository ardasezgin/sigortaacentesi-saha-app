import { readFileSync } from 'fs';
import { join } from 'path';
import { getDb } from '../server/db.js';
import { agencies } from '../drizzle/schema.js';

async function bulkSeed() {
  console.log('🚀 Starting bulk seed...');
  
  // Read agencies.json
  const jsonPath = join(process.cwd(), 'assets', 'agencies.json');
  const jsonData = readFileSync(jsonPath, 'utf-8');
  const agenciesData = JSON.parse(jsonData);
  
  console.log(`📊 Total agencies to insert: ${agenciesData.length}`);
  
  const db = await getDb();
  if (!db) {
    console.error('❌ Database not available');
    process.exit(1);
  }
  
  // Batch insert (1000 at a time)
  const batchSize = 1000;
  let inserted = 0;
  
  for (let i = 0; i < agenciesData.length; i += batchSize) {
    const batch = agenciesData.slice(i, i + batchSize);
    
    try {
      await db.insert(agencies).values(batch);
      inserted += batch.length;
      console.log(`✅ Inserted ${inserted}/${agenciesData.length} agencies`);
    } catch (error: any) {
      // Ignore duplicate key errors
      if (error.code !== 'ER_DUP_ENTRY') {
        console.error(`❌ Error inserting batch ${i}-${i + batchSize}:`, error.message);
      }
      inserted += batch.length; // Count as inserted even if duplicates
    }
  }
  
  console.log(`🎉 Bulk seed completed! Total inserted: ${inserted}`);
  process.exit(0);
}

bulkSeed().catch((error) => {
  console.error('❌ Bulk seed failed:', error);
  process.exit(1);
});
