import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DB_NAME = 'SigortaAcentesiDB';
const DB_VERSION = 1;
const STORE_NAME = 'agencies';

/**
 * IndexedDB wrapper for web, AsyncStorage fallback for mobile
 */
class AgencyDatabase {
  private db: IDBDatabase | null = null;
  // Web detection: typeof window kontrolü daha güvenilir
  private isWeb = typeof window !== 'undefined' && typeof indexedDB !== 'undefined';

  async init(): Promise<void> {
    if (!this.isWeb) {
      console.log('[AgencyDatabase] Mobile platform, using AsyncStorage');
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[AgencyDatabase] IndexedDB açılamadı:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[AgencyDatabase] IndexedDB başarıyla açıldı');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Agencies object store oluştur
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          // levhaNo için index oluştur (hızlı arama için)
          objectStore.createIndex('levhaNo', 'levhaNo', { unique: false });
          console.log('[AgencyDatabase] Object store ve index oluşturuldu');
        }
      };
    });
  }

  async saveAgencies(agencies: any[]): Promise<void> {
    if (!this.isWeb) {
      // Mobile: AsyncStorage kullan
      await AsyncStorage.setItem('agencies', JSON.stringify(agencies));
      await AsyncStorage.setItem('agencies_initialized', 'true');
      return;
    }

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);

      // Önce mevcut verileri temizle
      objectStore.clear();

      // Yeni verileri ekle
      agencies.forEach((agency) => {
        objectStore.add(agency);
      });

      transaction.oncomplete = () => {
        console.log(`[AgencyDatabase] ${agencies.length} acente kaydedildi`);
        resolve();
      };

      transaction.onerror = () => {
        console.error('[AgencyDatabase] Transaction hatası:', transaction.error);
        reject(transaction.error);
      };
    });
  }

  async findByLevhaNo(levhaNo: string): Promise<any | null> {
    if (!this.isWeb) {
      // Mobile: AsyncStorage kullan
      const data = await AsyncStorage.getItem('agencies');
      if (!data) return null;
      
      const agencies = JSON.parse(data);
      return agencies.find(
        (a: any) => a.levhaNo.toLowerCase() === levhaNo.toLowerCase().trim()
      ) || null;
    }

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const searchTerm = levhaNo.toLowerCase().trim();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(STORE_NAME);
      const index = objectStore.index('levhaNo');
      
      // Cursor ile case-insensitive arama
      const request = index.openCursor();
      let found: any = null;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor) {
          const agency = cursor.value;
          if (agency.levhaNo.toLowerCase() === searchTerm) {
            found = agency;
            resolve(found);
            return;
          }
          cursor.continue();
        } else {
          // Cursor sonu, bulunamadı
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error('[AgencyDatabase] Arama hatası:', request.error);
        reject(request.error);
      };
    });
  }

  async findByName(name: string): Promise<any | null> {
    if (!this.isWeb) {
      // Mobile: AsyncStorage kullan
      const data = await AsyncStorage.getItem('agencies');
      if (!data) return null;
      
      const agencies = JSON.parse(data);
      const searchTerm = name.toLowerCase().trim();
      return agencies.find(
        (a: any) => a.acenteUnvani.toLowerCase().includes(searchTerm)
      ) || null;
    }

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const searchTerm = name.toLowerCase().trim();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(STORE_NAME);
      
      // Tüm kayıtları tara (acenteUnvani için index yok)
      const request = objectStore.openCursor();
      let found: any = null;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor) {
          const agency = cursor.value;
          if (agency.acenteUnvani.toLowerCase().includes(searchTerm)) {
            found = agency;
            resolve(found);
            return;
          }
          cursor.continue();
        } else {
          // Cursor sonu, bulunamadı
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error('[AgencyDatabase] Acente adı arama hatası:', request.error);
        reject(request.error);
      };
    });
  }

  async getAll(): Promise<any[]> {
    if (!this.isWeb) {
      // Mobile: AsyncStorage kullan
      const data = await AsyncStorage.getItem('agencies');
      return data ? JSON.parse(data) : [];
    }

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('[AgencyDatabase] GetAll hatası:', request.error);
        reject(request.error);
      };
    });
  }

  async update(agency: any): Promise<void> {
    if (!this.isWeb) {
      // Mobile: AsyncStorage kullan
      const data = await AsyncStorage.getItem('agencies');
      if (!data) throw new Error('No agencies data found');
      
      const agencies = JSON.parse(data);
      const index = agencies.findIndex((a: any) => a.levhaNo === agency.levhaNo);
      
      if (index === -1) {
        throw new Error(`Agency not found: ${agency.levhaNo}`);
      }
      
      agencies[index] = agency;
      await AsyncStorage.setItem('agencies', JSON.stringify(agencies));
      return;
    }

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.put(agency);

      request.onsuccess = () => {
        console.log('[AgencyDatabase] Acente güncellendi:', agency.levhaNo);
        resolve();
      };

      request.onerror = () => {
        console.error('[AgencyDatabase] Update hatası:', request.error);
        reject(request.error);
      };
    });
  }

  async count(): Promise<number> {
    if (!this.isWeb) {
      // Mobile: AsyncStorage kullan
      const data = await AsyncStorage.getItem('agencies');
      return data ? JSON.parse(data).length : 0;
    }

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.count();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('[AgencyDatabase] Count hatası:', request.error);
        reject(request.error);
      };
    });
  }

  async isInitialized(): Promise<boolean> {
    if (!this.isWeb) {
      const flag = await AsyncStorage.getItem('agencies_initialized');
      return flag === 'true';
    }

    const count = await this.count();
    return count > 0;
  }
}

// Singleton instance
export const agencyDB = new AgencyDatabase();

// Export helper functions
export const getAllAgenciesFromDB = () => agencyDB.getAll();
export const updateAgencyInDB = (agency: any) => agencyDB.update(agency);
