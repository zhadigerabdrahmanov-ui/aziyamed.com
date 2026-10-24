exec(open('/tmp/ord/t3.py').read().split("with sync_playwright")[0])
put("rpn_baza",{"900101300111":{"fio":"Тест Ребенок","dob":"01.02.2026","gender":"ж","uchastok":"Участок №5","inList":True},
 "900101300112":{"fio":"Тест Взрослый","dob":"05.03.1976","gender":"м","uchastok":"Участок №5","inList":True},
 "900101300113":{"fio":"Тест Школьник","dob":"05.03.2018","gender":"м","uchastok":"Участок №5","inList":True}})
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={"width":1280,"height":1200})
    errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(B+"/"); pg.evaluate("localStorage.setItem('nz_session', JSON.stringify({iin:'222222222222',fio:'Медбике Тест',role:'nurse',uchastok:'5',uchList:[5]}))"); pg.reload(); pg.wait_for_timeout(1500); pg.evaluate("loadUchTable()"); pg.wait_for_timeout(2500); pg.evaluate("nurseDashRender()"); pg.wait_for_timeout(3000); print(pg.evaluate("document.getElementById('nurseDash') && [document.getElementById('nurseDash').style.display, document.getElementById('nurseDash').innerText.slice(0,300)]")); print(errs)
    print(pg.evaluate("[...document.querySelectorAll('#nurseDash button')].map(b=>b.innerText).join(' | ')"))
    print(pg.evaluate("['v','s','p'].map(k=>{const d=document.getElementById('nurseOv_'+k);return d&&d.style.display})"))
    pg.evaluate("nurseOv('s')"); print(pg.evaluate("document.getElementById('nurseOv_s').style.display"))
    print(pg.evaluate("document.getElementById('nurseOv_s').innerText.slice(0,200)"))
    print(errs); b.close()
