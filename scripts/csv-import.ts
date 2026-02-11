import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// JSON'u CSV'ye çevir
const jsonPath = join(process.cwd(), 'assets', 'agencies.json');
const csvPath = join(process.cwd(), 'assets', 'agencies.csv');

const jsonData = readFileSync(jsonPath, 'utf-8');
const agencies = JSON.parse(jsonData);

console.log(`📊 Total agencies: ${agencies.length}`);

// CSV header
const header = 'id,levhaNo,acenteTuru,acenteUnvani,adres,il,ilce,telefon,yetkiliKisiler,createdAt,updatedAt,isActive,notes,email,website,contactPerson\n';

// CSV rows
const rows = agencies.map((agency: any) => {
  const escape = (val: any) => {
    if (val === null || val === undefined) return '';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };
  
  return [
    escape(agency.id),
    escape(agency.levhaNo),
    escape(agency.acenteTuru),
    escape(agency.acenteUnvani),
    escape(agency.adres),
    escape(agency.il),
    escape(agency.ilce),
    escape(agency.telefon),
    escape(agency.yetkiliKisiler),
    escape(new Date().toISOString()),
    escape(new Date().toISOString()),
    '1', // isActive
    escape(''),
    escape(''),
    escape(''),
    escape('')
  ].join(',');
}).join('\n');

writeFileSync(csvPath, header + rows, 'utf-8');
console.log(`✅ CSV created: ${csvPath}`);
console.log(`📝 Total rows: ${agencies.length}`);
