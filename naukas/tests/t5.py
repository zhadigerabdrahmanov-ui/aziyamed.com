exec(open('/tmp/ord/t3.py').read().split("with sync_playwright")[0])
import re
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={"width":1300,"height":900})
    pg.goto(B+"/")
    pg.evaluate("""localStorage.setItem('nz_lang','ru');localStorage.setItem('nz_session', JSON.stringify({iin:'111111111111',fio:'Дәрігер Тест',role:'doctor',uchastok:'5'}))"""); pg.reload(); pg.wait_for_timeout(1500)
    put("referrals/r2",dict(base,dob="1975-03-02",referredAt=iso(0),referredByName="Регистратура",status="жаңа",date="2026-10-15",time="11:00"))
    pg.click("#tabBtn-doc"); pg.wait_for_timeout(1000)
    for s in ["#tabBtn-doc"]: pass
    pg.evaluate("document.querySelectorAll('#panel-doc button, #panel-doc .row, #panel-doc tr').forEach(()=>{})")
    t=pg.inner_text("#panel-doc")
    print(t[:600].replace("\n"," | "))
    pg.screenshot(path="/tmp/ord/ru_doc.png")
    pg.click("#tabBtn-ord"); pg.wait_for_timeout(500)
    pg.evaluate("ordReport()"); pg.wait_for_timeout(1200)
    allt=pg.inner_text("body")
    kz=set(w for w in re.findall(r"[А-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі]+",allt) if re.search(r"[ӘәҒғҚқҢңӨөҰұҮүҺһІі]",w))
    print(sorted(kz)[:80])
    b.close()
