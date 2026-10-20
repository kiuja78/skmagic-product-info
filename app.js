const ARCHIVE=window.SK_MONTH_ARCHIVE||{};
const DEFAULT_MONTH=window.SK_DEFAULT_MONTH||Object.keys(ARCHIVE).sort().reverse()[0];
const CART_KEY='sk_v64_cart';
let products=[];
let promos=[];
let priceDB={};
let finalRates={};
let referencePolicy={};

const $=s=>document.querySelector(s);
const fmt=n=>Number(n||0).toLocaleString('ko-KR')+'원';
const unique=arr=>[...new Set((arr||[]).filter(v=>v!==undefined&&v!==null&&v!==''))];

const state={
  month:localStorage.getItem('sk_selected_month')||DEFAULT_MONTH,
  category:'전체',sub:'전체',search:'',product:null,
  sel:{}, customerType:null, rateCustomer:null, promoId:null, commissionType:null,
  cart:JSON.parse(localStorage.getItem(CART_KEY)||'[]'),
  frameProductId:null, frameEnabled:false,
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
  finalRates=snap.finalRates||{};
  referencePolicy=snap.referencePolicy||{};
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
function tariffRows(p){return finalRates[String(p.apiId)]||[];}
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
function availableYears(p){return unique([...entry(p).rows.map(r=>r.contractYears),...tariffRows(p).map(r=>r.contractYears)]).sort((a,b)=>a-b);}
function priceRange(p){
  const a=tariffRows(p).flatMap(r=>Object.values(r.pricesByCustomer||{})).filter(Boolean);
  if(!a.length)return '첨부 최종가격표 미확인';
  return Math.min(...a)===Math.max(...a)?fmt(a[0]):`${fmt(Math.min(...a))} ~ ${fmt(Math.max(...a))}`;
}
function subFilters(c){
  if(c==='프로모션')return['전체','정수기','공기청정기','비데','매트리스'];
  if(c==='정수기')return['전체','직수형','초소형','얼음','얼음물','스탠드형','일반형'];
  if(c==='공기청정기')return['전체','올클린 디 아트','올클린','코어','슈퍼','기타'];
  if(c==='비데')return['전체','올클린 케어','풀스텐 케어','스파','파워업','기타'];
  if(c==='매트리스')return['전체','SS','Q','K'];
  return[];
}
function mattressSizes(p){return unique([...entry(p).rows.map(r=>r.size),...tariffRows(p).map(r=>r.size)]);}
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
            <p>${special?'연차별 가격 별도 확인':`10월 최종표 ${priceRange(p)} · 고객유형·약정별 선택`}</p>
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
function labelVal(k,v){ if(k==='size')return sizeLabel(v); if(k==='visitCycleMonths')return Number(v)===0?'무방문':`${v}개월`; if(k==='contractYears')return `${v}년`; if(k==='plan')return String(v).toUpperCase(); return v; }
// The 10월 final-price photos define customer-specific tariff conditions.
// Keep e-book contractual conditions only when they do not duplicate a photo condition.
function standardRows(){
  // The October reference-site tariff defines which contract conditions can be selected.
  // Mixing unrelated e-book summary rows into that selector silently hid Lite packages.
  const sheet=tariffRows(state.product);
  if(sheet.length)return sheet.map(r=>({...r,price:0}));
  return entry(state.product).rows.filter(r=>!r.pricingType).map(r=>({...r,sourceType:'ebook-only-unmatched'}));
}
function rowConditionsMatch(rate,row){
  if(!rate||!row)return false;
  const same=(k)=>rate[k]==null||row[k]==null||String(rate[k])===String(row[k]);
  if(!['size','management','contractYears','variant','plan'].every(same))return false;
  if(rate.visitCycleMonths!=null&&row.visitCycleMonths!=null&&Number(rate.visitCycleMonths)!==Number(row.visitCycleMonths))return false;
  return true;
}
function chosenFinalRate(row){
  if(!row)return null;
  const all=tariffRows(state.product);
  const match=all.filter(r=>rowConditionsMatch(r,row));
  const exact=match.find(r=>r.visitCycleMonths===row.visitCycleMonths&&r.size===row.size&&r.management===row.management&&r.plan===row.plan&&r.variant===row.variant);
  return exact||match[0]||null;
}
const rateGroups={
  '신규':['신규단품','신규'],
  '크로스':['크로스','크로스/재구독/우대','재구독/우대'],
  '패키지':['패키지','크로스/재구독/우대','재구독/우대'],
  '재구독':['재구독단품','재구독/우대','크로스/재구독/우대'],
  '재구독패키지':['재구독패키지','재구독패키지/우대패키지'],
  '우대':['재구독단품','재구독/우대','크로스/재구독/우대'],
  '우대패키지':['재구독패키지','재구독패키지/우대패키지'],
  '타사보상':['타사보상'],
  '기본최종':['기본최종','기본 최종구독료']
};
const refTypeOrder=['신규','크로스','패키지','재구독','재구독패키지','우대','우대패키지','타사보상','기본최종'];
const typeLabels={'신규':'신규 단품','재구독':'재구독 단품','기본최종':'단일 구독료'};
function customerPrice(rate,type){
  if(!rate)return null;
  const obj=rate.pricesByCustomer||{};
  for(const k of [...(rateGroups[type]||[]),type]){
    const val=obj[k];if(val!==undefined&&val!==null&&Number(val)>0)return Number(val);
  }
  return null;
}
function eligibleRateTypes(rate){
  return rate?refTypeOrder.filter(t=>customerPrice(rate,t)!=null):[];
}
function chooseRateCustomer(rate){
  const types=eligibleRateTypes(rate);
  if(!types.includes(state.rateCustomer))state.rateCustomer=types.includes('신규')?'신규':types[0]||null;
}
function saleTypeForCustomer(t){
  return ({'신규':'신규','타사보상':'타사보상','크로스':'크로스','패키지':'패키지','재구독':'교체','재구독패키지':'교체','우대':'교체','우대패키지':'패키지'})[t]||'신규';
}
function mallBase(row){
  if(!row||!state.product)return 0;
  const v=state.product.prices||{};
  if(row.management==='방문형')return Number(v.beforePriceVisit||v.beforePrice||0);
  if(row.management==='셀프형')return Number(v.beforePriceSelf||v.beforePrice||0);
  return Number(v.beforePrice||0);
}
const tariffGroupSections=[
  {title:'신규 · 크로스 · 패키지',css:'rate-group-primary',types:['신규','크로스','패키지']},
  {title:'재구독',css:'rate-group-pair',types:['재구독','재구독패키지']},
  {title:'우대',css:'rate-group-pair',types:['우대','우대패키지']},
  {title:'타사보상',css:'rate-group-single',types:['타사보상']},
  {title:'구독료',css:'rate-group-single',types:['기본최종']}
];
// Mattress and frame are independent rental lines. Matching uses mattress size
// and obligation years only: care visit frequency belongs to the mattress.
function isMattressCore(p){
  return p?.category==='매트리스' && /^MAT-SM(430|230|730)$/.test(String(p.model||''));
}
function frameProducts(){
  const order=['MAT-SF520','MAT-SF530','MAT-SH520','MAT-SH530','MAT-SH510'];
  return order.map(m=>products.find(p=>p.model===m)).filter(Boolean);
}
function frameRateFor(p,row){
  if(!p||!row||!row.size||!row.contractYears) return null;
  return tariffRows(p).find(x=>x.size===row.size && Number(x.contractYears)===Number(row.contractYears))||null;
}
function selectedFrameData(row){
  if(!isMattressCore(state.product)||!state.frameEnabled||!state.frameProductId)return null;
  const p=frameProducts().find(x=>x.apiId===state.frameProductId);
  if(!p)return null;
  const frameRow=frameRateFor(p,row);
  const amount=customerPrice(frameRow,'기본최종');
  return frameRow&&amount?{product:p, row:frameRow, monthly:amount}:null;
}
function combinedMattressRate(row){
  const mattress=customerPrice(chosenFinalRate(row),state.rateCustomer);
  const frame=selectedFrameData(row);
  return {mattress,frame,total: mattress!=null ? Number(mattress)+(frame?.monthly||0):null};
}
function renderFrameAddon(row){
  const el=$('#frameAddon');
  if(!isMattressCore(state.product)){
    el.classList.add('hidden');state.frameEnabled=false;state.frameProductId=null;return;
  }
  el.classList.remove('hidden');
  const valid=frameProducts().filter(p=>frameRateFor(p,row)!=null);
  if(state.frameEnabled && state.frameProductId && !valid.some(p=>p.apiId===state.frameProductId)){
    state.frameProductId=null;
  }
  $('#frameToggle').innerHTML=[
    `<button type="button" class="${!state.frameEnabled?'active':''}" data-frame-enabled="false" aria-pressed="${!state.frameEnabled}">선택 안함</button>`,
    `<button type="button" class="${state.frameEnabled?'active':''}" data-frame-enabled="true" aria-pressed="${state.frameEnabled}">프레임 선택</button>`
  ].join('');
  $('#frameContext').textContent=row?.size&&row?.contractYears ?
    `${sizeLabel(row.size)} · 의무 ${row.contractYears}년 기준으로 선택 가능한 프레임만 표시합니다.` :
    '매트리스 사이즈와 의무사용기간을 먼저 선택하세요.';
  const options=$('#frameChoices');
  options.classList.toggle('hidden',!state.frameEnabled);
  if(state.frameEnabled){
    options.innerHTML=frameProducts().map(p=>{
      const matching=frameRateFor(p,row);
      const amount=customerPrice(matching,'기본최종');
      const unavailable=amount==null;
      return `<button type="button" class="frame-choice ${state.frameProductId===p.apiId?'active':''}" data-frame-id="${p.apiId}" aria-pressed="${state.frameProductId===p.apiId}" ${unavailable?'disabled':''}>
        <span class="frame-choice-label">${p.title}</span><small>${p.model.replace('MAT-','')}</small>
        <strong>${unavailable?'선택 불가':fmt(amount)}</strong>
      </button>`;
    }).join('');
  }else{options.innerHTML='';}
  document.querySelectorAll('[data-frame-enabled]').forEach(b=>b.onclick=()=>{
    state.frameEnabled=b.dataset.frameEnabled==='true';
    if(!state.frameEnabled)state.frameProductId=null;
    else if(state.frameProductId==null && valid.length===1)state.frameProductId=valid[0].apiId;
    renderFrameAddon(selectedRow()); updatePrice();
  });
  document.querySelectorAll('[data-frame-id]').forEach(b=>b.onclick=()=>{
    const p=frameProducts().find(x=>x.apiId===Number(b.dataset.frameId));
    if(!p||!frameRateFor(p,selectedRow()))return;
    state.frameProductId=p.apiId;state.frameEnabled=true;
    renderFrameAddon(selectedRow()); updatePrice();
  });
  refreshFrameBundle(row);
}
function refreshFrameBundle(row){
  if(!isMattressCore(state.product))return;
  const result=combinedMattressRate(row);
  const box=$('#frameBundleTotal');
  if(result.mattress==null){
    box.innerHTML='<div class="frame-bundle-missing">매트리스 구독료가 확인되면 합산 금액이 표시됩니다.</div>';
    return;
  }
  const framePrice=result.frame?.monthly||0;
  const desc=result.frame ? result.frame.product.title : '프레임 없음';
  const status=state.frameEnabled&&!result.frame?'프레임 종류를 선택하면 합산됩니다.':'';
  box.innerHTML=`<div class="frame-bundle-parts">
      <span>매트리스 <b>${fmt(result.mattress)}</b></span>
      <span>${desc} <b>${framePrice?fmt(framePrice):'0원'}</b></span>
    </div>
    <div class="frame-bundle-sum"><span>월 합산 구독료</span><strong>${fmt(result.total)}</strong></div>
    ${status?`<div class="frame-bundle-hint">${status}</div>`:''}
    ${result.frame?'<div class="frame-bundle-disclaimer">매트리스와 프레임의 월요금 합산입니다. 프레임 수수료는 별도 산정이 필요합니다.</div>':''}`;
}

function renderFinalRates(row){
  const box=$('#finalRateBlock'), rate=chosenFinalRate(row);
  const types=eligibleRateTypes(rate);
  chooseRateCustomer(rate);
  box.classList.remove('hidden');
  const groups=tariffGroupSections.map(g=>{
    const visible=g.types.filter(t=>types.includes(t));
    if(!visible.length)return '';
    return `<div class="rate-group ${g.css}">
      <div class="rate-group-title">${g.title}</div>
      <div class="rate-group-grid">${visible.map(t=>{
        const amount=customerPrice(rate,t);
        const effType=saleTypeForCustomer(t);
        const ratio=(referencePolicy.rateByType||{})[effType];
        const percent=ratio==null?'':'지급 '+Math.round(ratio*100)+'%';
        return `<button type="button" aria-pressed="${t===state.rateCustomer}" class="rate-option ${t===state.rateCustomer?'active':''}" data-rate-customer="${t}">
          <span class="rate-option-title">${typeLabels[t]||t}</span><strong>${fmt(amount)}</strong>${percent?`<small>${percent}</small>`:''}</button>`;
      }).join('')}</div>
    </div>`;
  }).filter(Boolean);
  $('#finalCustomerTypes').innerHTML=groups.length?groups.join(''):
    '<div class="no-promo">이 계약조건에 등록된 구독료가 없습니다. 관리방식 또는 약정을 변경하세요.</div>';
  document.querySelectorAll('[data-rate-customer]').forEach(b=>b.onclick=()=>{
    state.rateCustomer=b.dataset.rateCustomer;
    state.commissionType=null;
    state.promoId=null;
    const applicable=unique(matchingPromos(selectedRow()).map(x=>x.customerType));
    state.customerType=applicable.includes(state.rateCustomer)?state.rateCustomer:'전체';
    renderFinalRates(selectedRow());renderPromos(selectedRow());updatePrice();
  });
  $('#finalRatePrice').textContent=rate&&state.rateCustomer?fmt(customerPrice(rate,state.rateCustomer)):'-';
}

function preferredValue(key, vals){
  const orders={ management:['셀프형','방문형','라이트형'], contractYears:[6,5,7,3,4], visitCycleMonths:[12,6,4,2,0] };
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
  let prior={};
  const selectorHtml={};
  dimensions.forEach(([key,title])=>{
    const vals=unique(rows.filter(r=>Object.entries(prior).every(([k,v])=>r[k]===v)).map(r=>r[key]));
    if(vals.length){
      selectorHtml[key]=`<div class="selector-group selector-${key}"><label>${title}</label><div class="seg">${vals.map(v=>`<button type="button" data-dim="${key}" data-val="${encodeURIComponent(String(v))}" class="${state.sel[key]===v?'active':''}">${labelVal(key,v)}</button>`).join('')}</div></div>`;
      prior[key]=state.sel[key];
    }
  });
  // Keep care mode and its service interval side by side even when a plan selector exists.
  const pair=[selectorHtml.management,selectorHtml.visitCycleMonths].filter(Boolean);
  box.innerHTML=[
    selectorHtml.variant,
    selectorHtml.size,
    pair.length?`<div class="selector-care-row">${pair.join('')}</div>`:'',
    selectorHtml.plan,
    selectorHtml.contractYears
  ].filter(Boolean).join('');
  document.querySelectorAll('[data-dim]').forEach(b=>b.onclick=()=>{
    const key=b.dataset.dim; const raw=decodeURIComponent(b.dataset.val); const sample=rows.find(r=>String(r[key])===raw)?.[key];
    state.sel[key]=sample; const idx=dimensions.findIndex(x=>x[0]===key); dimensions.slice(idx+1).forEach(([k])=>delete state.sel[k]);
    state.promoId=null; state.customerType='전체';state.commissionType=null; renderCalc();
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
  const eligible=all.length?matchingPromos(row):[];
  if(!eligible.length){ block.classList.add('hidden'); state.promoId=null; return; }
  block.classList.remove('hidden');
  const rawTypes=unique(eligible.map(x=>x.customerType));
  const types=['전체',...rawTypes];
  if(!types.includes(state.customerType)) state.customerType=types.includes(state.rateCustomer)?state.rateCustomer:'전체';
  if(state.promoId&&!eligible.some(x=>promoKey(x)===state.promoId)) state.promoId=null;
  $('#customerTypes').innerHTML=types.map(t=>{
    const forType=eligible.filter(x=>x.customerType===t);
    const price=t==='전체'||!forType.length?null:Math.min(...forType.map(x=>Number(x.promoPrice||0)).filter(Boolean));
    return `<button class="${state.customerType===t?'active':''}" data-customer="${t}" type="button">${t}${price?` <small>${fmt(price)}</small>`:''}</button>`;
  }).join('');
  document.querySelectorAll('[data-customer]').forEach(b=>b.onclick=()=>{
    state.customerType=b.dataset.customer;
    state.promoId=null;state.commissionType=null;
    const linked={'신규':'신규','재구독':'재구독','타사보상':'타사보상','크로스/재구독':'재구독'}[state.customerType];
    if(linked&&eligibleRateTypes(chosenFinalRate(selectedRow())).includes(linked))state.rateCustomer=linked;
    renderFinalRates(selectedRow());renderPromos(selectedRow()); updatePrice();
  });
  const matched=eligible.filter(p=>state.customerType==='전체'||p.customerType===state.customerType);
  const summary=rowSummary(row);
  $('#promoList').innerHTML=matched.length?
    matched.map(p=>promoCardMarkup(p,state.promoId===promoKey(p))).join(''):
    `<div class="no-promo">현재 선택한 <b>${summary||'계약조건'}</b>에는 적용 가능한 ${promoMonthText()} 프로모션이 없습니다.<br>다른 관리방식이나 의무사용기간을 선택하면 해당 혜택만 나타납니다.</div>`;
  document.querySelectorAll('[data-promo]').forEach(b=>b.onclick=()=>{
    const k=decodeURIComponent(b.dataset.promo);
    if(!matched.some(x=>promoKey(x)===k)) return; // never apply an incompatible offer
    state.promoId=state.promoId===k?null:k;state.commissionType=null;
    renderPromos(selectedRow());updatePrice();
  });
}

function renderCalc(){
  const p=state.product;
  $('#selCategory').textContent=p.category; $('#selSubtype').textContent=subtype(p); $('#selTitle').textContent=p.title; $('#selModel').textContent=p.model; $('#selImage').src=p.cover||'';
  $('#quickFeatures').innerHTML=quickFeatures(p).map(x=>`<span class="feature">${x}</span>`).join('');
  renderSelectors(); const r=selectedRow(); renderFinalRates(r); renderPromos(r); renderMembership(); renderFrameAddon(r); updatePrice();
}
function updatePrice(){
  const r=selectedRow(), special=entry(state.product).rows.filter(x=>x.pricingType);
  const mall=mallBase(r);
  $('#officialPriceLabel').textContent='기본구독료 · SK매직몰';
  $('#officialPrice').textContent=mall?fmt(mall):'-';
  $('#officialPrice').classList.toggle('base-price-strike', !!mall);
  $('#officialSummary').textContent='';
  $('#ebookContractMeta').textContent=mall?'':special.length?'연차별 구독료 확인':'기본구독료 미확인';
  const p=selectedPromo(), rate=chosenFinalRate(r), finalAmount=customerPrice(rate,state.rateCustomer);
  // Critical: never use a generic e-book contract or mall representative as a final customer rate.
  // Promo commission uses before-half base; non-half promo uses stated monthly rate.
  const apply=p?(Number((p.discountMonths&&p.basePriceInPromo)?p.basePriceInPromo:p.promoPrice)||0):Number(finalAmount||0);
  $('#applyPrice').textContent=apply?fmt(apply):'-';
  if(p){
    const parts=[`e-book 프로모션 · ${p.promoName}`];
    if(p.discountMonths){
      if(p.basePriceInPromo)parts.push(`수수료 기준 ${fmt(p.basePriceInPromo)} (반값 전)`);
      parts.push(`${p.discountMonths}개월 반값 ${fmt(p.promoPrice)}`);
    }else{parts.push(`프로모션가 ${fmt(p.promoPrice)}`);}
    $('#applyMeta').textContent=parts.join(' · ');
  }else{
    $('#applyMeta').textContent=apply?`10월 최종 구독료표 · ${state.rateCustomer||'기본'} 가격 기준`:'최종가격표 또는 e-book 프로모션 해당금액 확인 필요';
  }
  refreshFrameBundle(r);
  syncCommissionDefaults(r);
  renderCommissionTypes();
  updateCommission();
}

function suggestedProfitMultiplier(p){
  const m=String(p?.model||'').replace(/[^A-Z0-9]/gi,'').toUpperCase();
  if(p?.category==='매트리스')return {value:.8,reason:'매트리스 이익배수 ×0.8'};
  if(/^ACL(15C|20C|25C)/.test(m))return {value:.8,reason:'ACL15/20/25C 품목군 · 코드별 확인 필요'};
  if(/^BID(F17|S17)/.test(m))return {value:.8,reason:'F17/S17 코드별 이익배수 · 제품코드 확인 필요'};
  if(/^(WPUB(600|610|700|710)|WPUIC110F|WPUJCC104|WPUTD[C|F](104|114)|WPUB400)/.test(m))return {value:.8,reason:'참고 사이트 제품코드 표 기준 ×0.8'};
  return {value:1,reason:'기본 이익배수 ×1.0 · 세부 제품코드 확인 필요'};
}
function commissionTypeDefault(){
  const pp=selectedPromo();
  if(pp){
    const type=String(pp.customerType||'');
    if(type.includes('타사'))return '타사보상';
    if(type.includes('크로스')&&!type.includes('재구독'))return '크로스';
    if(type.includes('재구독'))return '교체';
    if(type.includes('신규'))return '신규';
  }
  return saleTypeForCustomer(state.rateCustomer);
}
function syncCommissionDefaults(r){
  const policy=referencePolicy||{}, years=r?.contractYears;
  const contract=policy.termMultiplier?.[String(years)];
  const profit=suggestedProfitMultiplier(state.product);
  if(!state.commissionType)state.commissionType=commissionTypeDefault();
  const payout=policy.rateByType?.[state.commissionType];
  $('#contractMultiplier').value=contract??'';
  $('#profitMultiplier').value=profit.value;
  $('#payoutRate').value=payout===undefined?'':Math.round(payout*100);
  $('#commissionPolicyNote').textContent=`SK매직 지급정책 · ${profit.reason} · 정산 전 예상액${selectedFrameData(r)?' · 프레임 수수료는 별도 산정(월 구독료 합산만 표시)':''}`;
}
function renderCommissionTypes(){
  const box=$('#commissionTypeOptions'), ratio=referencePolicy.rateByType||{};
  const types=['신규','크로스','패키지','교체','기기변경','기변패키지 순증','기변패키지 순증X','타사보상'];
  box.innerHTML=types.map(t=>`<button type="button" data-pay-type="${t}" class="${state.commissionType===t?'active':''}">${t} <small>${Math.round(100*(ratio[t]||0))}%</small></button>`).join('');
  document.querySelectorAll('[data-pay-type]').forEach(b=>b.onclick=()=>{
    state.commissionType=b.dataset.payType;
    $('#payoutRate').value=Math.round(100*(ratio[state.commissionType]||0));
    renderCommissionTypes();updateCommission();
  });
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
  state.customerType='전체'; state.rateCustomer=null; state.promoId=null;state.commissionType=null;state.frameProductId=null;state.frameEnabled=false;
  renderCalc(); $('#sheet').classList.remove('hidden'); $('#backdrop').classList.remove('hidden'); document.body.style.overflow='hidden';
}
function toast(m){const t=$('#toast'); t.textContent=m; t.classList.add('show'); clearTimeout(toast.tm); toast.tm=setTimeout(()=>t.classList.remove('show'),1300);}
$('#addBtn').onclick=()=>{
  const r=selectedRow(), p=selectedPromo(); const apply=Number($('#applyPrice').textContent.replace(/[^\d]/g,''))||0;
  if(!apply){toast('선택 조건의 최종가격이 없습니다. 가격표를 확인해 주세요.');return;} if($('#commissionResult').dataset.value===''){toast('계약기간과 수수료 정책을 확인해 주세요.');return;} const commission=Number($('#commissionResult').dataset.value||0);
  const selectedFrame=selectedFrameData(r);
  const monthly=selectedFrame?apply+selectedFrame.monthly:apply;
  state.cart.unshift({id:Date.now(),title:state.product.title,model:state.product.model,condition:r?rowSummary(r):'사용연차별',promo:p?p.promoName:'',monthly,baseMonthly:apply,
    frameModel:selectedFrame?.product.model||null, frameTitle:selectedFrame?.product.title||null, frameMonthly:selectedFrame?.monthly||0,
    customer:state.rateCustomer,commissionType:state.commissionType,commission});
  localStorage.setItem(CART_KEY,JSON.stringify(state.cart)); renderCart(); toast('계산내역에 추가했습니다'); closeSheet();
};
function renderCart(){
  $('#cartList').innerHTML=state.cart.length?state.cart.map(x=>`<div class="cart-item"><div><b>${x.title}</b><small>${x.model} · ${x.condition} · ${x.customer||'가격유형'} / ${x.commissionType||'정책확인'}${x.promo?' · '+x.promo:''}${x.frameModel?' · '+x.frameTitle+' ('+x.frameModel+') '+fmt(x.frameMonthly):''} · 월 ${fmt(x.monthly)}${x.frameModel?' (합산)':''}</small></div><div><strong>${x.commission?fmt(x.commission):'정책값 미입력'}</strong><button data-remove="${x.id}" type="button">삭제</button></div></div>`).join(''):'<div class="cart-empty">아직 계산한 제품이 없습니다.</div>';
  document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{state.cart=state.cart.filter(x=>String(x.id)!==b.dataset.remove); localStorage.setItem(CART_KEY,JSON.stringify(state.cart)); renderCart();});
  const sale=state.cart.reduce((s,x)=>s+Number(x.commission||0),0);
  const bracket=(referencePolicy.brackets||[]).find(b=>state.cart.length>=b.min&&(b.max===null||state.cart.length<=b.max));
  const incentive=Math.round(sale*(bracket?.rate||0));
  $('#saleCommissionTotal').textContent=fmt(sale);
  $('#incentiveRate').textContent=`${state.cart.length}건 · ${Math.round((bracket?.rate||0)*100)}%`;
  $('#incentiveTotal').textContent=fmt(incentive);
  $('#totalCommission').textContent=fmt(sale+incentive);
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

$('#brandReload').addEventListener('click', () => window.location.reload());

loadMonth(state.month);
renderMonthSelect();
renderCats(); renderSub(); renderProducts(); renderCart();
