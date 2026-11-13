import fs from 'fs'; import zlib from 'zlib';
export function decode(buf){
  let o=8,w,h,bd,ct,pal=null,trns=null;const idat=[];
  while(o<buf.length){const len=buf.readUInt32BE(o);const type=buf.toString('ascii',o+4,o+8);const d=buf.subarray(o+8,o+8+len);o+=12+len;
    if(type==='IHDR'){w=d.readUInt32BE(0);h=d.readUInt32BE(4);bd=d[8];ct=d[9];}
    else if(type==='PLTE')pal=d;else if(type==='tRNS')trns=d;else if(type==='IDAT')idat.push(d);else if(type==='IEND')break;}
  const raw=zlib.inflateSync(Buffer.concat(idat));
  const ch={0:1,2:3,3:1,4:2,6:4}[ct];const bpp=Math.max(1,ch*bd/8);const stride=Math.ceil(w*ch*bd/8);
  const out=Buffer.alloc(w*h*4);let prev=Buffer.alloc(stride);let p=0;
  for(let y=0;y<h;y++){const f=raw[p++];const line=Buffer.from(raw.subarray(p,p+stride));p+=stride;
    for(let i=0;i<stride;i++){const a=i>=bpp?line[i-bpp]:0,b=prev[i],c=i>=bpp?prev[i-bpp]:0;let v=line[i];
      if(f===1)v+=a;else if(f===2)v+=b;else if(f===3)v+=(a+b)>>1;else if(f===4){const pp=a+b-c,pa=Math.abs(pp-a),pb=Math.abs(pp-b),pc=Math.abs(pp-c);v+=(pa<=pb&&pa<=pc)?a:(pb<=pc?b:c);}line[i]=v&255;}
    for(let x=0;x<w;x++){let r,g,bb,al=255;
      const sample=(idx)=>{if(bd===8)return line[idx];if(bd===16)return line[idx*2];const per=8/bd;const byte=line[Math.floor(idx/per)];const sh=(per-1-idx%per)*bd;return (byte>>sh)&((1<<bd)-1)};
      if(ct===3){const ix=sample(x);r=pal[ix*3];g=pal[ix*3+1];bb=pal[ix*3+2];al=trns&&ix<trns.length?trns[ix]:255;}
      else if(ct===2){r=sample(x*3);g=sample(x*3+1);bb=sample(x*3+2);}
      else if(ct===6){r=sample(x*4);g=sample(x*4+1);bb=sample(x*4+2);al=sample(x*4+3);}
      else if(ct===0){r=g=bb=sample(x)*(bd<8?255/((1<<bd)-1):1);}
      else if(ct===4){r=g=bb=sample(x*2);al=sample(x*2+1);}
      out.set([r,g,bb,al],(y*w+x)*4);}
    prev=line;}
  return {w,h,data:out};
}
function crc32(b){let c,crc=~0;for(const x of b){c=(crc^x)&255;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;crc=(crc>>>8)^c}return ~crc>>>0}
export function encode(w,h,data){
  const raw=Buffer.alloc((w*4+1)*h);for(let y=0;y<h;y++){raw[y*(w*4+1)]=0;data.copy(raw,y*(w*4+1)+1,y*w*4,(y+1)*w*4)}
  const chunk=(t,d)=>{const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(t),d]);const c=Buffer.alloc(4);c.writeUInt32BE(crc32(td));return Buffer.concat([l,td,c])};
  const ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
// montage: files[], cell size, cols
export function montage(files,out,cell=48,cols=8){
  const rows=Math.ceil(files.length/cols);const W=cols*(cell+4),H=rows*(cell+4);const d=Buffer.alloc(W*H*4,0);
  for(let i=0;i<d.length;i+=4){d[i]=d[i+1]=d[i+2]=200;d[i+3]=255}
  files.forEach((f,i)=>{try{const im=decode(fs.readFileSync(f));const ox=(i%cols)*(cell+4)+2,oy=Math.floor(i/cols)*(cell+4)+2;const hh=Math.min(im.h,im.w);
    for(let y=0;y<cell;y++)for(let x=0;x<cell;x++){const sx=Math.floor(x*im.w/cell),sy=Math.floor(y*hh/cell);const si=(sy*im.w+sx)*4;const a=im.data[si+3]/255;const di=((oy+y)*W+ox+x)*4;for(let c=0;c<3;c++)d[di+c]=Math.round(im.data[si+c]*a+d[di+c]*(1-a));}}catch(e){console.error(f,e.message)}});
  fs.writeFileSync(out,encode(W,H,d));
}
