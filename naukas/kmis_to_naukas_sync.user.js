// ==UserScript==
// @name         КМИС → Наукас: авто-перенос записанных пациентов к врачам
// @namespace    aziyamed
// @version      1.0.0
// @description  Читает записи пациентов в «Электронной регистратуре» (reg-tur.dmed.kz) и сам создаёт направления к нашим врачам в платформе Наукас. Только читает КМИС, ничего в нём не меняет.
// @match        https://reg-tur.dmed.kz/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      192.168.0.224
// @connect      aziyamed-b0714-default-rtdb.asia-southeast1.firebasedatabase.app
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  // ============ НАСТРОЙКИ ============
  // Куда писать направления. Выберите ОДНУ строку (ту базу, которой реально пользуются врачи):
  const DB_URL = "http://192.168.0.224:8088/db";                                        // сервер клиники (NAS)
  // const DB_URL = "https://aziyamed-b0714-default-rtdb.asia-southeast1.firebasedatabase.app"; // Firebase (aziyamed.com)

  const INTERVAL_MIN = 5;        // как часто синхронизировать (минуты)
  const RPN_CACHE_HOURS = 12;    // как часто обновлять индекс РПН (ФИО+дата рождения → ИИН)
  const TOUR_DEFAULT = false;    // автоматический обход врачей в КМИС (включается кнопкой в панели)
  // ====================================

  const isTop = window.top === window;
  const LOGP = "[КМИС→Наукас] ";

  // ---------- GM обёртки ----------
  const gmGet = (k, d) => { try { const v = GM_getValue(k); return v === undefined ? d : v; } catch (e) { return d; } };
  const gmSet = (k, v) => { try { GM_setValue(k, v); } catch (e) {} };

  function http(method, path, body) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: method, url: DB_URL + "/" + path + ".json",
        headers: { "Content-Type": "application/json" },
        data: body === undefined ? undefined : JSON.stringify(body),
        timeout: 60000,
        onload: r => { try { resolve(JSON.parse(r.responseText)); } catch (e) { reject(new Error("bad json")); } },
        onerror: () => reject(new Error("нет связи с базой")), ontimeout: () => reject(new Error("таймаут базы"))
      });
    });
  }
  const dbGet = p => http("GET", p);
  const dbPush = (p, d) => http("POST", p, d);

  // ---------- Нормализация ----------
  const up = s => String(s || "").toUpperCase().replace(/Ё/g, "Е").replace(/\s+/g, " ").trim();
  function isoDob(s) {
    s = String(s || "");
    let m = s.match(/(\d{4})-(\d{2})-(\d{2})/); if (m) return m[1] + "-" + m[2] + "-" + m[3];
    m = s.match(/(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})/); if (m) return m[3] + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0");
    return "";
  }
  function dmyToIso(s) { return isoDob(s); }
  function nameParts(fio) {   // Фамилия / Имя / Отчество (или инициалы)
    const t = up(fio).replace(/\./g, ". ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
    let s = t[0] || "", n = t[1] || "", p = t[2] || "";
    if (n.indexOf(".") > 0 && n.length > 2) { const q = n.split("."); n = q[0]; p = q[1] || p; }
    return { s: s, n: n.replace(/\./g, ""), p: p.replace(/\./g, "") };
  }
  const todayIso = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };

  // ---------- Разбор страницы КМИС ----------
  function docOf(win) { try { return win.document; } catch (e) { return null; } }

  function findHeading(doc) {
    // «Отделение…, БУРИБАЕВА С.С. 5, БУРИБАЕВА САУЛЕШ САГИМАНОВНА, 15.10.2026»
    const els = doc.querySelectorAll("div,span,td,h1,h2,h3,b");
    for (const el of els) {
      if (el.children.length > 3) continue;
      const t = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (t.length < 15 || t.length > 260) continue;
      if (!/,\s*\d{2}\.\d{2}\.\d{4}$/.test(t)) continue;
      const parts = t.split(",").map(x => x.trim());
      if (parts.length < 3) continue;
      const date = dmyToIso(parts[parts.length - 1]);
      const docFull = parts[parts.length - 2];
      if (!date || !/[A-Za-zА-Яа-яӘәІіҢңҒғҮүҰұҚқӨөҺһ]/.test(docFull)) continue;
      return { date: date, docFull: docFull, sched: parts[parts.length - 3] || "", raw: t };
    }
    return null;
  }

  const TIME_RX = /(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/g;
  function scrapeCards(doc) {
    // карточка занятого слота: «09:00-09:15 [65] ФАМИЛИЯ ИМЯ ОТЧЕСТВО 28.07.1961 … Приём: …»
    const out = [], seen = new Set();
    const all = doc.body ? doc.body.querySelectorAll("div,li,tr,section,article") : [];
    for (const el of all) {
      const txt = (el.innerText || "").replace(/\s+/g, " ").trim();
      if (txt.length < 20 || txt.length > 600) continue;
      const times = txt.match(TIME_RX); if (!times || times.length !== 1) continue;
      if (!/^\d{2}:\d{2}\s*-\s*\d{2}:\d{2}/.test(txt)) continue;
      const m = txt.match(/^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})\s*(?:\d{1,3}\s+)?(.+?)\s+(\d{2}\.\d{2}\.\d{4})/);
      if (!m) continue;
      const key = m[1] + "|" + m[3] + "|" + m[4];
      if (seen.has(key)) continue; seen.add(key);
      const vt = txt.match(/Приём:\s*(.+?)(?:\s+Подробнее|\s+Не оплачено|\s+Выполнено|$)/i);
      out.push({ time: m[1], name: m[3].trim(), dob: dmyToIso(m[4]), visit: vt ? vt[1].trim() : "" });
    }
    return out;
  }

  function scanCurrentView() {
    // страница может быть в iframe: заголовок ищем в этом документе, затем в родителе
    const docs = [document]; try { if (window.parent && window.parent !== window) docs.push(window.parent.document); } catch (e) {}
    let head = null, cards = [];
    for (const d of docs) { if (!head) head = findHeading(d); }
    cards = scrapeCards(document);
    if (!cards.length && docs[1]) cards = scrapeCards(docs[1]);
    return { head: head, cards: cards };
  }

  // ---------- Справочники нашей платформы ----------
  let STAFF = null;
  async function loadStaff() {
    const o = (await dbGet("staff")) || {}; STAFF = [];
    Object.keys(o).forEach(k => { const s = o[k]; if (s && s.role === "doctor" && !s.disabled) STAFF.push({ iin: k, fio: s.fio || "", uch: s.uchastok || "", np: nameParts(s.fio) }); });
    return STAFF;
  }
  function matchDoctor(docFull) {
    const np = nameParts(docFull);
    let c = STAFF.filter(s => s.np.s === np.s && s.np.n[0] === np.n[0]);
    if (c.length > 1 && np.p) { const c2 = c.filter(s => !s.np.p || s.np.p[0] === np.p[0]); if (c2.length) c = c2; }
    return c.length === 1 ? c[0] : null;
  }

  let RPN = null;   // "ДР|ФАМИЛИЯ|ИМЯ" → [{iin,fio,dob,gender,uch}]
  async function loadRpn() {
    const age = Date.now() - gmGet("rpnAt", 0);
    if (!RPN) {
      const cached = gmGet("rpnIdx", ""); if (cached) { try { RPN = JSON.parse(cached); } catch (e) { RPN = null; } }
    }
    if (RPN && age < RPN_CACHE_HOURS * 3600000) return RPN;
    status("Загружаю список РПН (один раз в " + RPN_CACHE_HOURS + " ч)…");
    const base = (await dbGet("rpn_baza")) || {}; const idx = {};
    Object.keys(base).forEach(iin => {
      const r = base[iin]; if (!r || !r.fio) return;
      const np = nameParts(r.fio), d = isoDob(r.dob); if (!d) return;
      const k = d + "|" + np.s + "|" + np.n;
      (idx[k] = idx[k] || []).push({ iin: iin, fio: r.fio, dob: r.dob || "", gender: r.gender || "", uch: r.uchastok || "", inList: r.inList !== false });
    });
    RPN = idx; gmSet("rpnIdx", JSON.stringify(idx)); gmSet("rpnAt", Date.now());
    return RPN;
  }
  function matchPatient(card) {
    const np = nameParts(card.name);
    const c = (RPN[card.dob + "|" + np.s + "|" + np.n] || []);
    if (c.length === 1) return c[0];
    if (c.length > 1 && np.p) { const c2 = c.filter(x => nameParts(x.fio).p === np.p); if (c2.length === 1) return c2[0]; }
    return null;
  }

  // ---------- Синхронизация ----------
  const LOG = [];
  function log(msg) { LOG.unshift(new Date().toLocaleTimeString("ru-RU") + " " + msg); LOG.length = Math.min(LOG.length, 40); render(); console.log(LOGP + msg); }
  let busy = false;
  const rev = () => JSON.parse(gmGet("review", "{}"));
  const impd = () => JSON.parse(gmGet("imported", "{}"));

  async function syncView(sc) {
    const head = sc.head;
    if (!head) return { ok: false, why: "не вижу заголовок врача/даты (откройте график врача: «Свободно: N»)" };
    if (!sc.cards.length) return { ok: true, n: 0, created: 0, review: 0, doc: head.docFull };
    if (head.date < todayIso()) return { ok: true, n: sc.cards.length, created: 0, review: 0, doc: head.docFull, skipped: "прошедшая дата" };
    const doc = matchDoctor(head.docFull);
    const review = rev(), imported = impd();
    let created = 0, nrev = 0;
    if (!doc) {
      sc.cards.forEach(c => { review["nodoc|" + head.docFull + "|" + head.date + "|" + c.time] = { why: "врач не найден в Наукас", doc: head.docFull, date: head.date, time: c.time, name: c.name, dob: c.dob }; nrev++; });
      gmSet("review", JSON.stringify(review));
      return { ok: true, n: sc.cards.length, created: 0, review: nrev, doc: head.docFull, why: "врач не найден" };
    }
    let existing = null;   // направления в Наукас — загружаем только если есть новые
    for (const c of sc.cards) {
      const kkey = [head.date, c.time, doc.iin, c.name, c.dob].join("|");
      if (imported[kkey]) continue;
      const p = matchPatient(c);
      if (!p) { review[kkey] = { why: "пациент не найден в РПН (ФИО + дата рождения)", doc: doc.fio, date: head.date, time: c.time, name: c.name, dob: c.dob }; nrev++; continue; }
      if (!existing) existing = (await dbGet("referrals")) || {};
      const dup = Object.keys(existing).some(k => { const r = existing[k]; return r && r.iin === p.iin && r.doctorIin === doc.iin && r.date === head.date && r.status !== "келмеді"; });
      if (dup) { imported[kkey] = 1; delete review[kkey]; continue; }
      const now = new Date();
      const ref = {
        iin: p.iin, fio: p.fio, dob: p.dob, gender: p.gender, uchastok: p.uch, dispan: "",
        referredByIin: "kmis-sync", referredByName: "КМИС (авто)", referredAt: now.toISOString(), referredAtDisplay: now.toLocaleString("kk-KZ"),
        doctorIin: doc.iin, doctorName: doc.fio, date: head.date, time: c.time, status: "жаңа", diagnosisText: "", mkbCode: "", closedAt: null, closedByName: null,
        source: "kmis", kmisVisit: c.visit || ""
      };
      await dbPush("referrals", ref);
      try { await dbPush("audit/" + todayIso(), { t: now.toISOString(), iin: "kmis-sync", fio: "КМИС-синхронизация", role: "system", act: "ref_new", info: p.fio + " · уч. " + p.uch + " → " + doc.fio + " " + head.date + " " + c.time }); } catch (e) {}
      imported[kkey] = 1; delete review[kkey]; created++;
    }
    gmSet("imported", JSON.stringify(imported)); gmSet("review", JSON.stringify(review));
    return { ok: true, n: sc.cards.length, created: created, review: nrev, doc: doc.fio };
  }

  async function syncNow(manual) {
    if (!isTop && !window.__kmisFrameOk) { /* фреймы тоже могут содержать расписание — работаем и в них */ }
    if (busy) return; busy = true;
    try {
      status("Синхронизация…");
      await loadStaff(); await loadRpn();
      const r = await syncView(scanCurrentView());
      if (!r.ok) { status(r.why); if (manual) log("⚠ " + r.why); }
      else {
        const msg = (r.doc || "—") + ": записей " + r.n + ", создано направлений " + r.created + (r.review ? ", на проверку " + r.review : "") + (r.skipped ? " (" + r.skipped + ")" : "") + (r.why ? " — " + r.why : "");
        if (r.created || r.review || manual) log(msg);
        status("Готово " + new Date().toLocaleTimeString("ru-RU"));
      }
      gmSet("lastRun", Date.now());
    } catch (e) { status("Ошибка: " + e.message); log("✖ " + e.message); }
    busy = false; render();
  }

  // ---------- Обход врачей (по желанию; только просмотр расписаний) ----------
  const SKIP_WORDS = /запис|талон|печать|контакт|оплач|свободно|занято|забронир|перерыв|вернуться/i;
  function doctorListItems() {
    const sc = scanCurrentView(); if (!sc.head) return [];
    const full = up(sc.head.docFull);
    let el = null;
    for (const e of document.querySelectorAll("div,li,td")) {
      if (e.children.length > 6) continue;
      const t = up(e.textContent); if (t.indexOf(full) !== 0 || t.length > full.length + 60) continue;
      if (SKIP_WORDS.test(e.textContent)) continue; el = e; break;
    }
    if (!el) return [];
    const par = el.parentElement; if (!par) return [];
    return Array.from(par.children).filter(x => x.tagName === el.tagName && x.textContent.length < 120 && !SKIP_WORDS.test(x.textContent));
  }
  async function tour() {
    const items = doctorListItems(); if (!items.length) { log("Обход: список врачей не найден (см. «Диагностика»)"); return; }
    log("Обход: врачей на странице " + items.length);
    for (let i = 0; i < items.length; i++) {
      const fresh = doctorListItems(); const it = fresh[i]; if (!it) break;
      it.click(); await new Promise(r => setTimeout(r, 2500));
      await syncNow(false);
    }
  }

  // ---------- Диагностика (без данных пациентов) ----------
  function diag() {
    const sc = scanCurrentView();
    const items = doctorListItems();
    const info = [
      "Заголовок: " + (sc.head ? "найден (" + sc.head.date + ", врач «" + sc.head.docFull + "»)" : "НЕ найден"),
      "Карточек записей: " + sc.cards.length + (sc.cards[0] ? " (пример времени: " + sc.cards[0].time + ")" : ""),
      "Врачей в списке слева: " + items.length,
      "Фреймов на странице: " + document.querySelectorAll("iframe").length + (isTop ? " (я в основном окне)" : " (я во фрейме)"),
      "Врач найден в Наукас: " + (sc.head && STAFF ? (matchDoctor(sc.head.docFull) ? "да" : "нет") : "?"),
      "РПН-индекс: " + (RPN ? Object.keys(RPN).length + " ключей" : "не загружен")
    ];
    info.forEach(x => log("ДИАГ " + x));
  }

  // ---------- Панель ----------
  let panel, statusEl;
  function status(t) { if (statusEl) statusEl.textContent = t; }
  function render() {
    if (!isTop || !panel) return;
    const rv = rev(), keys = Object.keys(rv);
    panel.querySelector("#kmsLog").innerHTML = LOG.slice(0, 8).map(x => "<div>" + x.replace(/</g, "&lt;") + "</div>").join("");
    panel.querySelector("#kmsRev").innerHTML = keys.length ? "<b>На проверку вручную (" + keys.length + "):</b>" + keys.slice(0, 12).map(k => { const r = rv[k]; return "<div>• " + (r.date || "") + " " + (r.time || "") + " " + String(r.name || "").replace(/</g, "&lt;") + " " + (r.dob || "") + " — " + r.why + "</div>"; }).join("") + '<div><a href="#" id="kmsClr">очистить список</a></div>' : "";
    const cl = panel.querySelector("#kmsClr"); if (cl) cl.onclick = e => { e.preventDefault(); gmSet("review", "{}"); render(); };
    panel.querySelector("#kmsTour").textContent = "Обход врачей: " + (gmGet("tour", TOUR_DEFAULT) ? "ВКЛ" : "выкл");
  }
  function buildPanel() {
    if (!isTop) return;
    panel = document.createElement("div");
    panel.style.cssText = "position:fixed;right:10px;bottom:36px;z-index:99999;background:#fff;border:2px solid #2d7a2d;border-radius:10px;padding:8px 10px;font:12px/1.35 Arial,sans-serif;color:#223;width:330px;box-shadow:0 4px 14px rgba(0,0,0,.25);";
    panel.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;"><b style="color:#2d7a2d;">КМИС → Наукас</b><a href="#" id="kmsMin" style="text-decoration:none;">▁</a></div>' +
      '<div id="kmsBody"><div id="kmsSt" style="margin:4px 0;color:#556;">Запуск…</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin:4px 0;"><button id="kmsNow">Синхронизировать сейчас</button><button id="kmsTour"></button><button id="kmsDiag">Диагностика</button></div>' +
      '<div id="kmsLog" style="max-height:110px;overflow:auto;border-top:1px solid #eee;padding-top:4px;"></div><div id="kmsRev" style="margin-top:4px;color:#a35a00;"></div>' +
      '<div style="color:#889;margin-top:4px;">База: ' + DB_URL.replace(/^https?:\/\//, "").slice(0, 38) + '</div></div>';
    document.body.appendChild(panel);
    statusEl = panel.querySelector("#kmsSt");
    panel.querySelector("#kmsMin").onclick = e => { e.preventDefault(); const b = panel.querySelector("#kmsBody"); b.style.display = b.style.display === "none" ? "" : "none"; };
    panel.querySelector("#kmsNow").onclick = () => syncNow(true);
    panel.querySelector("#kmsDiag").onclick = async () => { try { await loadStaff(); await loadRpn(); } catch (e) {} diag(); };
    panel.querySelector("#kmsTour").onclick = () => { gmSet("tour", !gmGet("tour", TOUR_DEFAULT)); render(); };
    render();
  }

  // ---------- Запуск ----------
  buildPanel();
  async function loop() {
    if (gmGet("tour", TOUR_DEFAULT) && isTop) await tour(); else await syncNow(false);
  }
  setTimeout(loop, 6000);
  setInterval(loop, INTERVAL_MIN * 60000);
  // быстро реагируем, когда пользователь сам открыл график другого врача/дня
  let lastSig = "";
  setInterval(() => {
    if (busy) return;
    const sc = scanCurrentView(); if (!sc.head || !sc.cards.length) return;
    const sig = sc.head.date + "|" + sc.head.docFull + "|" + sc.cards.length;
    if (sig !== lastSig) { lastSig = sig; syncNow(false); }
  }, 8000);
})();
