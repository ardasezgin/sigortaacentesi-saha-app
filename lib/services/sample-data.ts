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
      acenteTuru: 'TÜZEL',
      levhaNo: 'T091014-SAN3',
      levhaKayitTarihi: '15.01.2020',
      levhaYenilemeTarihi: null,
      acenteUnvani: 'Güven Sigorta Acentesi',
      adres: 'Atatürk Cad. No:45',
      il: 'İSTANBUL',
      ilce: 'KADIKÖY',
      telefon: '05321234567',
      eposta: 'ahmet@guvensigorta.com',
      teknikPersonel: '(MÜDÜR) AHMET YILMAZ',
      isActive: 1,
    },
    {
      acenteTuru: 'TÜZEL',
      levhaNo: 'T091015-IST1',
      levhaKayitTarihi: '22.03.2019',
      levhaYenilemeTarihi: null,
      acenteUnvani: 'Anadolu Sigorta Merkez',
      adres: 'Cumhuriyet Mah. Bağdat Cad. No:123',
      il: 'İSTANBUL',
      ilce: 'ÜSKÜDAR',
      telefon: '05332345678',
      eposta: 'mehmet@anadolusigorta.com',
      teknikPersonel: '(MÜDÜR) MEHMET DEMİR',
      isActive: 1,
    },
    {
      acenteTuru: 'TÜZEL',
      levhaNo: 'T091016-ANK1',
      levhaKayitTarihi: '10.06.2021',
      levhaYenilemeTarihi: null,
      acenteUnvani: 'Başkent Sigorta',
      adres: 'Kızılay Meydan No:78',
      il: 'ANKARA',
      ilce: 'ÇANKAYA',
      telefon: '05343456789',
      eposta: 'ayse@baskentsigorta.com',
      teknikPersonel: '(MÜDÜR) AYŞE KAYA',
      isActive: 1,
    },
    {
      acenteTuru: 'TÜZEL',
      levhaNo: 'T091017-IZM1',
      levhaKayitTarihi: '05.09.2018',
      levhaYenilemeTarihi: null,
      acenteUnvani: 'Ege Sigorta Acentesi',
      adres: 'Alsancak Kordon No:234',
      il: 'İZMİR',
      ilce: 'KONAK',
      telefon: '05354567890',
      eposta: 'fatma@egesigorta.com',
      teknikPersonel: '(MÜDÜR) FATMA ŞAHİN',
      isActive: 1,
    },
    {
      acenteTuru: 'GERÇEK',
      levhaNo: 'T091018-BUR1',
      levhaKayitTarihi: '12.11.2017',
      levhaYenilemeTarihi: null,
      acenteUnvani: 'Uludağ Sigorta',
      adres: 'Heykel Meydanı No:56',
      il: 'BURSA',
      ilce: 'OSMANGAZİ',
      telefon: '05365678901',
      eposta: 'ali@uludagsigorta.com',
      teknikPersonel: '(MÜDÜR) ALİ ÖZDEMİR',
      isActive: 0,
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
      iletisimTuru: 'Ziyaret',
      isOrtagi: 'Mevcut Acente',
      levhaNo: 'T091014-SAN3',
      acenteAdi: 'Anadolu Sigorta Acentesi',
      kimleGorusuldu: 'Ali Kaya',
      tarih: now.toISOString().split('T')[0],
      gundem: 'Yol Yardım Satış',
      detayAciklama: 'Yeni ürün tanıtımı yapıldı. Acente yetkilisi yeni kampanyalardan memnun.',
      createdBy: 'Saha Personeli',
      createdAt: now.toISOString(),
    },
    {
      id: `${Date.now()}-sample-2`,
      iletisimTuru: 'Arama',
      isOrtagi: 'Mevcut Acente',
      levhaNo: 'T091015-IST1',
      acenteAdi: 'Marmara Sigorta Acentesi',
      kimleGorusuldu: 'Mehmet Yılmaz',
      tarih: yesterday.toISOString().split('T')[0],
      gundem: 'Genel Performans',
      detayAciklama: 'Aylık satış rakamları görüşüldü.',
      createdBy: 'Saha Personeli',
      createdAt: yesterday.toISOString(),
    },
    {
      id: `${Date.now()}-sample-3`,
      iletisimTuru: 'Ziyaret',
      isOrtagi: 'Mevcut Acente',
      levhaNo: 'T091016-ANK1',
      acenteAdi: 'Başkent Sigorta',
      kimleGorusuldu: 'Ayşe Demir',
      tarih: twoDaysAgo.toISOString().split('T')[0],
      gundem: 'Hızlı Teklif Ekranları',
      detayAciklama: 'Eğitim semineri düzenlendi. 5 acente personeli katıldı.',
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
