/*
 * Downloads the third-party CSS/JS the site serves locally from assets/vendor.
 *
 * Usage: node tools/download-vendor.cjs
 */
const fs = require("fs");
const path = require("path");

const vendorDir = path.join(__dirname, "..", "assets", "vendor");

(async () => {
  fs.mkdirSync(vendorDir, { recursive: true });
  for (const [url, file] of [
    ["https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css", "bootstrap.min.css"],
    ["https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js", "bootstrap.bundle.min.js"]
  ]) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(url + " " + r.status);
    const b = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(path.join(vendorDir, file), b);
    console.log(file, b.length);
  }
})();
