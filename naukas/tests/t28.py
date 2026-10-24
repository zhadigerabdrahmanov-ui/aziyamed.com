exec(open('/tmp/ord/t3.py').read().split("with sync_playwright")[0])
base={"gender":"м","inList":True,"contacts":"87071234567","dob":"05.03.1960"}
put("rpn_baza",{"900101300201":dict(base,fio="Тест Бес Иванович",uchastok="Участок №5")})
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={"width":1280,"height":1000})
    errs=[]; pg.on("pageerror",lambda e:errs.append(str(e))); pg.on("console",lambda m: errs.append(m.text) if m.type in("warning","error") else 0)
    pg.goto(B+"/"); pg.evaluate("localStorage.setItem('nz_session', JSON.stringify({iin:'222222222222',fio:'Медбике Тест',role:'nurse',uchastok:'5',uchList:[5]}))"); pg.reload(); pg.wait_for_timeout(1500); pg.evaluate("loadUchTable()"); pg.wait_for_timeout(2500); pg.evaluate("nurseDashRender()"); pg.wait_for_timeout(4000)
    print(pg.evaluate("[...document.querySelectorAll('.nd-tile')].map(t=>t.innerText.replace(/\\n/g,' ')).join(' | ')"))
    for k in range(1,8):
        pg.evaluate("ndTab(%d)"%k); pg.wait_for_timeout(300)
        print(k, pg.evaluate("[...document.querySelectorAll('#nurseDash [data-ndp]')].filter(e=>e.offsetParent).map(e=>e.dataset.ndp).join(',')"))
    pg.evaluate("ndTab(1)"); pg.locator("#nurseDash").screenshot(path="/tmp/ord/v114a.png")
    pg.evaluate("document.documentElement.dataset.theme='dark'"); pg.evaluate("ndTab(6)"); pg.locator("#nurseDash").screenshot(path="/tmp/ord/v114b.png")
    print(errs); b.close()
