const fs=require('fs'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
class CDP{constructor(ws){this.ws=ws;this.id=0;this.pending=new Map();this.events=[];}static async connect(){const ts=await (await fetch('http://127.0.0.1:9222/json')).json();const page=ts.find(t=>t.type==='page');const ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});const c=new CDP(ws);ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&c.pending.has(m.id)){const p=c.pending.get(m.id);c.pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result)}else if(m.method)c.events.push(m)};return c;}send(method,params={}){const id=++this.id;return new Promise((res,rej)=>{this.pending.set(id,{resolve:res,reject:rej});this.ws.send(JSON.stringify({id,method,params}))})}async ev(ex){const r=await this.send('Runtime.evaluate',{expression:ex,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}async shot(f){const r=await this.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(f,Buffer.from(r.data,'base64'));console.log('shot',f);}}
(async()=>{
 const c=await CDP.connect(); await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Log.enable');
 await c.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await c.send('Page.navigate',{url:'http://127.0.0.1:8080/browse.html'}); await sleep(1800);
 console.log('user', await c.ev('NFStore.currentUser().email'));
 // notifications
 await c.ev("document.querySelector('#notificationsBtn').click()"); await sleep(350);
 console.log('notif open', await c.ev("document.querySelector('#notificationsPanel').classList.contains('is-open')"), 'items', await c.ev("document.querySelectorAll('.notification-item').length"));
 await c.shot('test-artifacts/notifications.png');
 await c.ev("document.querySelector('#markNotificationsRead').click()"); await sleep(300);
 console.log('badge hidden', await c.ev("document.querySelector('#notifDot').hidden"), 'read', await c.ev('NFStore.notificationsWereRead()'));
 await c.ev("document.querySelector('.notification-item').click()"); await sleep(500);
 console.log('notif detail open', await c.ev("document.querySelector('#detailModal').classList.contains('is-open')"), 'title', await c.ev("document.querySelector('#detailTitle').innerText"));
 await c.ev("document.querySelector('#detailModal [data-close]').click()"); await sleep(200);

 // player
 await c.ev("document.querySelector('.hero .btn-play').click()"); await sleep(800);
 console.log('player open', await c.ev("document.querySelector('#playerModal').classList.contains('is-open')"), 'iframe', await c.ev("!!document.querySelector('#playerBody iframe')"), 'src', await c.ev("document.querySelector('#playerBody iframe') && document.querySelector('#playerBody iframe').src"));
 await c.shot('test-artifacts/player.png');
 await c.ev("document.querySelector('#playerModal [data-close]').click()"); await sleep(300);
 console.log('iframe after close', await c.ev("!!document.querySelector('#playerBody iframe')"), 'body scroll class', await c.ev("document.body.classList.contains('no-scroll')"));

 // profile update
 await c.ev("document.querySelector('#profileBtn').click(); document.querySelector('#manageProfileBtn').click()"); await sleep(400);
 await c.ev("document.querySelectorAll('.avatar-option')[2].click(); document.querySelector('#profileNameInput').value='Ayesha K.'; document.querySelector('#profileForm').requestSubmit();"); await sleep(500);
 console.log('updated user', await c.ev("NFStore.currentUser().name"), await c.ev("NFStore.currentUser().avatar"), 'nav name', await c.ev("document.querySelector('#profilePanelName').innerText"));
 await c.shot('test-artifacts/profile-updated.png');
 // restore
 await c.ev("document.querySelector('#profileBtn').click(); document.querySelector('#manageProfileBtn').click()"); await sleep(300);
 await c.ev("document.querySelectorAll('.avatar-option')[1].click(); document.querySelector('#profileNameInput').value='Ayesha Khan'; document.querySelector('#profileForm').requestSubmit();"); await sleep(400);

 // My list view
 await c.ev("document.querySelectorAll('.nav-link[data-view-link=list]')[0].click()"); await sleep(500);
 console.log('list view cards', await c.ev("document.querySelectorAll('#viewGrid .nf-card').length"), 'title', await c.ev("document.querySelector('#viewTitle').innerText"));
 await c.shot('test-artifacts/my-list.png');

 // mobile
 await c.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true,screenWidth:390,screenHeight:844});
 await c.send('Page.navigate',{url:'http://127.0.0.1:8080/browse.html'}); await sleep(1800);
 await c.ev('window.scrollTo(0,640)'); await sleep(600); await c.shot('test-artifacts/mobile-top10-fixed.png');
 await c.ev("document.querySelector('.top10-item .nf-card').click()"); await sleep(700); await c.shot('test-artifacts/mobile-detail.png');
 await c.ev("document.querySelector('#detailModal [data-close]').click()"); await sleep(200);
 await c.send('Page.navigate',{url:'http://127.0.0.1:8080/login.html'}); await sleep(1400); await c.shot('test-artifacts/mobile-login.png');

 const errs=c.events.filter(e=>e.method==='Runtime.exceptionThrown'||(e.method==='Log.entryAdded'&&e.params.entry.level==='error'));
 console.log('ERRORS', JSON.stringify(errs.map(e=>e.params).slice(0,10),null,2).slice(0,3000));
 c.ws.close();
})().catch(e=>{console.error('ERR',e);process.exit(1)});
