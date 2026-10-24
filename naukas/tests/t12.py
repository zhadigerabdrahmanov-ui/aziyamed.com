exec(open('/tmp/ord/t3.py').read().split("with sync_playwright")[0])
put("staff/333333333333",{"fio":"Эксперт Тест","role":"expert"})
from playwright.sync_api import sync_playwright
today=time.strftime("%Y-%m-%d")
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={"width":1280,"height":900})
    errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(B+"/"); pg.evaluate("localStorage.setItem('nz_session', JSON.stringify({iin:'333333333333',fio:'Эксперт Тест',role:'expert'}))"); pg.reload(); pg.wait_for_timeout(1500)
    exp=pg.evaluate("rkExpected('I10','1975-03-02')"); print("expected:",exp)
    def ref(i,**k):
        d=dict(base,fio="Пациент "+str(i),iin="9001013001%02d"%i,dob="1975-03-02",referredAt=iso(1),referredByName="Рег",status="жабылды",closedAt=iso(1),date=today,time="10:00",diagnosisText="x",mkbCode="I10"); d.update(k); put("referrals/q%d"%i,d)
    se={"s1":{"code":"I10","timestamp":iso(1)}}
    for i in (1,2): ref(i,protocolSearches=se)
    for n in exp: 
        for i in (1,): put("orders/o1_%s"%abs(hash(n)),dict(base,referralId="q1",createdAt=iso(1),kind=n.split("|")[0],name=n.split("|")[1],src="хаттама"))
    ref(2,protocolSearches=se,protoLog={"l":{"missed":[n.split("|")[1] for n in exp],"reason":"жақында тапсырылған","protoTotal":len(exp)}})
    put("orders/o2x",dict(base,referralId="q2",createdAt=iso(1),kind="lab",name="Өзге",src="қолмен"))
    ref(3)  # no search
    ref(4,protocolSearches=se)  # no orders no reason
    ref(5,protocolSearches=se,protoLog={"l":{"missed":[],"protoTotal":len(exp)}}) 
    for n in exp: put("orders/o5_%s"%abs(hash(n)),dict(base,referralId="q5",createdAt=iso(1),kind=n.split("|")[0],name=n.split("|")[1],src="хаттама"))
    put("referrals/q6",dict(base,fio="Просрочен",iin="900101300199",dob="1975-03-02",referredAt=iso(5),status="жаңа",date="2026-10-10",time="09:00",referredByName="Рег"))
    pg.click("#tabBtn-rk"); pg.wait_for_timeout(2500)
    print(pg.inner_text("#nx-rk table").replace("\n"," | ")[:600])
    pg.evaluate("rkDetail('111111111111','Дәрігер Тест')"); pg.wait_for_timeout(500); print(pg.inner_text("#ordOverlay table").replace("\n"," | ")[:1200])
    pg.evaluate("ordOvClose()"); pg.evaluate("setLang('ru')"); pg.wait_for_timeout(500); print(pg.inner_text("#nx-rk h2"), "|", pg.inner_text("#nx-rk thead").replace("\n"," | "))
    pg.screenshot(path="/tmp/ord/rk.png"); print(errs); b.close()
