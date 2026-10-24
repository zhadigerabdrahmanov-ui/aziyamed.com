exec(open('/tmp/ord/t3.py').read().split("with sync_playwright")[0])
base={"gender":"м","uchastok":"Участок №5","inList":True,"contacts":"87071234567"}
rp={}
for i in range(1,16): rp["9001013002%02d"%i]=dict(base,fio="Тест Диспансер%d Иванович"%i,dob="05.03.1960")
rp["900101300303"]=dict(base,fio="Тест Малыш Иванович",dob="17.10.2024"); rp["900101300301"]=dict(base,fio="Тест Школьник Иванович",dob="05.03.2018")
rp["900101300302"]=dict(base,fio="Тест Взрослый Иванович",dob="26.10.1976")  # due soon
put("rpn_baza",rp)
put("dispan",{"9001013002%02d"%i:{"c":["E11.9"],"g":["СД"],"u":"5"} for i in range(1,16)})
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={"width":1280,"height":1400})
    errs=[]; pg.on("pageerror",lambda e:errs.append(str(e))); pg.on("console",lambda m: errs.append(m.text) if m.type=="warning" else 0)
    pg.goto(B+"/"); pg.evaluate("localStorage.setItem('nz_session', JSON.stringify({iin:'222222222222',fio:'Медбике Тест',role:'nurse',uchastok:'5',uchList:[5]}))"); pg.reload(); pg.wait_for_timeout(1500); pg.evaluate("loadUchTable()"); pg.wait_for_timeout(2500); pg.evaluate("nurseDashRender()"); pg.wait_for_timeout(4000)
    print(pg.evaluate("document.querySelectorAll('#nd56 .nd-p').length"), pg.evaluate("[...document.querySelectorAll('#nd56 .nd-stat')].map(s=>s.innerText.replace(/\\n/g,' ')).join(' | ')"))
    pg.evaluate("ntfOpened(10)"); pg.evaluate("ntfMark(10,true)"); pg.wait_for_timeout(1200)
    print(pg.evaluate("[...document.querySelectorAll('#nd56 .nd-stat')].map(s=>s.innerText.replace(/\\n/g,' ')).join(' | ')"))
    pg.locator("#nd56").screenshot(path="/tmp/ord/v102_56.png")
    pg.emulate_media(color_scheme="dark"); pg.evaluate("setTheme('dark')"); pg.locator("#nd56").screenshot(path="/tmp/ord/v102_56d.png")
    print(errs); b.close()
