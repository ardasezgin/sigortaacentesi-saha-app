/**
 * Örnek veri yükleme fonksiyonları
 */

import { saveMultipleAgencies } from './storage';
import { addVisit } from './visit-storage';
import type { Agency } from '../types/agency';
import type { Visit } from '../types/visit';

export async function loadSampleAgencies(): Promise<boolean> {
  const sampleAgencies: Agency[] = [
    {
      levhaNo: 'T091014-SAN3',
      acenteAdi: 'Güven Sigorta Acentesi',
      yetkiliAdiSoyadi: 'Ahmet Yılmaz',
      telefon: '0532 123 45 67',
      eposta: 'ahmet@guvensigorta.com',
      adres: 'Atatürk Cad. No:45',
      sehir: 'İstanbul',
      ilce: 'Kadıköy',
      vergiNo: '1234567890',
      durum: 'Aktif',
    },
    {
      levhaNo: 'T091015-IST1',
      acenteAdi: 'Anadolu Sigorta Merkez',
      yetkiliAdiSoyadi: 'Mehmet Demir',
      telefon: '0533 234 56 78',
      eposta: 'mehmet@anadolusigorta.com',
      adres: 'Cumhuriyet Mah. Bağdat Cad. No:123',
      sehir: 'İstanbul',
      ilce: 'Üsküdar',
      vergiNo: '2345678901',
      durum: 'Aktif',
    },
    {
      levhaNo: 'T091016-ANK1',
      acenteAdi: 'Başkent Sigorta',
      yetkiliAdiSoyadi: 'Ayşe Kaya',
      telefon: '0534 345 67 89',
      eposta: 'ayse@baskentsigorta.com',
      adres: 'Kızılay Meydan No:78',
      sehir: 'Ankara',
      ilce: 'Çankaya',
      vergiNo: '3456789012',
      durum: 'Aktif',
    },
    {
      levhaNo: 'T091017-IZM1',
      acenteAdi: 'Ege Sigorta Acentesi',
      yetkiliAdiSoyadi: 'Fatma Şahin',
      telefon: '0535 456 78 90',
      eposta: 'fatma@egesigorta.com',
      adres: 'Alsancak Kordon No:234',
      sehir: 'İzmir',
      ilce: 'Konak',
      vergiNo: '4567890123',
      durum: 'Aktif',
    },
    {
      levhaNo: 'T091018-BUR1',
      acenteAdi: 'Uludağ Sigorta',
      yetkiliAdiSoyadi: 'Ali Özdemir',
      telefon: '0536 567 89 01',
      eposta: 'ali@uludagsigorta.com',
      adres: 'Heykel Meydanı No:56',
      sehir: 'Bursa',
      ilce: 'Osmangazi',
      vergiNo: '5678901234',
      durum: 'Pasif',
    },
  ];

  return await saveMultipleAgencies(sampleAgencies);
}

export async function loadSampleVisits(): Promise<boolean> {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  const sampleVisits: Visit[] = [
    {
      id: `${Date.now()}-sample-1`,
      levhaNo: 'T091014-SAN3',
      acenteAdi: 'Güven Sigorta Acentesi',
      visitType: 'Fiziksel Ziyaret',
      visitDate: now.toISOString(),
      duration: 45,
      notes: 'Yeni ürün tanıtımı yapıldı. Acente yetkilisi yeni kampanyalardan memnun.',
      createdBy: 'Saha Personeli',
      createdAt: now.toISOString(),
    },
    {
      id: `${Date.now()}-sample-2`,
      levhaNo: 'T091015-IST1',
      acenteAdi: 'Anadolu Sigorta Merkez',
      visitType: 'Telefon Araması',
      visitDate: yesterday.toISOString(),
      duration: 15,
      notes: 'Aylık satış rakamları görüşüldü.',
      createdBy: 'Saha Personeli',
      createdAt: yesterday.toISOString(),
    },
    {
      id: `${Date.now()}-sample-3`,
      levhaNo: 'T091016-ANK1',
      acenteAdi: 'Başkent Sigorta',
      visitType: 'Fiziksel Ziyaret',
      visitDate: twoDaysAgo.toISOString(),
      duration: 60,
      notes: 'Eğitim semineri düzenlendi. 5 acente personeli katıldı.',
      createdBy: 'Saha Personeli',
      createdAt: twoDaysAgo.toISOString(),
    },
  ];

  try {
    for (const visit of sampleVisits) {
      await addVisit(visit);
    }
    return true;
  } catch (error) {
    console.error('Örnek ziyaretler yüklenirken hata:', error);
    return false;
  }
}
