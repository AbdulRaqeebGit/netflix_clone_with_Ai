const fs=require('fs'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
class CDP{constructor(ws){this.ws=ws;this.id=0;this.pending=new Map();this.events=[];}static async connect(){const ts=await (await fetch('http://127.0.0.1:9222/json')).json();const page=ts.find(t=>t.type==='page');const ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});const c=new CDP(ws);ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&c.pending.has(m.id)){const p=c.pending.get(m.id);c.pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result)}else if(m.method)c.events.push(m)};return c;}send(method,params={}){const id=++this.id;return new Promise((res,rej)=>{this.pending.set(id,{resolve:res,reject:rej});this.ws.send(JSON.stringify({id,method,params}))})}async ev(ex){const r=await this.send('Runtime.evaluate',{expression:ex,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}async waitFor(ex,timeout=8000){const start=Date.now();while(Date.now()-start<timeout){try{const v=await this.ev(ex);if(v)return v;}catch(e){}await sleep(200);}throw new Error('Timeout waiting for '+ex);}async nav(url){await this.send('Page.navigate',{url});await sleep(1500);await this.waitFor("typeof NFStore !== 'undefined'");}async shot(f){const r=await this.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(f,Buffer.from(r.data,'base64'));console.log('shot',f);}}
(async()=>{
 const c=await CDP.connect(); await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Log.enable'); await c.send('Network.enable');
 await c.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 console.log('start url', await c.ev('location.href'));
 await c.ev("NFStore.signOut(); location.href='browse.html'");
 await c.waitFor("location.pathname.endsWith('login.html')",10000);
 console.log('guard url', await c.ev('location.href'));
 await c.shot('test-artifacts/login-guard.png');

 // login demo
 await c.ev("document.querySelector('[data-demo-fill]').click(); document.querySelector('#loginForm').requestSubmit();");
 await c.waitFor("location.pathname.endsWith('browse.html')",10000);
 await sleep(1200);
 console.log('logged in user', await c.ev("NFStore.currentUser().email"));
 await c.ev("document.querySelector('#searchToggle').click(); const i=document.querySelector('#searchInput'); i.value='Batman'; i.dispatchEvent(new Event('input',{bubbles:true}));");
 await sleep(2000);
 console.log('online note', await c.ev("document.querySelector('#searchNoteText').innerText"), 'cards', await c.ev("document.querySelectorAll('#searchGrid .nf-card').length"));
 await c.shot('test-artifacts/search-online2.png');

 // fallback
 await c.send('Network.setBlockedURLs',{urls:['*omdbapi.com*']});
 await c.ev("document.querySelector('#searchClear').click(); const i=document.querySelector('#searchInput'); i.value='Dune'; i.dispatchEvent(new Event('input',{bubbles:true}));");
 await sleep(2500);
 console.log('blocked note', await c.ev("document.querySelector('#searchNoteText').innerText"), 'cards', await c.ev("document.querySelectorAll('#searchGrid .nf-card').length"));
 await c.shot('test-artifacts/search-fallback2.png');
 await c.send('Network.setBlockedURLs',{urls:[]});

 // Top10 fresh after CSS fix
 await c.ev("document.querySelector('#searchClose').click(); window.scrollTo(0,620);"); await sleep(800);
 console.log('top10 scrollLeft', await c.ev("document.querySelector('.row-track').scrollLeft"));
 console.log('top10 rects', JSON.stringify(await c.ev(`(()=>{const i=document.querySelector('.top10-item'),card=i.querySelector('.nf-card'),rank=i.querySelector('.top10-rank'),t=i.closest('.row-track');return {item:i.getBoundingClientRect().toJSON(),card:card.getBoundingClientRect().toJSON(),rank:rank.getBoundingClientRect().toJSON(),scrollLeft:t.scrollLeft};})()`)));
 await c.shot('test-artifacts/top10-fixed.png');

 // My List toggle
 const before=await c.ev("NFStore.getMyList().length");
 await c.ev("document.querySelector('.top10-item .nf-card [data-action=list]').click()"); await sleep(400);
 const after=await c.ev("NFStore.getMyList().length");
 console.log('mylist count', before, '->', after, 'toast', await c.ev("document.querySelector('.cine-toast:last-child') && document.querySelector('.cine-toast:last-child').innerText"));

 const errs=c.events.filter(e=>e.method==='Runtime.exceptionThrown'||(e.method==='Log.entryAdded'&&e.params.entry.level==='error'));
 console.log('ERRORS', JSON.stringify(errs.map(e=>e.params).slice(0,10),null,2).slice(0,3000));
 c.ws.close();
})().catch(e=>{console.error('ERR',e);process.exit(1)});
