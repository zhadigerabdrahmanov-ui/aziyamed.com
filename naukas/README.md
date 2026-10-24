# Науқас жолдамасы — v118 (толық жинақ)

- `source/naukas_zholdamasy_v118_source.html` — клиенттің бастапқы (исходный) файлы; редакциялау осында жасалады.
- `source/ind_mod.js` — «Көрсеткіштер» модулінің бастапқы коды (v115).
- `server/` — NAS/Docker-ге орнатылатын пакет: `server.js`, `build.js`, `migrate.js`, `Dockerfile`, `docker-compose*.yml`,
  `app/index.html` (жиналған клиент), `vendor/` (xlsx, exceljs), құжаттар `README_KZ.md`, `ADMIN_NAS.md`, `SMS_KZ.md`, `WA_KZ.md`.
- `tests/` — Playwright (Python) сынақтары: `t3.py` — ортақ бөлік (put, B), `t28`–`t32` — соңғы мүмкіндіктер.
- `kmis_to_naukas_sync.user.js` — КМИС (reg-tur.dmed.kz) → платформа, Tampermonkey скрипті.

Жинау: `cd server && node build.js ../source/naukas_zholdamasy_v118_source.html` → `server/app/index.html`.
Сынақ сервері: `PORT=8099 node server.js`, содан соң `python3 tests/t32.py`.
