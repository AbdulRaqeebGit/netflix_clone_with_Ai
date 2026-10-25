const fs=require('fs');
const path=require('path');
(async()=>{
  fs.mkdirSync('assets/fonts',{recursive:true});
  const cssUrl='https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700;800&display=swap';
  const r=await fetch(cssUrl,{headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36'}});
  let css=await r.text();
  const matches=[...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map(m=>m[1]);
  console.log('font urls',matches.length);
  const seen=new Set();
  for(const url of matches){ if(seen.has(url))continue; seen.add(url);
    const name=url.split('/').pop().split('?')[0];
    const rr=await fetch(url); const b=Buffer.from(await rr.arrayBuffer());
    fs.writeFileSync(path.join('assets/fonts',name),b);
    css=css.split(url).join('../fonts/'+name);
    console.log('saved',name,b.length);
  }
  fs.writeFileSync('assets/fonts/fonts.css',css);
  console.log('css chars',css.length);
})();
