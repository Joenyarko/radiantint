const fs = require('fs');
const content = fs.readFileSync('amcharts_africa.svg', 'utf8');

// Extract all mainland + Madagascar country paths (x > 300)
const paths = [...content.matchAll(/<path id="([^"]+)" title="([^"]+)" class="land" d="([^"]+)"/g)];

const cleanedSubpaths = [];
paths.forEach(p => {
  const subpaths = p[3].split('z').filter(s => s.trim().length > 0);
  subpaths.forEach(sp => {
    const coords = [...sp.matchAll(/([0-9.]+),([0-9.]+)/g)];
    if (coords.length > 0) {
      const avgX = coords.reduce((acc, m) => acc + parseFloat(m[1]), 0) / coords.length;
      if (avgX > 300) {
        cleanedSubpaths.push(sp.trim() + 'z');
      }
    }
  });
});

const combinedD = cleanedSubpaths.join(' ');

// Coordinates bounds
const allCoords = [...combinedD.matchAll(/([0-9.]+),([0-9.]+)/g)];
const xs = allCoords.map(m => parseFloat(m[1]));
const ys = allCoords.map(m => parseFloat(m[2]));
const minX = Math.min(...xs);
const maxX = Math.max(...xs);
const minY = Math.min(...ys);
const maxY = Math.max(...ys);

const pad = 6;
const vbX = (minX - pad).toFixed(1);
const vbY = (minY - pad).toFixed(1);
const vbW = (maxX - minX + pad * 2).toFixed(1);
const vbH = (maxY - minY + pad * 2).toFixed(1);
const viewBox = `${vbX} ${vbY} ${vbW} ${vbH}`;

console.log('viewBox:', viewBox);

// Ghana coordinates specifically:
const ghanaPath = paths.find(p => p[1] === 'GH')[3];
const ghCoords = [...ghanaPath.matchAll(/([0-9.]+),([0-9.]+)/g)];
const ghXs = ghCoords.map(m => parseFloat(m[1]));
const ghYs = ghCoords.map(m => parseFloat(m[2]));
const ghCenterX = (ghXs.reduce((a,b)=>a+b,0)/ghXs.length).toFixed(1);
const ghCenterY = (ghYs.reduce((a,b)=>a+b,0)/ghYs.length).toFixed(1);
console.log('Ghana Center:', ghCenterX, ghCenterY);

// Save clean SVG snippet and path data to a JSON/file
fs.writeFileSync('assets/africa_path.json', JSON.stringify({
  viewBox,
  vbX, vbY, vbW, vbH,
  combinedD,
  ghCenterX, ghCenterY,
  ghanaD: ghanaPath
}, null, 2));

console.log('Saved assets/africa_path.json!');
