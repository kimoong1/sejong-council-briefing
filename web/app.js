(() => {
  'use strict';
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

  let page='latest',toastTimeout;
  function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.classList.remove('show'),2600);}
  function heading(eyebrow,title,subtitle,actions=''){return `<div class="page-heading"><div><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p>${subtitle}</p></div>${actions?`<div class="heading-actions">${actions}</div>`:''}</div>`;}
  function updateCounts(){$('#saved-count').textContent=window.IntakeUI.savedCount();}
  function renderSaved(){const count=window.IntakeUI.savedCount();$('#main').innerHTML=heading('MY QUESTIONS','질의 보관함',`선택한 질의 ${count}개 · 질문과 원문 근거를 함께 보관합니다.`)+window.IntakeUI.savedHtml()+(count?'':`<div class="empty-state">${icon('bookmark')}<h2>다음 회의에서 물을 질문을 모아두세요</h2><p>최신 회의록의 질문이나 이전 기록과 대조한 비교 질문에서 ‘질의 담기’를 누르세요.</p><a class="button primary" href="#latest">최신 자료에서 질문 준비 →</a></div>`);}
  function render(){
    $$('.nav-link').forEach(a=>{const active=a.dataset.page===(page==='record'?'latest':page);a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    $('#breadcrumb-current').textContent=({latest:'최신 공개자료',materials:'의원 참고자료함',record:'질의·답변과 비교 근거',saved:'질의 보관함',sources:'출처·수록 범위'})[page];
    ({latest:window.IntakeUI.latest,materials:window.IntakeUI.materials,record:window.IntakeUI.record,saved:renderSaved,sources:window.IntakeUI.sources})[page]();hydrateIcons();updateCounts();
  }
  function route(){const next=(location.hash.slice(1)||'latest').split('/')[0];
    // Old standalone examples no longer open as current briefings.
    if(next==='briefing'||next==='tracking'){history.replaceState(null,'','#latest');page='latest';}
    else page=['latest','materials','record','saved','sources'].includes(next)?next:'latest';
    $('.sidebar').classList.remove('open');$('#mobile-nav').setAttribute('aria-expanded','false');render();window.scrollTo({top:0,behavior:'instant'});
  }
  document.addEventListener('click',ev=>{if(ev.target.closest('.skip')){ev.preventDefault();$('#main').focus();$('#main').scrollIntoView();}});
  $('#mobile-nav').addEventListener('click',()=>{const open=$('.sidebar').classList.toggle('open');$('#mobile-nav').setAttribute('aria-expanded',String(open));});
  document.addEventListener('keydown',ev=>{if(ev.key==='Escape'){$('.sidebar').classList.remove('open');$('#mobile-nav').setAttribute('aria-expanded','false');}});
  window.SejongUI={heading,icon,toast};
  window.addEventListener('hashchange',route);
  window.addEventListener('live-saved:changed',()=>{updateCounts();if(page==='saved')renderSaved();});
  window.addEventListener('intake:loaded',()=>{if(page!=='saved')render();});route();
})();
