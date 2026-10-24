exec(open('/tmp/ord/t3.py').read().split("with sync_playwright")[0])
put("staff",{"920123300487":{"fio":"Абдрахманов Жадигер Шалабайұлы","role":"expert","lauazymy":"Врач-эпидемиолог"},
 "601204401557":{"fio":"Бурибаева Сәулеш Сагимановна","role":"doctor","uchastok":"1, 5","lauazymy":"Участковый ВОП"},
 "951007401341":{"fio":"Анарова Дана Мұратқызы","role":"registratura","uchastok":"3","lauazymy":"Учасковая медсестра"},
 "820711402613":{"fio":"Алманова Мадина Улымбековна","role":"doctor","lauazymy":"врач-эндокринолог"},
 "910109402382":{"fio":"Самуратова Юлыз Талгатовна","role":"registratura","uchastok":"2, 12"}})
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={"width":1280,"height":1500})
    errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(B+"/"); pg.evaluate("localStorage.setItem('nz_session', JSON.stringify({iin:'920123300487',fio:'Абдрахманов',role:'expert'}))"); pg.reload(); pg.wait_for_timeout(2000)
    pg.evaluate("switchTab('stf')"); pg.wait_for_timeout(1500)
    print(pg.inner_text("#stfTabs").replace("\n"," | "), pg.evaluate("[document.getElementById('stfResp').style.display, document.querySelectorAll('#stfOut tbody tr').length]"))
    pg.evaluate("nxStfTab('reg')"); pg.wait_for_timeout(300)
    print(pg.evaluate("[document.getElementById('stfResp').style.display, [...document.querySelectorAll('#stfOut tbody td:nth-child(2)')].map(t=>t.innerText)]"))
    pg.screenshot(path="/tmp/ord/v110.png"); print(errs); b.close()
