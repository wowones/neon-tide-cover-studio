/* Vice Coast's print compositor. Coordinates are in a short-edge 1080 design space. */
(() => {
  'use strict';
  const white = '#faf8f4', paper = '#f8f6f0', ink = '#0a080c';
  const pink = '#ff2e93', gold = '#ffc23c';
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  let fontPromise;
  function loadFonts() {
    return fontPromise ??= (async () => {
      const faces = {
        ViceArchivo: 'ArchivoBlack-Regular.ttf', ViceAnton: 'Anton-Regular.ttf',
        ViceScript: 'MrDafoe-Regular.ttf', VicePacifico: 'Pacifico-Regular.ttf'
      };
      await Promise.all(Object.entries(faces).map(async ([name, file]) => {
        // Chrome treats file origins as opaque. The byte copy is used only in file mode.
        const bytes = location.protocol === 'file:' && window.ViceAssets?.[file];
        const face = new FontFace(name, bytes ? Uint8Array.from(atob(bytes), c => c.charCodeAt(0)) : `url("./fonts/${file}")`);
        document.fonts.add(await face.load());
      }));
      await document.fonts.ready;
    })();
  }

  const knots = [0, 60, 128, 200, 255];
  function lut(values) {
    return Uint8Array.from({ length: 256 }, (_, x) => {
      const j = Math.max(1, knots.findIndex(k => k >= x));
      return values[j - 1] + (values[j] - values[j - 1]) * (x - knots[j - 1]) / (knots[j] - knots[j - 1]);
    });
  }
  const grades = Object.fromEntries(Object.entries({
    sunset: [[28,66,168,232,255],[12,34,92,150,212],[42,64,96,120,150],1.12,1.10,1,.13],
    golden: [[30,72,175,235,255],[14,40,100,158,216],[40,66,100,128,158],1.10,1.08,1,.12],
    neon: [[28,66,158,228,255],[12,30,80,138,204],[46,78,126,170,204],1.14,1.10,.96,.14],
    teal: [[24,56,128,204,246],[22,52,112,174,224],[42,74,128,176,212],1.10,1.08,1,.16]
  }).map(([name, [r,g,b,...rest]]) => [name, [lut(r),lut(g),lut(b),...rest]]));

  function gradePixels(ctx, w, h, name, flare) {
    const [red, green, blue, sat, contrast, brightness, overlay] = grades[name];
    const pixels = ctx.getImageData(0, 0, w, h), d = pixels.data;
    let mean = 0;
    for (let i = 0; i < d.length; i += 4) {
      const r = red[d[i]], g = green[d[i + 1]], b = blue[d[i + 2]];
      const y = (r * 299 + g * 587 + b * 114 + 500) / 1000 | 0;
      d[i] = clamp(y + (r - y) * sat | 0, 0, 255);
      d[i + 1] = clamp(y + (g - y) * sat | 0, 0, 255);
      d[i + 2] = clamp(y + (b - y) * sat | 0, 0, 255);
      mean += (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114 + 500) / 1000 | 0;
    }
    mean = Math.round(mean / (w * h));
    const tone = Uint8Array.from({ length: 256 }, (_, i) => clamp(mean + (i - mean) * contrast | 0, 0, 255) * brightness);
    for (let y = 0, i = 0; y < h; y++) {
      const t = y / h, r = (233 + 22 * t) * overlay, g = (60 + 80 * t) * overlay, b = (140 - 80 * t) * overlay;
      const beam = flare ? Math.exp(-0.5 * ((t - flare) / .027) ** 2) * .027 : 0;
      for (let x = 0; x < w; x++, i += 4) {
        const rr = tone[d[i]] * (1 - overlay) + r, gg = tone[d[i + 1]] * (1 - overlay) + g, bb = tone[d[i + 2]] * (1 - overlay) + b;
        const light = beam * (1 - Math.abs(x / w - .5) * .8);
        d[i] = rr + (255 - rr) * light;
        d[i + 1] = gg + (255 - gg) * light * .8;
        d[i + 2] = bb + (255 - bb) * light * .5;
      }
    }
    ctx.putImageData(pixels, 0, 0);
  }

  function polygon(ctx, points) {
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) (i ? ctx.lineTo : ctx.moveTo).call(ctx, ...points[i]);
    ctx.closePath();
  }
  function geometry(layout, wide, left, right, top, bottom) {
    const h = bottom - top, w = right - left, gap = 6;
    const q = (l,r,t,b) => [[l(t),t],[r(t),t],[r(b),b],[l(b),b]];
    const L = () => left, R = () => right;
    const seam = (f, lean) => y => left + w * f + lean * (y - top) / h;
    const edge = (s,d) => y => s(y) + d;
    if (layout === 'triple') {
      const a = seam(.308, 29), b = seam(.687, 29);
      return [q(L,edge(a,-gap),top,bottom), q(edge(a,gap),edge(b,-gap),top,bottom), q(edge(b,gap),R,top,bottom)];
    }
    if (layout === 'poster') {
      const a = seam(.49, 26), y = top + h * .48;
      return [q(L,edge(a,-gap),top,y-gap), q(edge(a,gap),R,top,y-gap), q(L,edge(a,-gap),y+gap,bottom), q(edge(a,gap),R,y+gap,bottom)];
    }
    const a = seam(wide ? (1056 / 1872) : (610 / 1032), wide ? 20 : 24);
    if (wide) {
      const b = () => left + w * (1470 / 1872), y = top + h * (372 / 746);
      return [q(L,edge(a,-gap),top,bottom), q(edge(a,gap),edge(b,-gap),top,y-gap), q(edge(b,gap),R,top,y-gap),
        q(edge(a,gap),edge(b,-gap),y+gap,bottom), q(edge(b,gap),R,y+gap,bottom)];
    }
    const y = top + h * (276 / 856), y2 = top + h * (568 / 856);
    return [q(L,edge(a,-gap),top,bottom), q(edge(a,gap),R,top,y-gap), q(edge(a,gap),R,y+gap,y2-gap), q(edge(a,gap),R,y2+gap,bottom)];
  }

  const panelCache = new WeakMap();
  function panel(ctx, quad, i, count, wide, state, scale) {
    const x = Math.min(...quad.map(p => p[0])), y = Math.min(...quad.map(p => p[1]));
    const w = Math.max(...quad.map(p => p[0])) - x, h = Math.max(...quad.map(p => p[1])) - y;
    const bounds = {x:x*scale,y:y*scale,w:w*scale,h:h*scale};
    const { photos } = state, setting = state.panels?.[i];
    const approved = state.layout === 'keyart' && photos[0]?.sample === 'boulevard' && photos[1]?.sample === 'pier' && photos.length === 2;
    const pierLead = state.layout === 'keyart' && wide && photos[0]?.sample === 'pier' && photos[1]?.sample === 'boulevard' && photos.length === 2;
    const feed = wide ? [0,1,0,0,1] : [0,1,0,1];
    const accents = count === 3 ? ['sunset','neon','teal'] : count === 5 ? ['sunset','golden','sunset','neon','teal'] : ['sunset','golden','neon','teal'];
    const name = (state.grade && state.grade !== 'sunset' && grades[state.grade]) ? state.grade : accents[i];
    const defaultPhoto = approved ? feed[i] : i % (photos.length || 1);
    const photo = photos[setting?.photo] ? setting.photo : defaultPhoto;
    const correctSample = approved && photo === defaultPhoto;
    const scenicAccent = wide && (correctSample || pierLead && photo === defaultPhoto) && i === 3;
    const focusX = setting?.x ?? (scenicAccent ? 0 : photos.length === 1 ? [.5,.28,.73,.46,.65][i] : .5);
    const focusY = setting?.y ?? (wide && (correctSample || pierLead) ? 0 : correctSample ? [.4,.34,.45,.5][i] : [.29,.28,.40,.43,.33][i]);
    const zoom = Math.max(1, setting?.zoom ?? (photos.length === 1 && i ? [1,1.18,1.35,1.23,1.34][i] : 1));
    let overflowX = 0, overflowY = 0;
    const src = photos[photo]?.image;
    if (src) {
      const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
      const sampleAccent = correctSample || pierLead && photo === defaultPhoto;
      // Landscape cells need the full source headroom, not the portrait detail crops.
      const top = sampleAccent && !wide ? (accents[i] === 'neon' ? .42 : accents[i] === 'teal' ? .46 : 0) : 0;
      // The title crosses this lower cell: use the palm/sky detail rather than hiding a face.
      const end = scenicAccent ? .25 : correctSample && wide && i === 2 ? .42 : 1;
      const sy = Math.floor(sh * top), sourceH = Math.floor(sh * end) - sy;
      const ratio = Math.max(w / sw, h / sourceH) * zoom;
      overflowX = Math.max(0, sw * ratio - w) * scale;
      overflowY = Math.max(0, sourceH * ratio - h) * scale;
      const pw = Math.max(1,Math.ceil(w * scale)), ph = Math.max(1,Math.ceil(h * scale));
      const flare = correctSample && i === 1 ? (wide ? .245 : .296) : 0;
      const key = [pw,ph,w,h,name,sy,sourceH,focusX,focusY,zoom,flare].join(':');
      let cache = panelCache.get(src);
      if (!cache) panelCache.set(src, cache = new Map());
      let tile = cache.get(key);
      if (!tile) {
        tile = document.createElement('canvas'); tile.width = pw; tile.height = ph;
        const t = tile.getContext('2d', {willReadFrequently:true});
        t.fillStyle = '#281634'; t.fillRect(0,0,pw,ph);
        t.imageSmoothingQuality = 'high';
        t.drawImage(src, (sw - w / ratio) * focusX, sy + (sourceH - h / ratio) * focusY, w / ratio, h / ratio, 0,0,pw,ph);
        gradePixels(t, pw, ph, name, flare);
        if (cache.size >= 10) cache.delete(cache.keys().next().value);
        cache.set(key, tile);
      }
      ctx.save(); polygon(ctx,quad); ctx.clip(); ctx.drawImage(tile,x,y,w,h); ctx.restore();
    } else {
      ctx.fillStyle = gradient(ctx,y,y+h,['#351942','#ad395b']); polygon(ctx,quad); ctx.fill();
    }
    return { quad:quad.map(([a,b]) => [a*scale,b*scale]),bounds,overflowX,overflowY,focusX,focusY,zoom,photo };
  }

  function gradient(ctx, top, bottom, colors) {
    const g = ctx.createLinearGradient(0,top,0,bottom);
    colors.forEach((c,i) => g.addColorStop(i / (colors.length - 1), c));
    return g;
  }
  let noise;
  function grain(ctx, x, y, w, h) {
    if (!noise) {
      noise = document.createElement('canvas'); noise.width = noise.height = 256;
      const n = noise.getContext('2d'), im = n.createImageData(256,256);
      let seed = 112358;
      const random = () => ((seed = Math.imul(seed,1664525) + 1013904223 | 0) >>> 0) / 4294967296;
      for (let i = 0; i < im.data.length; i += 4) {
        const v = 128 + 42 * (random()+random()+random()+random()+random()+random()-3) * Math.SQRT2;
        im.data[i] = im.data[i+1] = im.data[i+2] = v; im.data[i+3] = 255;
      }
      n.putImageData(im,0,0);
    }
    ctx.save(); ctx.globalAlpha = .05; ctx.fillStyle = ctx.createPattern(noise,'repeat'); ctx.fillRect(x,y,w,h); ctx.restore();
  }

  function star(ctx,x,y,r,color,n=5,inner=.45,angle=-Math.PI/2) {
    polygon(ctx,Array.from({length:n*2},(_,i) => {
      const a = angle+i*Math.PI/n, m = i%2 ? r*inner : r;
      return [x+Math.cos(a)*m,y+Math.sin(a)*m];
    }));
    ctx.fillStyle = color; ctx.fill();
  }
  function type(ctx, family, size) { ctx.font = `${size}px ${family}, sans-serif`; }
  function fit(ctx,text,family,size,available) {
    type(ctx,family,size);
    const measure = ctx.measureText(text);
    const width = Math.max(measure.width,measure.actualBoundingBoxLeft+measure.actualBoundingBoxRight);
    if (width > available) type(ctx,family,size *= available / width);
    return size;
  }
  function atTop(ctx,text,x,y) { ctx.fillText(text,x,y+ctx.measureText(text).actualBoundingBoxAscent); }
  function centered(ctx,text,x,y) {
    ctx.textAlign = 'center';
    const m = ctx.measureText(text);
    ctx.fillText(text,x,y+(m.actualBoundingBoxAscent-m.actualBoundingBoxDescent)/2);
    ctx.textAlign = 'left';
  }
  function review(ctx, text, w, wide) {
    if (!text.trim()) return;
    ctx.save();
    const left = wide ? 48 : 44, height = wide ? 68 : 64, quoteX = wide ? 212 : 200;
    fit(ctx,text,'ViceAnton',wide ? 26 : 24,Math.min(w * .67,wide ? 1030 : 705) - quoteX - 30);
    const width = ctx.measureText(text).width + quoteX + (wide ? 28 : 30);
    ctx.translate(left, (wide ? 54 : 56) + width * Math.sin(Math.PI / 90)); ctx.rotate(-Math.PI/90);
    ctx.fillStyle = 'rgba(8,6,10,.94)'; polygon(ctx,[[8,0],[width,0],[width-8,height],[0,height]]); ctx.fill();
    for (let i = 0; i < 5; i++) star(ctx,(wide ? 36 : 34)+i*(wide ? 34 : 32),height/2,wide ? 14 : 13,gold);
    const quote = ctx.measureText(text);
    ctx.fillStyle = white;
    ctx.fillText(text,quoteX,(height+quote.actualBoundingBoxAscent-quote.actualBoundingBoxDescent)/2+4);
    ctx.restore();
  }
  function seal(ctx,w,wide) {
    const r = wide ? 76 : 72, disc = r*.74;
    ctx.save(); ctx.translate(w-(wide ? 94 : 108),wide ? 110 : 120); ctx.rotate(-Math.PI/15);
    star(ctx,0,0,r,pink,24,.86,0);
    ctx.fillStyle = white; ctx.beginPath(); ctx.arc(0,0,disc,0,Math.PI*2); ctx.fill();
    for (let i = -1; i <= 1; i++) star(ctx,i*24,-disc*.52,8,ink);
    fit(ctx,'ORIGINAL','ViceArchivo',24,disc*1.6); ctx.fillStyle = ink; centered(ctx,'ORIGINAL',0,-4);
    type(ctx,'ViceAnton',20); centered(ctx,'COVER ART',0,disc*.44);
    ctx.restore();
  }

  function title(ctx,text,w,collageBottom,wide,portrait,limitBottom) {
    const depth = wide ? 21 : 16, shear = .2;
    const anchor = portrait ? 609 : wide ? 500 : 488;
    const preferredTop = anchor + (collageBottom - (portrait ? 880 : wide ? 770 : 705)) * .69;
    if (!text.trim()) return preferredTop + (wide ? 136 : 80);
    const max = Math.min(w - 90, wide ? 1292 : 752);
    // Bound the face, mitered outline, extrusion AND shadow, in design pixels.
    // Keep the approved anchor when possible; shrink only if the reserved area needs it.
    const strokePad = 4.5 / 2 * 2.5, shadowPad = 8 * 2;
    const lowerEffect = Math.max(strokePad, depth + 9 + shadowPad);
    const upperEffect = Math.max(strokePad, shadowPad - depth - 9);
    const top = Math.min(preferredTop, limitBottom - lowerEffect - upperEffect - 1);
    let sz = wide ? 190 : 114;
    type(ctx,'ViceArchivo',sz);
    let m = ctx.measureText(text);
    while ((m.actualBoundingBoxRight+m.actualBoundingBoxLeft+shear*(m.actualBoundingBoxAscent+m.actualBoundingBoxDescent)+depth*.54+2*shadowPad > max ||
      m.actualBoundingBoxAscent+m.actualBoundingBoxDescent+lowerEffect > limitBottom-top) && sz > 1) {
      sz *= .98; type(ctx,'ViceArchivo',sz); m = ctx.measureText(text);
    }
    const ht = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
    const left = (w - (m.actualBoundingBoxRight+m.actualBoundingBoxLeft))/2+m.actualBoundingBoxLeft-(wide ? 17 : portrait ? 10 : 0);
    const glyph = (dx,dy,fill,stroke,blur) => {
      ctx.save(); ctx.translate(left+dx-ht*shear*.5,top+dy); ctx.transform(1,0,shear,1,0,0);
      if (blur) {ctx.shadowColor = 'rgba(10,5,15,.86)';ctx.shadowBlur = blur;ctx.shadowOffsetX = 6;ctx.shadowOffsetY = 9;}
      if (stroke) {ctx.lineJoin = 'miter';ctx.miterLimit = 2.5;ctx.lineWidth = 4.5;ctx.strokeStyle = white;ctx.strokeText(text,0,m.actualBoundingBoxAscent);}
      ctx.fillStyle = fill || gradient(ctx,-ht*.6,ht*1.6,['#fff6e6','#ff8a3d']);
      ctx.fillText(text,0,m.actualBoundingBoxAscent); ctx.restore();
    };
    glyph(-depth*.54,depth,'#31103f',false,8);
    for (let i = depth; i > 0; i--) {
      const t = i / depth;
      const facet = t < .20 ? '#843076' : t < .45 ? '#632064' : t < .78 ? '#51164f' : '#3e1046';
      glyph(-i*.54,i,facet);
    }
    // Like the reference mask, the ramp extends beyond the ink to keep the face pale and luminous.
    glyph(0,0,null,true);
    return top + ht + lowerEffect;
  }
  function script(ctx,text,w,bottom,baseline,wide) {
    if (!text.trim()) return;
    ctx.save(); fit(ctx,text,'ViceScript',wide ? 80 : 72,w*.71);
    const m = ctx.measureText(text), h = m.actualBoundingBoxAscent+m.actualBoundingBoxDescent;
    const top = Math.min(bottom-h-(wide ? 14 : 44),baseline+(wide ? 12 : 18));
    const x = w-(wide ? 125 : 96)-m.actualBoundingBoxRight, y=top+m.actualBoundingBoxAscent;
    ctx.strokeStyle = '#23092f'; ctx.lineWidth = 3.5; ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(15,5,22,.9)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3;
    ctx.strokeText(text,x,y); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.fillStyle = '#ff3d9a'; ctx.fillText(text,x,y); ctx.restore();
  }

  function palm(ctx,x,y,s) {
    const tx=x+6*s, ty=y-72*s;
    ctx.fillStyle = '#16081a';
    polygon(ctx,[[x-5*s,y],[x+5*s,y],[tx+2*s,ty],[tx-2*s,ty]]); ctx.fill();
    for (const ang of [-175,-145,-115,-85,-55,-25,5]) {
      const a=ang*Math.PI/180,L=50*s,p=a+Math.PI/2,upper=[],lower=[];
      for (let k=0;k<=10;k++) {
        const t=k/10, px=tx+Math.cos(a)*L*t, py=ty+Math.sin(a)*L*t*.62+.55*L*t*t, d=7*s*(1-.85*t);
        upper.push([px+Math.cos(p)*d,py+Math.sin(p)*d]); lower.push([px-Math.cos(p)*d,py-Math.sin(p)*d]);
      }
      polygon(ctx,upper.concat(lower.reverse())); ctx.fill();
    }
  }
  function footer(ctx,state,w,top,bottom,wide,portrait) {
    const band=gradient(ctx,top,bottom,['#e91e8c','#ff6b35']), h=bottom-top;
    ctx.save(); ctx.beginPath();ctx.rect(24,top,w-48,h);ctx.clip();
    ctx.fillStyle=band;ctx.fillRect(24,top,w-48,h);
    const text=(state.tagline || '').toUpperCase();
    ctx.letterSpacing=wide ? '4px' : '3px';
    fit(ctx,text,'ViceAnton',wide ? 44 : portrait ? 42 : 36,w-140);
    if (ctx.measureText(text).width > w-112) ctx.letterSpacing='0px';
    ctx.fillStyle=white;ctx.textAlign='center';atTop(ctx,text,w/2,top+(wide ? 45 : portrait ? 53 : 28));ctx.textAlign='left';ctx.letterSpacing='0px';
    const x=wide?200:180, r=wide?80:portrait?88:62, y=top+(wide?140:portrait?185:124);
    const sun=ctx.createRadialGradient(x,y,0,x,y,r);sun.addColorStop(0,'#ffd660');sun.addColorStop(1,'#ff9032');
    if (!wide) {
      ctx.fillStyle=sun;ctx.beginPath();ctx.arc(x,y,r,0,2*Math.PI);ctx.fill();
      ctx.fillStyle=band;
      for(let j=0;j<6;j++) ctx.fillRect(x-r,y+8+j*(portrait?15:12),r*2,portrait?7:5);
    }
    for(let px=wide?400:360;px<w-(wide?110:90);px+=wide?110:95) palm(ctx,px,bottom-(wide?12:14),wide?1.2:portrait?1.15:1);
    ctx.restore();
    if (wide) {
      // Cut the stripes out of the sun so the paper gutter shows through outside the footer.
      ctx.save();ctx.beginPath();
      ctx.rect(x-r,y-r,r*2,r+8);
      for(let j=0;j<5;j++) {
        const stripe = y+15+j*15, stripeEnd = Math.min(stripe+8,bottom+9);
        if(stripeEnd>stripe) ctx.rect(x-r,stripe,r*2,stripeEnd-stripe);
      }
      ctx.clip();ctx.fillStyle=sun;ctx.beginPath();ctx.arc(x,y,r,0,2*Math.PI);ctx.fill();ctx.restore();
    }
  }
  function credits(ctx,w,top,bottom,wide) {
    const h=bottom-top, chip=h>=85?60:48, cy=top+h/2+(h>=85 && !wide ? 3 : 0), bc=w-(wide?180:150);
    ctx.fillStyle='#08060a';ctx.fillRect(24,top,w-48,h);
    ctx.fillStyle=pink;ctx.beginPath();ctx.roundRect(40,cy-chip/2,chip,chip,chip/6);ctx.fill();
    type(ctx,'ViceArchivo',chip*.5);ctx.fillStyle=white;centered(ctx,'VC',40+chip/2,cy);
    const x=60+chip, credit='VICE COAST: A COVER STUDIO PICTURE · STARRING YOU · SHOT ON YOUR CAMERA · GRADED BY HAND · '+(wide?'LETTERING & SEAL ORIGINAL · ':'')+'CAT. VC-NC-0626';
    fit(ctx,credit,'ViceAnton',wide?18:17,bc-x-24);ctx.fillStyle='#dcd7e1';
    atTop(ctx,credit,x,cy-ctx.measureText(credit).actualBoundingBoxAscent/2);
    const bars=[3,4,2,5,2,3,2,4,4,3,2,5,2,3,4,2,5,3,2,3,5,2];
    ctx.fillStyle=white;
    for(let px=bc,i=0;px<w-50;i++) {
      const bw=bars[i%bars.length];ctx.fillRect(px,top+h*.24,bw,h*.49);px+=bw+(i%3+2);
    }
    type(ctx,'ViceAnton',wide?11:12);ctx.fillStyle='#c8c3cd';atTop(ctx,'VICE COAST',bc,top+h*.81);
  }

  function render(canvas,state,width=canvas.width,height=canvas.height) {
    if (canvas.width !== width) canvas.width=width;
    if (canvas.height !== height) canvas.height=height;
    const scale=Math.min(width,height)/1080,w=width/scale,h=height/scale;
    const wide=w/h>1.28,portrait=h/w>1.10;
    const base=wide ? {bottom:h-310,band:h-300,end:h-100,credits:h-90} : portrait ?
      {bottom:h-470,band:h-445,end:h-120,credits:h-115} : {bottom:h-375,band:h-357,end:h-105,credits:h-97};
    const showFooter=state.footer !== false;
    const bottom=showFooter ? base.bottom : base.credits-18;
    const ctx=canvas.getContext('2d',{alpha:false});
    ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,w,h);
    ctx.fillStyle=paper;ctx.fillRect(0,0,w,h);
    const shapes=geometry(state.layout,wide,24,w-24,24,bottom);
    const panels=shapes.map((quad,i)=>panel(ctx,quad,i,shapes.length,wide,state,scale));
    if(state.grain !== false) grain(ctx,24,24,w-48,bottom-24);
    if(state.review !== false) review(ctx,state.quote || '',w,wide);
    if(state.seal !== false) seal(ctx,w,wide);
    let titleBottom=(showFooter ? base.band : base.credits)-20;
    if(wide && (state.subtitle || '').trim()) {
      ctx.save();fit(ctx,state.subtitle,'ViceScript',80,w*.71);
      const m=ctx.measureText(state.subtitle);
      titleBottom=Math.min(titleBottom,bottom-m.actualBoundingBoxAscent-m.actualBoundingBoxDescent-14-12);
      ctx.restore();
    }
    const last=title(ctx,(state.title || '').trim().toUpperCase(),w,bottom,wide,portrait,titleBottom);
    script(ctx,state.subtitle || '',w,bottom,last,wide);
    if(showFooter) footer(ctx,state,w,base.band,base.end,wide,portrait);
    credits(ctx,w,base.credits,h-24,wide);
    ctx.resetTransform();
    return panels;
  }
  window.ViceCover = Object.freeze({loadFonts,render});
})();
