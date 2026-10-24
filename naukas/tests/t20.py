exec(open('/tmp/ord/t3.py').read().split("with sync_playwright")[0])
put("staff",{"111111111111":{"fio":"Дәрігер Үш","role":"doctor","uchastok":"3"},"555555555555":{"fio":"Жаппар Бибіфатима","role":"doctor","uchastok":"5"}})
base={"gender":"м","inList":True,"contacts":"87071234567","dob":"05.03.1960","uchastok":"3 общей практики"}
put("rpn_baza",{"900101300201":dict(base,fio="Тест Пациент Иванович")})
iso=lambda d: time.strftime("%Y-%m-%dT%H:%M:%S.000Z",time.gmtime(time.time()-d*86400))
def O(i,doc,name,doci):
    put("orders/o%d"%i,{"referralId":"r","iin":"900101300201","fio":"Тест","uchastok":"3 общей практики","doctorIin":doci,"doctorName":doc,"kind":"lab","name":name,"createdAt":iso(0)})
O(1,"Дәрігер Үш","ЖҚА","111111111111"); O(2,"Жаппар Бибіфатима","ЖҚА-ЧУЖОЙ","555555555555")
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={"width":1280,"height":1500})
    errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(B+"/"); pg.evaluate("localStorage.setItem('nz_session', JSON.stringify({iin:'222222222222',fio:'Медбике Тест',role:'nurse',uchastok:'3',uchList:[3]}))"); pg.reload(); pg.wait_for_timeout(1500); pg.evaluate("loadUchTable()"); pg.wait_for_timeout(2500); pg.evaluate("nurseDashRender()"); pg.wait_for_timeout(4000)
    print("nurse dash:", pg.evaluate("[...document.querySelectorAll('#ndOrd .nd-chip.k')].map(s=>s.innerText)"))
    print("nurse tab:", pg.evaluate("ordFetch().then(()=>ordScope(ORD.all).map(o=>o.name))"))
    pg.evaluate("localStorage.setItem('nz_session', JSON.stringify({iin:'555555555555',fio:'Жаппар',role:'doctor',uchastok:'5'}))"); pg.reload(); pg.wait_for_timeout(2000)
    print("doctor5:", pg.evaluate("ordFetch().then(()=>ordScope(ORD.all).map(o=>o.name))"))
    pg.evaluate("localStorage.setItem('nz_session', JSON.stringify({iin:'333333333333',fio:'Эксперт',role:'expert'}))"); pg.reload(); pg.wait_for_timeout(2000)
    print("expert:", pg.evaluate("ordFetch().then(()=>ordScope(ORD.all).map(o=>o.name))"))
    print(errs); b.close()
