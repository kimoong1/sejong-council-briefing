import fs from 'node:fs/promises';
import {verifyRelations} from '../lib/relations.mjs';
export async function checkRelations(state){
  let catalog;try{catalog=JSON.parse(await fs.readFile('web/relations.json','utf8'));}catch{return null;}
  const result=await verifyRelations({state,catalog});
  await fs.writeFile('web/relations.json.tmp',JSON.stringify(result,null,2));await fs.rename('web/relations.json.tmp','web/relations.json');
  return {verified:result.links.filter(l=>l.verification.status==='verified').length,total:result.links.length};
}
