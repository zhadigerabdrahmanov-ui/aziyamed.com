exec(open('/tmp/ord/t3.py').read().split("with sync_playwright")[0])
put("staff/333333333333",{"fio":"Эксперт Тест","role":"expert"})
put("referrals/r2",dict(base,dob="1975-03-02",referredAt=iso(0),referredByName="Регистратура",status="жаңа",date=time.strftime("%Y-%m-%d"),time="11:00"))
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={"width":1280,"height":900})
    errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    for th in ["light","dark"]:
        pg.goto(B+"/"); pg.evaluate("t=>{localStorage.clear();localStorage.setItem('nz_theme',t)}",th); pg.reload(); pg.wait_for_timeout(700)
        pg.screenshot(path=f"/tmp/ord/d_{th}_login.png")
        pg.evaluate("localStorage.setItem('nz_session', JSON.stringify({iin:'333333333333',fio:'Эксперт Тест',role:'expert'}))"); pg.reload(); pg.wait_for_timeout(1500)
        pg.click("#tabBtn-doc"); pg.wait_for_timeout(1000); pg.evaluate("openReferral('r2')"); pg.wait_for_timeout(1500)
        pg.fill("#diagMkb","I10"); pg.click("text=Протоколдан іздеу >> nth=0"); pg.wait_for_timeout(1500)
        pg.screenshot(path=f"/tmp/ord/d_{th}_doc.png",full_page=False)
        pg.click("#tabBtn-ord"); pg.wait_for_timeout(1200); pg.screenshot(path=f"/tmp/ord/d_{th}_ord.png")
    print(errs); b.close()
