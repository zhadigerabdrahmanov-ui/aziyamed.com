exec(open('/tmp/ord/t3.py').read().split("with sync_playwright")[0])
long="строка<br>"*200
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={"width":1280,"height":900})
    errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(B+"/"); pg.evaluate("localStorage.setItem('nz_session', JSON.stringify({iin:'111111111111',fio:'Дәрігер Тест',role:'doctor',uchastok:'5'}))"); pg.reload(); pg.wait_for_timeout(1500)
    pg.evaluate("""(()=>{const c=document.createElement('div');c.id='protocolResultBox';document.body.appendChild(c);
      renderProtocolResult({dxname:'Тест',treatment:'%s',labs:'a',referral:'b'},'I10');})()"""%long)
    pg.wait_for_timeout(600)
    print(pg.evaluate("(()=>{const b=document.querySelector('#protocolResultBox .protocol-box');return [b.className,b.scrollHeight,b.clientHeight,getComputedStyle(b).overflowY]})()"))
    pg.evaluate("document.querySelector('#protocolResultBox [data-nxa=scroll]').click()")
    print(pg.evaluate("document.querySelector('#protocolResultBox .protocol-box').className"))
    pg.evaluate("document.querySelector('#protocolResultBox [data-nxa=scroll]').click()")
    pg.evaluate("""(()=>{const r=document.getElementById('protocolResultBox');appendRehab116Hint(r,'I21');})()""")
    print(pg.evaluate("(()=>{const b=document.querySelector('.rehab116');if(!b)return null;return [b.scrollHeight,b.clientHeight,getComputedStyle(b).overflowY]})()"))
    print(errs); b.close()
