import json, urllib.request, time
from playwright.sync_api import sync_playwright
B="http://localhost:8099"
def put(p,d):
    r=urllib.request.Request(B+"/db/"+p+".json",data=json.dumps(d).encode(),method="PUT"); urllib.request.urlopen(r).read()
iso=lambda days: time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(time.time()-days*86400))
put("staff",{"111111111111":{"fio":"Дәрігер Тест","role":"doctor","uchastok":"5"}})
base={"iin":"900101300123","fio":"Иванов Иван","uchastok":"5","doctorIin":"111111111111","doctorName":"Дәрігер Тест"}
put("referrals/r1",dict(base,dob="1975-03-02",referredAt=iso(10),referredByName="Регистратура",status="жабылды",closedAt=iso(10),closedByName="Дәрігер Тест",mkbCode="I10",date="2026-10-05",time="10:00"))
def o(i,**k): put("orders/"+i,dict(base,referralId="r1",createdByName="Дәрігер Тест",**k))
o("o1",kind="lab",name="ЖҚА (ОАК)",createdAt=iso(9),src="хаттама",protoCode="I10")
o("o2",kind="spec",name="Эндокринолог",createdAt=iso(35),src="қолмен")
o("o3",kind="lab",name="HbA1c",createdAt=iso(5),resultAt=iso(3),resultByName="Медбике Тест",src="хаттама",protoCode="I10")
o("o4",kind="instr",name="ЭКГ",createdAt=iso(6),resultAt=iso(5),resultByName="Медбике Тест",viewedAt=iso(4),viewedByName="Медбике Тест",conclusion="қалыпты",src="хаттама",protoCode="I10")
o("o5",kind="lab",name="Липидограмма",createdAt=iso(6),resultAt=iso(5),resultByName="Медбике Тест",viewedAt=iso(4),viewedByName="Медбике Тест",conclusion="ауытқу бар",note="холестерин жоғары — дәрігерге хабарланды",src="хаттама",protoCode="I10")
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={"width":1300,"height":900})
    pg.goto(B+"/")
    pg.evaluate("""localStorage.setItem('nz_session', JSON.stringify({iin:'111111111111',fio:'Дәрігер Тест',role:'doctor',uchastok:'5'}))"""); pg.reload(); pg.wait_for_timeout(2500)
    put("referrals/r2",dict(base,dob="1975-03-02",referredAt=iso(0),referredByName="Регистратура",status="жаңа",date="2026-10-15",time="11:00")); pg.evaluate("openReferral('r2')"); pg.wait_for_timeout(1000)
    pg.fill("#diagMkb","I10"); pg.click("text=Протоколдан іздеу >> nth=0"); pg.wait_for_timeout(1500)
    pg.locator("#ordDocBox").screenshot(path="/mnt/user-data/outputs/demo1_doktor_jolhdama.png")
    pg.evaluate("localStorage.setItem('nz_session', JSON.stringify({iin:'222222222222',fio:'Медбике Тест',role:'nurse',uchastok:'',uchList:[5]}))"); pg.reload(); pg.wait_for_timeout(2500)
    pg.click("#tabBtn-ord"); pg.wait_for_timeout(1200); pg.screenshot(path="/mnt/user-data/outputs/demo2_medbike_tizim.png")
    pg.evaluate("ordRoute('900101300123')"); pg.wait_for_timeout(1200); pg.locator("#ordOverlay > div").screenshot(path="/mnt/user-data/outputs/demo3_marshrut.png")
    pg.evaluate("ordOvClose()"); pg.evaluate("ordReport()"); pg.wait_for_timeout(1500); pg.locator("#ordOverlay > div").screenshot(path="/mnt/user-data/outputs/demo4_aptalyq_esep.png")
    b.close()
