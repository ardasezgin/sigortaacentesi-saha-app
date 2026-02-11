import { getDb } from '../server/db.js';
import { agencies } from '../drizzle/schema.js';

async function testQuery() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    process.exit(1);
  }
  
  console.log('Testing query...');
  const result = await db.select().from(agencies).limit(50000);
  console.log(`Result count: ${result.length}`);
  console.log('First 3 records:', result.slice(0, 3).map(r => r.levhaNo));
  
  process.exit(0);
}

testQuery();
