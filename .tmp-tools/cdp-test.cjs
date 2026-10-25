const fs = require('fs');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.events = [];
  }
  static async connect() {
    const targets = await (await fetch('http://127.0.0.1:9222/json')).json();
    const page = targets.find(t => t.type === 'page');
    if (!page) throw new Error('No page target');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });
    const cdp = new CDP(ws);
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && cdp.pending.has(msg.id)) {
        const {resolve, reject} = cdp.pending.get(msg.id);
        cdp.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message)); else resolve(msg.result);
      } else if (msg.method) {
        cdp.events.push(msg);
      }
    };
    return cdp;
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, {resolve, reject});
      this.ws.send(JSON.stringify({id, method, params}));
    });
  }
  async evaluate(expression, awaitPromise = true) {
    const result = await this.send('Runtime.evaluate', {expression, awaitPromise, returnByValue: true, userGesture: true});
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Evaluation failed');
    return result.result.value;
  }
  async navigate(url) {
    await this.send('Page.navigate', {url});
    await sleep(1600);
  }
  async shot(file, fullPage = false) {
    const params = {format: 'png', captureBeyondViewport: fullPage};
    if (fullPage) {
      const metrics = await this.send('Page.getLayoutMetrics');
      const {width, height} = metrics.cssContentSize;
      params.clip = {x: 0, y: 0, width, height, scale: 1};
    }
    const result = await this.send('Page.captureScreenshot', params);
    fs.writeFileSync(file, Buffer.from(result.data, 'base64'));
    console.log('shot', file, fs.statSync(file).size);
  }
}

(async () => {
  const cdp = await CDP.connect();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false});

  await cdp.navigate('http://127.0.0.1:8080/login.html');
  console.log('login title', await cdp.evaluate('document.title'));
  console.log('collage imgs', await cdp.evaluate("document.querySelectorAll('.auth-collage img').length"));
  await cdp.shot('test-artifacts/login.png');

  await cdp.evaluate("document.querySelector('[data-demo-fill]').click(); document.querySelector('#loginForm').requestSubmit();");
  await sleep(1800);
  console.log('url after login', await cdp.evaluate('location.href'));
  console.log('hero', await cdp.evaluate("document.querySelector('.hero__title') && document.querySelector('.hero__title').innerText"));
  console.log('cards', await cdp.evaluate("document.querySelectorAll('.nf-card').length"));
  console.log('rows', await cdp.evaluate("document.querySelectorAll('.movie-row').length"));
  await cdp.shot('test-artifacts/browse-home.png');

  await cdp.evaluate("document.querySelector('.hero .btn-more').click();");
  await sleep(700);
  console.log('detail open', await cdp.evaluate("document.querySelector('#detailModal').classList.contains('is-open')"));
  await cdp.shot('test-artifacts/detail.png');
  await cdp.evaluate("document.querySelector('#detailModal [data-close]').click();");
  await sleep(300);

  await cdp.evaluate("document.querySelector('#searchToggle').click(); document.querySelector('#searchInput').value='Dune'; document.querySelector('#searchInput').dispatchEvent(new Event('input',{bubbles:true}));");
  await sleep(2200);
  console.log('search title', await cdp.evaluate("document.querySelector('#searchTitle').innerText"));
  console.log('search cards', await cdp.evaluate("document.querySelectorAll('#searchGrid .nf-card').length"));
  console.log('search note', await cdp.evaluate("document.querySelector('#searchNoteText').innerText"));
  await cdp.shot('test-artifacts/search.png');

  await cdp.evaluate("document.querySelectorAll('[data-view-link]')[2].click();");
  await sleep(500);
  console.log('url after movies', await cdp.evaluate('location.href'));
  console.log('view title', await cdp.evaluate("document.querySelector('#viewTitle').innerText"));
  await cdp.shot('test-artifacts/movies.png');

  const errors = cdp.events.filter(e => ['Runtime.exceptionThrown','Log.entryAdded'].includes(e.method));
  console.log('EVENTS', JSON.stringify(errors.map(e => ({method:e.method, params:e.params})).slice(0,10), null, 2).slice(0,4000));

  cdp.ws.close();
})().catch(err => { console.error('TEST ERROR', err); process.exit(1); });
