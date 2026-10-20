import {parseMinutes,sha256} from './collector.mjs';

// Reviewed evidence records; a shared word alone never creates a relation.
export function relevantRelations(state,catalog,recordId=null){
  const latest=new Set(state?.sources?.find(s=>s.id==='minutes')?.recordIds||[]);
  return (catalog?.links||[]).filter(link=>{
    const record=state?.records?.find(r=>r.id===link.current?.recordId);
    return link.verification?.status==='verified'&&latest.has(record?.id)&&
      (!recordId||record.id===recordId)&&record.contentHash===link.current.sourceHash&&
      link.previous?.date<record.date&&link.reason&&link.question&&link.requestedDocuments?.length;
  });
}
export async function verifyRelations({state,catalog,fetcher=fetch,now=new Date().toISOString()}){
  const pending=new Map();
  const read=ref=>{
    const url=new URL(ref.url);
    if(url.origin!=='https://council.sejong.go.kr'||url.pathname!=='/cms/mntsViewer.do'||url.searchParams.get('mntsId')!==ref.recordId.replace('minutes-',''))throw Error('공식 회의록 ID·주소 불일치');
    if(!pending.has(ref.url))pending.set(ref.url,(async()=>{
      const response=await fetcher(ref.url,{headers:{'User-Agent':'SejongCouncilBriefing/0.4 (+public records collector)'},signal:AbortSignal.timeout(18000)});
      if(!response.ok)throw Error('HTTP '+response.status);
      const html=await response.text(),parsed=parseMinutes(html);
      const temporary=[...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)].some(m=>m[1].includes('임시회의록'));
      return {text:parsed.text,hash:await sha256((temporary?'임시회의록':'공식 전자회의록')+'\n'+parsed.text)};
    })());return pending.get(ref.url);
  };
  const links=[];
  for(const link of (catalog?.links||[]).slice(0,12)){
    let status='needs-review',reason='현재 수집 목록·판본 재검토 필요';
    const record=state.records.find(r=>r.id===link.current.recordId);
    try{
      if(record?.contentHash===link.current.sourceHash){
        const [current,previous]=await Promise.all([read(link.current),read(link.previous)]);
        if(current.hash!==link.current.sourceHash||previous.hash!==link.previous.sourceHash)reason='원문 판본 변경 · 연결 내용 재검토 필요';
        else if(![link.current.find,link.current.executiveFind].every(find=>typeof find==='string'&&find.length>=8&&current.text.includes(find))||![link.previous.find,link.previous.executiveFind].every(find=>typeof find==='string'&&find.length>=8&&previous.text.includes(find)))reason='비교 근거 문장을 확인할 수 없음';
        else {status='verified';reason='과거·현재 원문 판본과 질의·답변 근거 확인';}
      }
    }catch(error){status='unavailable';reason='원문 대조 실패: '+error.message;}
    links.push({...link,verification:{status,checkedAt:now,reason,lastVerifiedAt:status==='verified'?now:link.verification?.lastVerifiedAt||null}});
  }
  return {schemaVersion:1,checkedAt:now,policy:'양쪽 원문에서 같은 사업·기관의 비교 쟁점을 확인한 자료만 제공. 직접 후속답변·이행 완료로 간주하지 않음.',links};
}
