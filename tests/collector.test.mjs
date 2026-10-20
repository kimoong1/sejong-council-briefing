import test from 'node:test';
import assert from 'node:assert/strict';
import {collect,parseList,parseMinutes,SOURCE_REGISTRY} from '../lib/collector.mjs';
const html=(text,state='임시회의록')=>`<h2>회의록 ${state}</h2><div id="minutesContent"><div class='spkrMBR1'><p><span class='spkrbld'>○의원 위원</span>${'수요와 선정 절차를 확인하기 위해 제출한 자료는 어떤 기준으로 작성했습니까?'.repeat(4)}</p></div><div class='spkr02'><p><span class='spkrbld'>○국장 홍길동</span>${text.repeat(5)}</p></div></div>`;
const list=(s)=>s.id==='minutes'?`<tr><td><a href='/cms/mntsViewer.do?mntsId=1'>[임시회의록] 위원회</a></td><td>2026.10.14</td></tr>`:s.id==='appendices'?`<dl><dt>회의(2026.10.14)</dt><dd><a href='/cms/CmsApndxDownload.do?apndxSn=2'>검토보고서</a></dd></dl>`:`<tr><td><a href='${s.path.replace('List.do','View.do')}?${s.id==='bills'?'billSn':'bbsSn'}=3'>자료 제목</a></td><td>2026.10.14</td></tr>`;
test('중복 수집, 임시본 본문 수정, 부분 실패 시 기존 자료 보존',async()=>{
 let answer='추가 자료를 확인하여 별도로 보고하겠습니다.',fail=false;
 const fetcher=async url=>{const spec=SOURCE_REGISTRY.find(s=>url.endsWith(s.path));if(fail&&spec?.id==='bills')return new Response('',{status:503});return new Response(spec?list(spec):html(answer));};
 const first=await collect({fetcher,now:'2026-10-20T09:00:00Z'});assert.equal(first.counts.new,7);assert.equal(first.partial,false);
 const second=await collect({fetcher,previous:first,now:'2026-10-21T09:00:00Z'});assert.equal(second.counts.new,0);assert.equal(second.counts.changed,0);
 answer='기존 답변을 정정하고 대상 기준을 다시 검토하겠습니다.';
 const third=await collect({fetcher,previous:second,now:'2026-10-22T09:00:00Z'});assert.equal(third.counts.changed,1);assert.equal(third.records.find(r=>r.source==='minutes').versions.length,1);
 fail=true;const fourth=await collect({fetcher,previous:third,now:'2026-10-23T09:00:00Z'});assert.equal(fourth.partial,true);assert.ok(fourth.records.some(r=>r.source==='bills'));assert.equal(fourth.lastSuccessAt,third.lastSuccessAt);
});
test('회의일과 수집시점 분리, 첨부 자료 메타데이터, 비공식 호스트 차단',()=>{
 const r=parseList(list(SOURCE_REGISTRY[0]),SOURCE_REGISTRY[0])[0];assert.equal(r.date,'2026-10-14');assert.equal(r.dateType,'회의일');assert.equal(r.documentState,'임시회의록');
 assert.equal(parseList(list(SOURCE_REGISTRY[2]),SOURCE_REGISTRY[2])[0].kind,'검토·예산자료');
 assert.throws(()=>parseList(`<tr><td><a href='https://bad.example/cms/mntsViewer.do?mntsId=1'>자료</a></td></tr>`,SOURCE_REGISTRY[0]));
 assert.equal(parseMinutes(html('답변을 검토하고 별도로 제출할 자료를 정리하겠습니다.')).pairs.length,1);
});
test('임시본이 정식 표시로 바뀌면 이전 브리핑 근거 지문도 바뀜',async()=>{
 let formal=false;
 const fetcher=async url=>{const spec=SOURCE_REGISTRY.find(s=>url.endsWith(s.path));return new Response(spec?list(spec).replace('[임시회의록]',formal?'':'[임시회의록]'):html('관련 내용을 검토하여 추후 근거 자료를 설명드리겠습니다.',formal?'':'임시회의록'));};
 const initial=await collect({fetcher,now:'2026-10-20T09:00:00Z'});formal=true;
 const revised=await collect({fetcher,previous:initial,now:'2026-11-20T09:00:00Z'});
 const a=initial.records.find(r=>r.source==='minutes'),b=revised.records.find(r=>r.source==='minutes');
 assert.equal(b.documentState,'공식 전자회의록');assert.notEqual(a.contentHash,b.contentHash);assert.equal(revised.counts.changed,1);assert.equal(b.versions.length,1);
});
