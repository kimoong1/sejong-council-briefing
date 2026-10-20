export const ORIGIN = 'https://council.sejong.go.kr';
export const SOURCE_REGISTRY = [
  {id:'minutes',name:'최근 공개 회의록',kind:'회의록',path:'/cms/mntsLatelyList.do',pattern:'mntsViewer.do',role:'임시·정식 회의록, 의원 질의와 집행부 답변'},
  {id:'bills',name:'처리의안',kind:'의안',path:'/mnu/act/billList.do',pattern:'billView.do',role:'의안 원문·심사 경과·검토 및 심사보고서'},
  {id:'appendices',name:'회의록 부록',kind:'검토·예산자료',path:'/cms/mntsApndxList.do',pattern:'CmsApndxDownload.do',role:'검토보고서·제안설명·예산·결산 부록'},
  {id:'audit',name:'행정사무감사 조치결과 게시판',kind:'감사 후속자료',path:'/mnu/cap/administrativeAffairsAuditingList.do',pattern:'administrativeAffairsAuditingView.do',role:'지적·조치결과 자료 후보. 게시판 명칭만으로 완료 여부를 판정하지 않음'},
  {id:'legislation',name:'의원발의 입법예고',kind:'입법예고',path:'/mnu/noc/lawNoticeList.do',pattern:'lawNoticeView.do',role:'조례안·제안이유·신구조문 대조 자료'},
  {id:'research',name:'연구활동 결과보고서',kind:'정책연구',path:'/mnu/act/researchReportList.do',pattern:'researchReportView.do',role:'정책 대안과 연구 결과. 본문 분석 여부는 별도 표시'},
  {id:'press',name:'의회 보도자료',kind:'보도자료',path:'/mnu/noc/reportDataList.do',pattern:'reportDataView.do',role:'쟁점 탐색 보조자료. 회의록의 대체 근거로 취급하지 않음'}
];

export function textOnly(html) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ')
    .replace(/&#x([a-f\d]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n))
    .replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/\s+/g,' ').trim();
}
export function dateFrom(text) {const m=text.match(/(20\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})/);return m?`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`:null;}
export function officialUrl(href) {const u=new URL(href.replaceAll('&amp;','&'),ORIGIN);if(u.origin!==ORIGIN)throw new Error('허용되지 않은 원문 호스트');return u.href;}
export async function sha256(text) {const a=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(a)].map(x=>x.toString(16).padStart(2,'0')).join('');}
export function parseList(html, spec) {
  const items=[],seen=new Set();
  const blocks=html.match(/<tr\b[\s\S]*?<\/tr>/gi)||[];
  if(spec.id==='appendices') blocks.push(...(html.match(/<dl\b[\s\S]*?<\/dl>/gi)||[]));
  for(const block of blocks) {
    const links=[...block.matchAll(/<a\b[^>]*href=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/a>/gi)];
    for(const [,href,label] of links){
      if(!href.includes(spec.pattern))continue;
      const title=textOnly(label);if(!title)continue;
      const url=officialUrl(href),u=new URL(url);
      const keyName=spec.id==='minutes'?'mntsId':spec.id==='bills'?'billSn':spec.id==='appendices'?'apndxSn':'bbsSn';
      const sourceId=u.searchParams.get(keyName);if(!sourceId||seen.has(sourceId))continue;
      seen.add(sourceId);
      for(const key of [...u.searchParams.keys()])if(key!==keyName)u.searchParams.delete(key);
      const plain=textOnly(block),date=dateFrom(plain);
      items.push({id:`${spec.id}-${sourceId}`,sourceId,source:spec.id,kind:spec.kind,title,url:u.href,date,
        dateType:spec.id==='minutes'||spec.id==='appendices'?'회의일':'목록 기재일',
        documentState:spec.id==='minutes'?(title.includes('임시')?'임시회의록':'공식 전자회의록'):null,
        license:'별도 오픈라이선스 미확인',analysisState:'목록·메타데이터 수집',listContext:plain.slice(0,220)});
    }
  }
  return items;
}
export function parseMinutes(html) {
  const body=html.split(/id=["']minutesContent["']/)[1]||'';
  if(!body)throw new Error('회의록 본문 구조를 확인할 수 없음');
  const blocks=[...body.matchAll(/<div\b[^>]*class=['"]spkr[^'"]*['"][^>]*>([\s\S]*?)<\/div>/gi)].map(m=>{
    const label=m[1].match(/<span\b[^>]*class=['"]spkrbld['"][^>]*>([\s\S]*?)<\/span>/i);
    const speaker=label?textOnly(label[1]).replace(/^○/,'').trim():'';
    const text=textOnly(m[1]).replace(/^○/,'').trim();
    return {speaker,text:text.startsWith(speaker)?text.slice(speaker.length).trim():text};
  }).filter(b=>b.speaker&&b.text);
  const pairs=[];
  for(let n=0;n<blocks.length-1;n++){
    const q=blocks[n],a=blocks[n+1];
    if(!/위원|의원/.test(q.speaker)||/위원장/.test(q.speaker)||q.text.length<100||!/습니까|까요|인지|자료|주시|이유|어떻게|있는지/.test(q.text))continue;
    if(/위원|의원/.test(a.speaker)||a.text.length<45||!/(국장|과장|실장|담당관|소장|시장|원장|본부장|이사장|관장|처장)/.test(a.speaker))continue;
    pairs.push({id:`pair-${n}`,questioner:q.speaker,responder:a.speaker,questionExcerpt:q.text.slice(0,180),answerExcerpt:a.text.slice(0,180),
      questionFind:q.text.slice(0,45),answerFind:a.text.slice(0,45),
      followupMention:/제출|보고|자료|검토|협의|확인/.test(a.text),followupStatus:'후속 이행 증빙 미확인'});
    if(pairs.length===3)break;
  }
  const attachments=[...html.matchAll(/<a[^>]+href=['"]([^'"]*CmsApndxDownload\.do\?apndxSn=\d+)[^'"]*['"][^>]*>([\s\S]*?)<\/a>/gi)].map(m=>({title:textOnly(m[2]),url:officialUrl(m[1]),analysisState:'첨부 링크 확인 · 본문 미분석'}));
  return {text:textOnly(body),pairs,attachments};
}
export function diffSummary(before,after){
  if(!before)return {type:'new',text:'처음 수집한 자료입니다. 원문 최초 게시일과 수집일은 다를 수 있습니다.'};
  if(before.contentHash===after.contentHash)return {type:'unchanged',text:'확인한 본문·메타데이터 변화 없음'};
  const beforePairs=before.pairs||[],afterPairs=after.pairs||[];
  return {type:'changed',text:`원문 내용 또는 문서 상태가 변경됐습니다. 이전 ${before.documentState||'자료'} → 현재 ${after.documentState||'자료'}.`,
    previousHash:before.contentHash,pairCountBefore:beforePairs.length,pairCountAfter:afterPairs.length,
    excerptsBefore:beforePairs.map(p=>({question:p.questionExcerpt,answer:p.answerExcerpt})),excerptsAfter:afterPairs.map(p=>({question:p.questionExcerpt,answer:p.answerExcerpt}))};
}

export async function collect({fetcher=fetch,previous={},storeRaw=async()=>{},now=new Date().toISOString(),maxMinutes=8}) {
  const old=new Map((previous.records||[]).map(r=>[r.id,r])),records=new Map(old),sources=[],errors=[];
  let added=0,changed=0,unchanged=0;
  const get=async url=>{
    const response=await fetcher(url,{headers:{'User-Agent':'SejongCouncilBriefing/0.2 (+public records collector)','Accept':'text/html'},signal:AbortSignal.timeout(18000)});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const text=await response.text();if(text.length>6_000_000)throw new Error('응답 크기 제한 초과');return text;
  };
  let latestMinutes=[];
  for(const spec of SOURCE_REGISTRY){
    try{
      const html=await get(ORIGIN+spec.path),items=parseList(html,spec);
      if(!items.length)throw new Error('자료 링크를 찾지 못함 · 목록 구조 재확인 필요');
      sources.push({...spec,url:ORIGIN+spec.path,ok:true,checkedAt:now,count:items.length,recordIds:items.map(i=>i.id),scope:'최근 목록 1페이지'});
      for(const item of items){
        const before=old.get(item.id),contentHash=await sha256(JSON.stringify({title:item.title,date:item.date,documentState:item.documentState}));
        const metadataChanged=!!before&&(before.documentState!==item.documentState||before.title!==item.title||before.date!==item.date);
        const next={...before,...item,analysisState:before?.analysisState||item.analysisState,firstSeenAt:before?.firstSeenAt||now,lastCheckedAt:now,contentHash:before?.analysisState==='본문 확인'&&!metadataChanged?before.contentHash:contentHash};
        if(spec.id==='minutes'&&metadataChanged){next.analysisState='문서 상태 변경 · 본문 재확인 대기';next.change=diffSummary(before,next);next.changedAt=now;}
        if(spec.id!=='minutes'){
          const diff=diffSummary(before,{...next,contentHash});next.contentHash=contentHash;next.change=diff;
          if(diff.type==='new')added++;else if(diff.type==='changed')changed++;else unchanged++;
          if(diff.type!=='unchanged')next.changedAt=now;
          next.versions=[...(before?.versions||[]),...(diff.type==='changed'?[{hash:before.contentHash,seenAt:before.lastCheckedAt,state:before.documentState}]:[])].slice(-20);
        }
        records.set(item.id,next);
      }
      if(spec.id==='minutes')latestMinutes=items;
    }catch(e){errors.push({source:spec.id,message:String(e.message)});sources.push({...spec,url:ORIGIN+spec.path,ok:false,checkedAt:now,recordIds:previous.sources?.find(x=>x.id===spec.id)?.recordIds||[],lastSuccess:previous.sources?.find(x=>x.id===spec.id&&x.ok)?.checkedAt||previous.sources?.find(x=>x.id===spec.id)?.lastSuccess||null,error:String(e.message)});}
  }
  const stateChanged=latestMinutes.filter(r=>old.has(r.id)&&old.get(r.id).documentState!==r.documentState);
  const newest=[...new Map([...stateChanged,...latestMinutes].map(r=>[r.id,r])).values()].slice(0,maxMinutes);
  const pending=(previous.records||[]).filter(r=>r.source==='minutes'&&r.documentState==='임시회의록'&&!latestMinutes.some(x=>x.id===r.id)).slice(0,4);
  for(const item of [...newest,...pending]){
    try{
      const html=await get(item.url),parsed=parseMinutes(html),before=old.get(item.id),meta=records.get(item.id)||item;
      const headings=[...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)].map(m=>textOnly(m[1])).join(' ');
      const actualTemp=headings.includes('임시회의록');
      const state=actualTemp?'임시회의록':'공식 전자회의록';
      const contentHash=await sha256(state+'\n'+parsed.text),next={...meta,documentState:state,contentHash,pairs:parsed.pairs,attachments:parsed.attachments,analysisState:'본문 확인',lastCheckedAt:now,firstSeenAt:before?.firstSeenAt||now};
      const diff=diffSummary(before,next);next.change=diff;
      if(diff.type==='new')added++;else if(diff.type==='changed')changed++;else unchanged++;
      if(diff.type!=='unchanged')next.changedAt=now;
      next.versions=[...(before?.versions||[]),...(diff.type==='changed'?[{hash:before.contentHash,seenAt:before.lastCheckedAt,state:before.documentState}]:[])].slice(-20);
      await storeRaw(`${item.id}/${contentHash}`,html);records.set(item.id,next);
    }catch(e){errors.push({source:item.id,message:String(e.message)});const next=records.get(item.id)||item;records.set(item.id,{...next,lastAttemptError:String(e.message),lastAttemptAt:now});}
  }
  const output=[...records.values()].sort((a,b)=>(b.date||'').localeCompare(a.date||'')||b.id.localeCompare(a.id));
  added=changed=unchanged=0;
  for(const r of output.filter(r=>r.lastCheckedAt===now)){const before=old.get(r.id);if(!before)added++;else if(before.contentHash!==r.contentHash)changed++;else unchanged++;}
  return {schemaVersion:2,checkedAt:now,lastSuccessAt:errors.length?previous.lastSuccessAt||null:now,partial:errors.length>0,
    counts:{new:added,changed,unchanged,total:output.length},sources,errors,records:output,
    coverage:{minutesBodyLimit:maxMinutes,pendingRecheckLimit:4,listPagesPerSource:1,liveStenography:'세종시의회 공개 실시간 속기 원문 경로 미확인',collectionRule:'최신 목록의 신규·수정 자료만 반영. 이전 판본과 근거는 보존. 첨부파일 본문은 별도 분석 전까지 미분석 표시.'}};
}
