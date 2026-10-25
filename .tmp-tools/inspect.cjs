const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const ts=await (await fetch('http://127.0.0.1:9222/json')).json(); const page=ts.find(t=>t.type==='page');
 const ws=new WebSocket(page.webSocketDebuggerUrl); await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
 let id=0; const pending=new Map(); ws.onmessage=e=>{const m=JSON.parse(e.data); if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result)}};
 const send=(method,params={})=>{const i=++id;return new Promise((res,rej)=>{pending.set(i,{resolve:res,reject:rej});ws.send(JSON.stringify({id:i,method,params}))})};
 const ev=async ex=>{const r=await send('Runtime.evaluate',{expression:ex,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.text);return r.result.value};
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:'http://127.0.0.1:8080/browse.html'}); await sleep(1800);
 console.log(await ev(`(()=>{const item=document.querySelector('.top10-item');const card=item.querySelector('.nf-card');const rank=item.querySelector('.top10-rank');const track=item.closest('.row-track');return {item:item.getBoundingClientRect().toJSON(),card:card.getBoundingClientRect().toJSON(),rank:rank.getBoundingClientRect().toJSON(),track:track.getBoundingClientRect().toJSON(),cardW:getComputedStyle(track).getPropertyValue('--card-w'),pad:getComputedStyle(item).paddingLeft,width:getComputedStyle(item).width};})()`));
 console.log('scrollbar',await ev('innerWidth-document.documentElement.clientWidth'));
 ws.close();
})().catch(e=>{console.error(e);process.exit(1)});
