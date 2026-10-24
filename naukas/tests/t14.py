exec(open('/tmp/ord/t3.py').read().split("with sync_playwright")[0])
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={"width":1280,"height":900})
    errs=[]; pg.on("pageerror",lambda e:errs.append(str(e))); pg.on("dialog",lambda d:d.accept())
    pg.goto(B+"/"); pg.evaluate("localStorage.setItem('nz_session', JSON.stringify({iin:'222222222222',fio:'Медбике Тест',role:'nurse',uchastok:'5'}))"); pg.reload(); pg.wait_for_timeout(1500)
    print(pg.evaluate("[typeof NTF, typeof ntfGroups, typeof nxAutoSave, typeof session]"))
    pg.evaluate("""(()=>{ uchCache={rows:[],baseMap:{},editMap:{}}; vaccLoad=async()=>{};scrLoad=async()=>{};prfLoad=async()=>{};
      ntfGroups=function(){ const sn=(NTF.sent['900101300123']||{}); const it=[{kind:'s',vk:'cvd',due:new Date(Date.now()+86400000),sk:'s_cvd_1'}];
        return [{iin:'900101300123',fio:'Иванов Иван Иванович',uch:5,dob:'1975-03-02',child:false,items:it,phones:['77071234567'],allSent:!!sn['s_cvd_1'],unsent:1},
                {iin:'900101300124',fio:'Без Телефон',uch:5,items:it,phones:[],allSent:false}]; };
      document.getElementById('ntfScroll')||0; })()""")
    pg.evaluate("ntfOpen=ntfOpen")  # keep
    pg.evaluate("""(async()=>{ await dbUpdate('settings/autoNotify',{on:true,hour:0,days:1,lang:'kz'}); })()"""); pg.wait_for_timeout(300)
    r=pg.evaluate("(async()=>{ const c=await dbGet('settings/autoNotify'); await tick_probe?.(); return c })()") if False else None
    # run through the manual path via panel
    pg.evaluate("uchOverlay('<div id=\"ntfScroll\"></div>'); NTF={opened:{},days:1,over:false,lang:'kz',show:'all',uch:'',q:'',kinds:{v:true,s:true,p:true,d:false},page:1,sent:{},keep:{},list:[],view:[]};")
    pg.evaluate("nxAutoNow()"); pg.wait_for_timeout(2500)
    print(pg.evaluate("dbGet('settings/autoNotify')"))
    print(pg.evaluate("dbGet('notif')"))
    pg.evaluate("nxAutoNow()"); pg.wait_for_timeout(2000)
    print(pg.evaluate("dbGet('settings/autoNotify')")["lastResult"])
    print(pg.evaluate("ntfLabel({kind:'s',vk:'cvd'},'kz')"))
    print(errs); b.close()
