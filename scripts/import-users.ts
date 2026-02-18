import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import * as db from "../server/db";

const DEFAULT_PASSWORD = "Aksiyon2026";

interface CSVUser {
  name: string;
  email: string;
  initials: string;
  role: string;
  clickupUserId: string;
}

async function parseCSV(filePath: string): Promise<CSVUser[]> {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  
  // Skip header line
  const dataLines = lines.slice(1);
  
  const users: CSVUser[] = [];
  
  for (const line of dataLines) {
    if (!line.trim()) continue;
    
    // Parse CSV line (handle quoted fields)
    const matches = line.match(/("([^"]*)"|[^,]+)/g);
    if (!matches || matches.length < 12) continue;
    
    const cleanField = (field: string) => field.replace(/^"|"$/g, "").trim();
    
    const name = cleanField(matches[0]);
    const email = cleanField(matches[1]);
    const initials = cleanField(matches[2]);
    const role = cleanField(matches[4]);
    // ClickUp User ID is in column 11 (0-indexed), but we need to find it properly
    // The CSV has many columns, User ID should be a numeric value
    let clickupUserId = "";
    if (matches.length > 11) {
      const possibleId = cleanField(matches[11]);
      // Only use if it's a numeric ID
      if (possibleId && /^\d+$/.test(possibleId)) {
        clickupUserId = possibleId;
      }
    }
    
    // Skip if no email or not sigortaacentesi.com domain
    if (!email || !email.includes("@")) continue;
    if (!email.endsWith("@sigortaacentesi.com")) continue;
    
    users.push({
      name,
      email,
      initials,
      role,
      clickupUserId,
    });
  }
  
  return users;
}

async function importUsers() {
  console.log("[Import] Starting user import...");
  
  const csvPath = path.join(__dirname, "../clickup-users.csv");
  const users = await parseCSV(csvPath);
  
  console.log(`[Import] Found ${users.length} users in CSV`);
  
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const user of users) {
    try {
      // Check if user already exists
      const existing = await db.findUserByEmail(user.email);
      
      if (existing) {
        console.log(`[Import] Skipping ${user.email} - already exists`);
        
        // Update ClickUp user ID if missing
        if (!existing.clickupUserId && user.clickupUserId) {
          await db.updateUserClickUpId(existing.id, user.clickupUserId);
          console.log(`[Import] Updated ClickUp ID for ${user.email}`);
        }
        
        skipped++;
        continue;
      }
      
      // Create new user
      const userData: any = {
        openId: `clickup-${user.clickupUserId || `${Date.now()}-${Math.random().toString(36).substring(7)}`}`,
        name: user.name,
        email: user.email,
        passwordHash,
        loginMethod: "email",
      };
      
      if (user.clickupUserId) {
        userData.clickupUserId = user.clickupUserId;
      }
      
      await db.createUser(userData);
      
      console.log(`[Import] Created user: ${user.name} (${user.email})`);
      imported++;
      
    } catch (error) {
      console.error(`[Import] Error importing ${user.email}:`, error);
      errors++;
    }
  }
  
  console.log("\n[Import] Summary:");
  console.log(`  - Imported: ${imported}`);
  console.log(`  - Skipped: ${skipped}`);
  console.log(`  - Errors: ${errors}`);
  console.log(`  - Total: ${users.length}`);
  console.log(`\n[Import] Default password for all users: ${DEFAULT_PASSWORD}`);
}

// Run import
importUsers()
  .then(() => {
    console.log("[Import] Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("[Import] Fatal error:", error);
    process.exit(1);
  });
