const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
class CDP {
  constructor(ws){this.ws=ws;this.id=0;this.pending=new Map();this.events=[];}
  static async connect(){
    const targets=await (await fetch('http://127.0.0.1:9222/json')).json();
    const page=targets.find(t=>t.type==='page');
    const ws=new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res,rej)=>{ws.onopen=res;ws.onerror=rej;});
    const c=new CDP(ws);
    ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&c.pending.has(m.id)){const p=c.pending.get(m.id);c.pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}else if(m.method)c.events.push(m);};
    return c;
  }
  send(method,params={}){const id=++this.id;return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}));});}
  async ev(expression){const r=await this.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}
  async nav(url){await this.send('Page.navigate',{url});await sleep(1700);}
  async shot(file,full=false){const p={format:'png',captureBeyondViewport:full};if(full){const m=await this.send('Page.getLayoutMetrics');const {width,height}=m.cssContentSize;p.clip={x:0,y:0,width,height,scale:0.7};}const r=await this.send('Page.captureScreenshot',p);fs.writeFileSync(file,Buffer.from(r.data,'base64'));console.log('shot',file,fs.statSync(file).size);}
}
(async()=>{
 const c=await CDP.connect();
 await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Log.enable');
 const setVp=async(w,h,mobile=false)=>c.send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile,screenWidth:w,screenHeight:h});
 await setVp(1440,1000,false);
 await c.nav('http://127.0.0.1:8080/browse.html');
 await sleep(1200);
 await c.shot('test-artifacts/home-top2.png');
 console.log('scrollY', await c.ev('scrollY'), 'bodyH', await c.ev('document.body.scrollHeight'));
 await c.ev('window.scrollTo(0,700)'); await sleep(500); await c.shot('test-artifacts/home-rows1.png');
 await c.ev('window.scrollTo(0,1500)'); await sleep(500); await c.shot('test-artifacts/home-rows2.png');
 await c.ev('window.scrollTo(0,2400)'); await sleep(500); await c.shot('test-artifacts/home-rows3.png');
 await c.ev('window.scrollTo(0,0)'); await sleep(300);

 // Profile menu and modal
 await c.ev("document.querySelector('#profileBtn').click()"); await sleep(300); await c.shot('test-artifacts/profile-menu.png');
 await c.ev("document.querySelector('#manageProfileBtn').click()"); await sleep(500); await c.shot('test-artifacts/profile-modal.png');
 await c.ev("document.querySelector('#profileModal [data-close]').click()"); await sleep(250);

 // Search API details
 await c.ev("document.querySelector('#searchToggle').click(); const i=document.querySelector('#searchInput'); i.value='Batman'; i.dispatchEvent(new Event('input',{bubbles:true}));"); await sleep(2200);
 console.log('search count', await c.ev("document.querySelectorAll('#searchGrid .nf-card').length"), 'note', await c.ev("document.querySelector('#searchNoteText').innerText"));
 await c.ev("document.querySelector('#searchGrid .nf-card').click()"); await sleep(1600); await c.shot('test-artifacts/search-detail.png');
 await c.ev("document.querySelector('#detailModal [data-close]').click()"); await sleep(200);
 await c.ev("document.querySelector('#searchClear').click()"); await sleep(300);

 // Mobile viewport
 await setVp(390,844,true);
 await c.nav('http://127.0.0.1:8080/browse.html'); await sleep(1200);
 await c.shot('test-artifacts/mobile-home.png');
 await c.ev('window.scrollTo(0,720)'); await sleep(500); await c.shot('test-artifacts/mobile-rows.png');
 await c.ev("document.querySelector('#searchToggle').click()"); await sleep(300); await c.shot('test-artifacts/mobile-search-overlay.png');

 const errors=c.events.filter(e=>e.method==='Runtime.exceptionThrown'||(e.method==='Log.entryAdded'&&['error','warning'].includes(e.params.entry.level)));
 console.log('errors',JSON.stringify(errors.map(e=>e.params).slice(0,20),null,2).slice(0,5000));
 c.ws.close();
})().catch(e=>{console.error('ERR',e);process.exit(1);});
