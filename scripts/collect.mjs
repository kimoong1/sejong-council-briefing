import fs from 'node:fs/promises';
import path from 'node:path';
import { collect } from '../lib/collector.mjs';
import {checkRelations} from './check-relations.mjs';
const output=path.resolve(process.argv[2]||'web/intake.json');
let previous={};try{previous=JSON.parse(await fs.readFile(output,'utf8'));}catch{}
const result=await collect({previous});
await fs.mkdir(path.dirname(output),{recursive:true});
await fs.writeFile(output+'.tmp',JSON.stringify(result,null,2));await fs.rename(output+'.tmp',output);
const relations=await checkRelations(result);
console.log(JSON.stringify({checkedAt:result.checkedAt,partial:result.partial,counts:result.counts,errors:result.errors,relations}));
if(result.partial)process.exitCode=2;
