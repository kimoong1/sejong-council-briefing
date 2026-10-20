import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMinutes,sha256} from '../lib/collector.mjs';
import {relevantRelations,verifyRelations} from '../lib/relations.mjs';
const html=(body,temp=false)=>`<h2>${temp?'임시회의록':'공식 회의록'}</h2><div id="minutesContent"><div class='spkr02'><span class='spkrbld'>○국장</span>${body}</div></div>`;
async function fixture(){
  const currentHTML=html('마을회관 보수사업의 선정 기준을 제출하십시오. 예산 범위 내에서 읍면장과 협의하겠습니다.',true),previousHTML=html('기존 보수사업 대상과의 중복을 점검해 주십시오. 기존 지원 이력을 확인하겠습니다.');
  const current={recordId:'minutes-20',date:'2026-10-13',url:'https://council.sejong.go.kr/cms/mntsViewer.do?mntsId=20',sourceHash:await sha256('임시회의록\n'+parseMinutes(currentHTML).text),find:'마을회관 보수사업의 선정 기준',executiveFind:'예산 범위 내에서 읍면장과 협의'},previous={recordId:'minutes-10',date:'2025-06-16',url:'https://council.sejong.go.kr/cms/mntsViewer.do?mntsId=10',sourceHash:await sha256('공식 전자회의록\n'+parseMinutes(previousHTML).text),find:'기존 보수사업 대상과의 중복',executiveFind:'기존 지원 이력을 확인하겠습니다'};
  return {state:{sources:[{id:'minutes',recordIds:['minutes-20','minutes-30']}],records:[{id:'minutes-20',date:current.date,contentHash:current.sourceHash},{id:'minutes-30',date:current.date,contentHash:current.sourceHash,title:'마을회관을 활용한 게스트하우스'}]},catalog:{links:[{id:'repair',current,previous,reason:'같은 보수사업의 선정 기준 비교',question:'지원 이력을 비교해 제출할 수 있습니까?',requestedDocuments:['신청·선정 비교표']}]},currentHTML,previousHTML};
}
test('양쪽 원문 대조 통과, 같은 단어의 다른 사업은 연결하지 않음',async()=>{
  const f=await fixture(),result=await verifyRelations({...f,fetcher:async url=>new Response(url.includes('mntsId=20')?f.currentHTML:f.previousHTML)});
  assert.equal(relevantRelations(f.state,result,'minutes-20').length,1);
  assert.equal(relevantRelations(f.state,result,'minutes-30').length,0);
  assert.equal(result.links[0].current.sourceHash,f.catalog.links[0].current.sourceHash);
});
test('과거 원문 수정·근거 누락·접근 실패 시 비교를 숨기고 원 승인 지문을 보존',async()=>{
  const f=await fixture();
  const changed=await verifyRelations({...f,fetcher:async url=>new Response(url.includes('mntsId=20')?f.currentHTML:f.previousHTML.replace('확인하겠습니다','별도로 정정하겠습니다'))});
  assert.equal(changed.links[0].verification.status,'needs-review');assert.equal(relevantRelations(f.state,changed).length,0);
  assert.equal(changed.links[0].previous.sourceHash,f.catalog.links[0].previous.sourceHash);
  const missing=structuredClone(f.catalog);missing.links[0].current.find='원문에 존재하지 않는 근거 문장';
  const missingResult=await verifyRelations({...f,catalog:missing,fetcher:async url=>new Response(url.includes('mntsId=20')?f.currentHTML:f.previousHTML)});
  assert.equal(relevantRelations(f.state,missingResult).length,0);
  const failed=await verifyRelations({...f,fetcher:async()=>new Response('',{status:503})});
  assert.equal(failed.links[0].verification.status,'unavailable');assert.equal(relevantRelations(f.state,failed).length,0);
});
test('현재 판본 변경 또는 최신 목록에서 제외되면 이전 비교를 추천하지 않음',async()=>{
  const f=await fixture(),result=await verifyRelations({...f,fetcher:async url=>new Response(url.includes('mntsId=20')?f.currentHTML:f.previousHTML)});
  f.state.records[0].contentHash='new-version';assert.equal(relevantRelations(f.state,result).length,0);
  f.state.records[0].contentHash=f.catalog.links[0].current.sourceHash;f.state.sources[0].recordIds=['minutes-30'];assert.equal(relevantRelations(f.state,result).length,0);
});
