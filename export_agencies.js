const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

(async () => {
  try {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    
    const [rows] = await connection.query('SELECT * FROM agencies ORDER BY id');
    
    console.log('Agencies count:', rows.length);
    
    const inserts = rows.map(row => {
      const cols = Object.keys(row).join(', ');
      const values = Object.values(row).map(v => {
        if (v === null) return 'NULL';
        if (typeof v === 'string') return "'" + v.replace(/'/g, "''").replace(/\\/g, '\\\\') + "'";
        if (typeof v === 'boolean') return v ? 'true' : 'false';
        if (v instanceof Date) return "'" + v.toISOString() + "'";
        return v;
      }).join(', ');
      return `INSERT INTO agencies (${cols}) VALUES (${values});`;
    }).join('\n');
    
    fs.writeFileSync('/tmp/agencies_export.sql', inserts);
    console.log('Export completed: /tmp/agencies_export.sql');
    console.log('File size:', fs.statSync('/tmp/agencies_export.sql').size, 'bytes');
    
    await connection.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
