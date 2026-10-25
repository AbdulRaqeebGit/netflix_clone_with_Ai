const fs=require('fs'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
class CDP{constructor(ws){this.ws=ws;this.id=0;this.pending=new Map();this.events=[];}static async connect(){const ts=await (await fetch('http://127.0.0.1:9222/json')).json();const page=ts.find(t=>t.type==='page');const ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});const c=new CDP(ws);ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&c.pending.has(m.id)){const p=c.pending.get(m.id);c.pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result)}else if(m.method)c.events.push(m)};return c;}send(method,params={}){const id=++this.id;return new Promise((res,rej)=>{this.pending.set(id,{resolve:res,reject:rej});this.ws.send(JSON.stringify({id,method,params}))})}async ev(ex){const r=await this.send('Runtime.evaluate',{expression:ex,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}async nav(url){await this.send('Page.navigate',{url});await sleep(1500);}async shot(f){const r=await this.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(f,Buffer.from(r.data,'base64'));console.log('shot',f);}}
(async()=>{
 const c=await CDP.connect(); await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Log.enable'); await c.send('Network.enable');
 await c.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await c.nav('http://127.0.0.1:8080/index.html');
 await c.ev("localStorage.clear()");
 await c.nav('http://127.0.0.1:8080/signup.html');
 await c.shot('test-artifacts/signup.png');
 console.log('users before', await c.ev("NFStore.getUsers().length"));
 // submit empty to test validation
 await c.ev("document.querySelector('#signupForm').requestSubmit()"); await sleep(300);
 console.log('errors after empty submit', await c.ev("Array.from(document.querySelectorAll('.field-error')).map(e=>e.textContent)"));
 console.log('alert', await c.ev("document.querySelector('#signupAlert').textContent"));
 // valid signup
 await c.ev(`(()=>{
  const set=(id,val)=>{const el=document.querySelector(id);el.value=val;el.dispatchEvent(new Event('input',{bubbles:true}));};
  set('#signupName','Bilal Ahmed');set('#signupEmail','bilal@example.com');set('#signupPassword','Test@1234');set('#signupConfirm','Test@1234');
  document.querySelector('#signupTerms').checked=true;
  document.querySelector('#signupForm').requestSubmit();
 })()`);
 await sleep(2000);
 console.log('url after signup', await c.ev('location.href'));
 console.log('session user', await c.ev("NFStore.currentUser() && NFStore.currentUser().email"));
 console.log('users after', await c.ev("NFStore.getUsers().length"));
 console.log('welcome toast', await c.ev("document.querySelector('.cine-toast') && document.querySelector('.cine-toast').innerText"));
 await c.shot('test-artifacts/browse-welcome.png');

 // sign out and forgot reset
 await c.ev("NFStore.signOut(); location.href='forgot-password.html'"); await sleep(1400);
 await c.ev("document.querySelector('#resetEmail').value='bilal@example.com'; document.querySelector('#emailStepForm').requestSubmit();"); await sleep(500);
 console.log('reset step2 active', await c.ev("document.querySelector('.reset-step[data-step=reset]').classList.contains('is-active')"));
 await c.shot('test-artifacts/forgot-step2.png');
 await c.ev("document.querySelector('#newPassword').value='NewPass@987'; document.querySelector('#confirmNewPassword').value='NewPass@987'; document.querySelector('#resetStepForm').requestSubmit();"); await sleep(400);
 console.log('reset done', await c.ev("document.querySelector('.reset-step[data-step=done]').classList.contains('is-active')"));
 console.log('reset signin href', await c.ev("document.querySelector('#resetSignIn').getAttribute('href')"));
 await c.shot('test-artifacts/forgot-done.png');
 await c.nav('http://127.0.0.1:8080/login.html?email=bilal%40example.com&reset=1');
 console.log('login prefill', await c.ev("document.querySelector('#loginEmail').value"));
 console.log('reset alert', await c.ev("document.querySelector('#loginAlert').innerText"));
 // wrong password
 await c.ev("document.querySelector('#loginPassword').value='wrongpass'; document.querySelector('#loginForm').requestSubmit();"); await sleep(600);
 console.log('wrong pass alert', await c.ev("document.querySelector('#loginAlert').innerText"));
 // correct new password
 await c.ev("document.querySelector('#loginPassword').value='NewPass@987'; document.querySelector('#loginForm').requestSubmit();"); await sleep(1800);
 console.log('url after login new pass', await c.ev('location.href'));

 // guard
 await c.ev("NFStore.signOut(); location.href='browse.html'"); await sleep(1800);
 console.log('guard url', await c.ev('location.href'));
 await c.shot('test-artifacts/login-guard.png');

 // login demo for fallback search
 await c.ev("document.querySelector('[data-demo-fill]').click(); document.querySelector('#loginForm').requestSubmit();"); await sleep(1800);
 await c.ev("document.querySelector('#searchToggle').click(); const i=document.querySelector('#searchInput'); i.value='Batman'; i.dispatchEvent(new Event('input',{bubbles:true}));"); await sleep(1800);
 console.log('online search note', await c.ev("document.querySelector('#searchNoteText').innerText"), 'cards', await c.ev("document.querySelectorAll('#searchGrid .nf-card').length"));
 await c.send('Network.setBlockedURLs',{urls:['*omdbapi.com*']});
 await c.ev("document.querySelector('#searchClear').click(); const i=document.querySelector('#searchInput'); i.value='Dune'; i.dispatchEvent(new Event('input',{bubbles:true}));"); await sleep(2200);
 console.log('blocked search note', await c.ev("document.querySelector('#searchNoteText').innerText"), 'cards', await c.ev("document.querySelectorAll('#searchGrid .nf-card').length"));
 await c.shot('test-artifacts/search-fallback.png');
 await c.send('Network.setBlockedURLs',{urls:[]});

 const errs=c.events.filter(e=>e.method==='Runtime.exceptionThrown'||(e.method==='Log.entryAdded'&&e.params.entry.level==='error'));
 console.log('ERRORS', JSON.stringify(errs.map(e=>e.params).slice(0,10),null,2).slice(0,3000));
 c.ws.close();
})().catch(e=>{console.error('ERR',e);process.exit(1)});
