import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerClickUpOAuthRoutes, pendingOAuthTokens } from "./clickup-oauth";
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
  registerClickUpOAuthRoutes(app);

  // OAuth callback page - handles redirect from ClickUp OAuth flow
  // This serves an HTML page that stores the token and redirects to the app
  app.get("/oauth/callback", (req, res) => {
    const sessionToken = typeof req.query.sessionToken === "string" ? req.query.sessionToken : "";
    const user = typeof req.query.user === "string" ? req.query.user : "";
    const error = typeof req.query.error === "string" ? req.query.error : "";

    if (error) {
      res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Giriş Hatası</title></head>
<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f5f5f5">
<div style="text-align:center;padding:2rem;background:white;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.1)">
<div style="font-size:3rem">❌</div><h2 style="color:#ef4444">Giriş Başarısız</h2>
<p style="color:#666">${error}</p>
<a href="/" style="color:#7B68EE">Tekrar dene</a>
</div></body></html>`);
      return;
    }

    // Store token server-side so the opener can poll for it
    const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
    pendingOAuthTokens.set(nonce, { token: sessionToken, user, createdAt: Date.now() });
    console.log(`[OAuth/callback] Stored pending token nonce=${nonce}`);

    res.send(`<!DOCTYPE html>
<html>
<head><title>Giriş Yapılıyor...</title><meta charset="utf-8">
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f5f5f5;}
  .box{text-align:center;padding:2.5rem 3rem;background:white;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.1);max-width:320px;}
  .icon{font-size:3rem;margin-bottom:1rem;}
  h2{color:#1a1a1a;margin:0 0 0.5rem;font-size:1.25rem;}
  p{color:#666;margin:0;font-size:0.9rem;}
</style>
</head>
<body>
<div class="box">
  <div class="icon">✅</div>
  <h2>Giriş Başarılı</h2>
  <p id="msg">Uygulama açılıyor...</p>
</div>
<script>
(function() {
  var token = ${JSON.stringify(sessionToken)};
  var user = ${JSON.stringify(user)};
  var nonce = ${JSON.stringify(nonce)};
  var msg = { type: 'OAuthCallback', sessionToken: token, user: user, nonce: nonce };

  // Store nonce in sessionStorage so opener can poll
  try { sessionStorage.setItem('oauth_nonce', nonce); } catch(e) {}

  // Send postMessage to all possible parent/opener windows
  function sendMsg(target) {
    try { if (target) target.postMessage(msg, '*'); } catch(e) {}
  }
  sendMsg(window.opener);
  sendMsg(window.opener && window.opener.parent);
  sendMsg(window.opener && window.opener.top);
  sendMsg(window.parent);
  sendMsg(window.top);

  document.getElementById('msg').textContent = 'Giriş tamamlandı, pencere kapanıyor...';
  // Close this popup after sending messages
  setTimeout(function() { window.close(); }, 1200);
})();
</script>
</body>
</html>`);
  });

  // Polling endpoint: opener checks this after popup closes
  // Returns the pending token once, then deletes it (one-time use)
  app.get("/api/auth/pending-token", (req, res) => {
    const nonce = typeof req.query.nonce === "string" ? req.query.nonce : "";
    if (!nonce) {
      res.status(400).json({ error: "nonce required" });
      return;
    }
    const entry = pendingOAuthTokens.get(nonce);
    if (!entry) {
      res.status(404).json({ error: "not found" });
      return;
    }
    // One-time use: delete after retrieval
    pendingOAuthTokens.delete(nonce);
    console.log(`[OAuth/pending-token] Token consumed for nonce=${nonce}`);
    res.json({ sessionToken: entry.token, user: entry.user });
  });

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

  // Debug endpoint - check table schema in production
  app.get("/api/debug/schema", async (_req, res) => {
    try {
      const pg = await getPgClient();
      if (!pg) {
        res.status(503).json({ error: "Database not available" });
        return;
      }
      const [requestsCols, visitsCols] = await Promise.all([
        pg`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'requests' ORDER BY ordinal_position`,
        pg`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'visits' ORDER BY ordinal_position`,
      ]);
      res.json({ requests: requestsCols, visits: visitsCols });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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
