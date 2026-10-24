exec(open('/tmp/ord/t3.py').read().split("with sync_playwright")[0])
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={"width":1280,"height":900})
    errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(B+"/"); pg.evaluate("localStorage.setItem('nz_session', JSON.stringify({iin:'222222222222',fio:'Медбике Тест',role:'nurse',uchastok:'5'}))"); pg.reload(); pg.wait_for_timeout(1500)
    pg.evaluate("""(()=>{ uchCache={rows:[],baseMap:{},editMap:{}}; vaccLoad=async()=>{};scrLoad=async()=>{};prfLoad=async()=>{};dspLoad=async()=>{};
      ntfGroups=function(){return [];}; })()""")
    pg.evaluate("ntfOpen()"); pg.wait_for_timeout(1500)
    print(pg.inner_text("#nxAutoBox")[:400])
    pg.screenshot(path="/tmp/ord/v99_auto.png"); print(errs); b.close()
