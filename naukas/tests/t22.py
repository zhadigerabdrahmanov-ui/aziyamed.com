exec(open('/tmp/ord/t3.py').read().split("with sync_playwright")[0])
put("staff",{"333333333333":{"fio":"Эксперт Тест","role":"expert"},
 "111111111111":{"fio":"Бурибаева Сәулеш Сагимановна","role":"doctor","uchastok":"1"},
 "222222222222":{"fio":"Анарова Дана Мұратқызы","role":"registratura"},
 "444444444444":{"fio":"Қабылбеков Расулбек Ердінұлы","role":"doctor","uchastok":"2, 8, 12"}})
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={"width":1280,"height":1200})
    errs=[]; pg.on("pageerror",lambda e:errs.append(str(e))); pg.on("dialog",lambda d:(print("DIALOG:",d.message[:200]),d.accept()))
    pg.goto(B+"/"); pg.evaluate("localStorage.setItem('nz_session', JSON.stringify({iin:'333333333333',fio:'Эксперт Тест',role:'expert'}))"); pg.reload(); pg.wait_for_timeout(2000)
    pg.evaluate("switchTab('stf')"); pg.wait_for_timeout(1500)
    print(pg.inner_text("#stfResp")[:900].replace("\n"," | "))
    pg.evaluate("nxRespApply()"); pg.wait_for_timeout(1500)
    print(pg.evaluate("dbGet('staff/111111111111')"))
    pg.evaluate("nxRespAdd('РАХИМОВА ГАЛИНА')"); print(pg.evaluate("[sfFio.value,sfRole.value,sfUch.value]"))
    pg.screenshot(path="/tmp/ord/v106.png")
    print(errs); b.close()
