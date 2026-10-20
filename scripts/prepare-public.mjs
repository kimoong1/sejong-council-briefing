import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

// Only browser assets enter the public deployment. No Worker, state, or identity.
const out=path.resolve(process.argv[2]||'_public');
if(out===process.cwd()||out===path.resolve('web'))throw Error('Choose a separate output directory');
await fs.mkdir(out,{recursive:true});
await fs.cp('web',out,{recursive:true});
let index=await fs.readFile(path.join(out,'index.html'),'utf8');
// A Pages/browser cache must never combine new HTML with an old UI script.
for(const file of ['styles.css','data.js','intake-ui.js','app.js']){
  const bytes=await fs.readFile(path.join(out,file));
  const hash=createHash('sha256').update(bytes).digest('hex').slice(0,12);
  const versioned=file.replace(/(\.[^.]+)$/,'.'+hash+'$1');
  await fs.writeFile(path.join(out,versioned),bytes);
  index=index.replaceAll('"'+file+'"','"'+versioned+'"');
}
await fs.writeFile(path.join(out,'index.html'),index.replace('<html lang="ko">','<html lang="ko" data-mode="public">'));
await fs.writeFile(path.join(out,'.nojekyll'),'');
console.log('Public read-only files prepared in '+out);
