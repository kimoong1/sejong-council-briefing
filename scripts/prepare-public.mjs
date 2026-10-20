import fs from 'node:fs/promises';
import path from 'node:path';

// Only browser assets enter the public deployment. No Worker, state, or identity.
const out=path.resolve(process.argv[2]||'_public');
if(out===process.cwd()||out===path.resolve('web'))throw Error('Choose a separate output directory');
await fs.mkdir(out,{recursive:true});
await fs.cp('web',out,{recursive:true});
const index=await fs.readFile(path.join(out,'index.html'),'utf8');
await fs.writeFile(path.join(out,'index.html'),index.replace('<html lang="ko">','<html lang="ko" data-mode="public">'));
await fs.writeFile(path.join(out,'.nojekyll'),'');
console.log('Public read-only files prepared in '+out);
