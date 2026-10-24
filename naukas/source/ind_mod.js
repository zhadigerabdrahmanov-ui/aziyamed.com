/* ===== v115: Көрсеткіштер · Тәуекел тізімі · Деректер сапасы ===== */
(function(){
  const IND = {view:"ind", u:"", data:null, targets:{v:90, s:90, p:90, d:90}, busy:false};
  const KINDS = {v:"Вакцинация", s:"Скрининг", p:"Балалар профосмотры", d:"Диспансерлік есеп"};
  const esc = s=>String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const digits = s=>String(s||"").replace(/\D/g,"");
  const okPhone = s=>digits(s).length >= 10;
  const col = (p,t)=> p == null ? "var(--muted)" : p >= t ? "var(--ok)" : p >= t-15 ? "var(--warn)" : "var(--bad)";

  function css(){
    if(document.getElementById("indCss")) return;
    const s = document.createElement("style"); s.id = "indCss";
    s.textContent = `
    #nx-ind .ind-seg{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0 14px}
    #nx-ind .ind-seg button{border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:999px;padding:7px 16px;cursor:pointer;font-weight:600}
    #nx-ind .ind-seg button.on{background:var(--navy);color:#fff;border-color:var(--navy)}
    #nx-ind .ind-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin:8px 0 14px}
    #nx-ind .ind-kpi{border:1px solid var(--line);background:var(--card);border-radius:12px;padding:12px 14px;border-top:4px solid var(--c,var(--blue))}
    #nx-ind .ind-kpi b{display:block;font-size:26px;line-height:1.1;margin:4px 0}
    #nx-ind .ind-bar{height:8px;border-radius:99px;background:var(--surface2);overflow:hidden;min-width:70px}
    #nx-ind .ind-bar i{display:block;height:100%}
    #nx-ind td.ind-c{cursor:pointer;white-space:nowrap}
    #nx-ind td.ind-c:hover{background:var(--surface2)}
    #nx-ind .ind-gap{font-size:12px;color:var(--muted)}
    #nx-ind .ind-risk{display:inline-block;border-radius:999px;padding:2px 10px;font-weight:700;color:#fff;font-size:12px}
    `;
    document.head.appendChild(s);
  }

  // ---------- есептеу ----------
  async function compute(){
    if(!uchCache){ await loadUchTable(); if(!uchCache) throw new Error("РПН тізімі жүктелмеді"); }
    const y = new Date().getFullYear(), now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const prev = [VACC, SCR, PRF, DSP];
    let ok = true;
    try{
      ok = (await vaccLoad(y)) && (await scrLoad(y)) && (await prfLoad(y)) && (await dspLoad());
      if(!ok) throw new Error("Деректер жүктелмеді");
      try{ const t = await dbGet("settings/indTargets"); if(t && !t.error) IND.targets = Object.assign({v:90,s:90,p:90,d:90}, t); }catch(e){}
      await ordFetch();
      const own = uchOwnList();
      const U = {}, P = {};   // участок → есеп; iin → адам
      const mk = u => U[u] = U[u] || {u, pop:0, contact:0, nodob:0,
        v:{plan:0,due:0,done:0,left:[]}, s:{plan:0,due:0,done:0,left:[]}, p:{plan:0,due:0,done:0,left:[]}, d:{act:0,sum:0,full:0,left:[]}};
      const person = (iin, fio, u, contacts) => P[iin] = P[iin] || {iin, fio, u, contacts:contacts||"", score:0, why:[]};
      uchCache.rows.forEach(r=>{
        if(r.inList === false) return;
        const u = uchNum(r.uchastok); if(u === null) return;
        if(own !== null && !own.includes(u)) return;
        const o = mk(u); o.pop++;
        if(okPhone(r.contacts)) o.contact++;
        if(!r.dob) o.nodob++;
      });
      const nm = {}; VACC_PLAN.forEach(v=>nm[v.k] = v.name); SCR_PLAN.forEach(v=>nm[v.k] = v.name);
      const rowBy = {}; uchCache.rows.forEach(r=>{ rowBy[r.iin] = r; });
      const addPlan = (kind, items, stFn, labelFn, exclFn) => {
        items.forEach(it=>{
          const o = mk(it.uch), st = stFn(it);
          if(exclFn && exclFn(st)) return;
          const c = o[kind]; c.plan++;
          const due = it.due.getTime() <= today.getTime();
          if(due){ c.due++; if(st === "done") c.done++; else if(!st || st === "temp"){
            const r = rowBy[it.iin] || {};
            c.left.push({iin:it.iin, fio:it.fio, uch:it.uch, name:labelFn(it), due:it.due, contacts:r.contacts||""});
            const days = Math.floor((today.getTime()-it.due.getTime())/86400000);
            if(days > 30){ const p = person(it.iin, it.fio, it.uch, r.contacts); p.od = (p.od||0) + 1; if(p.od <= 3){ p.score += 1; p.why.push("мерзімі өткен: "+labelFn(it).slice(0,48)+" ("+days+" күн)"); } }
          } }
        });
      };
      addPlan("v", VACC.items, vaccSt, it=>(nm[it.vk]||it.vk)+" · "+it.mk, st=>st === "perm");
      addPlan("s", SCR.items, scrSt, it=>(nm[it.vk]||it.vk).slice(0,70), null);
      addPlan("p", PRF.items, prfSt, it=>{ try{ return prfMs(it.vk).name; }catch(e){ return it.vk; } }, st=>st === "moved");
      // диспансер
      const doy = Math.round((today.getTime() - Date.UTC(y,0,1))/86400000) + 1, expect = Math.min(100, Math.round(doy*100/365));
      DSP.persons.forEach(p=>{
        if(!p.rules.length) return;
        const o = mk(p.uch);
        let sum = 0, n = 0, excl = false;
        p.rules.forEach(r=>{ const s = dspPct(p.iin, r); if(s.st && ["refuse","removed","dead"].indexOf(s.st) >= 0){ excl = true; return; } sum += s.pct; n++; });
        if(excl && !n) return;
        const pct = n ? Math.round(sum/n) : 0;
        o.d.act++; o.d.sum += pct; if(pct >= 100) o.d.full++;
        const r0 = rowBy[p.iin] || {};
        if(pct < expect - 20){
          o.d.left.push({iin:p.iin, fio:p.fio, uch:p.uch, name:"Д-учет: орындалу "+pct+"% (мерзім бойынша күтілетін ~"+expect+"%) · "+p.groups, due:null, contacts:r0.contacts||""});
          const q = person(p.iin, p.fio, p.uch, r0.contacts);
          const lag = expect - pct;
          q.score += lag >= 40 ? 3 : 2; q.why.push("диспансер: "+pct+"% (күтілетін ~"+expect+"%) · "+(p.groups||p.codes||"").slice(0,50));
        }
      });
      // жолдамалар
      ORD.all.forEach(o=>{
        if(o.cancelled) return;
        const q = P[o.iin]; const stt = ordState(o);
        const base = q || (rowBy[o.iin] ? null : null);
        const apply = (pp)=>{
          if(stt === "pend" && ordDays(o.createdAt) >= 14){ pp.score += 2; pp.why.push("жолдама орындалмаған "+ordDays(o.createdAt)+" күн: "+(o.name||"")); }
          else if(stt === "arr" && ordDays(o.resultAt) >= 7){ pp.score += 2; pp.why.push("нәтиже дәрігермен қаралмаған "+ordDays(o.resultAt)+" күн: "+(o.name||"")); }
        };
        if(stt === "pend" && ordDays(o.createdAt) >= 14 || stt === "arr" && ordDays(o.resultAt) >= 7){
          const r = rowBy[o.iin]; const u = r ? uchNum(r.uchastok) : null;
          if(u === null || (own !== null && !own.includes(u))) return;
          apply(person(o.iin, (r&&r.fio)||o.fio||"", u, r&&r.contacts));
        }
      });
      const risk = Object.values(P).filter(p=>p.score >= 3).sort((a,b)=>b.score-a.score);
      risk.forEach(p=>{ if(!okPhone(p.contacts)) p.why.push("байланыс телефоны жоқ — хабарлау мүмкін емес"); });
      // жолдамалар: деректер сапасы
      const stale = ORD.all.filter(o=>!o.cancelled && ordState(o) === "pend" && ordDays(o.createdAt) >= 7).length;
      return {year:y, today, expect, U, risk, stale, at:Date.now()};
    } finally { VACC = prev[0]; SCR = prev[1]; PRF = prev[2]; DSP = prev[3]; }
  }

  // ---------- көрініс ----------
  const pctOf = (a,b)=> b ? Math.round(a*1000/b)/10 : null;
  function sums(list){
    const t = {pop:0, contact:0, nodob:0, v:{due:0,done:0,left:[]}, s:{due:0,done:0,left:[]}, p:{due:0,done:0,left:[]}, d:{act:0,sum:0,full:0,left:[]}};
    list.forEach(o=>{ t.pop += o.pop; t.contact += o.contact; t.nodob += o.nodob;
      ["v","s","p"].forEach(k=>{ t[k].due += o[k].due; t[k].done += o[k].done; t[k].left = t[k].left.concat(o[k].left); });
      t.d.act += o.d.act; t.d.sum += o.d.sum; t.d.full += o.d.full; t.d.left = t.d.left.concat(o.d.left); });
    return t;
  }
  const dpct = d => d.act ? Math.round(d.sum/d.act) : null;
  function cell(o, k, uKey){
    const t = IND.targets[k];
    let p, gap = 0, n = 0;
    if(k === "d"){ p = dpct(o.d); n = o.d.left.length; }
    else { p = pctOf(o[k].done, o[k].due); gap = Math.max(0, Math.ceil(t*o[k].due/100) - o[k].done); n = o[k].left.length; }
    if(p == null) return '<td>—</td>';
    const bar = '<div class="ind-bar"><i style="width:'+Math.min(100,p)+'%;background:'+col(p,t)+'"></i></div>';
    return '<td class="ind-c" onclick="indList(\''+uKey+'\',\''+k+'\')" title="Тізімді ашу"><b style="color:'+col(p,t)+'">'+p+'%</b>'+bar+
      '<div class="ind-gap">'+(k==="d" ? (n ? n+' кешігуде' : 'кешігу жоқ') : (gap ? 'мақсатқа '+gap+' жетпейді' : '✔ мақсат орындалды')+' · '+n+' ашық')+'</div></td>';
  }
  function render(){
    const box = document.getElementById("nx-ind"); if(!box) return;
    const X = IND.data;
    const seg = '<div class="ind-seg">'+[["ind","📈 Көрсеткіштер"],["risk","⚠ Тәуекел тізімі"],["dq","🧹 Деректер сапасы"]].map(a=>'<button class="'+(IND.view===a[0]?'on':'')+'" onclick="indView(\''+a[0]+'\')">'+a[1]+'</button>').join("")+
      '<button onclick="indReload()" style="margin-left:auto">⟳ Жаңарту</button></div>';
    if(!X){ box.innerHTML = '<h2>📈 Көрсеткіштер</h2>'+seg+'<p class="small-muted">'+(IND.busy?"Есептелуде (15 мың адамға бірнеше секунд)…":"Деректер жоқ")+'</p>'; return; }
    const allU = Object.values(X.U).sort((a,b)=>a.u-b.u);
    const list = IND.u ? allU.filter(o=>String(o.u)===IND.u) : allU;
    const T = sums(list);
    const sel = allU.length > 1 ? '<select onchange="indSel(this.value)" style="max-width:200px"><option value="">Барлық участок</option>'+allU.map(o=>'<option value="'+o.u+'"'+(String(o.u)===IND.u?' selected':'')+'>№'+o.u+'</option>').join("")+'</select>' : "";
    let body = "";
    if(IND.view === "ind"){
      const kp = k=>{ const p = k==="d" ? dpct(T.d) : pctOf(T[k].due ? T[k].done : 0, T[k].due); const t = IND.targets[k];
        return '<div class="ind-kpi" style="--c:'+col(p,t)+'"><div class="small-muted">'+KINDS[k]+'</div><b style="color:'+col(p,t)+'">'+(p==null?"—":p+"%")+'</b><div class="ind-gap">мақсат '+t+'%</div></div>'; };
      const th = "<th>Участок</th><th>Халық</th><th>Вакцинация</th><th>Скрининг</th><th>Профосмотр</th><th>Диспансер</th>";
      const rows = list.map(o=>'<tr><td><b>№'+o.u+'</b></td><td>'+o.pop+'</td>'+cell(o,"v",o.u)+cell(o,"s",o.u)+cell(o,"p",o.u)+cell(o,"d",o.u)+'</tr>').join("")
        + (list.length > 1 ? '<tr style="font-weight:700;background:var(--surface2)"><td>БАРЛЫҒЫ</td><td>'+T.pop+'</td>'+cell({v:T.v,s:T.s,p:T.p,d:T.d},"v","all")+cell({v:T.v,s:T.s,p:T.p,d:T.d},"s","all")+cell({v:T.v,s:T.s,p:T.p,d:T.d},"p","all")+cell({v:T.v,s:T.s,p:T.p,d:T.d},"d","all")+'</tr>' : "");
      const tg = session && session.role === "expert" ? '<details style="margin-top:12px"><summary style="cursor:pointer;font-weight:700">⚙ Мақсатты мәндерді өзгерту (тек эксперт)</summary><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px">'+
        ["v","s","p","d"].map(k=>'<label class="small-muted">'+KINDS[k]+' %<br><input id="indT_'+k+'" type="number" min="1" max="100" value="'+IND.targets[k]+'" style="width:90px"></label>').join("")+'<button onclick="indSaveT()" style="align-self:end">Сақтау</button></div><p class="small-muted">Бастапқы мән — 90%. Нақты мақсаттарды өзіңіздің қолданыстағы бұйрық/шарттағы көрсеткіштерге сәйкес қойыңыз.</p></details>' : "";
      body = '<div class="ind-kpis">'+["v","s","p","d"].map(kp).join("")+'</div>'+
        '<div class="tablewrap"><table><thead><tr>'+th+'</tr></thead><tbody>'+rows+'</tbody></table></div>'+tg+
        '<details style="margin-top:12px"><summary style="cursor:pointer;font-weight:700">Қалай есептеледі?</summary><div class="small-muted" style="line-height:1.6;margin-top:6px;font-size:13px">'+
        'Вакцинация, скрининг, профосмотр: <b>бүгінге дейін мерзімі келген</b> жоспар бойынша «орындалды» үлесі (жыл соңына дейінгі жоспар емес — сонда қазір көрсеткіш қате төмен көрінер еді). Тұрақты медотвод (вакцина) және көшкен (профосмотр) есепке кірмейді. '+
        'Диспансер: әр науқастың 149-бұйрық ережелері бойынша орташа орындалуы; бас тартқан/есептен шыққан/қайтыс болғандар кірмейді; «кешігуде» — мерзім бойынша күтілетіннен 20%-дан артық артта қалғандар. '+
        '«Мақсатқа N жетпейді» — мақсатты пайызға жету үшін қосымша қанша адамды жабу керек. Ұяшықты басыңыз — нақты адамдар тізімі және Excel.</div></details>';
    } else if(IND.view === "risk"){
      const R = X.risk.filter(p=>!IND.u || String(p.u)===IND.u);
      const rows = R.slice(0,300).map(p=>'<tr><td><span class="ind-risk" style="background:'+(p.score>=6?"var(--bad)":p.score>=4?"var(--warn)":"var(--blue)")+'">'+p.score+'</span></td><td><b>'+esc(p.fio)+'</b><div class="ind-gap">'+esc(p.iin)+'</div></td><td>№'+p.u+'</td><td>'+esc(p.contacts||"—")+'</td><td style="font-size:13px">'+p.why.map(esc).join("<br>")+'</td></tr>').join("");
      body = '<p class="small-muted">Бұл — қазір назар аударуды қажет ететін науқастар: диспансерлік бақылаудан артта қалу, мерзімі өткен скрининг/вакцина, орындалмаған жолдама, дәрігер қарамаған нәтиже. Балл — қауіп белгілерінің қосындысы (3+ көрсетіледі). Бұл диагноз емес, <b>басымдық тізімі</b>.</p>'+
        '<div style="display:flex;gap:8px;margin:8px 0;align-items:center"><b>'+R.length+'</b> адам <button onclick="indRiskXlsx()">⬇ Excel</button></div>'+
        (R.length ? '<div class="tablewrap"><table><thead><tr><th>Балл</th><th>Науқас</th><th>Уч.</th><th>Телефон</th><th>Себептер</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+(R.length>300?'<p class="small-muted">Алғашқы 300 көрсетілді, Excel-де — барлығы.</p>':'') : '<p>Тәуекелі жоғары науқас табылмады.</p>');
    } else {
      const q = (a,b)=>{ const p = b ? Math.round(a*100/b) : null; return p; };
      const rows = list.map(o=>'<tr><td><b>№'+o.u+'</b></td><td>'+o.pop+'</td><td style="color:'+col(q(o.contact,o.pop),90)+';font-weight:700">'+(q(o.contact,o.pop)==null?"—":q(o.contact,o.pop)+"%")+'<div class="ind-gap">телефоны жоқ: '+(o.pop-o.contact)+'</div></td><td style="color:'+(o.nodob?"var(--bad)":"var(--ok)")+';font-weight:700">'+o.nodob+'</td></tr>').join("");
      body = '<p class="small-muted">Жоспар да, хабарлама да дұрыс байланыс пен туған күнге тәуелді. Телефоны жоқ адамға SMS/WhatsApp бармайды, туған күні жоқ адам скрининг пен вакцина жоспарына түспей қалады — ол көрсеткіштен «көрінбей» кетеді.</p>'+
        '<div class="ind-kpis"><div class="ind-kpi" style="--c:'+col(q(T.contact,T.pop),90)+'"><div class="small-muted">Телефоны көрсетілген</div><b>'+(q(T.contact,T.pop)==null?"—":q(T.contact,T.pop)+"%")+'</b><div class="ind-gap">'+(T.pop-T.contact)+' адамда жоқ</div></div>'+
        '<div class="ind-kpi" style="--c:'+(T.nodob?"var(--bad)":"var(--ok)")+'"><div class="small-muted">Туған күні жоқ</div><b>'+T.nodob+'</b></div>'+
        '<div class="ind-kpi" style="--c:'+(X.stale?"var(--warn)":"var(--ok)")+'"><div class="small-muted">Жолдама 7+ күн орындалмаған</div><b>'+X.stale+'</b></div></div>'+
        '<div class="tablewrap"><table><thead><tr><th>Участок</th><th>Халық</th><th>Телефон бар</th><th>Туған күні жоқ</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
        '<div style="margin-top:10px"><button onclick="indNoPhoneXlsx()">⬇ Телефоны жоқ адамдар (Excel)</button></div>';
    }
    box.innerHTML = '<h2>📈 Көрсеткіштер · '+X.year+'</h2><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span class="small-muted">'+esc(nurseFmt(X.today))+' жағдайы бойынша</span>'+sel+'</div>'+seg+body;
  }

  // ---------- әрекеттер ----------
  window.indView = v=>{ IND.view = v; render(); };
  window.indSel = v=>{ IND.u = v; render(); };
  window.indReload = ()=>{ IND.data = null; IND.busy = true; render(); load(true); };
  window.indSaveT = async ()=>{
    const t = {}; ["v","s","p","d"].forEach(k=>{ const n = parseInt(document.getElementById("indT_"+k).value,10); t[k] = n>0&&n<=100 ? n : 90; });
    IND.targets = t; try{ await dbSet("settings/indTargets", t); }catch(e){ alert("Сақталмады: "+e.message); } render();
  };
  function listFor(u, k){
    const X = IND.data; const L = [];
    Object.values(X.U).forEach(o=>{ if(u !== "all" && String(o.u) !== String(u)) return; o[k].left.forEach(x=>L.push(x)); });
    return L.sort((a,b)=>(a.uch-b.uch)||String(a.fio).localeCompare(String(b.fio),"ru"));
  }
  window.indList = (u,k)=>{
    const L = listFor(u,k);
    const rows = L.slice(0,400).map(x=>'<tr><td>№'+x.uch+'</td><td><b>'+esc(x.fio)+'</b><div class="ind-gap">'+esc(x.iin)+'</div></td><td>'+esc(x.name)+'</td><td>'+(x.due?esc(nurseFmt(x.due)):"")+'</td><td>'+esc(x.contacts||"—")+'</td></tr>').join("");
    ordOv('<h3 style="margin:4px 0 8px">'+KINDS[k]+' · '+(u==="all"?"барлық участок":"№"+u)+' — ашық: '+L.length+'</h3><div style="margin-bottom:8px"><button onclick="indListXlsx(\''+u+'\',\''+k+'\')">⬇ Excel</button></div>'+
      '<div class="tablewrap"><table><thead><tr><th>Уч.</th><th>Науқас</th><th>Не істеу керек</th><th>Мерзімі</th><th>Телефон</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+(L.length>400?'<p class="small-muted">Алғашқы 400 көрсетілді, Excel-де — барлығы.</p>':''));
  };
  window.indListXlsx = (u,k)=>{
    const L = listFor(u,k); const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Участок","ИИН","ФИО","Не істеу керек","Мерзімі","Телефон"]].concat(L.map(x=>["№"+x.uch,x.iin,x.fio,x.name,x.due?nurseFmt(x.due):"",x.contacts||""]))), "Ашық");
    XLSX.writeFile(wb, "korsetkish_"+k+"_"+(u==="all"?"barlygy":"uch"+u)+".xlsx");
  };
  window.indRiskXlsx = ()=>{
    const X = IND.data; const R = X.risk.filter(p=>!IND.u || String(p.u)===IND.u); const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Балл","Участок","ИИН","ФИО","Телефон","Себептер"]].concat(R.map(p=>[p.score,"№"+p.u,p.iin,p.fio,p.contacts||"",p.why.join("; ")]))), "Тәуекел");
    XLSX.writeFile(wb, "tauekel_tizimi.xlsx");
  };
  window.indNoPhoneXlsx = ()=>{
    const own = uchOwnList(); const rows = [["Участок","ИИН","ФИО","Туған күні"]];
    uchCache.rows.forEach(r=>{ if(r.inList === false) return; const u = uchNum(r.uchastok); if(u === null || (own !== null && !own.includes(u))) return; if(IND.u && String(u) !== IND.u) return; if(!okPhone(r.contacts)) rows.push(["№"+u,r.iin,r.fio||"",r.dob||""]); });
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Телефонсыз"); XLSX.writeFile(wb, "telefony_zhok.xlsx");
  };

  async function load(force){
    if(IND.busy && !force) return;
    if(IND.data && !force && Date.now()-IND.data.at < 120000){ render(); return; }
    IND.busy = true; render();
    try{ IND.data = await compute(); }catch(e){ const b = document.getElementById("nx-ind"); if(b) b.innerHTML = '<h2>📈 Көрсеткіштер</h2><p>Қате: '+esc(e.message)+'</p>'; IND.busy = false; return; }
    IND.busy = false; render();
  }

  // ---------- таб ----------
  function mkTab(){
    css();
    if(document.getElementById("tabBtn-ind")) return;
    const tabs = document.querySelector(".tabs"), main = document.querySelector("main"); if(!tabs || !main) return;
    const b = document.createElement("button"); b.id = "tabBtn-ind"; b.textContent = "📈 Көрсеткіштер"; b.style.display = "none"; b.setAttribute("onclick","switchTab('ind')"); tabs.appendChild(b);
    const p = document.createElement("div"); p.className = "panel"; p.id = "panel-ind"; p.innerHTML = '<div class="card" id="nx-ind"></div>'; main.appendChild(p);
  }
  function show(){
    const b = document.getElementById("tabBtn-ind"); if(!b) return;
    b.style.display = session && (session.role === "expert" || session.role === "doctor" || session.role === "nurse") ? "" : "none";
  }
  const _sw = switchTab;
  switchTab = function(n){ _sw(n); if(n === "ind") load(false); };
  const _en = enterApp;
  enterApp = function(){ _en(); try{ mkTab(); show(); IND.data = null; IND.u = ""; }catch(e){ console.warn("ind", e); } };
  const _lo = doLogout;
  doLogout = function(){ _lo(); IND.data = null; };
})();
