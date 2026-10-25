const fs = require('fs');
const path = require('path');
const sources = JSON.parse(fs.readFileSync('poster-sources.json','utf8'));
const tv = {
  'stranger-things': 'Stranger Things',
  'wednesday': 'Wednesday',
  'breaking-bad': 'Breaking Bad',
  'game-of-thrones': 'Game of Thrones',
  'last-of-us': 'The Last of Us',
  'money-heist': 'Money Heist',
  'dark': 'Dark',
  'the-witcher': 'The Witcher',
  'the-crown': 'The Crown',
  'squid-game': 'Squid Game',
  'peaky-blinders': 'Peaky Blinders',
  'succession': 'Succession',
  'queens-gambit': "The Queen's Gambit",
  'sherlock': 'Sherlock',
  'black-mirror': 'Black Mirror'
};
const outDir = path.join('assets','img','posters');
fs.mkdirSync(outDir,{recursive:true});
const sleep = ms => new Promise(r=>setTimeout(r,ms));
async function download(url, file, attempt=0){
  try {
    const r = await fetch(url, {headers:{'User-Agent':'CineFlixDemo/1.0 (educational project)'}});
    if(!r.ok) throw new Error('HTTP '+r.status);
    const b = Buffer.from(await r.arrayBuffer());
    if(b.length < 1000) throw new Error('too small '+b.length);
    fs.writeFileSync(file,b);
    console.log('SAVED', file, b.length);
    return true;
  } catch(e) {
    if(attempt<3){ await sleep(1200*(attempt+1)); return download(url,file,attempt+1); }
    console.log('FAIL',url,e.message); return false;
  }
}
(async()=>{
  for(const [slug, info] of Object.entries(sources)){
    if(tv[slug]) continue;
    await download(info.image, path.join(outDir, slug+'.jpg'));
    await sleep(150);
  }
  for(const [slug, query] of Object.entries(tv)){
    try {
      const r = await fetch('https://api.tvmaze.com/singlesearch/shows?q='+encodeURIComponent(query));
      if(!r.ok) throw new Error('HTTP '+r.status);
      const j = await r.json();
      const url = j.image?.original || j.image?.medium;
      if(!url) throw new Error('no image');
      await download(url, path.join(outDir, slug+'.jpg'));
    } catch(e){ console.log('TV FAIL',slug,e.message); }
    await sleep(250);
  }
  await download('https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=2200&q=85','assets/img/hero-dune.jpg');
  await download('https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?auto=format&fit=crop&w=2200&q=85','assets/img/backdrop-desert-2.jpg');
  await download('https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=2200&q=85','assets/img/backdrop-city.jpg');
  await download('https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=2200&q=85','assets/img/backdrop-cinema.jpg');
})();
