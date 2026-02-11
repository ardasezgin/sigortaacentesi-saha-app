#!/bin/bash
# MySQL LOAD DATA INFILE kullanarak hızlı import

# Database connection bilgileri environment'tan al
DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-3306}"
DB_NAME="${DATABASE_NAME:-sigortaacentesi}"
DB_USER="${DATABASE_USER:-root}"
DB_PASS="${DATABASE_PASSWORD:-}"

CSV_FILE="/home/ubuntu/sigortaacentesi-saha-app/assets/agencies.csv"

mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" << SQL
LOAD DATA LOCAL INFILE '$CSV_FILE'
INTO TABLE agencies
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(id, levhaNo, acenteTuru, acenteUnvani, adres, il, ilce, telefon, yetkiliKisiler, createdAt, updatedAt, isActive, notes, email, website, contactPerson);
SQL

echo "✅ Import completed!"
