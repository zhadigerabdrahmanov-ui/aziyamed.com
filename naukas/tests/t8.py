import json,urllib.request,time
from playwright.sync_api import sync_playwright
B="http://localhost:8099"
def put(p,d):
    r=urllib.request.Request(B+"/db/"+p+".json",data=json.dumps(d).encode(),method="PUT"); urllib.request.urlopen(r).read()
def get(p): return json.load(urllib.request.urlopen(B+"/db/"+p+".json"))
today=time.strftime("%Y-%m-%d"); dmy=time.strftime("%d.%m.%Y")
put("staff",{"111111111111":{"fio":"Бурибаева Саулеш Сагимановна","role":"doctor","uchastok":"5"},"555555555555":{"fio":"Юсупов Х.А.","role":"doctor","uchastok":"1"}})
put("rpn_baza",{"610728300111":{"fio":"МИРЗАЕВА БУБАЙША ТАЛГАТОВНА","dob":"1961-07-28","gender":"Ж","uchastok":"5"},
 "100701500222":{"fio":"АЛЕН ТӨРЕХАН ҒАЛЫМЖАНҰЛЫ","dob":"01.07.2010","gender":"М","uchastok":"5"}})
put("referrals",None) if False else None
html=f"""<html><head><meta charset=utf-8></head><body><div class="hdr">Отделение участковой службы, БУРИБАЕВА С.С. 5, БУРИБАЕВА САУЛЕШ САГИМАНОВНА, {dmy}</div>
<div id=list><div class=it>БУРИБАЕВА САУЛЕШ САГИМАНОВНА <span>12</span></div><div class=it>ЮСУПОВ ХАМЗААЛИ <span>81</span></div></div>
<div id=slots>
<div class=card><div><b>09:00-09:15</b></div><div><span>65</span></div><div>МИРЗАЕВА БУБАЙША <span>28.07.1961</span> <button>Контакты</button></div><hr><div>Прием: Семейный врач (Врач общей практики) <a>Подробнее</a></div><div>Не оплачено Выполнено</div><button>Талон</button></div>
<div class=card><div><b>09:45-10:00</b></div><div>АЛЕН ТӨРЕХАН ҒАЛЫМЖАНҰЛЫ <span>01.07.2010</span></div><div>Приём: Семейный врач (Врач общей практики) <a>Подробнее</a></div></div>
<div class=card><div><b>10:00-10:15</b></div><div>НЕИЗВЕСТНЫЙ ПАЦИЕНТ <span>01.01.1990</span></div></div>
<div class=card><div><b>10:15-10:30</b></div></div>
</div></body></html>"""
shim="""window.GM_getValue=k=>{const v=localStorage.getItem('gm_'+k);return v===null?undefined:JSON.parse(v)};window.GM_setValue=(k,v)=>localStorage.setItem('gm_'+k,JSON.stringify(v));
window.GM_xmlhttpRequest=o=>{fetch(o.url,{method:o.method,headers:o.headers,body:o.data}).then(async r=>o.onload({responseText:await r.text()})).catch(()=>o.onerror())};"""
with sync_playwright() as p:
    b=p.chromium.launch(args=["--disable-web-security","--disable-features=PrivateNetworkAccessSendPreflights,PrivateNetworkAccessRespectPreflightResults,BlockInsecurePrivateNetworkRequests"]); pg=b.new_page(viewport={"width":1200,"height":800})
    pg.route("http://regtest.local/**",lambda r:r.fulfill(body=html,content_type="text/html"))
    errs=[]; pg.on("pageerror",lambda e:errs.append(str(e))); pg.on("console",lambda m:print("C:",m.text[:200]))
    pg.goto("http://regtest.local/Home/Desktop")
    pg.add_script_tag(content=shim); pg.add_script_tag(content=open('/tmp/ord/kt.js').read())
    pg.wait_for_timeout(500)
    print(pg.evaluate("(()=>{const t=document.querySelector('.hdr').textContent;return [t, /,\\s*\\d{2}\\.\\d{2}\\.\\d{4}$/.test(t)]})()")); pg.click("#kmsNow"); pg.wait_for_timeout(2500)
    print(pg.inner_text("#kmsLog")); print(pg.inner_text("#kmsRev"))
    refs=get("referrals") or {}
    for k,v in refs.items(): print(v["fio"],v["doctorName"],v["date"],v["time"],v["uchastok"],v["status"],v["source"])
    pg.click("#kmsNow"); pg.wait_for_timeout(2000); print("second run:",len(get("referrals")))
    pg.click("#kmsDiag"); pg.wait_for_timeout(1500); print(pg.inner_text("#kmsLog")[:700])
    print(errs); print(list((get("audit/"+today) or {}).values())[:1]); b.close()
