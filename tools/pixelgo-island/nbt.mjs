import zlib from 'zlib';
// Minimal NBT reader/writer (big-endian Java edition)
export function read(buf){
  buf = buf[0]===0x1f ? zlib.gunzipSync(buf) : buf;
  let o=0;
  const rd={
    1:()=>{const v=buf.readInt8(o);o+=1;return {t:1,v}},
    2:()=>{const v=buf.readInt16BE(o);o+=2;return {t:2,v}},
    3:()=>{const v=buf.readInt32BE(o);o+=4;return {t:3,v}},
    4:()=>{const v=buf.readBigInt64BE(o);o+=8;return {t:4,v}},
    5:()=>{const v=buf.readFloatBE(o);o+=4;return {t:5,v}},
    6:()=>{const v=buf.readDoubleBE(o);o+=8;return {t:6,v}},
    7:()=>{const n=buf.readInt32BE(o);o+=4;const v=[...buf.subarray(o,o+n)].map(x=>x<<24>>24);o+=n;return {t:7,v}},
    8:()=>({t:8,v:str()}),
    9:()=>{const et=buf[o++];const n=buf.readInt32BE(o);o+=4;const v=[];for(let i=0;i<n;i++)v.push(rd[et]());return {t:9,et,v}},
    10:()=>{const v={};for(;;){const tt=buf[o++];if(tt===0)break;const k=str();v[k]=rd[tt]();}return {t:10,v}},
    11:()=>{const n=buf.readInt32BE(o);o+=4;const v=[];for(let i=0;i<n;i++){v.push(buf.readInt32BE(o));o+=4}return {t:11,v}},
    12:()=>{const n=buf.readInt32BE(o);o+=4;const v=[];for(let i=0;i<n;i++){v.push(buf.readBigInt64BE(o));o+=8}return {t:12,v}},
  };
  function str(){const n=buf.readUInt16BE(o);o+=2;const s=buf.toString('utf8',o,o+n);o+=n;return s}
  const t=buf[o++]; const name=str(); return {name, root:rd[t]()};
}
// plain JS -> tagged helpers
export const T={
  b:v=>({t:1,v}), s:v=>({t:2,v}), i:v=>({t:3,v}), l:v=>({t:4,v:BigInt(v)}), f:v=>({t:5,v}), d:v=>({t:6,v}),
  str:v=>({t:8,v}), list:(et,v)=>({t:9,et,v}), c:v=>({t:10,v}), ia:v=>({t:11,v}),
};
export function write(root,name=''){
  const parts=[];
  const w={
    1:v=>{const b=Buffer.alloc(1);b.writeInt8(v);parts.push(b)},
    2:v=>{const b=Buffer.alloc(2);b.writeInt16BE(v);parts.push(b)},
    3:v=>{const b=Buffer.alloc(4);b.writeInt32BE(v);parts.push(b)},
    4:v=>{const b=Buffer.alloc(8);b.writeBigInt64BE(BigInt(v));parts.push(b)},
    5:v=>{const b=Buffer.alloc(4);b.writeFloatBE(v);parts.push(b)},
    6:v=>{const b=Buffer.alloc(8);b.writeDoubleBE(v);parts.push(b)},
    7:v=>{w[3](v.length);parts.push(Buffer.from(v.map(x=>x&255)))},
    8:v=>{const s=Buffer.from(v,'utf8');w[2](s.length);parts.push(s)},
    9:(v,tag)=>{const et=v.length?tag.et??v[0].t:(tag.et??0);parts.push(Buffer.from([et]));w[3](v.length);for(const e of v)w[e.t](e.v,e)},
    10:v=>{for(const [k,e] of Object.entries(v)){parts.push(Buffer.from([e.t]));w[8](k);w[e.t](e.v,e)}parts.push(Buffer.from([0]))},
    11:v=>{w[3](v.length);for(const x of v)w[3](x)},
    12:v=>{w[3](v.length);for(const x of v)w[4](x)},
  };
  parts.push(Buffer.from([10]));w[8](name);w[10](root.v);
  return zlib.gzipSync(Buffer.concat(parts));
}
export function plain(tag){
  switch(tag.t){case 9:return tag.v.map(plain);case 10:{const o={};for(const[k,e]of Object.entries(tag.v))o[k]=plain(e);return o}case 4:return Number(tag.v);default:return tag.v}
}
