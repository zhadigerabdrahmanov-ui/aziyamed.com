import json, urllib.request, time
from playwright.sync_api import sync_playwright
B="http://localhost:8099"
def put(p,d):
    r=urllib.request.Request(B+"/db/"+p+".json",data=json.dumps(d).encode(),method="PUT"); urllib.request.urlopen(r).read()
iso=lambda days: time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(time.time()-days*86400))
put("staff",{"111111111111":{"fio":"Дәрігер Тест","role":"doctor","uchastok":"5"}})
put("referrals/r1",{"iin":"900101300123","fio":"Иванов Иван","dob":"1975-03-02","uchastok":"5","doctorIin":"111111111111","doctorName":"Дәрігер Тест","referredAt":iso(0),"referredByName":"Регистратор","status":"жаңа","date":"2026-10-15","time":"10:00"})
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={"width":1300,"height":1500}); pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(B+"/"); pg.evaluate("""localStorage.setItem('nz_session', JSON.stringify({iin:'111111111111',fio:'Дәрігер Тест',role:'doctor',uchastok:'5'}))""")
    pg.reload(); pg.wait_for_timeout(2500)
    pg.evaluate("openReferral('r1')"); pg.wait_for_timeout(1200)
    pg.fill("#diagMkb","I10"); pg.click("text=Протоколдан іздеу >> nth=0"); pg.wait_for_timeout(1500)
    print(pg.inner_text("#ordProtoBox")[:600])
    pg.locator("#docDetailBox").screenshot(path="s7.png")
    pg.click(".ord-chip.on >> nth=0")   # remove one
    pg.click("text=Жолдама беру"); pg.wait_for_timeout(1500)
    print(pg.inner_text("#ordDocList"))
    print(json.loads(urllib.request.urlopen(B+"/db/orders.json").read())[next(iter(json.loads(urllib.request.urlopen(B+"/db/orders.json").read())))])
    b.close()
print("ERRS",errs)
