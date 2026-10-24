exec(open('/tmp/ord/t3.py').read().split("with sync_playwright")[0])
put("staff",{"920123300487":{"fio":"Абдрахманов Жадигер Шалабайұлы","role":"expert","uchastok":"Врач-эпидемиолог"},
 "601204401557":{"fio":"Бурибаева Сәулеш Сагимановна","role":"doctor","uchastok":"Участковый ВОП"},
 "951007401341":{"fio":"Анарова Дана Мұратқызы","role":"registratura"},
 "820711402613":{"fio":"Алманова Мадина Улымбековна","role":"doctor","uchastok":"Эндокринолог (совместитель)"},
 "030522050358":{"fio":"Куанышбаева Нуоржайна Муханқызы","role":"registratura"},"910109402382":{"fio":"Самуратова Юлыз Талгатовна","role":"registratura"},"123456789012":{"fio":"Бывший Сотрудник","role":"doctor","uchastok":"4"}})
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={"width":1280,"height":1400})
    errs=[]; pg.on("pageerror",lambda e:errs.append(str(e))); pg.on("dialog",lambda d:(print("DIALOG:",d.message[:900]),d.accept()))
    pg.goto(B+"/"); pg.evaluate("localStorage.setItem('nz_session', JSON.stringify({iin:'920123300487',fio:'Абдрахманов',role:'expert'}))"); pg.reload(); pg.wait_for_timeout(2000)
    pg.evaluate("switchTab('stf')"); pg.wait_for_timeout(1500)
    print(pg.inner_text("#stfResp")[:1100].replace("\n"," | "))
    pg.evaluate("nxRespApply()"); pg.wait_for_timeout(4000)
    s=pg.evaluate("dbGet('staff')"); print(len(s))
    for k in ("910109402382","030522050358","601204401557","951007401341","820711402613","920123300487","951104301350""030522050358"): print(k, s.get(k))
    print([k for k in s if k=="8804284011717"], errs); b.close()
