exec(open('/tmp/ord/t3.py').read().split("with sync_playwright")[0])
import datetime
y=datetime.date.today().year
rp={}
def P(i,u,dob,g,fio,contacts="87071234567"):
    rp["9001013002%02d"%i]={"gender":g,"inList":True,"contacts":contacts,"dob":dob,"fio":fio,"uchastok":"Участок №%d"%u}
P(1,5,"05.03.%d"%(y-50),"ж","Тест Бір Иванова")
P(2,5,"05.03.%d"%(y-52),"ж","Тест Екі Иванова","")
P(3,5,"10.01.%d"%(y-1),"м","Тест Үш Балаев")
P(4,6,"01.02.%d"%(y-60),"м","Тест Төрт Петров")
P(5,6,"",'м',"Тест Бес Без ДР")
put("rpn_baza",rp)
put("dispan",{"900101300201":{"c":["I10"],"g":["АГ"],"f":"Тест Бір Иванова","u":"5"},"900101300204":{"c":["E11"],"g":["СД"],"f":"Тест Төрт Петров","u":"6"}})
put("scr",{"900101300202":{"cvd_%d"%y:{"s":"done"}}})
now=time.time()
put("orders/o1",{"referralId":"r","iin":"900101300201","fio":"Тест","uchastok":"Участок №5","doctorName":"D","kind":"lab","name":"ОАК","createdAt":time.strftime("%Y-%m-%dT%H:%M:%S.000Z",time.gmtime(now-20*86400))})
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={"width":1280,"height":1300})
    errs=[]; pg.on("pageerror",lambda e:errs.append(str(e))); pg.on("console",lambda m: errs.append(m.text) if m.type in("warning","error") else 0)
    pg.goto(B+"/"); pg.evaluate("localStorage.setItem('nz_session', JSON.stringify({iin:'920123300487',fio:'Эксперт',role:'expert'}))"); pg.reload(); pg.wait_for_timeout(2500)
    print("btn", pg.evaluate("getComputedStyle(document.getElementById('tabBtn-ind')).display"))
    pg.evaluate("switchTab('ind')"); pg.wait_for_timeout(6000)
    print(pg.inner_text("#nx-ind")[:900].replace("\n"," | "))
    pg.screenshot(path="/tmp/ord/v115a.png")
    pg.evaluate("indView('risk')"); pg.wait_for_timeout(500); print(pg.inner_text("#nx-ind")[:700].replace("\n"," | "))
    pg.evaluate("indView('dq')"); pg.wait_for_timeout(500); print(pg.inner_text("#nx-ind")[:500].replace("\n"," | "))
    pg.evaluate("indView('ind')"); pg.evaluate("indList('5','s')"); pg.wait_for_timeout(500); print(pg.inner_text("#ordOverlay")[:400].replace("\n"," | "))
    pg.evaluate("ordOvClose()")
    # nurse: only own
    pg.evaluate("localStorage.setItem('nz_session', JSON.stringify({iin:'222222222222',fio:'Мед',role:'nurse',uchastok:'5',uchList:[5]}))"); pg.reload(); pg.wait_for_timeout(2500)
    pg.evaluate("switchTab('ind')"); pg.wait_for_timeout(6000); print("NURSE:", pg.inner_text("#nx-ind")[:400].replace("\n"," | "))
    print(errs); b.close()
