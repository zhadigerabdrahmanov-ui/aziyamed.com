exec(open('/tmp/ord/t3.py').read().split("with sync_playwright")[0])
base={"gender":"м","inList":True,"dob":"05.03.1980"}
put("rpn_baza",{
 "900101300201":dict(base,fio="Бір Сақтанбаған",uchastok="Участок №5",contacts="87071234567",insuranceStatus="Не застрахован"),
 "900101300202":dict(base,fio="Екі Сақтанған",uchastok="Участок №5",contacts="87071234568",insuranceStatus="Застрахован"),
 "900101300203":dict(base,fio="Үш Телефонсыз",uchastok="Участок №6",contacts="",insuranceStatus="Не застрахован"),
 "900101300204":dict(base,fio="Төрт Сақтандырылмаған",uchastok="Участок №6",contacts="87771234569",insuranceStatus="Сақтандырылмаған")})
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={"width":1280,"height":1000})
    errs=[]; pg.on("pageerror",lambda e:errs.append(str(e))); pg.on("dialog",lambda d:d.accept())
    pg.goto(B+"/"); pg.evaluate("localStorage.setItem('nz_session', JSON.stringify({iin:'222222222222',fio:'Мед',role:'nurse',uchastok:'5',uchList:[5,6]}))"); pg.reload(); pg.wait_for_timeout(2500)
    pg.evaluate("loadUchTable()"); pg.wait_for_timeout(2500)
    pg.evaluate("ntfOpen()"); pg.wait_for_timeout(3500)
    pg.evaluate("NTF.kinds.u=true; ntfRender()"); pg.wait_for_timeout(800)
    print(pg.inner_text("#uchRepOverlay")[:900].replace("\n"," | "))
    print(pg.evaluate("ntfMsg(NTF.list.find(o=>o.iin==='900101300201'),'kz')"))
    print(pg.evaluate("ntfMsg(NTF.list.find(o=>o.iin==='900101300201'),'ru')")[:400])
    print(pg.evaluate("NTF.list.map(o=>o.iin+\":\"+o.phones.length).join(\" \")"), pg.evaluate("document.getElementById(\"ntfScroll\").previousElementSibling.previousElementSibling.innerText")); pg.screenshot(path="/tmp/ord/v117.png"); print(errs); b.close()
