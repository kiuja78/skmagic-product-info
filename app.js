const ARCHIVE=window.SK_MONTH_ARCHIVE||{};
const DEFAULT_MONTH=window.SK_DEFAULT_MONTH||Object.keys(ARCHIVE).sort().reverse()[0];
const CART_KEY='sk_v64_cart';
let products=[];
let promos=[];
let priceDB={};

const $=s=>document.querySelector(s);
const fmt=n=>Number(n||0).toLocaleString('ko-KR')+'원';
const unique=arr=>[...new Set((arr||[]).filter(v=>v!==undefined&&v!==null&&v!==''))];

const state={
  month:localStorage.getItem('sk_selected_month')||DEFAULT_MONTH,
  category:'전체',sub:'전체',search:'',product:null,
  sel:{}, customerType:null, promoId:null,
  cart:JSON.parse(localStorage.getItem(CART_KEY)||'[]'),
  photo:{product:null,images:[],index:0}
};
const cats=['전체','프로모션','정수기','공기청정기','비데','매트리스'];

function monthText(){
  const [y,m]=(state.month||'').split('-');
  return y&&m?`${y}.${m}`:state.month;
}
function promoMonthText(){
  const m=Number((state.month||'').split('-')[1]||0);
  return m?`${m}월`:'';
}
function loadMonth(month){
  const snap=ARCHIVE[month]||ARCHIVE[DEFAULT_MONTH];
  if(!snap)return;
  state.month=month in ARCHIVE?month:DEFAULT_MONTH;
  products=snap.products||[];
  promos=(snap.promotions||{}).entries||[];
  priceDB=(snap.contractPrices||{}).products||{};
  localStorage.setItem('sk_selected_month',state.month);
}
function subtype(p){
  const t=`${p.title||''} ${p.spec||''} ${p.features||''}`;
  if(p.category==='정수기'){if(t.includes('얼음물'))return'얼음물';if(t.includes('얼음정수기')||p.model==='WPU-IC110F')return'얼음';if(t.includes('초소형'))return'초소형';if(t.includes('직수'))return'직수형';if(t.includes('스탠드')||t.includes('그랜드'))return'스탠드형';return'일반형'}
  if(p.category==='공기청정기'){if(t.includes('올클린 디 아트'))return'올클린 디 아트';if(t.includes('올클린'))return'올클린';if(t.includes('코어'))return'코어';if(t.includes('슈퍼'))return'슈퍼';return'기타'}
  if(p.category==='비데'){if(t.includes('올클린'))return'올클린 케어';if(t.includes('풀스텐 케어'))return'풀스텐 케어';if(t.includes('스파'))return'스파';if(t.includes('파워업'))return'파워업';return'기타'}
  if(p.category==='매트리스')return p.title.includes('매트리스')?'매트리스':'프레임';
  return'';
}
function quickFeatures(p){
  if(p.model==='WPU-IAC606')return['냉수','온수','정수','얼음','미네랄'];
  const s=`${p.spec||''} ${p.features||''}`;
  const out=[];
  ['냉수','온수','정수','얼음','미네랄','직수','UV','살균','AI','저소음'].forEach(k=>{if(s.includes(k)&&!out.includes(k))out.push(k)});
  return out.slice(0,5);
}
function productPromos(p){return promos.filter(x=>(x.apiIds||[]).includes(p.apiId));}
function promoDisplayLabel(pr){
  if(pr.group==='반값' && pr.discountMonths) return `${pr.discountMonths}개월 반값`;
  if(pr.customerType==='크로스/재구독') return '크로스/재구독';
  if(pr.customerType==='타사보상') return '타사보상';
  return pr.group||'프로모션';
}
function renderPromoSummary(p){
  const ps=productPromos(p);
  if(!ps.length) return '';
  const seen=new Set();
  const rows=ps.filter(pr=>{
    const key=`${pr.customerType||''}|${promoDisplayLabel(pr)}|${pr.promoPrice}`;
    if(seen.has(key)) return false;
    seen.add(key); return true;
  }).slice(0,4);
  return `<div class="promo-mini-list">${rows.map(pr=>`
    <div class="promo-mini">
      <span>${pr.customerType?pr.customerType+' · ':''}${promoDisplayLabel(pr)}</span>
      <strong>${fmt(pr.promoPrice)}</strong>
    </div>`).join('')}</div>`;
}
function entry(p){return priceDB[String(p.apiId)]||{rows:[],memberships:[]};}
function availableYears(p){return unique(entry(p).rows.map(r=>r.contractYears)).sort((a,b)=>a-b);}
function priceRange(p){const a=entry(p).rows.map(r=>r.price).filter(Boolean);if(!a.length)return'';return Math.min(...a)===Math.max(...a)?fmt(a[0]):`${fmt(Math.min(...a))} ~ ${fmt(Math.max(...a))}`;}
function subFilters(c){
  if(c==='프로모션')return['전체','정수기','공기청정기','비데','매트리스'];
  if(c==='정수기')return['전체','직수형','초소형','얼음','얼음물','스탠드형','일반형'];
  if(c==='공기청정기')return['전체','올클린 디 아트','올클린','코어','슈퍼','기타'];
  if(c==='비데')return['전체','올클린 케어','풀스텐 케어','스파','파워업','기타'];
  if(c==='매트리스')return['전체','SS','Q','K'];
  return[];
}
function mattressSizes(p){return unique(entry(p).rows.map(r=>r.size));}
function sizeLabel(s){return s==='SS'?'슈퍼싱글(SS)':s==='Q'?'퀸(Q)':s==='K'?'킹(K)':s;}
function photoImages(p){return unique([...(p.galleryImages||[]),p.cover].filter(Boolean));}

function renderCats(){
  $('#categoryChips').innerHTML=cats.map(c=>{
    const label=c==='프로모션'?`🔥 ${promoMonthText()} 프로모션`:c;
    return `<button class="chip ${c==='프로모션'?'promo':''} ${state.category===c?'active':''}" data-cat="${c}">${label}</button>`;
  }).join('');
  document.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{
    state.category=b.dataset.cat; state.sub='전체';
    $('#listTitle').textContent=state.category==='전체'?'전체 제품':state.category==='프로모션'?`${promoMonthText()} 프로모션`:state.category;
    renderCats();renderSub();renderProducts();
  });
}
function renderSub(){
  const a=subFilters(state.category),w=$('#subFilter');
  if(!a.length){w.classList.add('hidden');return}
  w.classList.remove('hidden');
  $('#subTitle').textContent=state.category==='프로모션'?'프로모션 제품군':state.category==='매트리스'?'사이즈':'세부구분';
  $('#subHelp').textContent=state.category==='프로모션'?'제품군별로 보기':'';
  $('#subChips').innerHTML=a.map(x=>`<button class="sub-chip ${state.sub===x?'active':''}" data-sub="${x}">${state.category==='매트리스'&&x!=='전체'?sizeLabel(x):x}</button>`).join('');
  document.querySelectorAll('[data-sub]').forEach(b=>b.onclick=()=>{state.sub=b.dataset.sub;renderSub();renderProducts()});
}
function filtered(){
  const q=state.search.trim().toLowerCase();
  return products.filter(p=>{
    if(state.category==='프로모션'){
      if(!productPromos(p).length)return false;
      if(state.sub!=='전체'&&p.category!==state.sub)return false;
    }else{
      if(state.category!=='전체'&&p.category!==state.category)return false;
      if(state.sub!=='전체'){
        if(state.category==='매트리스'){if(!mattressSizes(p).includes(state.sub))return false}
        else if(subtype(p)!==state.sub)return false;
      }
    }
    return !q||`${p.title} ${p.model} ${p.spec||''} ${p.features||''}`.toLowerCase().includes(q);
  });
}
function renderProducts(){
  const list=filtered();
  $('#count').textContent=`${list.length}개`;
  $('#productGrid').innerHTML=list.length?list.map(p=>{
    const years=availableYears(p); const prom=productPromos(p).length; const special=entry(p).rows.some(r=>r.pricingType==='사용연차');
    return `<article class="card">
      <div class="card-main">
        <button class="photo" data-photo="${p.apiId}" type="button">
          <img src="${p.cover||''}" alt="${p.title}" referrerpolicy="no-referrer" onerror="this.style.display='none'">
          <span class="zoom-badge">확대</span>
        </button>
        <div>
          <div class="badges"><i>${p.category}</i><i>${subtype(p)}</i>${prom?`<i class="hot">🔥 ${promoMonthText()} 혜택</i>`:''}</div>
          <h3>${p.title}</h3><div class="model">${p.model}</div>
          <div class="feature-row">${quickFeatures(p).map(x=>`<span class="feature">${x}</span>`).join('')}</div>
          <div class="contract-summary">
            <b>${special?'사용연차별 가격':years.length?`의무사용 ${years.join('·')}년`:'계약가격'}</b>
            <p>${special?'기간에 따라 월요금이 달라집니다.':`계약조건별 ${priceRange(p)} · 정확한 금액은 조건 선택 후 표시`}</p>
          </div>
          ${renderPromoSummary(p)}
        </div>
      </div>
      <div class="card-actions"><button data-official="${p.apiId}" type="button">공식 상세</button><button class="calc" data-calc="${p.apiId}" type="button">가격 · 수수료</button></div>
    </article>`;
  }).join(''):'<div class="cart-empty" style="grid-column:1/-1">조건에 맞는 제품이 없습니다.</div>';
  document.querySelectorAll('[data-photo]').forEach(b=>b.onclick=()=>openPhotoViewer(Number(b.dataset.photo)));
  document.querySelectorAll('[data-official]').forEach(b=>b.onclick=()=>openOfficial(Number(b.dataset.official)));
  document.querySelectorAll('[data-calc]').forEach(b=>b.onclick=()=>openSheet(Number(b.dataset.calc)));
}
function openOfficial(id){const p=products.find(x=>x.apiId===id); const url=p?.officialMallUrl||p?.officialDetailUrl; if(url) window.open(url,'_blank','noopener,noreferrer');}
function closeSheet(){$('#sheet').classList.add('hidden');$('#backdrop').classList.add('hidden');document.body.style.overflow='';}
$('#closeSheet').onclick=closeSheet; $('#backdrop').onclick=closeSheet; $('#officialBtn').onclick=()=>state.product&&openOfficial(state.product.apiId); $('#officialImageBtn').onclick=()=>state.product&&openPhotoViewer(state.product.apiId,true);

function openPhotoViewer(id){
  const p=products.find(x=>x.apiId===id)||state.product;
  if(!p) return;
  state.photo={product:p,images:photoImages(p),index:0};
  const viewer=$('#photoViewer');
  $('#photoViewerTitle').textContent=p.title||'';
  $('#photoViewerModel').textContent=p.model||'';
  renderPhotoViewer();
  viewer.classList.remove('hidden');
  document.body.style.overflow='hidden';
}
function renderPhotoViewer(){
  const {product,images,index}=state.photo;
  const url=images[index]||product?.cover||'';
  $('#photoViewerImage').src=url;
  $('#photoViewerImage').alt=product?.title||'제품 사진';
  $('#photoViewerImage').onerror=()=>{ if(product?.cover && $('#photoViewerImage').src!==product.cover) $('#photoViewerImage').src=product.cover; };
  $('#photoViewerThumbs').innerHTML=images.map((src,i)=>`<button type="button" class="${i===index?'active':''}" data-photo-index="${i}"><img src="${src}" alt="썸네일 ${i+1}" referrerpolicy="no-referrer" onerror="this.parentElement.remove()"></button>`).join('');
  document.querySelectorAll('[data-photo-index]').forEach(b=>b.onclick=()=>{state.photo.index=Number(b.dataset.photoIndex); renderPhotoViewer();});
  $('#photoViewerOfficial').onclick=()=>product&&openOfficial(product.apiId);
}
function closePhotoViewer(){ $('#photoViewer').classList.add('hidden'); if($('#sheet').classList.contains('hidden')) document.body.style.overflow=''; }
$('#photoViewerClose').onclick=closePhotoViewer; $('#photoViewerCloseBg').onclick=closePhotoViewer;

const dimensions=[['variant','제품/필터'],['size','사이즈'],['management','관리방식'],['plan','케어/요금제'],['visitCycleMonths','관리주기'],['contractYears','의무사용기간']];
function labelVal(k,v){ if(k==='size')return sizeLabel(v); if(k==='visitCycleMonths')return `${v}개월`; if(k==='contractYears')return `${v}년`; if(k==='plan')return String(v).toUpperCase(); return v; }
function standardRows(){return entry(state.product).rows.filter(r=>!r.pricingType);}
function preferredValue(key, vals){
  const orders={ management:['셀프형','방문형'], contractYears:[6,5,7,3], visitCycleMonths:[12,6,4,2] };
  const pref=orders[key]||[];
  for(const x of pref){ if(vals.some(v=>String(v)===String(x))) return vals.find(v=>String(v)===String(x)); }
  return vals[0];
}
function normalizeSelections(){
  const rows=standardRows(); let prior={};
  dimensions.forEach(([key])=>{
    const possible=unique(rows.filter(r=>Object.entries(prior).every(([k,v])=>r[k]===v)).map(r=>r[key]));
    if(!possible.length){ delete state.sel[key]; return; }
    if(!possible.some(v=>v===state.sel[key])) state.sel[key]=preferredValue(key, possible);
    prior[key]=state.sel[key];
  });
}
function renderSelectors(){
  const rows=standardRows(), box=$('#selectors'), special=$('#specialPricing');
  const ent=entry(state.product); const warn=$('#dataWarning');
  if(ent.dataCompleteness==='summary-only'){ warn.textContent=ent.note||'이 제품은 상세 계약기간별 가격표가 아직 수집되지 않아 e-book 요약 가격을 표시합니다.'; warn.classList.remove('hidden'); }
  else if(ent.dataCompleteness==='partial-official'){ warn.textContent=ent.note||'현재 확보된 공식 상세가격 범위만 표시합니다.'; warn.classList.remove('hidden'); }
  else { warn.classList.add('hidden'); }
  if(!rows.length){ box.innerHTML=''; special.classList.remove('hidden'); special.innerHTML=entry(state.product).rows.map(r=>`<div class="special-row"><span>${r.serviceYearFrom}~${r.serviceYearTo}년차</span><strong>${fmt(r.price)}</strong></div>`).join(''); return; }
  special.classList.add('hidden'); normalizeSelections();
  let prior={}; let html='';
  dimensions.forEach(([key,title])=>{
    const vals=unique(rows.filter(r=>Object.entries(prior).every(([k,v])=>r[k]===v)).map(r=>r[key]));
    if(vals.length){
      html+=`<div class="selector-group"><label>${title}</label><div class="seg">${vals.map(v=>`<button type="button" data-dim="${key}" data-val="${encodeURIComponent(String(v))}" class="${state.sel[key]===v?'active':''}">${labelVal(key,v)}</button>`).join('')}</div></div>`;
      prior[key]=state.sel[key];
    }
  });
  box.innerHTML=html;
  document.querySelectorAll('[data-dim]').forEach(b=>b.onclick=()=>{
    const key=b.dataset.dim; const raw=decodeURIComponent(b.dataset.val); const sample=rows.find(r=>String(r[key])===raw)?.[key];
    state.sel[key]=sample; const idx=dimensions.findIndex(x=>x[0]===key); dimensions.slice(idx+1).forEach(([k])=>delete state.sel[k]);
    state.promoId=null; state.customerType='전체'; renderCalc();
  });
}
function selectedRow(){
  const rows=standardRows();
  if(!rows.length) return null;
  return rows.find(r=>Object.entries(state.sel).every(([k,v])=>v===undefined||r[k]===v))||null;
}
function rowSummary(r){ if(!r) return ''; const a=[]; if(r.variant)a.push(r.variant); if(r.size)a.push(sizeLabel(r.size)); if(r.management)a.push(r.management); if(r.plan)a.push(String(r.plan).toUpperCase()); if(r.visitCycleMonths)a.push(`${r.visitCycleMonths}개월 주기`); if(r.contractYears)a.push(`의무 ${r.contractYears}년`); if(r.ownershipYears)a.push(`소유 ${r.ownershipYears}년`); return a.join(' · '); }
function renderMembership(){
  const m=entry(state.product).memberships||[],w=$('#membershipBlock');
  if(!m.length){w.classList.add('hidden'); return;}
  w.classList.remove('hidden');
  $('#membershipList').innerHTML=m.map(x=>`<div class="membership-item"><span>${[x.management,x.visitCycleMonths?x.visitCycleMonths+'개월':''].filter(Boolean).join(' · ')}</span><strong>${fmt(x.price)}</strong></div>`).join('');
}
// Only promotions for the contract row can be shown or applied.
// The e-book price matrix and the promotional policy are deliberately kept separate.
function promoMatchesRow(p,row){
  if(!row) return false;
  if(p.contractYears!=null){
    if(row.contractYears==null || Number(p.contractYears)!==Number(row.contractYears)) return false;
  }
  const m=String(p.managementType||'');
  if(m.includes('무방문')){
    if(row.management && row.management!=='셀프형') return false;
  }else if(m.includes('Lite')){
    // Lite is a separate service plan, not a synonym for either visit or self.
    if(row.plan && String(row.plan).toLowerCase()!=='lite') return false;
    if(!row.plan && row.management) return false;
  }else if(m.includes('셀프')){
    if(row.management && row.management!=='셀프형') return false;
  }else if(m.includes('방문')){
    if(row.management && row.management!=='방문형') return false;
  }
  const mm=m.match(/(\d+)개월/);
  if(mm && row.visitCycleMonths!=null && Number(mm[1])!==Number(row.visitCycleMonths)) return false;
  if(/슈퍼싱글|\bSS\b/.test(String(p.note||'')) && row.size && row.size!=='SS') return false;
  return true;
}
function promoKey(p){return [p.page,p.sourceModel,p.customerType,p.managementType,p.contractYears,p.discountMonths,p.promoPrice].join('|');}
function matchingPromos(row){
  return state.product ? productPromos(state.product).filter(p=>promoMatchesRow(p,row)):[];
}
function selectedPromo(){
  if(!state.product||!state.promoId) return null;
  return matchingPromos(selectedRow()).find(p=>promoKey(p)===state.promoId)||null;
}
function promoCardMarkup(p,active){
  const mainPrice=p.basePriceInPromo||p.promoPrice;
  const halfLabel=p.discountMonths&&p.basePriceInPromo?`(${p.discountMonths}개월 반값할인 ${fmt(p.promoPrice)})`:'';
  const afterInfo=p.discountMonths&&p.priceAfterDiscount&&Number(p.priceAfterDiscount)!==Number(mainPrice)?`할인 종료 후 ${fmt(p.priceAfterDiscount)}`:'';
  return `<button class="promo-card ${active?'active':''}" data-promo="${encodeURIComponent(promoKey(p))}" type="button"
    aria-pressed="${active}">
      <h4>${p.promoName}</h4>
      <div class="condition">${[p.customerType,p.managementType||'',p.contractYears?`의무 ${p.contractYears}년`:'' ].filter(Boolean).join(' · ')}</div>
      <div class="promo-main-row"><strong>${fmt(mainPrice)}</strong>${halfLabel?`<span>${halfLabel}</span>`:''}</div>
      <p>${[afterInfo,p.note||''].filter(Boolean).join(' · ') || '프로모션 적용 조건을 확인하세요.'}</p>
    </button>`;
}
function renderPromos(row){
  const all=productPromos(state.product), block=$('#promoBlock');
  $('#promoBlockTitle').textContent=`🔥 ${promoMonthText()} 프로모션`;
  if(!all.length){ block.classList.add('hidden'); state.promoId=null; return; }
  block.classList.remove('hidden');
  const eligible=matchingPromos(row);
  const rawTypes=unique(eligible.map(x=>x.customerType));
  const types=['전체',...rawTypes];
  if(!types.includes(state.customerType)) state.customerType='전체';
  if(state.promoId&&!eligible.some(x=>promoKey(x)===state.promoId)) state.promoId=null;
  $('#customerTypes').innerHTML=types.map(t=>{
    const forType=eligible.filter(x=>x.customerType===t);
    const price=t==='전체'||!forType.length?null:Math.min(...forType.map(x=>Number(x.promoPrice||0)).filter(Boolean));
    return `<button class="${state.customerType===t?'active':''}" data-customer="${t}" type="button">${t}${price?` <small>${fmt(price)}</small>`:''}</button>`;
  }).join('');
  document.querySelectorAll('[data-customer]').forEach(b=>b.onclick=()=>{
    state.customerType=b.dataset.customer;
    state.promoId=null;
    renderPromos(selectedRow()); updatePrice();
  });
  const matched=eligible.filter(p=>state.customerType==='전체'||p.customerType===state.customerType);
  const summary=rowSummary(row);
  $('#promoList').innerHTML=matched.length?
    matched.map(p=>promoCardMarkup(p,state.promoId===promoKey(p))).join(''):
    `<div class="no-promo">현재 선택한 <b>${summary||'계약조건'}</b>에는 적용 가능한 ${promoMonthText()} 프로모션이 없습니다.<br>다른 관리방식이나 의무사용기간을 선택하면 해당 혜택만 나타납니다.</div>`;
  document.querySelectorAll('[data-promo]').forEach(b=>b.onclick=()=>{
    const k=decodeURIComponent(b.dataset.promo);
    if(!matched.some(x=>promoKey(x)===k)) return; // never apply an incompatible offer
    state.promoId=state.promoId===k?null:k;
    renderPromos(selectedRow());updatePrice();
  });
}

function renderCalc(){
  const p=state.product;
  $('#selCategory').textContent=p.category; $('#selSubtype').textContent=subtype(p); $('#selTitle').textContent=p.title; $('#selModel').textContent=p.model; $('#selImage').src=p.cover||'';
  $('#quickFeatures').innerHTML=quickFeatures(p).map(x=>`<span class="feature">${x}</span>`).join('');
  renderSelectors(); const r=selectedRow(); renderPromos(r); renderMembership(); updatePrice();
}
function updatePrice(){
  const r=selectedRow();
  const special=entry(state.product).rows.filter(x=>x.pricingType);
  // The selected e-book contract row is the authoritative term-specific monthly price.
  // Product-list beforePrice is only a representative summary for one contract, so never use it here.
  if(r){
    $('#officialPriceLabel').textContent='선택한 공식 월 구독료';
    $('#officialPriceSource').textContent='SK매직 e-book 계약조건별 가격';
    $('#officialPrice').textContent=r.price?fmt(r.price):'-';
    $('#officialSummary').textContent=rowSummary(r);
    $('#ebookContractMeta').textContent='선택한 관리방식 · 관리주기 · 의무사용기간 기준';
  }else if(special.length){
    $('#officialPriceLabel').textContent='선택한 공식 월 구독료';
    $('#officialPriceSource').textContent='사용연차별 가격';
    $('#officialPrice').textContent='사용연차 선택형';
    $('#officialSummary').textContent='상단 사용연차별 가격표를 확인하세요.';
    $('#ebookContractMeta').textContent='';
  }else{
    $('#officialPriceLabel').textContent='공식 월 구독료';
    $('#officialPriceSource').textContent='선택 조건에 맞는 가격 없음';
    $('#officialPrice').textContent='-';
    $('#officialSummary').textContent='';
    $('#ebookContractMeta').textContent='';
  }
  const p=selectedPromo();
  // Commission basis: original promotional price BEFORE half-price discount.
  // If no promotion is selected, use this exact e-book contract row's price.
  const apply=p?((p.discountMonths&&p.basePriceInPromo)?Number(p.basePriceInPromo):Number(p.promoPrice)):Number(r?.price||0);
  $('#applyPrice').textContent=apply?fmt(apply):'-';
  if(p){
    const parts=[p.promoName];
    if(p.discountMonths){
      if(p.basePriceInPromo) parts.push(`수수료 기준 ${fmt(p.basePriceInPromo)} (할인 전)`);
      parts.push(`${p.discountMonths}개월 할인요금 ${fmt(p.promoPrice)}`);
    }else{
      parts.push(`프로모션가 ${fmt(p.promoPrice)}`);
    }
    $('#applyMeta').textContent=parts.join(' · ');
  }else{
    $('#applyMeta').textContent=r?'선택한 e-book 계약가격 기준 (프로모션 미선택)':'선택 조건의 공식가격 확인 필요';
  }
  updateCommission();
}
function updateCommission(){
  const amount=Number($('#applyPrice').textContent.replace(/[^\d]/g,''))||0;
  const c=Number($('#contractMultiplier').value), pm=Number($('#profitMultiplier').value), rr=$('#payoutRate').value, rate=rr===''?NaN:Number(rr)/100, extra=Number($('#extraCommission').value||0);
  if(amount&&c>0&&pm>0&&Number.isFinite(rate)){const v=Math.round(amount*c*pm*rate+extra); $('#commissionResult').textContent=fmt(v); $('#commissionResult').dataset.value=v;}
  else{$('#commissionResult').textContent='정책값 입력 필요'; $('#commissionResult').dataset.value='';}
}
['contractMultiplier','profitMultiplier','payoutRate','extraCommission'].forEach(id=>$('#'+id).addEventListener('input',updateCommission));

function openSheet(id){
  state.product=products.find(p=>p.apiId===id);
  state.sel={management:'셀프형',contractYears:6};
  state.customerType='전체'; state.promoId=null;
  renderCalc(); $('#sheet').classList.remove('hidden'); $('#backdrop').classList.remove('hidden'); document.body.style.overflow='hidden';
}
function toast(m){const t=$('#toast'); t.textContent=m; t.classList.add('show'); clearTimeout(toast.tm); toast.tm=setTimeout(()=>t.classList.remove('show'),1300);}
$('#addBtn').onclick=()=>{
  const r=selectedRow(), p=selectedPromo(); const apply=Number($('#applyPrice').textContent.replace(/[^\d]/g,''))||0; const commission=Number($('#commissionResult').dataset.value||0);
  state.cart.unshift({id:Date.now(),title:state.product.title,model:state.product.model,condition:r?rowSummary(r):'사용연차별',promo:p?p.promoName:'',monthly:apply,commission});
  localStorage.setItem(CART_KEY,JSON.stringify(state.cart)); renderCart(); toast('계산내역에 추가했습니다'); closeSheet();
};
function renderCart(){
  $('#cartList').innerHTML=state.cart.length?state.cart.map(x=>`<div class="cart-item"><div><b>${x.title}</b><small>${x.model} · ${x.condition}${x.promo?' · '+x.promo:''} · 월 ${fmt(x.monthly)}</small></div><div><strong>${x.commission?fmt(x.commission):'정책값 미입력'}</strong><button data-remove="${x.id}" type="button">삭제</button></div></div>`).join(''):'<div class="cart-empty">아직 계산한 제품이 없습니다.</div>';
  document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{state.cart=state.cart.filter(x=>String(x.id)!==b.dataset.remove); localStorage.setItem(CART_KEY,JSON.stringify(state.cart)); renderCart();});
  $('#totalCommission').textContent=fmt(state.cart.reduce((s,x)=>s+Number(x.commission||0),0));
}
$('#clearCart').onclick=()=>{ if(state.cart.length&&confirm('계산내역을 모두 삭제할까요?')){ state.cart=[]; localStorage.setItem(CART_KEY,'[]'); renderCart(); } };
$('#searchInput').addEventListener('input',e=>{state.search=e.target.value; renderProducts();});
$('#clearSearch').onclick=()=>{$('#searchInput').value=''; state.search=''; renderProducts();};
function renderMonthSelect(){
  const months=Object.keys(ARCHIVE).sort().reverse();
  $('#monthSelect').innerHTML=months.map(m=>`<option value="${m}" ${m===state.month?'selected':''}>${ARCHIVE[m]?.label||m.replace('-','.')}</option>`).join('');
  $('#monthCurrent').textContent=monthText();
  $('#monthSelect').onchange=e=>{ closeSheet(); loadMonth(e.target.value); $('#monthCurrent').textContent=monthText(); state.category='전체'; state.sub='전체'; state.search=''; $('#searchInput').value=''; $('#listTitle').textContent='전체 제품'; renderCats(); renderSub(); renderProducts(); toast(`${monthText()} 기준 가격으로 변경했습니다`); };
}

loadMonth(state.month);
renderMonthSelect();
renderCats(); renderSub(); renderProducts(); renderCart();
