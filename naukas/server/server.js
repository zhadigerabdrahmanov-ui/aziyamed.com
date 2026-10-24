// Наукас жолдамасы — жергілікті сервер (Firebase Realtime Database REST-ке үйлесімді).
// Тәуелділік жоқ: тек Node.js 18+ (20/22 ұсынылады). Іске қосу: node server.js
"use strict";
const http = require("http"), fs = require("fs"), path = require("path"), zlib = require("zlib");

const PORT = +process.env.PORT || 8080;
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, "data"));
const APP_DIR = path.resolve(process.env.APP_DIR || path.join(__dirname, "app"));
const VENDOR_DIR = path.resolve(process.env.VENDOR_DIR || path.join(__dirname, "vendor"));
// Тек осы IP-префикстерге рұқсат (үтірмен), мысалы "192.168.1.,10.0.". Бос болса — бәріне (желіні фаервол қорғайды).
const ALLOW = (process.env.ALLOW_PREFIX || "").split(",").map(s => s.trim()).filter(Boolean);
const MAX_BODY = 200 * 1024 * 1024;
const SNAP_EVERY_MS = 10 * 60 * 1000;

fs.mkdirSync(DATA_DIR, { recursive: true });
const SNAP = path.join(DATA_DIR, "db.json"), JOURNAL = path.join(DATA_DIR, "journal.ndjson");

// ---------- Деректер ағашы ----------
let db = {};
function parts(p) { return String(p || "").split("/").filter(Boolean); }
function clean(v) {                       // Firebase сияқты: null мәндер мен бос объектілер сақталмайды
  if (v === null || v === undefined) return null;
  if (Array.isArray(v)) return v.map(x => (x === undefined ? null : clean(x)));
  if (typeof v === "object") {
    const o = {}; let n = 0;
    for (const k of Object.keys(v)) { const c = clean(v[k]); if (c !== null) { o[k] = c; n++; } }
    return n ? o : null;
  }
  return v;
}
function getAt(p) {
  let cur = db;
  for (const k of parts(p)) { if (cur === null || typeof cur !== "object" || !(k in cur)) return null; cur = cur[k]; }
  return cur === undefined ? null : cur;
}
function setAt(p, val) {
  const ks = parts(p); val = clean(val);
  if (!ks.length) { db = (val && typeof val === "object" && !Array.isArray(val)) ? val : {}; return; }
  const stack = []; let cur = db;
  for (let i = 0; i < ks.length - 1; i++) {
    const k = ks[i];
    if (cur[k] === null || typeof cur[k] !== "object") { if (val === null) return; cur[k] = {}; }
    stack.push([cur, k]); cur = cur[k];
  }
  const last = ks[ks.length - 1];
  if (val === null) delete cur[last]; else cur[last] = val;
  for (let i = stack.length - 1; i >= 0; i--) {   // бос аталарды жою
    const [o, k] = stack[i];
    if (o[k] && typeof o[k] === "object" && !Array.isArray(o[k]) && !Object.keys(o[k]).length) delete o[k]; else break;
  }
}
function applyOps(ops) { for (const [p, v] of ops) setAt(p, v); }

// ---------- Сақтау: снапшот + журнал ----------
let dirty = false;
function loadAll() {
  if (fs.existsSync(SNAP)) db = JSON.parse(fs.readFileSync(SNAP, "utf8"));
  if (fs.existsSync(JOURNAL)) {
    const lines = fs.readFileSync(JOURNAL, "utf8").split("\n");
    let n = 0;
    for (const ln of lines) { if (!ln.trim()) continue; try { applyOps(JSON.parse(ln)); n++; } catch (e) { console.log("journal жолы өткізілді:", e.message); } }
    console.log("journal қайта ойнатылды:", n, "жазба");
  }
  snapshot();
}
function snapshot() {
  const tmp = SNAP + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.renameSync(tmp, SNAP);
  fs.writeFileSync(JOURNAL, "");
  dirty = false;
}
function journal(ops) { fs.appendFileSync(JOURNAL, JSON.stringify(ops) + "\n"); dirty = true; }
setInterval(() => { if (dirty) { try { snapshot(); } catch (e) { console.log("snapshot қатесі", e.message); } } }, SNAP_EVERY_MS).unref();
function shutdown() { try { snapshot(); } catch (e) {} process.exit(0); }
process.on("SIGINT", shutdown); process.on("SIGTERM", shutdown);

// ---------- Push ID ----------
let pushCounter = 0;
function pushId() {
  pushCounter = (pushCounter + 1) % 46656;
  return "-" + Date.now().toString(36).padStart(9, "0") + pushCounter.toString(36).padStart(3, "0") + Math.random().toString(36).slice(2, 6);
}

// ---------- HTTP ----------
const MIME = { ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2" };
function send(res, code, body, headers) {
  res.writeHead(code, Object.assign({ "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,PUT,POST,PATCH,DELETE,OPTIONS", "Access-Control-Allow-Headers": "*", "Cache-Control": "no-store" }, headers || {}));
  res.end(body);
}
function sendJson(req, res, obj) {
  const raw = Buffer.from(JSON.stringify(obj));
  if (raw.length > 4096 && /\bgzip\b/.test(req.headers["accept-encoding"] || "")) {
    zlib.gzip(raw, (e, z) => e ? send(res, 200, raw, { "Content-Type": "application/json" }) : send(res, 200, z, { "Content-Type": "application/json", "Content-Encoding": "gzip" }));
  } else send(res, 200, raw, { "Content-Type": "application/json" });
}
function readBody(req) {
  return new Promise((ok, bad) => {
    const ch = []; let n = 0;
    req.on("data", c => { n += c.length; if (n > MAX_BODY) { bad(new Error("body too large")); req.destroy(); } else ch.push(c); });
    req.on("end", () => ok(Buffer.concat(ch).toString("utf8")));
    req.on("error", bad);
  });
}
function serveFile(res, base, rel) {
  const f = path.resolve(base, "." + path.sep + decodeURIComponent(rel));
  if (!f.startsWith(base + path.sep) && f !== base) return send(res, 403, "forbidden");
  fs.stat(f, (e, st) => {
    if (e || !st.isFile()) return send(res, 404, "not found");
    const ext = path.extname(f).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream", "Cache-Control": ext === ".html" ? "no-store" : "public, max-age=86400" });
    fs.createReadStream(f).pipe(res);
  });
}

async function handleDb(req, res, u) {
  const p = decodeURIComponent(u.pathname.replace(/^\/db(\.json)?\/?/, "").replace(/\.json$/, ""));
  const m = req.method;
  if (m === "OPTIONS") return send(res, 204, "");
  if (m === "GET") {
    const val = getAt(p), q = u.searchParams;
    if (q.get("shallow") === "true") {
      if (val && typeof val === "object") { const o = {}; Object.keys(val).forEach(k => { o[k] = true; }); return sendJson(req, res, o); }
      return sendJson(req, res, val);
    }
    const ob = q.get("orderBy");
    if (ob && val && typeof val === "object") {
      const prop = JSON.parse(ob);
      const hasEq = q.has("equalTo"); const eq = hasEq ? JSON.parse(q.get("equalTo")) : undefined;
      const out = {};
      Object.keys(val).forEach(k => {
        const c = val[k];
        const x = prop === "$key" ? k : prop === "$value" ? c : (c && typeof c === "object" ? c[prop] : undefined);
        if (!hasEq || x === eq) out[k] = c;
      });
      return sendJson(req, res, out);
    }
    return sendJson(req, res, val);
  }
  let body;
  if (m === "PUT" || m === "POST" || m === "PATCH") {
    try { body = JSON.parse(await readBody(req) || "null"); } catch (e) { return send(res, 400, JSON.stringify({ error: "bad json" }), { "Content-Type": "application/json" }); }
  }
  if (m === "PUT") { const ops = [[p, body]]; applyOps(ops); journal(ops); return sendJson(req, res, body); }
  if (m === "DELETE") { const ops = [[p, null]]; applyOps(ops); journal(ops); return sendJson(req, res, null); }
  if (m === "POST") { const id = pushId(); const ops = [[(p ? p + "/" : "") + id, body]]; applyOps(ops); journal(ops); return sendJson(req, res, { name: id }); }
  if (m === "PATCH") {
    if (!body || typeof body !== "object") return send(res, 400, JSON.stringify({ error: "object expected" }), { "Content-Type": "application/json" });
    const ops = Object.keys(body).map(k => [(p ? p + "/" : "") + k, body[k]]);   // «a/b/c»: мәні — көп жолды жаңарту (Firebase-тегідей)
    applyOps(ops); journal(ops); return sendJson(req, res, body);
  }
  return send(res, 405, "method not allowed");
}

// ---------- SMS жіберу (автоматты хабарлама) ----------
// Кілттер DATA_DIR/sms.json ішінде тұрады (дерекқорға түспейді). Мысал:
// {"enabled":true,"provider":"smsc","login":"...","password":"...","sender":"","dailyCap":300}
// {"enabled":true,"provider":"mobizon","apiKey":"...","sender":"","dailyCap":300}
const https = require("https");
const SMS_CFG = path.join(DATA_DIR, "sms.json");
let smsDay = "", smsCount = 0;
function smsConf() { try { return JSON.parse(fs.readFileSync(SMS_CFG, "utf8")); } catch (e) { return null; } }
function today() { return new Date().toISOString().slice(0, 10); }
function httpsGetJson(url) {
  return new Promise((ok, bad) => {
    https.get(url, r => { let b = ""; r.on("data", c => b += c); r.on("end", () => { try { ok(JSON.parse(b)); } catch (e) { bad(new Error("gateway: " + b.slice(0, 120))); } }); }).on("error", bad).setTimeout(15000, function () { this.destroy(new Error("timeout")); });
  });
}
async function smsSend(cfg, phone, text) {
  const q = encodeURIComponent;
  if (cfg.provider === "log") { console.log("SMS(dry-run)", phone, text.replace(/\n/g, " ")); return { dry: true }; }
  if (cfg.provider === "smsc") {
    const j = await httpsGetJson("https://smsc.kz/sys/send.php?login=" + q(cfg.login) + "&psw=" + q(cfg.password) + "&phones=" + q(phone) + "&mes=" + q(text) + "&charset=utf-8&fmt=3" + (cfg.sender ? "&sender=" + q(cfg.sender) : ""));
    if (j.error) throw new Error("smsc: " + (j.error || "") + " " + (j.error_code || ""));
    return j;
  }
  if (cfg.provider === "mobizon") {
    const j = await httpsGetJson("https://api.mobizon.kz/service/message/sendsmsmessage?output=json&apiKey=" + q(cfg.apiKey) + "&recipient=" + q(phone) + "&text=" + q(text) + (cfg.sender ? "&from=" + q(cfg.sender) : ""));
    if (j.code !== 0) throw new Error("mobizon: " + (j.message || j.code));
    return j;
  }
  throw new Error("provider unknown");
}
async function handleSms(req, res, u) {
  const J = { "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return send(res, 204, "");
  const cfg = smsConf();
  if (u.pathname === "/sms/status") {
    if (smsDay !== today()) { smsDay = today(); smsCount = 0; }
    return send(res, 200, JSON.stringify({ enabled: !!(cfg && cfg.enabled), provider: cfg && cfg.provider || "", sentToday: smsCount, cap: cfg && cfg.dailyCap || 300 }), J);
  }
  if (req.method !== "POST") return send(res, 405, "method not allowed");
  if (!cfg || !cfg.enabled) return send(res, 503, JSON.stringify({ error: "sms disabled" }), J);
  let b; try { b = JSON.parse(await readBody(req) || "null"); } catch (e) { return send(res, 400, JSON.stringify({ error: "bad json" }), J); }
  const phone = String(b && b.phone || "").replace(/\D/g, ""), text = String(b && b.text || "").trim();
  if (!/^7\d{10}$/.test(phone) || !text || text.length > 600) return send(res, 400, JSON.stringify({ error: "bad phone/text" }), J);
  if (smsDay !== today()) { smsDay = today(); smsCount = 0; }
  if (smsCount >= (cfg.dailyCap || 300)) return send(res, 429, JSON.stringify({ error: "daily cap" }), J);
  smsCount++;                                   // қателікте де санайды — қайталанып кетпеу үшін
  try { await smsSend(cfg, phone, text); console.log("SMS ok", phone.slice(0, 4) + "***" + phone.slice(-2)); return send(res, 200, JSON.stringify({ ok: true }), J); }
  catch (e) { console.log("SMS ERR", e.message); return send(res, 502, JSON.stringify({ error: String(e.message).slice(0, 200) }), J); }
}

// ---------- WhatsApp Business Cloud API (жаппай жіберу) ----------
// Кілттер DATA_DIR/wa.json ішінде (дерекқорға түспейді). Мысал:
// {"enabled":true,"provider":"cloud","token":"EAAG...","phoneNumberId":"123456789","apiVersion":"v21.0",
//  "templates":{"kk":"naukas_habar_kk","ru":"naukas_habar_ru"},"dailyCap":1000}
// provider:"log" — сынақ режимі (ештеңе жібермейді, тек журналға жазады)
const WA_CFG = path.join(DATA_DIR, "wa.json");
let waDay = "", waCount = 0;
function waConf() { try { return JSON.parse(fs.readFileSync(WA_CFG, "utf8")); } catch (e) { return null; } }
function httpsPostJson(host, pth, headers, obj) {
  return new Promise((ok, bad) => {
    const data = JSON.stringify(obj);
    const rq = https.request({ host, path: pth, method: "POST", headers: Object.assign({ "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) }, headers) }, r => {
      let b = ""; r.on("data", c => b += c);
      r.on("end", () => { let j = {}; try { j = JSON.parse(b); } catch (e) {} ok({ status: r.statusCode, json: j, raw: b }); });
    });
    rq.on("error", bad); rq.setTimeout(20000, () => rq.destroy(new Error("timeout")));
    rq.write(data); rq.end();
  });
}
// Шаблон айнымалысында жаңа жол, табуляция және 4-тен көп қатар бос орын болмауы керек
function waFlat(t) { return String(t).replace(/[\r\n\t]+/g, " | ").replace(/ {2,}/g, " ").replace(/(\| ){2,}/g, "| ").trim().slice(0, 1000); }
async function waSend(cfg, phone, text, lang) {
  const body = waFlat(text);
  if (cfg.provider === "log") { console.log("WA(dry-run)", phone, lang, body); return { dry: true }; }
  if (cfg.provider !== "cloud") throw new Error("provider unknown");
  const tpl = (cfg.templates || {})[lang === "ru" ? "ru" : "kk"];
  if (!tpl) throw new Error("template not set for " + lang);
  const r = await httpsPostJson("graph.facebook.com", "/" + (cfg.apiVersion || "v21.0") + "/" + cfg.phoneNumberId + "/messages",
    { Authorization: "Bearer " + cfg.token },
    { messaging_product: "whatsapp", to: phone, type: "template",
      template: { name: tpl, language: { code: lang === "ru" ? "ru" : "kk" }, components: [{ type: "body", parameters: [{ type: "text", text: body }] }] } });
  if (r.status >= 300 || r.json.error) { const e = r.json.error || {}; throw new Error("wa " + r.status + ": " + (e.message || r.raw.slice(0, 100)) + (e.code ? " (" + e.code + ")" : "")); }
  return r.json;
}
async function handleWa(req, res, u) {
  const J = { "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return send(res, 204, "");
  const cfg = waConf();
  if (waDay !== today()) { waDay = today(); waCount = 0; }
  if (u.pathname === "/wa/status") return send(res, 200, JSON.stringify({ enabled: !!(cfg && cfg.enabled), provider: cfg && cfg.provider || "", sentToday: waCount, cap: cfg && cfg.dailyCap || 1000 }), J);
  if (req.method !== "POST") return send(res, 405, "method not allowed");
  if (!cfg || !cfg.enabled) return send(res, 503, JSON.stringify({ error: "wa disabled" }), J);
  let b; try { b = JSON.parse(await readBody(req) || "null"); } catch (e) { return send(res, 400, JSON.stringify({ error: "bad json" }), J); }
  const phone = String(b && b.phone || "").replace(/\D/g, ""), text = String(b && b.text || "").trim(), lang = b && b.lang === "ru" ? "ru" : "kk";
  if (!/^7\d{10}$/.test(phone) || !text || text.length > 1500) return send(res, 400, JSON.stringify({ error: "bad phone/text" }), J);
  if (waCount >= (cfg.dailyCap || 1000)) return send(res, 429, JSON.stringify({ error: "daily cap" }), J);
  waCount++;
  try { await waSend(cfg, phone, text, lang); console.log("WA ok", phone.slice(0, 4) + "***" + phone.slice(-2)); return send(res, 200, JSON.stringify({ ok: true }), J); }
  catch (e) { console.log("WA ERR", e.message); return send(res, 502, JSON.stringify({ error: String(e.message).slice(0, 250) }), J); }
}

const server = http.createServer(async (req, res) => {
  try {
    if (ALLOW.length) {
      const ip = (req.socket.remoteAddress || "").replace("::ffff:", "");
      if (ip !== "127.0.0.1" && ip !== "::1" && !ALLOW.some(a => ip.startsWith(a))) return send(res, 403, "forbidden");
    }
    const u = new URL(req.url, "http://x");
    if (u.pathname === "/health") return send(res, 200, "ok");
    if (u.pathname === "/db" || u.pathname === "/db.json" || u.pathname.startsWith("/db/")) return await handleDb(req, res, u);
    if (u.pathname === "/sms" || u.pathname === "/sms/status") return await handleSms(req, res, u);
    if (u.pathname === "/wa" || u.pathname === "/wa/status") return await handleWa(req, res, u);
    if (u.pathname.startsWith("/vendor/")) return serveFile(res, VENDOR_DIR, u.pathname.slice(8));
    return serveFile(res, APP_DIR, u.pathname === "/" ? "index.html" : u.pathname.slice(1));
  } catch (e) { console.log("ERR", e.message); try { send(res, 500, "error"); } catch (_) {} }
});

// ---------- Автоматты сақтық көшірме (күніне 1 рет, 30 күн сақталады) ----------
// BACKUP_DIR — басқа дискіге салынған папка болса жақсы (docker volume). Әдепкі: /data/backups
const BACKUP_DIR = path.resolve(process.env.BACKUP_DIR || path.join(DATA_DIR, "backups"));
const BACKUP_KEEP_DAYS = +process.env.BACKUP_KEEP_DAYS || 30;
function dailyBackup() {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const d = new Date(); const pad = n => String(n).padStart(2, "0");
    const name = "db_" + d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + ".json.gz";
    const f = path.join(BACKUP_DIR, name);
    if (!fs.existsSync(f)) {
      fs.writeFileSync(f + ".tmp", zlib.gzipSync(JSON.stringify(db)));
      fs.renameSync(f + ".tmp", f);
      console.log("Сақтық көшірме жасалды:", f);
    }
    const lim = Date.now() - BACKUP_KEEP_DAYS * 86400000;
    fs.readdirSync(BACKUP_DIR).forEach(n => {
      if (!/^db_.*\.json\.gz$/.test(n)) return;
      const p = path.join(BACKUP_DIR, n);
      if (fs.statSync(p).mtimeMs < lim) fs.unlinkSync(p);
    });
  } catch (e) { console.log("backup қатесі", e.message); }
}
setInterval(dailyBackup, 30 * 60 * 1000).unref();
setTimeout(dailyBackup, 5000).unref();
loadAll();
server.listen(PORT, "0.0.0.0", () => console.log("Наукас сервері: http://0.0.0.0:" + PORT + "  | деректер: " + DATA_DIR));
