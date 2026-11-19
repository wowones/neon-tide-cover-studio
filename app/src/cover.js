/* Original Canvas 2D port of the approved Neon Tide art direction. No dependencies. */
(() => {
'use strict';
const WHITE='#faf8f4', INK='#0a080c';
const makeCanvas=(w,h)=>Object.assign(document.createElement('canvas'),{width:Math.max(1,Math.ceil(w)),height:Math.max(1,Math.ceil(h))});
const curves={
sunset:[[[0,28],[60,66],[128,168],[200,232],[255,255]],[[0,12],[60,34],[128,92],[200,150],[255,212]],[[0,42],[60,64],[128,96],[200,120],[255,150]],1.12,1.10,1,.13],
golden:[[[0,30],[60,72],[128,175],[200,235],[255,255]],[[0,14],[60,40],[128,100],[200,158],[255,216]],[[0,40],[60,66],[128,100],[200,128],[255,158]],1.10,1.08,1,.12],
neon:[[[0,26],[60,64],[128,150],[200,224],[255,255]],[[0,8],[60,22],[128,62],[200,120],[255,188]],[[0,50],[60,92],[128,160],[200,210],[255,240]],1.25,1.18,.85,.10],
teal:[[[0,10],[60,28],[128,74],[200,132],[255,200]],[[0,26],[60,62],[128,132],[200,190],[255,235]],[[0,42],[60,82],[128,152],[200,205],[255,240]],1.18,1.08,1,.12]};
const lut=p=>Uint8Array.from({length:256},(_,i)=>{let j=0;while(j<p.length-2&&i>p[j+1][0])j++;return p[j][1]+(p[j+1][1]-p[j][1])*(i-p[j][0])/(p[j+1][0]-p[j][0]);});
const cache=new WeakMap();
function graded(image,grade){
 let entries=cache.get(image);if(!entries){entries={};cache.set(image,entries);}if(entries[grade])return entries[grade];
 const scale=Math.min(1,1400/Math.max(image.naturalWidth,image.naturalHeight));const c=makeCanvas(image.naturalWidth*scale,image.naturalHeight*scale),x=c.getContext('2d',{willReadFrequently:true});x.drawImage(image,0,0,c.width,c.height);
 const conf=curves[grade]||curves.sunset,m=conf.slice(0,3).map(lut),d=x.getImageData(0,0,c.width,c.height),a=d.data;
 // PIL Color uses ITU-R 601 luminance; contrast blends against the image mean.
 let mean=0;for(let i=0;i<a.length;i+=4){for(let j=0;j<3;j++)a[i+j]=m[j][a[i+j]];mean+=.299*a[i]+.587*a[i+1]+.114*a[i+2];}mean/=a.length/4;
 for(let i=0;i<a.length;i+=4){const l=.299*a[i]+.587*a[i+1]+.114*a[i+2],t=Math.floor(i/4/c.width)/c.height,ov=[233+22*t,60+80*t,140-80*t];for(let j=0;j<3;j++){const sat=Math.max(0,Math.min(255,l+(a[i+j]-l)*conf[3]));const con=Math.max(0,Math.min(255,mean+(sat-mean)*conf[4]))*conf[5];a[i+j]=con*(1-conf[6])+ov[j]*conf[6];}}
 x.putImageData(d,0,0);return entries[grade]=c;
}
function polygon(c,p){c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();}
function star(c,x,y,r,color,n=5,inner=.45){let p=[];for(let i=0;i<n*2;i++){const a=-Math.PI/2+i*Math.PI/n,rr=i%2?r*inner:r;p.push([x+Math.cos(a)*rr,y+Math.sin(a)*rr]);}polygon(c,p);c.fillStyle=color;c.fill();}
function palm(c,x,y,s){const tx=x+6*s,ty=y-72*s;c.fillStyle='#16081a';polygon(c,[[x-5*s,y],[x+5*s,y],[tx+2*s,ty],[tx-2*s,ty]]);c.fill();for(const ang of [-175,-145,-115,-85,-55,-25,5]){const a=ang*Math.PI/180,L=50*s,upper=[],lower=[];for(let k=0;k<=10;k++){const t=k/10,px=tx+Math.cos(a)*L*t,py=ty+Math.sin(a)*L*t*.62+.55*L*t*t,wd=7*s*(1-t*.85),pa=a+Math.PI/2;upper.push([px+Math.cos(pa)*wd,py+Math.sin(pa)*wd]);lower.push([px-Math.cos(pa)*wd,py-Math.sin(pa)*wd]);}polygon(c,upper.concat(lower.reverse()));c.fill();}}
function getPanels(w,h,layout='keyart',footer=true){
 const S=w/1080,H=h/S,m=24,bottom=footer?H*(H>900?.652:.66):H-110,top=24,gap=12;
 let p=[];const left=m,right=1080-m;
 if(layout==='triple'){const cell=(right-left-2*gap)/3;for(let i=0;i<3;i++){const x=left+i*(cell+gap);p.push([[x,top],[x+cell,top],[x+cell+(!i?18:i===1?9:0),bottom],[x+(i?18:0),bottom]]);}}
 else if(layout==='poster'){let mid=H>900?bottom*.52:bottom*.50;for(let row=0;row<2;row++)for(let col=0;col<2;col++){let y0=row?mid+gap:top,y1=row?bottom:mid,x0=col?548:24,x1=col?1056:536;p.push([[x0, y0],[x1,y0],[x1+(col?0:18),y1],[x0+(col?18:0),y1]]);}}
 else{const div=H>900?634:650,lean=24,edge=y=>div+6+(y-top)/(bottom-top)*lean;p.push([[24,top],[div-6,top],[div-6+lean,bottom],[24,bottom]]);for(let i=0;i<3;i++){const y0=top+i*(bottom-top+gap)/3,y1=top+(i+1)*(bottom-top+gap)/3-gap;p.push([[edge(y0),y0],[1056,y0],[1056,y1],[edge(y1),y1]]);}}
 return p.map(points=>{points=points.map(p=>p.map(n=>n*S));const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);return {points,bounds:{x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)}};});
}
function fit(c,text,font,start,max){let size=start;while(size>2){c.font=`${size}px ${font}`;if(c.measureText(text).width+size*.24<max)break;size-=1;}return size;}
function title(c,text,y,maxw,start=150,centerX=540){text=(text||'').toUpperCase();if(!text)return;const size=fit(c,text,'Archivo',start,maxw-36),tw=c.measureText(text).width,depth=Math.max(6,size*.155);c.save();c.translate(centerX-tw/2,y);c.transform(1,0,.20,1,0,0);c.textBaseline='top';c.lineJoin='round';c.shadowColor='#100515aa';c.shadowBlur=12;c.shadowOffsetY=10;c.fillStyle='#100515aa';c.fillText(text,-depth*.5,depth);c.shadowColor='transparent';
 for(let i=Math.ceil(depth);i>0;i--){const t=i/depth;c.fillStyle=`rgb(${122-64*t},${30-14*t},${110-38*t})`;c.fillText(text,-i*.5,i);}c.shadowColor='transparent';c.lineWidth=Math.max(3,size*.06);c.strokeStyle=WHITE;c.strokeText(text,0,0);let grad=c.createLinearGradient(0,0,0,size);grad.addColorStop(0,'#fff6e6');grad.addColorStop(1,'#ff8a3d');c.fillStyle=grad;c.fillText(text,0,0);c.restore();return size;
}
function script(c,text,y,x=1000,start=76){c.save();const s=fit(c,text,'Dafoe',start,420);c.font=`${s}px Dafoe`;c.textAlign='right';c.textBaseline='middle';c.strokeStyle='#2a0a3a';c.lineWidth=3;c.shadowColor='#14061caa';c.shadowBlur=4;c.shadowOffsetY=4;c.strokeText(text,x,y);c.fillStyle='#ff3d9a';c.fillText(text,x,y);c.restore();}
function seal(c,x,y,r){c.save();c.translate(x,y);c.rotate(-12*Math.PI/180);star(c,0,0,r,'#ff2e93',24,.86);c.beginPath();c.arc(0,0,r*.74,0,Math.PI*2);c.fillStyle=WHITE;c.fill();for(let i=0;i<3;i++)star(c,(i-1)*r/3,-r*.385,r*.11,INK);c.fillStyle=INK;c.textAlign='center';c.textBaseline='middle';c.font=`${r*.22}px Archivo`;c.fillText('ORIGINAL',0,-2);c.font=`${r*.28}px Anton`;c.fillText('COVER ART',0,r*.33);c.restore();}
function banner(c,quote,H){const landscape=H<=900,height=landscape?48:64;c.save();c.translate(46,H>1200?78:H>900?48:H*.66-(height+2));c.rotate(-2*Math.PI/180);let size=24;c.font=`${size}px Anton`;while(c.measureText(quote).width>470&&size>8)c.font=`${--size}px Anton`;const bw=Math.min(740,220+c.measureText(quote).width);polygon(c,[[8,0],[bw,0],[bw-8,height],[0,height]]);c.fillStyle='#08060aee';c.fill();for(let i=0;i<5;i++)star(c,34+i*32, height/2, landscape?10:13,'#ffc23c');c.fillStyle=WHITE;c.textBaseline='middle';c.fillText(quote,200,height/2);c.restore();}
let noise;
function grain(c,x,y,w,h){if(!noise){noise=makeCanvas(256,256);const n=noise.getContext('2d'),d=n.createImageData(256,256);let seed=77;for(let i=0;i<d.data.length;i+=4){seed=(1664525*seed+1013904223)>>>0;const v=80+(seed%96);d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255;}n.putImageData(d,0,0);}c.save();c.globalAlpha=.05;c.fillStyle=c.createPattern(noise,'repeat');c.fillRect(x,y,w,h);c.restore();}
function drawCover(canvas,state){
 const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,S=w/1080,H=h/S,portrait=H>900,panels=getPanels(w,h,state.layout,state.footer),bottom=(state.footer?H*(portrait?.652:.66):H-110);c.setTransform(1,0,0,1,0,0);c.fillStyle=WHITE;c.fillRect(0,0,w,h);
 panels.forEach((p,i)=>{const ps=state.panels?.[i]||{photo:i%(state.photos?.length||1),x:.5,y:.4,zoom:1},entry=state.photos?.[ps.photo]||state.photos?.[0],image=entry?.image;if(!image)return;const mode=state.grade==='sunset'?['sunset','golden','neon','teal'][i%4]:state.grade,im=graded(image,mode),b=p.bounds;
 // Detail panels echo the original lower car and water crops, independently editable.
 const landscape=!portrait,sourceY=landscape?0:i===2?.42:i===3?.46:0,sh=im.height*(1-sourceY),scale=Math.max(b.w/im.width,b.h/sh)*(ps.zoom||1),dw=im.width*scale,dh=sh*scale,defaultFocus=landscape&&(i===2||i===3)&&Math.abs((ps.y??.55)-.55)<.001?(i===3?.62:0):ps.y??.4,dx=b.x-(dw-b.w)*(ps.x??.5),dy=b.y-(dh-b.h)*(portrait?defaultFocus:defaultFocus*.25);
 c.save();polygon(c,p.points);c.clip();c.drawImage(im,0,im.height*sourceY,im.width,sh,dx,dy,dw,dh);c.restore();});
 c.scale(S,S);if(state.grain)grain(c,24,24,1032,bottom-24);
 if(state.review)banner(c,state.quote||'',H);if(state.seal)seal(c,portrait?972:560,portrait?120:92,portrait?72:52);
 const ty=portrait?bottom*.675:bottom*.47;const ts=title(c,state.title,ty,portrait?830:570,portrait?150:102,portrait?540:305)||100;script(c,state.subtitle||'',portrait?Math.min(bottom-65,ty+ts*1.60):bottom-102,portrait?1000:600,portrait?76:58);
 const creditH=portrait?92:64,creditY=H-24-creditH;
 if(state.footer){const fy=bottom+(portrait?25:14),fh=creditY-fy-5;let g=c.createLinearGradient(0,fy,0,fy+fh);g.addColorStop(0,'#e91e8c');g.addColorStop(1,'#ff6b35');c.fillStyle=g;c.fillRect(24,fy,1032,fh);
 const tag=(state.tagline||'').toUpperCase();c.save();const fs=fit(c,tag,'Anton',portrait?42:28,920);c.font=`${fs}px Anton`;c.textAlign='center';c.textBaseline='top';c.fillStyle=WHITE;if('letterSpacing'in c)c.letterSpacing='3px';fit(c,tag,'Anton',fs,920);c.fillText(tag,540,fy+(portrait?52:20),940);c.restore();
 const r=portrait?Math.max(20,Math.min(88,(fh-111)/2)):Math.min(88,fh*.31),cx=180,cy=portrait?fy+97+r:fy+fh*.57;g=c.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,'#ffd660');g.addColorStop(1,'#ff9032');c.fillStyle=g;c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.fill();for(let k=0;k<6;k++){const yy=cy+8+k*r*.17;if(yy>cy+r)break;const t=(yy-fy)/fh;c.fillStyle=`rgb(${233+22*t},${30+77*t},${140-87*t})`;c.fillRect(cx-r,yy,2*r,r*.08);}const horizon=fy+fh-14,ps=Math.max(.15,Math.min(1.15,(fh-64)/95));for(let px=360;px<990;px+=95)palm(c,px,horizon,ps);
 }
 c.fillStyle='#08060a';c.fillRect(24,creditY,1032,creditH);const chip=portrait?60:42,cx=40,cy=creditY+(creditH-chip)/2;c.fillStyle='#ff2e93';c.beginPath();c.roundRect(cx,cy,chip,chip,10);c.fill();c.font=`${chip*.49}px Archivo`;c.fillStyle=WHITE;c.textBaseline='middle';c.fillText('VC',cx+chip*.18,cy+chip*.54);
 const credit=`${(state.title||'VICE COAST').toUpperCase()}: A COVER STUDIO PICTURE · STARRING YOU · SHOT ON YOUR CAMERA · GRADED BY HAND · CAT. VC-NC-0626`;fit(c,credit,'Anton',portrait?17:13,780-(portrait?0:20));c.fillStyle='#dcd7e1';c.fillText(credit,portrait?120:100,creditY+creditH*.56);let seed=7,x=930;c.fillStyle=WHITE;while(x<1034){seed=(seed*16807)%2147483647;let wd=[2,3,4,2,5][seed%5];c.fillRect(x,creditY+creditH*.26,wd,creditH*.46);x+=wd+2+seed%3;}c.font=`${portrait?12:9}px Anton`;c.fillStyle='#c8c3cd';c.fillText('VICE COAST',930,creditY+creditH*.89);c.setTransform(1,0,0,1,0,0);return panels;
}
window.CoverStudio={drawCover,getPanels};
})();
