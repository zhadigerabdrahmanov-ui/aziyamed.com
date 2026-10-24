// Қолданылуы: node build.js <naukas_zholdamasy_….html>   →   app/index.html
// Firebase мекенжайын жергілікті /db-ге, cdnjs кітапханаларын /vendor-ға ауыстырады.
const fs = require("fs"), path = require("path");
const src = process.argv[2]; if (!src) { console.log("HTML файлын көрсетіңіз"); process.exit(1); }
let s = fs.readFileSync(src, "utf8");
function rep(a, b) { const n = s.split(a).length - 1; if (n !== 1) { console.log("ҚАТЕ: табылмады/қайталанады:", a.slice(0, 60), n); process.exit(1); } s = s.replace(a, b); }
rep('const DB_URL = "https://aziyamed-b0714-default-rtdb.asia-southeast1.firebasedatabase.app";', 'const DB_URL = location.origin + "/db";');
rep("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js", "/vendor/xlsx.full.min.js");
rep("https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js", "/vendor/exceljs.min.js");
fs.mkdirSync(path.join(__dirname, "app"), { recursive: true });
fs.writeFileSync(path.join(__dirname, "app", "index.html"), s);
console.log("дайын: app/index.html (" + (s.length / 1048576).toFixed(1) + " МБ)");
