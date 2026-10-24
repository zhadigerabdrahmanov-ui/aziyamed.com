import json,urllib.request,time
exec(open('/tmp/ord/t3.py').read().split("with sync_playwright")[0])
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={"width":1300,"height":900})
    errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(B+"/"); pg.wait_for_timeout(500)
    print("login kz:",pg.inner_text("#loginScreen")[:120].replace("\n"," | "))
    pg.click(".nz-login"); pg.wait_for_timeout(300)
    print("login ru:",pg.inner_text("#loginScreen")[:160].replace("\n"," | "))
    pg.evaluate("""localStorage.setItem('nz_session', JSON.stringify({iin:'111111111111',fio:'Дәрігер Тест',role:'doctor',uchastok:'5'}))"""); pg.reload(); pg.wait_for_timeout(1500)
    print("persist:",pg.evaluate("nzLang()"))
    print("tabs:",pg.inner_text(".tabs").replace("\n"," | "))
    pg.click("#tabBtn-ord"); pg.wait_for_timeout(1200)
    print("ord:",pg.inner_text("#panel-ord")[:400].replace("\n"," | "))
    pg.screenshot(path="/tmp/ord/ru1.png")
    pg.click(".session-box .nz-lang"); pg.wait_for_timeout(400)
    print("back kz:",pg.inner_text(".tabs").replace("\n"," | "))
    print(errs); b.close()
