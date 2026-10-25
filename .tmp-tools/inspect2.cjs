const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const ts=await (await fetch('http://127.0.0.1:9222/json')).json(); const page=ts.find(t=>t.type==='page');
 const ws=new WebSocket(page.webSocketDebuggerUrl); await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
 let id=0; const pending=new Map(); ws.onmessage=e=>{const m=JSON.parse(e.data); if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result)}};
 const send=(method,params={})=>{const i=++id;return new Promise((res,rej)=>{pending.set(i,{resolve:res,reject:rej});ws.send(JSON.stringify({id:i,method,params}))})};
 const ev=async ex=>{const r=await send('Runtime.evaluate',{expression:ex,returnByValue:true,awaitPromise:true});return r.result.value};
 console.log(await ev(`(()=>{const t=document.querySelector('.row-track');const s=getComputedStyle(t);return {scrollLeft:t.scrollLeft,paddingLeft:s.paddingLeft,paddingRight:s.paddingRight,scrollSnap:s.scrollSnapType,firstCard:document.querySelector('.movie-row .nf-card').getBoundingClientRect().toJSON(), active:document.activeElement.tagName+'.'+document.activeElement.className};})()`));
 ws.close();
})();
