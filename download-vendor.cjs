const fs=require('fs');
(async()=>{
 fs.mkdirSync('assets/vendor',{recursive:true});
 for (const [url,out] of [
  ['https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css','assets/vendor/bootstrap.min.css'],
  ['https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js','assets/vendor/bootstrap.bundle.min.js'],
  ['https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css','assets/vendor/bootstrap-icons.css']
 ]) {
   const r=await fetch(url); if(!r.ok) throw new Error(url+' '+r.status);
   const b=Buffer.from(await r.arrayBuffer()); fs.writeFileSync(out,b); console.log(out,b.length);
 }
})();
