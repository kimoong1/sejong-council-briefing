(() => {
  'use strict';
  const D = window.BRIEFING_DATA;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icons = {
    brief:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/>',
    track:'<path d="M6 4v16M6 7h10M6 17h10"/><circle cx="6" cy="7" r="2"/><circle cx="6" cy="17" r="2"/><path d="m14 4 3 3-3 3m0 4 3 3-3 3"/>',
    bookmark:'<path d="M6 4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17l-6-4-6 4z"/>',
    source:'<path d="M3 5h7l2 2h9v13H3zM3 10h18"/>',
    shield:'<path d="m12 3 8 3v6c0 4-5 8-8 9-3-1-8-5-8-9V6z"/><path d="m8 12 3 3 5-6"/>',
    external:'<path d="M14 3h7v7M21 3l-11 11"/><path d="M10 4H4v16h16v-6"/>',
    arrow:'<path d="M4 12h15m-5-5 5 5-5 5"/>',
    search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    print:'<path d="M6 8V3h12v5M6 17H3V9h18v8h-3M6 14h12v7H6zM17 11h1"/>',
    close:'<path d="m5 5 14 14M19 5 5 19"/>',
    menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v.1"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    copy:'<path d="M8 7V3h13v14h-4"/><rect x="3" y="7" width="14" height="14" rx="1"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    layers:'<path d="m12 3 10 6-10 6L2 9zM2 13l10 6 10-6M2 17l10 6 10-6"/>'
  };
  const icon = name => `<svg aria-hidden="true" viewBox="0 0 24 24">${icons[name] || icons.brief}</svg>`;
  function hydrateIcons() { $$('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); }); }
  const storageKey = 'sejong-briefing-v1';
  let local = { saved:[], reviews:{} }, storageAvailable = true;
  try {
    const loaded = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (loaded && Array.isArray(loaded.saved) && loaded.reviews && typeof loaded.reviews === 'object') {
      local.saved = loaded.saved.filter(id => D.issues.some(i => i.questions.some(q => q.id === id)));
      local.reviews = Object.fromEntries(D.issues.filter(i => loaded.reviews[i.id] && typeof loaded.reviews[i.id] === 'object').map(i => [i.id, loaded.reviews[i.id]]));
    }
  } catch { storageAvailable = false; }
  let page = 'latest', selectedId = D.issues[0].id, search = '', agendaFilter = '', trackSearch = '', trackStatus = '';
  const source = id => D.sources.find(s => s.id === id);
  const agenda = id => D.agendas.find(a => a.id === id);
  const issue = id => D.issues.find(i => i.id === id);
  const findQuestion = id => {
    for (const i of D.issues) { const q = i.questions.find(q => q.id === id); if (q) return {i,q}; }
    return null;
  };
  const refUrl = ref => `${source(ref.source).url}${ref.find ? '#:~:text=' + encodeURIComponent(ref.find) : ''}`;
  const date = d => d.replaceAll('-', '.');
  const badge = i => `<span class="badge ${i.tone}">${esc(i.status)}</span>`;
  const original = (ref, label='원문 근거') => `<a class="evidence-link" href="${esc(refUrl(ref))}" target="_blank" rel="noopener noreferrer">${icon('source')}${esc(label)} ${icon('external')}</a>`;
  let toastTimeout;
  function toast(message) { const el=$('#toast'); el.textContent=message; el.classList.add('show'); clearTimeout(toastTimeout); toastTimeout=setTimeout(()=>el.classList.remove('show'),2600); }
  function persist() {
    try { localStorage.setItem(storageKey,JSON.stringify(local)); }
    catch { storageAvailable=false; toast('브라우저 저장을 사용할 수 없습니다. JSON으로 내보내 보관하세요.'); }
  }
  function updateCounts() { $('#saved-count').textContent=local.saved.length+(window.IntakeUI?.savedCount()||0); }
  function heading(eyebrow, title, subtitle, actions='') { return `<div class="page-heading"><div><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p>${subtitle}</p></div>${actions?`<div class="heading-actions">${actions}</div>`:''}</div>`; }
  function exportButtons(label='브리핑 인쇄') { return `<button class="button" data-action="export">${icon('download')}JSON 내보내기</button><button class="button primary" data-action="print">${icon('print')}${label}</button>`; }
  function stats() { return `<div class="stats"><div class="stat"><span class="stat-icon">${icon('layers')}</span><div><div class="stat-label">수록 안건</div><div class="stat-num">3<small>실제 상정 안건</small></div></div><span class="stat-detail">예산 · 추경 · 감사</span></div><div class="stat"><span class="stat-icon">${icon('brief')}</span><div><div class="stat-label">주요 쟁점</div><div class="stat-num">5<small>질의·답변 연결</small></div></div><span class="stat-detail">회의록 3건</span></div><div class="stat"><span class="stat-icon">${icon('source')}</span><div><div class="stat-label">근거 있는 질의 초안</div><div class="stat-num">15<small>각 질문에 원문 링크</small></div></div><span class="stat-detail">검토 후 사용</span></div></div><div class="data-note">${icon('info')}2025년 6~12월 회의록을 선별한 시제품입니다. 최신 전체 안건을 수록한 서비스는 아닙니다.</div>`; }
  function questionCard(q, i, number, context=false) {
    const saved=local.saved.includes(q.id);
    return `<article class="question-card" data-question="${q.id}"><div class="question-top"><span class="question-topic"><span class="q-number">Q${String(number).padStart(2,'0')}</span>${esc(q.label)}</span><button class="save-question ${saved?'saved':''}" data-action="save-question" data-id="${q.id}" aria-pressed="${saved}" aria-label="${esc(q.label)} 질의 ${saved?'보관 해제':'보관'}">${icon(saved?'check':'bookmark')}${saved?'보관됨':'담기'}</button></div><p class="question-text">${esc(q.text)}</p><div class="question-footer">${original(q.refs[0])}<button class="text-button" data-action="evidence" data-id="${q.id}">근거 ${q.refs.length>1?`${q.refs.length}건 `:''}보기</button><button class="text-button" data-action="copy" data-id="${q.id}" aria-label="${esc(q.label)} 질의 복사">${icon('copy')}복사</button></div>${context?`<p class="saved-context">${esc(i.title)} · ${esc(agenda(i.agenda).short)}</p>`:''}</article>`;
  }
  function timelineHtml(i, compact=false) { return `<div class="timeline">${(compact?i.timeline.filter(t=>t.kind!=='의원 질의'&&t.kind!=='자료 요구'):i.timeline).map(t=>`<div class="timeline-event ${t.kind.includes('답변')||t.kind.includes('수락')?'answer':''}"><div><span class="timeline-date">${date(t.date)}</span><span class="timeline-kind">${esc(t.kind)}</span></div><strong>${esc(t.speaker)}</strong><p>${esc(t.text)}</p>${original(t,'회의록')}</div>`).join('')}</div>`; }
  const reviewOptions = ['검토 전','자료요청 준비','추가 확인 중','검토 완료'];
  function reviewHtml(i) {
    const r=local.reviews[i.id]||{};
    return `<div class="review-box"><div class="review-head"><h3>나의 검토 메모</h3><span>${storageAvailable?'이 브라우저에 자동 저장':'브라우저 저장 불가 · 내보내기 사용'}</span></div><div class="review-controls"><label class="screen-reader" for="review-${i.id}">나의 검토 상태</label><select class="review-select" id="review-${i.id}" data-review="${i.id}" aria-label="${esc(i.title)} 나의 검토 상태">${reviewOptions.map(o=>`<option ${r.status===o?'selected':''}>${o}</option>`).join('')}</select><label class="screen-reader" for="note-${i.id}">나의 검토 메모</label><textarea id="note-${i.id}" data-note="${i.id}" placeholder="다음 질의에서 확인할 내용, 요청할 자료…" maxlength="5000">${esc(r.note||'')}</textarea></div><p class="review-help">개인 검토 상태입니다. 집행부의 공식 이행 상태에는 반영되지 않습니다.</p></div>`;
  }
  function filteredIssues() { const term=search.trim().toLowerCase();return D.issues.filter(i=>(!agendaFilter||i.agenda===agendaFilter)&&(!term||[i.title,i.department,i.category,i.committee,agenda(i.agenda).title,...i.questions.map(q=>q.text)].join(' ').toLowerCase().includes(term))); }
  function issueItems() {
    const items=filteredIssues();
    $('#issue-count').textContent=`${items.length}개 쟁점`;
    $('#issue-list').innerHTML=items.length?items.map(i=>`<button class="issue-item ${i.id===selectedId?'selected':''}" data-action="select-issue" data-id="${i.id}" aria-pressed="${i.id===selectedId}"><div class="issue-top"><span class="category">${esc(i.category)}</span><span>${date(i.date)}</span></div><strong>${esc(i.title)}</strong><p>${esc(agenda(i.agenda).short)}${agenda(i.agenda).number?` · ${agenda(i.agenda).number}호`:''}</p>${badge(i)}</button>`).join(''):'<div class="empty-list">검색 결과가 없습니다.<br>다른 검색어나 안건을 선택해 보세요.</div>';
    if (items.length&&!items.some(i=>i.id===selectedId)) selectedId=items[0].id;
    if(items.length) {
      $$('.issue-item').forEach(el=> {el.classList.toggle('selected',el.dataset.id===selectedId);el.setAttribute('aria-pressed',String(el.dataset.id===selectedId));});
      renderDetail();
    } else $('#detail').innerHTML='<div class="empty-state"><h2>일치하는 쟁점이 없습니다</h2><p>검색어를 바꾸거나 전체 안건을 선택해 주세요.</p></div>';
  }
  function renderDetail() {
    const i=issue(selectedId), a=agenda(i.agenda), s=source(a.source);
    $('#detail').innerHTML=`<section class="detail-shell"><div class="detail-heading"><div class="detail-meta"><span class="tag">${esc(a.kind)}</span><span>${esc(i.committee)}</span><span>최근 근거 ${date(i.date)}</span></div><div class="detail-title-row"><h2>${esc(i.title)}</h2>${badge(i)}</div><p class="detail-subtitle">${esc(i.subtitle)}</p><a class="agenda-anchor" href="${esc(s.url+'#'+a.anchor)}" target="_blank" rel="noopener noreferrer">${icon('brief')}${esc(a.title)}${a.number?`<span>의안 ${a.number}호</span>`:''}${icon('external')}</a></div><div class="detail-body"><div class="summary-block"><span class="mini-label">쟁점 요약</span><p>${esc(i.summary)}</p></div><div class="content-columns"><section><div class="section-header"><h3>검토할 질문 <span>3</span></h3><button class="text-button" data-action="save-all" data-id="${i.id}">${icon('bookmark')}3개 모두 담기</button></div><p class="question-notice">${icon('info')}AI 작성 질의 초안 · 실제 발언과 구분해 검토하세요.</p>${i.questions.map((q,n)=>questionCard(q,i,n+1)).join('')}</section><aside class="answer-preview" aria-label="집행부 답변 요약"><div class="section-header"><h3>${i.id==='audit'?'의결·조치 추적':'집행부 답변'}</h3><a class="small-link" href="#tracking/${i.id}">전체 이력 ${icon('arrow')}</a></div><p class="sub">당시 직위·성명 · 공식 회의록 기준</p>${timelineHtml(i,true)}<div class="followup-box"><span class="mini-label">${icon('clock')}후속 자료 미확인</span><p>${esc(i.followup.text)}</p><span class="deadline">${esc(i.followup.deadline)}</span></div></aside></div>${reviewHtml(i)}</div></section>`;
  }
  function renderBriefing() {
    $('#main').innerHTML=heading('AGENDA BRIEFING','안건별 질의 브리핑','회의 전 쟁점을 읽고, 근거가 있는 다음 질문을 준비하세요.',exportButtons())+stats()+`<div class="brief-grid"><section class="issue-panel" aria-label="안건·쟁점 선택"><div class="list-header"><div class="list-header-title">검토할 안건·쟁점 <span id="issue-count">5개 쟁점</span></div><div class="list-filters"><label class="search-wrap">${icon('search')}<span class="screen-reader">쟁점·부서 검색</span><input id="issue-search" type="search" placeholder="쟁점·부서 검색" value="${esc(search)}"></label><label class="screen-reader" for="agenda-filter">안건 선택</label><select class="filter-select" id="agenda-filter"><option value="">전체 안건</option>${D.agendas.map(a=>`<option value="${a.id}" ${agendaFilter===a.id?'selected':''}>${esc(a.short)}</option>`).join('')}</select></div></div><div class="issue-list" id="issue-list"></div><div class="list-foot">회기·위원회 명칭과 직위는<br>각 회의 당시 기록을 따릅니다.</div></section><div id="detail"></div></div>`;
    issueItems();
  }
  function renderTracking() {
    $('#main').innerHTML=heading('ANSWER TRACKER','집행부 답변 추적','질의 → 답변 → 후속 확인. 약속과 이행 증빙을 구분해서 살펴보세요.',exportButtons('추적 이력 인쇄'))+`<div class="scope-banner">${icon('info')}<p><strong>“미확인”은 미이행 판정이 아닙니다.</strong> 수록 회의록에서 확인한 답변만 표시합니다. 후속 자료가 없다고 단정하거나 기한 초과로 판정하지 않습니다.</p></div><div class="toolbar"><label class="search-wrap">${icon('search')}<span class="screen-reader">답변 추적 검색</span><input id="track-search" type="search" placeholder="쟁점·답변자·부서 검색" value="${esc(trackSearch)}"></label><label class="screen-reader" for="track-status">확인 단계 필터</label><select id="track-status" class="filter-select"><option value="">모든 확인 단계</option>${[...new Set(D.issues.map(i=>i.status))].map(s=>`<option ${s===trackStatus?'selected':''}>${s}</option>`).join('')}</select><button class="text-button" data-action="reset-track">전체 이력 보기</button></div><div id="tracking-list" class="tracking-list"></div>`;
    trackingCards();
  }
  function trackingCards() {
    const term=trackSearch.toLowerCase().trim();
    const items=D.issues.filter(i=>(!trackStatus||i.status===trackStatus)&&(!term||[i.title,i.department,...i.timeline.map(t=>t.speaker+' '+t.text)].join(' ').toLowerCase().includes(term)));
    $('#tracking-list').innerHTML=items.length?items.map(i=>`<article class="tracking-card"><div class="tracking-card-head"><div><h2>${esc(i.title)}</h2><p>${esc(i.department)} · ${esc(agenda(i.agenda).short)}</p></div><div class="heading-actions">${badge(i)}<a class="button" href="#briefing/${i.id}">질의 브리핑 ${icon('arrow')}</a></div></div><div class="tracking-body"><div>${timelineHtml(i)}</div><div><div class="followup-box"><span class="mini-label">${icon('clock')}다음 확인</span><strong>${esc(i.followup.title)}</strong><p>${esc(i.followup.text)}</p><div class="deadline">${esc(i.followup.deadline)}</div><p class="next-step">확보할 자료 · ${esc(i.followup.next)}</p>${original(i.followup,'요청·답변 근거')}</div>${reviewHtml(i)}</div></div></article>`).join(''):'<div class="empty-state"><h2>일치하는 답변 이력이 없습니다</h2><p>검색어나 확인 단계 필터를 바꿔 주세요.</p></div>';
  }
  function renderSaved() {
    const rows=local.saved.map(findQuestion).filter(Boolean),liveCount=window.IntakeUI.savedCount();
    $('#main').innerHTML=heading('MY QUESTIONS','질의 보관함',`선택한 질의 ${rows.length+liveCount}개 · 이 브라우저에 저장됩니다.`,rows.length?exportButtons('보관한 질의 인쇄'):'')+`<div class="scope-banner">${icon('bookmark')}<p>질문과 원문 근거를 함께 보관합니다. 개인 메모·보관함은 다른 기기나 사용자에게 공유되지 않습니다. 다른 기기로 옮길 때 JSON으로 내보내세요.</p></div>`+window.IntakeUI.savedHtml()+(rows.length?`<div class="saved-list">${rows.map(({q,i},n)=>questionCard(q,i,n+1,true)).join('')}</div>`:liveCount?'':`<div class="empty-state">${icon('bookmark')}<h2>회의에서 꺼내 쓸 질문을 모아두세요</h2><p>안건별 브리핑에서 질문 옆 ‘담기’를 누르면 이곳에 저장됩니다.</p><a class="button primary" href="#briefing">안건 브리핑 열기 ${icon('arrow')}</a></div>`);
  }
  function renderSources() {
    $('#main').innerHTML=heading('SOURCES & SCOPE','근거자료·수록 범위','세종시의회 공식 공개자료를 직접 확인해 선별했습니다.',`<button class="button" data-action="export">${icon('download')}근거 데이터 내보내기</button>`)+`<div class="scope-banner">${icon('shield')}<p><strong>확인일 2026.10.20 · 회의록 3건 · 실제 안건 3개 · 쟁점 5개</strong><br>수록 회의일 ${D.period}. 이전 브리핑 예시의 확인 범위입니다. 최신 자료는 별도 자동 수집하며, 최신 화면에서 수집 시각과 출처별 상태를 확인할 수 있습니다. 실시간 속기 원문 경로는 미확인입니다.</p></div><div class="source-grid">${D.sources.map(s=>`<article class="source-card"><span class="source-type">${icon(s.id==='ci'?'shield':'source')}${esc(s.type)}${s.date?' · '+date(s.date):''}</span>${s.id==='ci'?'<img class="ci-preview" src="assets/council-ci.gif" alt="세종특별자치시의회 공식 CI">':''}<h2>${esc(s.title)}</h2><p>${esc(s.scope)}</p><p>${esc(s.keywords)}</p><p class="source-license">${esc(s.license)}</p><a class="button" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">공식 원문 열기 ${icon('external')}</a>${s.assetUrl?` <a class="evidence-link" href="${esc(s.assetUrl)}" target="_blank" rel="noopener noreferrer">사용한 CI 원본 ${icon('external')}</a>`:''}</article>`).join('')}</div><section class="method-card"><h2>이 시제품을 읽는 기준</h2><div class="method-grid"><div><strong>질의 초안과 실제 발언</strong><p>질의 초안은 공개자료를 근거로 AI가 새로 작성했습니다. 실제 의원 발언은 답변 이력에 별도로 요약했습니다. 예산액이나 법적 효과는 원문·첨부자료를 다시 확인하세요.</p></div><div><strong>답변 확인과 이행 확인</strong><p>답변·자료 제공 언급·위원회 의결을 구분합니다. 별도 제출자료와 이행 증빙은 확인하지 못한 경우 ‘미확인’으로 표시합니다. 전체 후속 자료를 검색했다는 의미는 아닙니다.</p></div><div><strong>코드·자료·공식 상징</strong><p>이 시제품의 새로 작성한 코드는 MIT 라이선스입니다. 원자료와 의회 CI의 권리는 각 권리자에게 있으며 코드 라이선스에 포함되지 않습니다. 공식 CI의 원본 비율·색상을 유지했습니다. 의회의 승인·공식을 의미하지 않습니다.</p></div></div></section>`;
  }
  function render() {
    $$('.nav-link').forEach(a=> {const active=a.dataset.page===(page==='record'?'latest':page);a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    $('#breadcrumb-current').textContent=({latest:'최신 공개자료',materials:'의원 참고자료함',record:'최신 질의·답변',briefing:'이전 브리핑 예시',tracking:'이전 답변 추적',saved:'질의 보관함',sources:'출처·수록 범위'})[page];
    ({latest:window.IntakeUI.latest,materials:window.IntakeUI.materials,record:window.IntakeUI.record,briefing:renderBriefing,tracking:renderTracking,saved:renderSaved,sources:renderSources})[page]();
    hydrateIcons();updateCounts();
  }
  function route() {
    const [next, id]=(location.hash.slice(1)||'latest').split('/');
    page=['latest','materials','record','briefing','tracking','saved','sources'].includes(next)?next:'latest';
    if(issue(id)) { selectedId=id;if(page==='tracking'){trackSearch=issue(id).title;trackStatus='';} if(page==='briefing'&&!filteredIssues().some(i=>i.id===id)){search='';agendaFilter='';} }
    $('.sidebar').classList.remove('open');$('#mobile-nav').setAttribute('aria-expanded','false');
    render();window.scrollTo({top:0,behavior:'instant'});
  }
  function showEvidence(id) {
    const found=findQuestion(id);if(!found)return;
    const {q,i}=found;
    $('#evidence-content').innerHTML=`<h2 id="evidence-title">${esc(q.label)} · 원문 근거</h2><p class="evidence-question">${esc(q.text)}</p><p class="evidence-reason">${esc(q.reason)}</p>${q.refs.map(ref=>{const s=source(ref.source);return `<div class="evidence-document"><span class="eyebrow">공식 회의록 · ${date(s.date)}</span><h3>${esc(s.title)}</h3><p>${esc(agenda(i.agenda).title)}</p><div class="finder">원문 찾기: ${esc(ref.find)}</div><a class="button soft" href="${esc(refUrl(ref))}" target="_blank" rel="noopener noreferrer">원문 해당 대목 열기 ${icon('external')}</a></div>`;}).join('')}<div class="dialog-foot">확인일 ${date(D.verifiedAt)} · 원문 찾기 기능이 지원되지 않는 브라우저에서는 위 검색어로 회의록 내 검색을 이용하세요. 질의 초안은 당시 실제 발언을 그대로 옮긴 것이 아닙니다.</div>`;
    $('#evidence-dialog').showModal();
  }
  function download() {
    let payload,filename;
    const disclaimer='세종시의회 공식 공개자료 기반 비공식 시제품. 질의는 AI 작성 초안이며 검토가 필요합니다. 미확인은 미이행 판정이 아닙니다. 개인 검토 상태와 메모는 공식 상태가 아닙니다.';
    if(page==='sources'){payload={...D,disclaimer};filename='sejong-source-data';}
    else if(page==='saved'){payload={verifiedAt:D.verifiedAt,disclaimer,questions:local.saved.map(findQuestion).filter(Boolean).map(({q,i})=>({...q,issue:i.title,agenda:agenda(i.agenda),evidence:q.refs.map(r=>({...r,url:refUrl(r),meeting:source(r.source)}))}))};filename='sejong-saved-questions';}
    else {const items=page==='tracking'?D.issues.filter(i=>(!trackStatus||i.status===trackStatus)&&(!trackSearch||[i.title,i.department,...i.timeline.map(t=>t.speaker+' '+t.text)].join(' ').toLowerCase().includes(trackSearch.trim().toLowerCase()))):[issue(selectedId)];payload={verifiedAt:D.verifiedAt,disclaimer,sources:D.sources,agendas:D.agendas,issues:items.map(i=>({...i,questions:i.questions.map(q=>({...q,evidenceUrls:q.refs.map(refUrl)})),personalReview:local.reviews[i.id]||{status:'검토 전',note:''}}))};filename=page==='tracking'?'sejong-answer-tracker':`sejong-briefing-${selectedId}`;}
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${filename}-${D.verifiedAt}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);toast('근거 링크를 포함한 JSON을 내보냈습니다.');
  }
  document.addEventListener('click',async e=> {
    if(e.target.closest('.skip')) { e.preventDefault();$('#main').focus();$('#main').scrollIntoView();return; }
    const b=e.target.closest('[data-action]');if(!b)return;
    const {action,id}=b.dataset;
    if(action==='select-issue') { selectedId=id; if(location.hash===`#briefing/${id}`)render();else location.hash=`briefing/${id}`; }
    if(action==='evidence')showEvidence(id);
    if(action==='save-question') { const saved=local.saved.includes(id);local.saved=saved?local.saved.filter(q=>q!==id):[...local.saved,id];persist();updateCounts();if(page==='saved')renderSaved();else {b.classList.toggle('saved',!saved);b.setAttribute('aria-pressed',String(!saved));b.setAttribute('aria-label',`${findQuestion(id).q.label} 질의 ${saved?'보관':'보관 해제'}`);b.innerHTML=icon(saved?'bookmark':'check')+(saved?'담기':'보관됨');}toast(saved?'보관함에서 해제했습니다.':'근거 링크와 함께 보관했습니다.'); }
    if(action==='save-all') {local.saved=[...new Set([...local.saved,...issue(id).questions.map(q=>q.id)])];persist();updateCounts();renderDetail();toast('질의 3개를 근거와 함께 보관했습니다.');}
    if(action==='copy') {const {q,i}=findQuestion(id);const text=`[${i.title}]\n${q.text}\n\n원문 근거\n${q.refs.map(r=>`${source(r.source).title} (${date(source(r.source).date)})\n${refUrl(r)}`).join('\n\n')}\n\n공개자료 기반 AI 작성 질의 초안 · 확인일 ${date(D.verifiedAt)}`;try{await navigator.clipboard.writeText(text);toast('질의와 원문 근거 링크를 복사했습니다.');}catch{toast('복사를 사용할 수 없습니다. JSON 내보내기를 이용하세요.');}}
    if(action==='export')download();
    if(action==='print')window.print();
    if(action==='reset-track') {trackSearch='';trackStatus='';$('#track-search').value='';$('#track-status').value='';trackingCards();}
  });
  document.addEventListener('input',e=> {
    if(e.target.id==='issue-search'){search=e.target.value;issueItems();}
    if(e.target.id==='track-search'){trackSearch=e.target.value;trackingCards();}
    if(e.target.dataset.note){const id=e.target.dataset.note;local.reviews[id]={...(local.reviews[id]||{}),note:e.target.value};persist();}
  });
  document.addEventListener('change',e=> {
    if(e.target.id==='agenda-filter'){agendaFilter=e.target.value;issueItems();}
    if(e.target.id==='track-status'){trackStatus=e.target.value;trackingCards();}
    if(e.target.dataset.review){const id=e.target.dataset.review;local.reviews[id]={...(local.reviews[id]||{}),status:e.target.value};persist();toast('나의 검토 상태를 저장했습니다.');}
  });
  $('#close-dialog').addEventListener('click',()=>$('#evidence-dialog').close());
  $('#evidence-dialog').addEventListener('click',e=> {if(e.target===$('#evidence-dialog')) {const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
  $('#mobile-nav').addEventListener('click',()=>{const open=$('.sidebar').classList.toggle('open');$('#mobile-nav').setAttribute('aria-expanded',String(open));});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('.sidebar').classList.remove('open');$('#mobile-nav').setAttribute('aria-expanded','false');}});
  window.addEventListener('hashchange',route);
  window.SejongUI={heading,icon,toast};
  window.addEventListener('live-saved:changed',()=>{updateCounts();if(page==='saved')renderSaved();});
  window.addEventListener('intake:loaded',()=>{if(['latest','materials','record'].includes(page))render();});
  route();
})();
