import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { getPgClient } from "../db";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Enable CORS for all routes - reflect the request origin to support credentials
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    res.header("Access-Control-Allow-Credentials", "true");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerOAuthRoutes(app);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  // Excel export endpoint - returns all agencies with karne data as CSV
  app.get("/api/export/agencies", async (_req, res) => {
    try {
      const pg = await getPgClient();
      if (!pg) {
        res.status(503).json({ error: "Database not available" });
        return;
      }
      const rows = await pg`
        SELECT
          "levhaNo", "acenteUnvani", il, ilce,
          "kurucuPersonel", "kurulusTarihi", "kurulusTarihiSacom",
          "personelSayisi", "subeMudurSayisi", "organizasyoncu",
          "subeSayisi", "kacSirketleCalisiyor", "acenteSegmenti",
          "yonetimIliskisi", "acenteyeVerilenSoz", "hayatHayatDisi",
          "uretim2025", "portfoyAgirligi", "trafikYuzde", "kaskoYuzde",
          "otoDisiYuzde", "saglikYuzde", "cmYapilanmasi", "acenteKararAlicisi",
          "teknolojiIlgisi", "hizliTeklifEkrani", "hizliTeklifPartneri",
          "whatsappKullanimi", "whatsappPartneri", "webSitesi", "webPartneri",
          "mobilUygulama", "appPartneri", "dijitalPazarlama", "musteriNeredenGeliyor",
          "operasyonelVerimlilik", "leadYonlendirme", "dijitallesmeHarcama",
          "filoMusteriYogunlugu", "galeriMusterisi",
          to_char("karneLastUpdated", 'DD.MM.YYYY HH24:MI') as "karneLastUpdated"
        FROM agencies
        ORDER BY "acenteUnvani" ASC
      `;

      const headers = [
        "Levha No", "Acente Adı", "İl", "İlçe",
        "Kurucu Personel", "Kuruluş Tarihi", "Kuruluş Tarihi SA.com",
        "Personel Sayısı", "Şube Müdürü Sayısı", "Organizasyoncu mu?",
        "Şube Sayısı", "Kaç Şirketle Çalışıyor", "Acente Segmenti",
        "Yönetim İlişkisi", "Acenteye Verilen Söz", "Hayat/Hayat Dışı",
        "Üretim 2025", "Portföy Ağırlığı", "Trafik %", "Kasko %",
        "Oto Dışı %", "Sağlık %", "CM Yapılanması", "Acente Karar Alıcısı",
        "Teknoloji İlgisi", "Hızlı Teklif Ekranı", "Hızlı Teklif Partneri",
        "WhatsApp Kullanımı", "WhatsApp Partneri", "Web Sitesi", "Web Partneri",
        "Mobil Uygulama", "App Partneri", "Dijital Pazarlama", "Müşteri Nereden Geliyor",
        "Operasyonel Verimlilik", "Lead Yönlendirme", "Dijitalleşme Harcama",
        "Filo Müşteri Yoğunluğu", "Galeri Müşterisi", "Karne Son Güncelleme"
      ];

      const fields = [
        "levhaNo", "acenteUnvani", "il", "ilce",
        "kurucuPersonel", "kurulusTarihi", "kurulusTarihiSacom",
        "personelSayisi", "subeMudurSayisi", "organizasyoncu",
        "subeSayisi", "kacSirketleCalisiyor", "acenteSegmenti",
        "yonetimIliskisi", "acenteyeVerilenSoz", "hayatHayatDisi",
        "uretim2025", "portfoyAgirligi", "trafikYuzde", "kaskoYuzde",
        "otoDisiYuzde", "saglikYuzde", "cmYapilanmasi", "acenteKararAlicisi",
        "teknolojiIlgisi", "hizliTeklifEkrani", "hizliTeklifPartneri",
        "whatsappKullanimi", "whatsappPartneri", "webSitesi", "webPartneri",
        "mobilUygulama", "appPartneri", "dijitalPazarlama", "musteriNeredenGeliyor",
        "operasyonelVerimlilik", "leadYonlendirme", "dijitallesmeHarcama",
        "filoMusteriYogunlugu", "galeriMusterisi", "karneLastUpdated"
      ];

      const escape = (v: any) => {
        if (v === null || v === undefined) return "";
        const s = String(v);
        if (s.includes(",") || s.includes('"') || s.includes("\n")) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };

      const csvLines = [
        headers.map(escape).join(","),
        ...rows.map((row: any) => fields.map((f) => escape(row[f])).join(","))
      ];

      const csv = "\uFEFF" + csvLines.join("\n"); // BOM for Excel UTF-8
      const filename = `acenteler_karne_${new Date().toISOString().slice(0,10)}.csv`;
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(csv);
      console.log(`[export] Exported ${rows.length} agencies as CSV`);
    } catch (error) {
      console.error("[export] Failed:", error);
      res.status(500).json({ error: "Export failed" });
    }
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch(console.error);
