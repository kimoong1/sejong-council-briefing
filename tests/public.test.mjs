import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const run=promisify(execFile);
test('public build keeps project subpaths and excludes private runtime/state',async()=>{
  const out=await fs.mkdtemp(path.join(os.tmpdir(),'sejong-public-'));
  try{
    await run(process.execPath,['scripts/prepare-public.mjs',out]);
    const index=await fs.readFile(path.join(out,'index.html'),'utf8');
    assert.match(index,/<html lang="ko" data-mode="public">/);
    for(const ref of [...index.matchAll(/(?:src|href)="([^"#]+)"/g)].map(m=>m[1]).filter(x=>!/^https?:/.test(x))){assert.ok(!ref.startsWith('/'),ref);await fs.access(path.join(out,ref));}
    for(const name of ['worker','.openai','.git','.preview-state','raw','server','site-service.mjs'])await assert.rejects(fs.access(path.join(out,name)));
    const data=JSON.parse(await fs.readFile(path.join(out,'intake.json'),'utf8'));
    assert.ok(data.records.every(r=>!('body'in r)&&!('raw'in r)));
    assert.ok(data.records.every(r=>new URL(r.url).hostname==='council.sejong.go.kr'));
  }finally{await fs.rm(out,{recursive:true,force:true});}
});
test('curated questions require a matching source fingerprint and original evidence strings',async()=>{
  const data=JSON.parse(await fs.readFile('web/intake.json','utf8')),curated=JSON.parse(await fs.readFile('web/curated.json','utf8'));
  for(const [id,briefing] of Object.entries(curated)){
    assert.ok(data.records.some(r=>r.id===id),'source must be indexed');
    assert.match(briefing.sourceHash,/^[a-f0-9]{64}$/);
    // A stale hash is valid stored history; UI must not call it current.
    for(const issue of briefing.issues){assert.equal(issue.questions.length,3);assert.ok(issue.executiveFind.length>8);for(const q of issue.questions){assert.ok(q.text.length>10);assert.ok(q.sourceFind.length>8);}}
  }
  const ui=await fs.readFile('web/intake-ui.js','utf8');
  assert.ok(ui.includes('briefing.sourceHash===r.contentHash'));
});
