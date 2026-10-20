import fs from 'node:fs/promises';
import path from 'node:path';
const assets={};
async function walk(dir){for(const ent of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,ent.name);if(ent.isDirectory()){await walk(file);continue;}if(ent.name==='intake.json'||ent.name==='curated.json'||ent.name==='relations.json')continue;const ext=path.extname(file),type={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.gif':'image/gif','.json':'application/json; charset=utf-8'}[ext]||'application/octet-stream';const binary=ext==='.gif';const bytes=await fs.readFile(file);assets['/'+path.relative('web',file).replaceAll('\\','/')]={type,binary,data:binary?bytes.toString('base64'):bytes.toString('utf8')};}}
await walk('web');
const collector=(await fs.readFile('lib/collector.mjs','utf8')).replace(/^export /gm,'');
const seed=await fs.readFile('web/intake.json','utf8');let curated='{}';try{curated=await fs.readFile('web/curated.json','utf8');}catch{}
const relations=await fs.readFile('web/relations.json','utf8');
const relationLogic=(await fs.readFile('lib/relations.mjs','utf8')).replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'');
const server=await fs.readFile('worker/server.mjs','utf8');
await fs.mkdir('dist/server',{recursive:true});await fs.mkdir('dist/.openai',{recursive:true});
await fs.writeFile('dist/server/index.js',`const ASSETS=${JSON.stringify(assets)};\nconst SEED=${seed};\nconst CURATED=${curated};\n${collector}\nconst RELATIONS=${relations};\n${relationLogic}\n${server}`);
await fs.copyFile('.openai/hosting.json','dist/.openai/hosting.json');
console.log(JSON.stringify({assets:Object.keys(assets).length,worker:'dist/server/index.js'}));
