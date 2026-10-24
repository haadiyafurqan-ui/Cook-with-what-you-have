# Dish pictures

Each recipe page shows a drawing of the dish: `images/dishes/<dish-name>.jpg` (1200 × 720), and the category pages
use small copies in `images/dishes/thumbs/` (480 × 288).
They are the same drawings the app shows on its cards (`plateSvg` in `index.html`), saved as pictures
so Google and WhatsApp can show them.

A dish without a picture still gets its recipe page, just without the drawing.

## Making them again (after adding dishes or changing a drawing)

1. In PowerShell, from the project folder: `powershell -ExecutionPolicy Bypass -File tools\serve.ps1`
2. Open `http://localhost:8765/` in Chrome or Edge, open the console (F12) and paste:

```js
(async()=>{let ok=0;
const draw=async(d,W,H,q)=>{const sc=W/320,top=8,svg=plateSvg(d,D.indexOf(d)),bg=CCOL[CK.find(k=>k!="airfryer"&&inCat(d,k))]||"#F4C7B6";
 const s2=svg.includes("xmlns=")?svg:svg.replace("<svg",'<svg xmlns="http://www.w3.org/2000/svg"');const img=new Image();
 img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(s2);await img.decode();
 const c=document.createElement("canvas");c.width=W;c.height=H;const g=c.getContext("2d");g.fillStyle=bg;g.fillRect(0,0,W,H);
 g.drawImage(img,0,-top*sc,320*sc,200*sc);return new Promise(r=>c.toBlob(r,"image/jpeg",q))};
for(const d of D){const s=dslug(d[0]);
 await fetch("/__save/"+s+".jpg",{method:"POST",body:await draw(d,1200,720,.88)});
 if((await fetch("/__save/thumbs/"+s+".jpg",{method:"POST",body:await draw(d,480,288,.82)})).status==204)ok++}
console.log("saved",ok,"of",D.length)})()
```

3. Run `bash tools/build-pages.sh`, then commit `images/dishes` with the rest.

If a drawing doesn't match its dish, add the dish to the `PLK` list just above `plateSvg` in `index.html`
with the kind of picture it should get (plate, bowl, snack, sweet, cake and so on).
