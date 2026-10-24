exec(open('/tmp/ord/t3.py').read().split("with sync_playwright")[0])
import re
from playwright.sync_api import sync_playwright
KZ=r"[А-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі]+"
def left(t): return sorted(set(w for w in re.findall(KZ,t) if re.search(r"[ӘәҒғҚқҢңӨөҰұҮүҺһІі]",w)))
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={"width":1300,"height":900})
    pg.on("dialog",lambda d:(print("DIALOG:",d.message[:120].replace("\n"," / ")), d.dismiss()))
    pg.goto(B+"/")
    pg.evaluate("localStorage.setItem('nz_lang','ru');localStorage.setItem('nz_session', JSON.stringify({iin:'333333333333',fio:'Эксперт Тест',role:'expert'}))"); pg.reload(); pg.wait_for_timeout(2000)
    print(pg.inner_text("#nxBrief").replace("\n"," | "))
    for t in ["aud","stf"]:
        pg.click("#tabBtn-"+t); pg.wait_for_timeout(1300); txt=pg.inner_text("#panel-"+t); print(t,txt[:330].replace("\n"," | ")); print(" left:",left(txt))
    pg.evaluate("nxStfForm()"); print(pg.inner_text("#ordOverlay")[:300].replace("\n"," | ")); pg.evaluate("ordOvClose()")
    pg.evaluate("ordReport()"); pg.wait_for_timeout(1500); txt=pg.inner_text("#ordOverlay"); print("rep left:",left(txt))
    b.close()
