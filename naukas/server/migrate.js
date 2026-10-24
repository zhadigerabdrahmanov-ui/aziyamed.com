// Firebase → жергілікті сервер. Қолданылуы:
//   node migrate.js [firebase_url] [local_url]
// Әдепкі: Азия мед-МО Firebase → http://localhost:8080/db. Деректерді бірнеше рет көшіруге болады (қайта жазады).
const FB = (process.argv[2] || "https://aziyamed-b0714-default-rtdb.asia-southeast1.firebasedatabase.app").replace(/\/$/, "");
const LOCAL = (process.argv[3] || "http://localhost:8080/db").replace(/\/$/, "");
(async () => {
  const top = await (await fetch(FB + "/.json?shallow=true")).json();
  const keys = Object.keys(top || {});
  console.log("Firebase-те жоғарғы деңгей:", keys.join(", "));
  for (const k of keys) {
    const t0 = Date.now();
    const data = await (await fetch(FB + "/" + k + ".json")).json();
    const r = await fetch(LOCAL + "/" + k + ".json", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const sz = (JSON.stringify(data) || "").length;
    console.log((r.ok ? "OK  " : "ҚАТЕ") + " " + k + "  " + (sz / 1048576).toFixed(2) + " МБ  " + (Date.now() - t0) + " мс");
  }
  console.log("Дайын. Тексеру: " + LOCAL.replace("/db", "") + "/health");
})().catch(e => { console.log("Қате:", e.message); process.exit(1); });
