exec(open('/tmp/ord/t3.py').read().split("with sync_playwright")[0])
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={"width":1280,"height":950})
    errs=[]; pg.on("pageerror",lambda e:errs.append(str(e))); pg.on("dialog",lambda d:d.accept())
    pg.goto(B+"/"); pg.evaluate("localStorage.setItem('nz_session', JSON.stringify({iin:'222222222222',fio:'Медбике Тест',role:'nurse',uchastok:'5',uchList:[5]}))"); pg.reload(); pg.wait_for_timeout(1500)
    pg.evaluate("""(()=>{ uchCache={rows:[],baseMap:{},editMap:{}}; vaccLoad=async()=>{};scrLoad=async()=>{};prfLoad=async()=>{};
      dspLoad=async()=>{ DSP={year:2026,persons:[],status:{},noRule:0}; return true; };
      ntfGroups=function(){
        const mk=(i,u,k,ph)=>({iin:'9001013001'+i,fio:'Пациент '+i+' Тест',uch:u,dob:'1975-03-02',child:false,phones:ph?['7707123456'+(i%10)]:[],
           items:[k==='d'?{kind:'d',vk:'dm2',due:new Date(),sk:'d_dm2_2026',rem:{docs:['участкелік дәрігер'],tests:['HbA1c']}}:{kind:'s',vk:'cvd',due:new Date(Date.now()+86400000),sk:'s_cvd_'+i}]});
        const sn=NTF.sent||{}; const L=[];
        const d=NTF.kinds.d, n=NTF.kinds.v;
        for(let i=10;i<24;i++){ if(d) L.push(mk(i,i%2?5:6,'d',true)); }
        for(let i=30;i<34;i++){ if(n) L.push(mk(i,5,'s',i!==33)); }
        L.forEach(o=>{const s=sn[o.iin]||{}; o.allSent=o.items.every(it=>s[it.sk]); });
        return L; }; })()""")
    pg.evaluate("uchShowPlan()"); pg.wait_for_timeout(500)
    print(pg.evaluate("[...document.querySelectorAll('#uchRepOverlay button')].map(b=>b.innerText.replace(/\\n/g,' ')).join(' | ')")[:300])
    pg.evaluate("uchOpenPlan('day')"); pg.wait_for_timeout(1500)
    print(pg.inner_text("#uchRepOverlay")[:700].replace("\n"," | "))
    print(pg.evaluate("NTF.view.length"))
    pg.evaluate("ntfWaWeb=function(i){ntfOpened(i)}"); pg.evaluate("ntfOpened(0)"); pg.evaluate("ntfMark(0,true)"); pg.wait_for_timeout(1200)
    print(pg.inner_text("#uchRepOverlay")[:300].replace("\n"," | ")); print(pg.evaluate("Object.keys(NTF.sent)"))
    pg.screenshot(path="/tmp/ord/v100_day.png"); print(errs); b.close()
