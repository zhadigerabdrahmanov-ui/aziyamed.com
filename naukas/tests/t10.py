exec(open('/tmp/ord/t3.py').read().split("with sync_playwright")[0])
put("staff/333333333333",{"fio":"Эксперт Тест","role":"expert"})
put("staff/555555555555",{"fio":"Второй Врач","role":"doctor","uchastok":"6"})
put("referrals/r3",dict(base,fio="Петров Пётр",iin="900202300999",doctorIin="555555555555",doctorName="Второй Врач",dob="1980-01-01",referredAt=iso(0),referredByName="КМИС (авто)",status="жаңа",date=time.strftime("%Y-%m-%d"),time="12:00"))
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={"width":1300,"height":900})
    errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(B+"/"); pg.evaluate("localStorage.setItem('nz_session', JSON.stringify({iin:'333333333333',fio:'Эксперт Тест',role:'expert'}))"); pg.reload(); pg.wait_for_timeout(1500)
    pg.click("#tabBtn-doc"); pg.wait_for_timeout(1500)
    print(pg.inner_text("#panel-doc .card h2")); print(pg.inner_text("#docFilterTabs").replace("\n"," | ")); print(pg.inner_text("#docQueue")[:400].replace("\n"," | "))
    pg.select_option("#docDocFilter","555555555555"); pg.wait_for_timeout(300); print("filtered:",pg.inner_text("#docQueue")[:200].replace("\n"," | "))
    # doctor still sees only own
    pg.evaluate("localStorage.setItem('nz_session', JSON.stringify({iin:'111111111111',fio:'Дәрігер Тест',role:'doctor',uchastok:'5'}))"); pg.reload(); pg.wait_for_timeout(1500); pg.click("#tabBtn-doc"); pg.wait_for_timeout(1200)
    print("doctor sel:",pg.query_selector("#docDocFilter") is not None, "|", pg.inner_text("#docQueue")[:150].replace("\n"," | ")); print(errs); b.close()
