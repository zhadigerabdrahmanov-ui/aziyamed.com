import json, urllib.request, time
from playwright.sync_api import sync_playwright
B="http://localhost:8099"
def put(p,d):
    r=urllib.request.Request(B+"/db/"+p+".json",data=json.dumps(d).encode(),method="PUT"); urllib.request.urlopen(r).read()
iso=lambda days: time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(time.time()-days*86400))
put("staff",{"111111111111":{"fio":"Дәрігер Тест","role":"doctor","uchastok":"5"}})
put("referrals/r1",{"iin":"900101300123","fio":"Иванов Иван","uchastok":"5","doctorIin":"111111111111","doctorName":"Дәрігер Тест","referredAt":iso(10),"referredByName":"Регистратор","status":"жабылды","closedAt":iso(10),"closedByName":"Дәрігер Тест","mkbCode":"E11","date":"2026-10-05","time":"10:00"})
put("orders/o1",{"referralId":"r1","iin":"900101300123","fio":"Иванов Иван","uchastok":"5","doctorIin":"111111111111","doctorName":"Дәрігер Тест","kind":"lab","name":"ЖҚА (ОАК)","createdAt":iso(9)})
put("orders/o2",{"referralId":"r1","iin":"900101300123","fio":"Иванов Иван","uchastok":"5","doctorIin":"111111111111","doctorName":"Дәрігер Тест","kind":"spec","name":"Эндокринолог","createdAt":iso(35)})
put("orders/o3",{"referralId":"r1","iin":"900101300123","fio":"Иванов Иван","uchastok":"5","doctorIin":"111111111111","doctorName":"Дәрігер Тест","kind":"lab","name":"HbA1c","createdAt":iso(5),"resultAt":iso(3),"resultByName":"Медбике Тест"})
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1194/chrome-linux/chrome") if False else p.chromium.launch()
    pg=b.new_page(viewport={"width":1300,"height":900}); pg.on("pageerror",lambda e:errs.append(str(e))); pg.on("console",lambda m: errs.append(m.text) if m.type=="error" else None)
    pg.goto(B+"/"); 
    pg.evaluate("""localStorage.setItem('nz_session', JSON.stringify({iin:'222222222222',fio:'Медбике Тест',role:'nurse',uchastok:'',uchList:[5]}))""")
    pg.reload(); pg.wait_for_timeout(2500)
    print("tab:", pg.inner_text("#tabBtn-ord"))
    pg.click("#tabBtn-ord"); pg.wait_for_timeout(1000)
    print(pg.inner_text("#ordBox")[:700])
    pg.screenshot(path="s1.png")
    # arrived o1, view o3
    pg.evaluate("ordMarkArrived('o1')"); pg.wait_for_timeout(800)
    pg.evaluate("ordViewForm('o3')"); pg.wait_for_timeout(300)
    pg.select_option("#ordConcl","ауытқу бар"); pg.fill("#ordNote","глюкоза жоғары")
    pg.click("text=Қарадым, сақтау"); pg.wait_for_timeout(1000)
    pg.screenshot(path="s2.png")
    pg.evaluate("ordRoute('900101300123')"); pg.wait_for_timeout(1000)
    pg.screenshot(path="s3.png")
    print(pg.inner_text("#ordOverlay")[:900])
    pg.evaluate("ordOvClose()")
    pg.evaluate("ordReport()"); pg.wait_for_timeout(1500)
    pg.screenshot(path="s4.png")
    print(pg.inner_text("#ordOverlay")[:1500])
    # doctor view
    pg.evaluate("""localStorage.setItem('nz_session', JSON.stringify({iin:'111111111111',fio:'Дәрігер Тест',role:'doctor',uchastok:'5'}))""")
    pg.reload(); pg.wait_for_timeout(2500)
    pg.evaluate("openReferral('r1')"); pg.wait_for_timeout(1500)
    pg.evaluate("document.getElementById('docDetailCard').scrollIntoView()")
    pg.click(".ord-chip[data-n='Кардиолог']"); pg.fill("#ordFree","Анализ крови на ферритин")
    pg.click("text=+ Жолдама беру") if False else pg.click("text=Жолдама беру")
    pg.wait_for_timeout(1500)
    print(pg.inner_text("#ordDocList"))
    pg.locator("#ordDocBox").screenshot(path="s5.png")
    b.close()
print("ERRS",errs)
