const u='https://unsplash.com/photos/sandy-path-through-dunes-with-light-m1ZIt1Z5Q-c';
fetch(u,{headers:{'User-Agent':'Mozilla/5.0'}}).then(r=>r.text()).then(t=>{
  const m=[...t.matchAll(/https:\/\/images\.unsplash\.com\/photo-[^?&"'\\]+/g)].map(x=>x[0]);
  console.log([...new Set(m)].slice(0,10).join('\n'));
  console.log('len',t.length);
}).catch(e=>console.error(e));
