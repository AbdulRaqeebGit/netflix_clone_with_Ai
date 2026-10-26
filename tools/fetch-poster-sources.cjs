const pages = {
  'dune-part-two': 'Dune: Part Two',
  'dune-2021': 'Dune (2021 film)',
  'oppenheimer': 'Oppenheimer (film)',
  'interstellar': 'Interstellar (film)',
  'inception': 'Inception',
  'dark-knight': 'The Dark Knight',
  'the-batman': 'The Batman (film)',
  'spider-verse': 'Spider-Man: Across the Spider-Verse',
  'john-wick-4': 'John Wick: Chapter 4',
  'top-gun-maverick': 'Top Gun: Maverick',
  'everything-everywhere': 'Everything Everywhere All at Once',
  'parasite': 'Parasite (2019 film)',
  'joker': 'Joker (2019 film)',
  'avengers-endgame': 'Avengers: Endgame',
  'mad-max-fury-road': 'Mad Max: Fury Road',
  'whiplash': 'Whiplash (2014 film)',
  'la-la-land': 'La La Land',
  'blade-runner-2049': 'Blade Runner 2049',
  'wolf-wall-street': 'The Wolf of Wall Street (2013 film)',
  'django': 'Django Unchained',
  'shutter-island': 'Shutter Island (film)',
  'the-prestige': 'The Prestige (film)',
  'shawshank': 'The Shawshank Redemption',
  'pulp-fiction': 'Pulp Fiction',
  'the-matrix': 'The Matrix',
  'fight-club': 'Fight Club',
  'gladiator': 'Gladiator (2000 film)',
  'lotr-fellowship': 'The Lord of the Rings: The Fellowship of the Ring',
  'titanic': 'Titanic (1997 film)',
  'se7en': 'Se7en',
  'stranger-things': 'Stranger Things',
  'wednesday': 'Wednesday (TV series)',
  'breaking-bad': 'Breaking Bad',
  'game-of-thrones': 'Game of Thrones',
  'last-of-us': 'The Last of Us (TV series)',
  'money-heist': 'Money Heist',
  'dark': 'Dark (TV series)',
  'the-witcher': 'The Witcher (TV series)',
  'the-crown': 'The Crown (TV series)',
  'squid-game': 'Squid Game',
  'peaky-blinders': 'Peaky Blinders (TV series)',
  'succession': 'Succession (TV series)',
  'queens-gambit': "The Queen's Gambit (miniseries)",
  'sherlock': 'Sherlock (TV series)',
  'black-mirror': 'Black Mirror'
};
const sleep = ms => new Promise(r=>setTimeout(r,ms));
(async()=>{
  const entries = Object.entries(pages);
  const result = {};
  for (let i=0;i<entries.length;i+=20) {
    const chunk = entries.slice(i,i+20);
    const titles = chunk.map(([,t])=>t).join('|');
    const url = 'https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageimages&pithumbsize=600&pilicense=any&titles='+encodeURIComponent(titles);
    let data;
    for(let attempt=0;attempt<4;attempt++){
      try { const r=await fetch(url); if(!r.ok) throw new Error('HTTP '+r.status); data=await r.json(); break; } catch(e){ console.error('retry',e.message); await sleep(1200); }
    }
    if(!data){console.log('FAILED CHUNK',i);continue;}
    const norm = data.query?.normalized||[];
    const redir = data.query?.redirects||[];
    const pageMap = new Map(Object.values(data.query?.pages||{}).map(p=>[p.title,p]));
    // Map requested title through normalized and redirect to final
    for (const [slug, requested] of chunk) {
      let t = requested;
      const n = norm.find(x=>x.from===t); if(n) t=n.to;
      const rd = redir.find(x=>x.from===t); if(rd) t=rd.to;
      const p = pageMap.get(t);
      if(!p) { console.log('NO PAGE',slug,requested); continue; }
      if(p.missing) { console.log('MISSING',slug,requested); continue; }
      if(!p.thumbnail) { console.log('NO IMAGE',slug,requested); continue; }
      result[slug] = {page:p.title, image:p.thumbnail.source, w:p.thumbnail.width, h:p.thumbnail.height};
      console.log('OK',slug,p.title,p.thumbnail.width+'x'+p.thumbnail.height);
    }
    await sleep(500);
  }
  require('fs').writeFileSync(require('path').join(__dirname,'poster-sources.json'), JSON.stringify(result,null,2));
  console.log('TOTAL',Object.keys(result).length);
})();
