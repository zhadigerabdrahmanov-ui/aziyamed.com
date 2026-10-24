exec(open('/tmp/ord/t3.py').read().split("with sync_playwright")[0])
put("staff",{"333333333333":{"fio":"Эксперт Тест","role":"expert"},
 "111111111111":{"fio":"Бурибаева Сәулеш Сагимановна","role":"doctor","uchastok":"Участковый ВОП"},
 "222222222222":{"fio":"Анарова Дана Мұратқызы","role":"registratura","uchastok":"3"},
 "444444444444":{"fio":"Алманова Мадина Улымбековна","role":"doctor","uchastok":"Эндокринолог (совместитель)"},
 "555555555555":{"fio":"Какой Тоодин","role":"doctor","uchastok":"4","lauazymy":"Терапевт"}})
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={"width":1280,"height":1200})
    errs=[]; pg.on("pageerror",lambda e:errs.append(str(e))); pg.on("dialog",lambda d:(print("DIALOG:",d.message),d.accept()))
    pg.goto(B+"/"); pg.evaluate("localStorage.setItem('nz_session', JSON.stringify({iin:'333333333333',fio:'Эксперт Тест',role:'expert'}))"); pg.reload(); pg.wait_for_timeout(2000)
    pg.evaluate("switchTab('stf')"); pg.wait_for_timeout(1500)
    pg.evaluate("nxRespApply()"); pg.wait_for_timeout(1500)
    for k in ("111111111111","222222222222","444444444444","555555555555"): print(pg.evaluate("dbGet('staff/%s')"%k))
    print(errs); b.close()
