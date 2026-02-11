import { readFileSync } from 'fs';
import { join } from 'path';
import { getDb } from '../server/db.js';
import { agencies } from '../drizzle/schema.js';

async function fastSeed() {
  console.log('🚀 Starting fast seed...');
  
  const jsonPath = join(process.cwd(), 'assets', 'agencies.json');
  const jsonData = readFileSync(jsonPath, 'utf-8');
  const agenciesData = JSON.parse(jsonData);
  
  console.log(`📊 Total agencies: ${agenciesData.length}`);
  
  const db = await getDb();
  if (!db) {
    console.error('❌ Database not available');
    process.exit(1);
  }
  
  // Smaller batch size for faster processing
  const batchSize = 100;
  let inserted = 0;
  let failed = 0;
  
  for (let i = 0; i < agenciesData.length; i += batchSize) {
    const batch = agenciesData.slice(i, i + batchSize);
    
    try {
      await db.insert(agencies).values(batch);
      inserted += batch.length;
      
      // Progress every 1000 records
      if (inserted % 1000 === 0) {
        console.log(`✅ Progress: ${inserted}/${agenciesData.length} (${Math.round(inserted/agenciesData.length*100)}%)`);
      }
    } catch (error: any) {
      failed += batch.length;
      console.error(`❌ Batch ${i}-${i + batchSize} failed: ${error.message}`);
    }
  }
  
  console.log(`\n🎉 Seed completed!`);
  console.log(`✅ Inserted: ${inserted}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${agenciesData.length}`);
  
  process.exit(0);
}

fastSeed().catch((error) => {
  console.error('❌ Fast seed failed:', error);
  process.exit(1);
});
