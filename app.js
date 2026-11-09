const ARCHIVE=window.SK_MONTH_ARCHIVE||{};
const DEFAULT_MONTH=window.SK_DEFAULT_MONTH||Object.keys(ARCHIVE).sort().reverse()[0];
const CART_KEY='sk_v611_cart';
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
  frameProductId:null, frameEnabled:false, frameHalfOptOut:false,
  photo:{product:null,images:[],index:0}
};
const cats=['전체','프로모션','정수기','공기청정기','비데','매트리스','나무엑스'];

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
  // 사용자 첨부 원본: 나무엑스 A1 프로모션 구독료 16개 조건.
  if(state.month==='2026-11' && window.NAMUHX_RATES?.rows?.length){
    let np=products.find(p=>p.category==='나무엑스'||/WRB-?NAMUX|WRBA1/i.test(p.model||''));
    if(!np){
      np={apiId:990017,title:'웰니스 로보틱스 나무엑스 A1',model:'WRBA1M10KRNG',
        category:'나무엑스',spec:'AI 자율주행 공기청정 · 웰니스 로봇',
        features:'AI 자율주행·이동 청정·라이브뷰·건강 체크',
        cover:'https://godomall-storage.cdn-nhncommerce.com/666491d955848ac771719e187e418aef/goods/1000000017/image/detail/1000000017_detail_024.png',
        galleryImages:[],prices:{}};
      products=[...products,np];
    }
    const code=String(np.apiId);
    const multipliers={'3':2.7,'5':4.5,'6':4.95,'7':5.4};
    finalRates[code]=window.NAMUHX_RATES.rows.map(r=>{
      const by={'신규단품':r.single,'크로스':r.cross,'패키지':r.package,
        '재구독단품':r.renew,'재구독패키지':r.renewPackage,'타사보상':r.trade};
      const fees={'신규':r.commissions.single,'크로스':r.commissions.cross,
        '패키지':r.commissions.package,'재구독':r.commissions.renew,
        '재구독패키지':r.commissions.renewPackage,'타사보상':r.commissions.trade};
      return {variant:null,management:r.management,visitCycleMonths:r.visitCycleMonths,
        contractYears:r.contractYears,ownershipYears:r.contractYears,
        sheetBasePrice:r.base,pricesByCustomer:by,
        sheetContractMultiplier:multipliers[String(r.contractYears)],
        sheetProfitMultiplier:1,
        sheetPayoutRates:{'신규':1,'크로스':.8,'패키지':.7,
          '재구독':.7,'재구독패키지':.7,'타사보상':1},
        sheetCommissionByCustomer:fees,
        sourceSheet:'사용자 첨부 나무엑스 프로모션 구독료',
        sourceNote:'적용기간은 원본 표에 미기재 · 계약 전 확인'};
    });
  }
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
  // 매트리스·프레임은 사이즈 및 계약기간별로 요금이 달라서,
  // 카드에 무작위 첫 번째 프로모션 금액을 노출하면 SS/Q/K 가격으로 오해할 수 있습니다.
  if(state.month==='2026-11' && p.category==='매트리스' && productPromos(p).length){
    return '<div class="mattress-card-price-notice">6개월 반값 대상 · 사이즈·약정·유형 선택 후 정확한 금액 확인</div>';
  }
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
            <p>${special?'연차별 가격 별도 확인':`${promoMonthText()} 요금표 ${priceRange(p)} · 고객유형·약정별 선택`}</p>
          </div>
          ${renderPromoSummary(p)}
        </div>
      </div>
      <div class="card-actions"><button data-official="${p.apiId}" type="button" ${officialDetailUrl(p)?'':'disabled title="제품별 공식 상세 웹기술서 링크가 확인되지 않았습니다"'}>${officialButtonText(p)}</button><button class="calc" data-calc="${p.apiId}" type="button">가격 · 수수료</button></div>
    </article>`;
  }).join(''):'<div class="cart-empty" style="grid-column:1/-1">조건에 맞는 제품이 없습니다.</div>';
  document.querySelectorAll('[data-photo]').forEach(b=>b.onclick=()=>openPhotoViewer(Number(b.dataset.photo)));
  document.querySelectorAll('[data-official]').forEach(b=>b.onclick=()=>openOfficial(b.dataset.official));
  document.querySelectorAll('[data-calc]').forEach(b=>b.onclick=()=>openSheet(Number(b.dataset.calc)));
}
// 제품 상세는 공식몰 전체 화면보다 별도의 SK매직 e-카탈로그 웹기술서를 우선합니다.
// 11월 추가 모델 중 같은 공식 문서에 모델명이 명시된 제품은 해당 문서를 공유합니다.
// 임의의 상세 URL은 만들지 않으며, 확인되지 않은 모델은 버튼을 비활성화합니다.
const SHARED_OFFICIAL_DETAILS={
  'WPU-TDC104':'WPU-TDC114',  // 문서명: TDC114,104,10R
  'WPU-TDC10R':'WPU-TDC114',  // 문서명: TDC114,104,10R
  'WPU-TDF104':'WPU-TDF114',  // 문서명: TDF104,114
  'WPU-B710F':'WPU-B700F (NANO)', // 문서명: WPUB700FRENW,WPUB710FRENW
  'ACL-22C1ASKOB':'ACL-22C1A' // 디 아트 ACL-22C 제품군 공용 문서
};
function officialDetailUrl(p){
  if(!p)return '';
  if(p.model==='WRB-NAMUX'||p.category==='나무엑스')return 'https://www.namuhx.com/a1';
  const shared=SHARED_OFFICIAL_DETAILS[p.model];
  const sharedProduct=shared?products.find(x=>x.model===shared):null;
  const url=p.officialDetailUrl||sharedProduct?.officialDetailUrl||'';
  // 공식 SK매직 웹기술서만 허용합니다. 나무엑스는 브랜드 공식몰의 특정 A1 제품 상세 링크만 예외적으로 허용합니다.
  if(p.model==='WRB-NAMUX' && url==='https://www.namuhx.com/goods/goods_view_plan.php?goodsNo=1000000017') return url;
  return /^https:\/\/ebookimage\.skmagic\.com\/images\/.+\.html(?:[?#].*)?$/i.test(url)?url:'';
}
function officialButtonText(p,long=false){
  return officialDetailUrl(p)?(p?.model==='WRB-NAMUX'?(long?'나무엑스 공식 제품상세 ↗':'공식 상세'):(long?'SK매직 공식 제품상세 ↗':'공식 상세')):'상세자료 미등록';
}
function setOfficialButton(btn,p,long=false){
  const url=officialDetailUrl(p);
  btn.disabled=!url;
  btn.textContent=officialButtonText(p,long);
  btn.title=url?(p?.model==='WRB-NAMUX'?'나무엑스 브랜드 공식 제품 상세페이지 열기':'공식몰 메뉴 없이 제품별 상세 웹기술서 열기'):'제품별 공식 웹기술서 링크가 확인되지 않았습니다';
}
function openOfficial(id){
  const p=products.find(x=>String(x.apiId)===String(id));
  const url=officialDetailUrl(p);
  if(url&&(p?.model==='WRB-NAMUX'||p?.category==='나무엑스')){showNamuhxDetail(p,url);return;}
  if(url) window.open(url,'_blank','noopener,noreferrer');
  else toast('이 모델의 공식 상세 웹기술서는 아직 등록되지 않았습니다.');
}
// 나무엑스 상세: 계산 흐름을 유지한 채 내부에서 원본을 표시합니다.
// 외부 사이트가 프레임을 차단하는 경우 원본 링크와 제품사진을 제공합니다.
function showNamuhxDetail(p,url){
  // Show a dedicated product information layer rather than the cross-origin storefront.
  // This prevents unrelated navigation and shopping menus from appearing.
  let layer=$('#namuhxDetailLayer');
  if(layer)layer.remove();
  const photos=photoImages(p).filter(src=>/^https:\/\//i.test(src));
  const image=photos[0]||'';
  const cssId='namuhxViewerStyles';
  if(!$('#'+cssId)){
    const css=document.createElement('style');
    css.id=cssId;
    css.textContent=`
      #namuhxDetailLayer{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:16px;background:rgba(12,21,35,.82)}
      #namuhxDetailLayer .nh-dialog{width:min(1050px,100%);height:min(92vh,940px);background:#fff;color:#253247;border-radius:18px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 70px #0005}
      #namuhxDetailLayer .nh-top{padding:15px 20px;display:flex;justify-content:space-between;align-items:center;gap:12px;border-bottom:1px solid #e6e9ef;flex-wrap:wrap}
      #namuhxDetailLayer .nh-actions{display:flex;gap:8px;align-items:center}
      #namuhxDetailLayer .nh-actions a,#namuhxDetailLayer .nh-actions button{padding:9px 14px;border-radius:9px;border:1px solid #c9d2e0;text-decoration:none;background:#f5f8ff;color:#18345c;font-weight:700;font-size:14px;cursor:pointer}
      #namuhxDetailLayer .nh-actions a{background:#183f89;color:#fff}
      #namuhxDetailLayer .nh-content{flex:1;overflow:auto;padding:clamp(20px,4vw,42px);text-align:center}
      #namuhxDetailLayer .nh-content img{width:auto;max-width:100%;height:auto;max-height:650px;object-fit:contain}
      #namuhxDetailLayer .nh-feature{padding:22px;margin:25px auto 0;max-width:690px;text-align:left;border-radius:14px;background:#f5f8fc;line-height:1.8}
      #namuhxDetailLayer .nh-feature h3{margin:0 0 9px;font-size:19px}
      #namuhxDetailLayer .nh-hint{padding:12px 16px;font-size:12px;line-height:1.6;color:#617086;background:#f7f9fc}
      @media(max-width:560px){#namuhxDetailLayer{padding:0}#namuhxDetailLayer .nh-dialog{height:100%;border-radius:0}}
    `;
    document.head.appendChild(css);
  }
  layer=document.createElement('div');
  layer.id='namuhxDetailLayer';
  const safeValue=x=>String(x||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const features=quickFeatures(p).filter(Boolean).map(x=>'<li>'+safeValue(x)+'</li>').join('');
  layer.innerHTML=`<div class="nh-dialog" role="dialog" aria-modal="true" aria-label="나무엑스 A1 제품 상세">
    <div class="nh-top"><strong>나무엑스 A1 · 제품 상세</strong><div class="nh-actions"><a href="https://www.namuhx.com/a1" target="_blank" rel="noopener noreferrer">원본 페이지 열기 ↗</a><button type="button" id="nhClose">닫기 ×</button></div></div>
    <div class="nh-content">
      <small style="font-weight:700;letter-spacing:.12em;color:#517a89">NAMUHX · WELLNESS ROBOTICS</small>
      <h2 style="font-size:clamp(25px,4vw,36px);margin:14px 0 6px">나무엑스 A1</h2>
      <p style="margin:0 0 25px;color:#67768b">공식 등록 제품 이미지 · ${safeValue(p.model)}</p>
      ${image?'<img src="'+safeValue(image)+'" alt="나무엑스 A1 등록 제품 사진" referrerpolicy="no-referrer">':''}
      <div class="nh-feature"><h3>제품 주요 특징</h3><ul>${features||'<li>AI 자율주행 공기청정 · 웰니스 로보틱스</li>'}</ul><p style="margin-bottom:0;font-size:13px;color:#617086">상세 기술 사양과 최신 서비스 조건은 나무엑스 원본 페이지에서 확인할 수 있습니다.</p></div>
    </div>
    <div class="nh-hint">공식 쇼핑몰의 메뉴 없이 제품 정보를 표시합니다. 보다 자세한 자료는 원본 페이지 열기를 이용해 주세요.</div>
  </div>`;
  document.body.appendChild(layer);
  layer.querySelector('#nhClose').onclick=()=>layer.remove();
  layer.addEventListener('click',e=>{if(e.target===layer)layer.remove()});
}
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
  setOfficialButton($('#photoViewerOfficial'),product,true);
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
  if(state.month==='2026-11')return []; // 11월 미등록 제품에 10월 계약조건을 보여주지 않습니다.
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
  if(!rate)return [];
  return refTypeOrder.filter(t=>{
    // 11월 원본에는 우대/우대패키지 별도 열이 없습니다.
    // 지난달 관행으로 재구독 가격을 복제하지 않습니다.
    if(state.month==='2026-11' && (t==='우대'||t==='우대패키지')){
      return Object.prototype.hasOwnProperty.call(rate.pricesByCustomer||{},t);
    }
    return customerPrice(rate,t)!=null;
  });
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
function frameCustomerPrice(frameRow){
  if(!frameRow)return null;
  const exact=customerPrice(frameRow,state.rateCustomer);
  // 11월에는 고객유형별 별도 가격을 임의로 대체하면 안 됩니다.
  return exact??(state.month==='2026-11'?null:customerPrice(frameRow,'기본최종'));
}
function selectedFrameData(row){
  if(!isMattressCore(state.product)||!state.frameEnabled||!state.frameProductId)return null;
  const p=frameProducts().find(x=>x.apiId===state.frameProductId);
  if(!p)return null;
  const frameRow=frameRateFor(p,row);
  const amount=frameCustomerPrice(frameRow);
  return frameRow&&amount!=null?{product:p, row:frameRow, monthly:amount}:null;
}
// 11월 프레임 역시 원본 표에 '신규/재구독 6개월 반값' 별도 가격이 존재합니다.
function frameHalfOffer(frame){
  if(state.month!=='2026-11'||!frame||!['신규','재구독'].includes(state.rateCustomer))return null;
  return productPromos(frame.product).find(pr=>
    pr.customerType===state.rateCustomer && pr.promoSize===frame.row.size &&
    Number(pr.contractYears)===Number(frame.row.contractYears) &&
    Number(pr.discountMonths)===6 && Number(pr.basePriceInPromo)===Number(frame.monthly))||null;
}
function bundleMonthData(row){
  const frame=selectedFrameData(row), promo=selectedPromo();
  const tariff=customerPrice(chosenFinalRate(row),state.rateCustomer);
  if(tariff==null)return {frame,tariff:null};
  const mattressAfter=promo
    ? Number(promo.discountMonths?(promo.priceAfterDiscount||promo.basePriceInPromo||tariff):promo.promoPrice||tariff)
    : Number(tariff);
  const mattressIntro=promo?.discountMonths?Number(promo.promoPrice):mattressAfter;
  const frameOffer=frame&&!state.frameHalfOptOut?frameHalfOffer(frame):null;
  const frameAfter=frame?.monthly||0, frameIntro=frameOffer?Number(frameOffer.promoPrice):frameAfter;
  const promoMonths=Math.max(Number(promo?.discountMonths||0),Number(frameOffer?.discountMonths||0));
  return {frame,promo,frameOffer,tariff,mattressAfter,mattressIntro,frameAfter,frameIntro,
    before:Number(tariff)+frameAfter, first:mattressIntro+frameIntro,
    after:mattressAfter+frameAfter, promoMonths};
}
// V6.11.10: 매트리스 할인 전 정상가와 실제 고객유형별 계약 월 구독료를 명확하게 구분합니다.
// 화면의 연도별 가격은 JSON에 저장된 동일 행의 pricesByCustomer만 사용합니다.
function renderMattressPriceComparison(row){
  const box=$('#mattressPriceCompare'), status=$('#mattressConditionStatus');
  const enabled=state.month==='2026-11'&&isMattressCore(state.product)&&!!row;
  box.classList.toggle('hidden',!enabled);
  status.classList.toggle('hidden',!enabled);
  $('.official-price').classList.toggle('mattress-normal',enabled);
  if(!enabled){box.innerHTML='';status.innerHTML='';return;}
  const rates=tariffRows(state.product), t=state.rateCustomer;
  const sameCondition=(r)=>r.size===row.size&&r.management===row.management&&
    Number(r.visitCycleMonths)===Number(row.visitCycleMonths) && r.plan===row.plan;
  const matching=rates.filter(sameCondition);
  const contractYears=[...new Set(matching.map(r=>Number(r.contractYears)))].sort((x,y)=>x-y);
  const management=Number(row.visitCycleMonths)===0?'무방문':`${row.visitCycleMonths}개월 방문`;
  const label=typeLabels[t]||t||'고객유형 미선택';
  const selectedMonthly=customerPrice(chosenFinalRate(row),t);
  status.innerHTML=`<div class="mattress-status-top"><b>현재 선택된 계약조건</b><small>11월 원본 요금표 기준 · 프레임 별도</small></div>
    <strong>${sizeLabel(row.size)} · ${management} · 의무 ${row.contractYears}년</strong>
    <div class="mattress-status-bottom"><span>${label} 월 구독료 (반값 전)</span><b>${selectedMonthly!=null?fmt(selectedMonthly):'금액 미확인'}</b></div>`;
  const cells=contractYears.map(year=>{
    const rate=matching.find(r=>Number(r.contractYears)===year);
    const actual=customerPrice(rate,t);
    const normal=Number(rate?.sheetNormalPrice||0);
    const selected=Number(row.contractYears)===year;
    return `<button type="button" class="mattress-year-cell ${selected?'selected':''}" data-mattress-year="${year}" aria-pressed="${selected}" aria-label="${label} ${year}년 ${actual!=null?fmt(actual):'금액 미확인'} 선택">
      <span class="mattress-year-name">${year}년${selected?' · 선택':''}</span>
      <strong>${actual!=null?fmt(actual):'금액 미확인'}</strong>
      ${normal>0?`<small>정상가 <s>${fmt(normal)}</s></small>`:''}
    </button>`;
  });
  box.innerHTML=`<div class="mattress-compare-title"><b>${label} 월 구독료 (반값 전)</b><small>${sizeLabel(row.size)} · ${management} · 프레임 제외</small></div>
    <div class="mattress-year-grid">${cells.join('')}</div>
    <p>연도를 누르면 해당 약정으로 변경됩니다. 굵은 금액은 현재 고객유형별 월 구독료이며, 취소선은 정상가입니다. 6개월 반값 등 프로모션은 아래에서 별도 확인하세요.</p>`;
  document.querySelectorAll('[data-mattress-year]').forEach(b=>b.onclick=()=>{
    state.sel.contractYears=Number(b.dataset.mattressYear);
    state.promoId=null; state.customerType='전체'; state.commissionType=null;
    renderCalc();
  });
}
function combinedMattressRate(row){
  const data=bundleMonthData(row);
  return {mattress:data.tariff,frame:data.frame,total:data.before};
}
function renderFrameAddon(row){
  const el=$('#frameAddon');
  if(!isMattressCore(state.product)){
    el.classList.add('hidden');state.frameEnabled=false;state.frameProductId=null;return;
  }
  el.classList.remove('hidden');
  const valid=frameProducts().filter(p=>frameCustomerPrice(frameRateFor(p,row))!=null);
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
      const amount=frameCustomerPrice(matching);
      const unavailable=amount==null;
      return `<button type="button" class="frame-choice ${state.frameProductId===p.apiId?'active':''}" data-frame-id="${p.apiId}" aria-pressed="${state.frameProductId===p.apiId}" ${unavailable?'disabled':''}>
        <span class="frame-choice-label">${p.title}</span><small>${p.model.replace('MAT-','')}</small>
        <strong>${unavailable?'선택 불가':fmt(amount)}</strong>
        ${!unavailable&&matching?.sheetCommissionByCustomer?.[state.rateCustomer]!=null?`<small class="frame-fee-preview">원본 수수료 ${fmt(matching.sheetCommissionByCustomer[state.rateCustomer])}</small>`:''}
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
    if(state.frameProductId!==p.apiId)state.frameHalfOptOut=false;
    state.frameProductId=p.apiId;state.frameEnabled=true;
    renderFrameAddon(selectedRow()); updatePrice();
  });
  // 프레임 반값을 별도 선택/해제할 수 있으며, 추가 할인이 가능한 고객유형만 표시됩니다.
  const halfFrame=selectedFrameData(row), halfOffer=frameHalfOffer(halfFrame);
  const halfBox=$('#frameHalfOption');
  halfBox.classList.toggle('hidden',!halfOffer);
  halfBox.innerHTML=halfOffer?`<div class="frame-half-title">프레임 6개월 반값할인 · ${state.rateCustomer}</div>
    <div class="frame-half-desc">원본 프레임 ${fmt(halfFrame.monthly)} → 첫 6개월 ${fmt(halfOffer.promoPrice)}</div>
    <div class="frame-half-buttons" role="group" aria-label="프레임 반값 적용 여부">
      <button type="button" class="${!state.frameHalfOptOut?'active':''}" data-frame-half="true">반값 적용</button>
      <button type="button" class="${state.frameHalfOptOut?'active':''}" data-frame-half="false">미적용</button>
    </div><small>프레임 자체의 반값 조건입니다. 매트리스와 동시 할인 가능 여부는 계약 시 확인하세요.</small>`:'';
  document.querySelectorAll('[data-frame-half]').forEach(b=>b.onclick=()=>{
    state.frameHalfOptOut=b.dataset.frameHalf==='false';
    renderFrameAddon(selectedRow());updatePrice();
  });
  refreshFrameBundle(row);
}
function refreshFrameBundle(row){
  if(!isMattressCore(state.product))return;
  const result=bundleMonthData(row),box=$('#frameBundleTotal');
  if(result.tariff==null){
    box.innerHTML='<div class="frame-bundle-missing">매트리스 구독료가 확인되면 합산 금액이 표시됩니다.</div>';
    return;
  }
  const desc=result.frame ? result.frame.product.title : '프레임 없음';
  const status=state.frameEnabled&&!result.frame?'프레임 종류를 선택하면 합산됩니다.':'';
  const promoLine=result.promoMonths?`<div class="frame-bundle-sum frame-bundle-intro"><span>첫 ${result.promoMonths}개월 월 구독료</span><strong>${fmt(result.first)}</strong></div>
    <div class="frame-bundle-hint">할인 종료 후 월 ${fmt(result.after)} · 매트리스 ${fmt(result.mattressAfter)} + 프레임 ${fmt(result.frameAfter)}</div>`:'';
  box.innerHTML=`<div class="frame-bundle-parts">
      <span>매트리스 <b>${fmt(result.tariff)}</b></span>
      <span>${desc} <b>${fmt(result.frameAfter)}</b></span>
    </div>
    <div class="frame-bundle-sum"><span>${result.promoMonths?'선택조건 기준 월 합계':'월 합산 구독료'}</span><strong>${fmt(result.after)}</strong></div>
    ${promoLine}
    ${result.frameOffer?`<div class="frame-bundle-hint">프레임 첫 6개월 반값 ${fmt(result.frameIntro)} 적용 · 수수료 기준은 할인 전 금액</div>`:''}
    ${status?`<div class="frame-bundle-hint">${status}</div>`:''}
    ${result.frame?'<div class="frame-bundle-disclaimer">판매수수료는 매트리스 + 프레임을 각각 원본 금액으로 계산해 합산합니다.</div>':''}`;
}
function renderFinalRates(row){
  const box=$('#finalRateBlock'), rate=chosenFinalRate(row);
  const types=eligibleRateTypes(rate);
  chooseRateCustomer(rate);
  box.classList.remove('hidden');
  const groups=tariffGroupSections.map(g=>{
    const visible=g.types.filter(t=>types.includes(t));
    if(!visible.length)return '';
    const groupTitle=(state.month==='2026-11' && g.types.includes('타사보상'))?'타사보상 · 신규·단품 전용':g.title;
    return `<div class="rate-group ${g.css}">
      <div class="rate-group-title">${groupTitle}</div>
      <div class="rate-group-grid">${visible.map(t=>{
        const amount=customerPrice(rate,t);
        const effType=saleTypeForCustomer(t);
        const ratio=rate?.sheetPayoutRates?.[t]??(referencePolicy.rateByType||{})[effType];
        const percent=ratio==null?'':'지급 '+Math.round(ratio*100)+'%';
        const crossHalf=t==='타사보상'&&state.month==='2026-11'&&Number(row?.contractYears)>=5&&
          matchingPromos(row).find(pr=>pr.customerType==='타사보상'&&Number(pr.discountMonths)===5&&Number(pr.basePriceInPromo)===amount);
        const crossHalfHint=crossHalf?`<small class="cross-half-hint">첫 5개월 ${fmt(crossHalf.promoPrice)}</small>`:'';
        return `<button type="button" aria-pressed="${t===state.rateCustomer}" class="rate-option ${t===state.rateCustomer?'active':''}" data-rate-customer="${t}">
          <span class="rate-option-title">${typeLabels[t]||t}</span><strong>${fmt(amount)}</strong>${crossHalfHint}${percent?`<small>${percent}</small>`:''}</button>`;
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
    renderFinalRates(selectedRow());renderPromos(selectedRow());renderFrameAddon(selectedRow());updatePrice();
  });
  $('#finalRatePrice').textContent=rate&&state.rateCustomer?fmt(customerPrice(rate,state.rateCustomer)):'-';
}

function preferredValue(key, vals){
  const orders={ management:['셀프형','방문형','라이트형'], contractYears:[6,5,7,3,4], visitCycleMonths:[12,6,4,2,0] };
  // 기존 요금행의 배열 순서가 Q/K부터 시작해도 매트리스 상세 기본 사이즈는 SS로 통일합니다.
  // 선택 이후 사용자가 지정한 사이즈·기간은 변경하지 않습니다.
  if(key==='size' && state.product?.category==='매트리스'){
    const ss=vals.find(v=>v==='SS');if(ss!==undefined)return ss;
  }
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
  if(!rows.length){
    box.innerHTML='<div class="no-promo">선택 월의 계약별 구독료가 등록되지 않았습니다. 금액을 임의로 표시하지 않습니다.</div>';
    special.classList.add('hidden'); return;
  }
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
function rowSummary(r){ if(!r) return ''; const a=[]; if(r.variant)a.push(r.variant); if(r.size)a.push(sizeLabel(r.size)); if(r.management)a.push(r.management); if(r.plan)a.push(String(r.plan).toUpperCase()); if(r.visitCycleMonths===0 && state.product?.category==='매트리스')a.push('무방문');else if(r.visitCycleMonths)a.push(`${r.visitCycleMonths}개월 주기`); if(r.contractYears)a.push(`의무 ${r.contractYears}년`); if(r.ownershipYears)a.push(`소유 ${r.ownershipYears}년`); return a.join(' · '); }
function renderMembership(){
  const m=entry(state.product).memberships||[],w=$('#membershipBlock');
  if(!m.length){w.classList.add('hidden'); return;}
  w.classList.remove('hidden');
  const selSize=state.sel.size;
  const shown=state.month==='2026-11'&&selSize?m.filter(x=>!x.size||x.size===selSize):m;
  $('#membershipList').innerHTML=shown.map(x=>`<div class="membership-item"><span>${[x.size?sizeLabel(x.size):null,x.management,x.visitCycleMonths?x.visitCycleMonths+'개월':''].filter(Boolean).join(' · ')}</span><strong>${fmt(x.price)}</strong></div>`).join('');
}
// Only promotions for the contract row can be shown or applied.
// The e-book price matrix and the promotional policy are deliberately kept separate.
function promoMatchesRow(p,row){
  if(!row) return false;
  if(p.promoSize && String(row.size)!==String(p.promoSize))return false;
  if(p.promoPlan && String(row.plan||'')!==String(p.promoPlan))return false;
  if(p.contractYears!=null){
    if(row.contractYears==null || Number(p.contractYears)!==Number(row.contractYears)) return false;
  }
  const m=String(p.managementType||'');
  if(m.includes('무방문')){
    if(row.management && row.management!=='셀프형') return false;
    // 무방문 프로모션은 계약의 관리주기 0개월에만 허용합니다.
    if(row.visitCycleMonths!=null && Number(row.visitCycleMonths)!==0) return false;
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
// 11월 타사보상 5개월 반값은 고객유형·관리방식·약정이 정확히 일치할 때 자동 적용합니다.
// 3년 약정은 사용자 제공 정책상 제외됩니다. 수수료 기준은 할인 전 타사보상가입니다.
function automaticCrossHalfPromo(row){
  if(state.month!=='2026-11'||state.rateCustomer!=='타사보상'||!row||Number(row.contractYears)<5) return null;
  const base=customerPrice(chosenFinalRate(row),'타사보상');
  if(!base)return null;
  return matchingPromos(row).find(pr=>pr.customerType==='타사보상'&&
    Number(pr.discountMonths)===5&&Number(pr.basePriceInPromo)===base&&
    pr.promoSourceId?.startsWith('user_2026-11-02_cross_half/'))||null;
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
  const crossHalf=automaticCrossHalfPromo(row);
  if(crossHalf){
    state.promoId=promoKey(crossHalf);
    state.customerType='타사보상';
  }
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
    renderFinalRates(selectedRow());renderPromos(selectedRow());renderFrameAddon(selectedRow());updatePrice();
  });
  const matched=eligible.filter(p=>state.customerType==='전체'||p.customerType===state.customerType);
  const summary=rowSummary(row);
  $('#promoList').innerHTML=matched.length?
    matched.map(p=>promoCardMarkup(p,state.promoId===promoKey(p))).join(''):
    `<div class="no-promo">현재 선택한 <b>${summary||'계약조건'}</b>에는 적용 가능한 ${promoMonthText()} 프로모션이 없습니다.<br>다른 관리방식이나 의무사용기간을 선택하면 해당 혜택만 나타납니다.</div>`;
  document.querySelectorAll('[data-promo]').forEach(b=>b.onclick=()=>{
    const k=decodeURIComponent(b.dataset.promo);
    if(!matched.some(x=>promoKey(x)===k)) return; // never apply an incompatible offer
    // 타사보상 5개월 혜택은 필수 자동 적용: 카드 재클릭으로 누락되지 않게 보호.
    const fixed=automaticCrossHalfPromo(selectedRow());
    state.promoId=(fixed&&promoKey(fixed)===k)?k:(state.promoId===k?null:k);
    state.commissionType=null;
    const selectedOffer=matched.find(x=>promoKey(x)===state.promoId);
    if(selectedOffer){
      const linked={'신규':'신규','재구독':'재구독'}[selectedOffer.customerType];
      if(linked&&eligibleRateTypes(chosenFinalRate(selectedRow())).includes(linked))state.rateCustomer=linked;
    }
    renderFinalRates(selectedRow());renderPromos(selectedRow());renderFrameAddon(selectedRow());updatePrice();
  });
}

function renderCalc(){
  const p=state.product;
  $('#selCategory').textContent=p.category; $('#selSubtype').textContent=subtype(p); $('#selTitle').textContent=p.title; $('#selModel').textContent=p.model; $('#selImage').src=p.cover||'';
  setOfficialButton($('#officialBtn'),p,true);
  $('#quickFeatures').innerHTML=quickFeatures(p).map(x=>`<span class="feature">${x}</span>`).join('');
  renderSelectors(); const r=selectedRow(); renderFinalRates(r); renderPromos(r); renderMembership(); renderFrameAddon(r); updatePrice();
}
function updatePrice(){
  const r=selectedRow(), special=entry(state.product).rows.filter(x=>x.pricingType);
  const mall=mallBase(r);
  const sheetBase=state.month==='2026-11'?chosenFinalRate(r)?.sheetBasePrice:0;
  // 11월 매트리스/프레임의 '정상 구독료'는 첨부 엑셀 G열의 계약조건별 정상가입니다.
  // 제품 단위 공식몰 대표가로 덮어쓰면 사이즈/약정/방문주기마다 오표시됩니다.
  renderMattressPriceComparison(r);
  const exactMattressNormal=state.month==='2026-11' && state.product?.category==='매트리스'
    ? Number(chosenFinalRate(r)?.sheetNormalPrice||0):0;
  const mainBase=exactMattressNormal||mall||sheetBase||0;
  $('#officialPriceLabel').textContent=exactMattressNormal?'정상 구독료 · 11월 매트리스 원본':mall?'기본구독료 · SK매직몰 참고':sheetBase?'기준구독료 · 11월 요금표':'기본구독료 · SK매직몰 미확인';
  $('#officialPrice').textContent=mainBase?fmt(mainBase):'-';
  $('#officialPrice').classList.toggle('base-price-strike',!!mainBase);
  $('#officialSummary').textContent=exactMattressNormal&&sheetBase?`기준구독료 ${fmt(sheetBase)} · 고객유형별 금액은 아래에서 선택`:'';
  $('#ebookContractMeta').textContent=mainBase?'':special.length?'연차별 구독료 확인':'기본구독료 미확인';
  const p=selectedPromo(), rate=chosenFinalRate(r), finalAmount=customerPrice(rate,state.rateCustomer);
  // Critical: never use a generic e-book contract or mall representative as a final customer rate.
  // Promo commission uses before-half base; non-half promo uses stated monthly rate.
  const apply=p?(Number((p.discountMonths&&p.basePriceInPromo)?p.basePriceInPromo:p.promoPrice)||0):Number(finalAmount||0);
  $('#applyPrice').textContent=apply?fmt(apply):'-';
  if(p){
    const parts=[`${promoMonthText()} 프로모션 · ${p.promoName}`];
    if(p.discountMonths){
      if(p.basePriceInPromo)parts.push(`수수료 기준 ${fmt(p.basePriceInPromo)} (반값 전)`);
      parts.push(`${p.discountMonths}개월 반값 ${fmt(p.promoPrice)}`);
    }else{parts.push(`프로모션가 ${fmt(p.promoPrice)}`);}
    $('#applyMeta').textContent=parts.join(' · ');
  }else{
    const crossLabel=state.month==='2026-11'&&state.rateCustomer==='타사보상';
    $('#applyMeta').textContent=apply?(crossLabel?`${promoMonthText()} 타사보상 · 신규·단품 전용 · 할인 전 월요금 기준`:`${promoMonthText()} 구독료표 · ${state.rateCustomer||'기본'} 가격 기준`):'선택 월 구독료표에 해당 조건 금액이 없습니다';
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
  const contract=r?.sheetContractMultipliersByCustomer?.[state.rateCustomer]??r?.sheetContractMultiplier??policy.termMultiplier?.[String(years)];
  const profit=suggestedProfitMultiplier(state.product);
  const profitValue=r?.sheetProfitMultiplier??profit.value;
  if(!state.commissionType)state.commissionType=commissionTypeDefault();
  const sheetType=state.rateCustomer;
  const payout=(r?.sheetPayoutRates && r.sheetPayoutRates[sheetType]!=null)?r.sheetPayoutRates[sheetType] : policy.rateByType?.[state.commissionType];
  $('#contractMultiplier').value=contract??'';
  $('#profitMultiplier').value=profitValue;
  $('#payoutRate').value=payout===undefined?'':Math.round(payout*100);
  state.commissionSourceBaseline={monthly:customerPrice(chosenFinalRate(r),state.rateCustomer),contract:Number(contract),profit:Number(profitValue),payout:Number(payout),fee:chosenFinalRate(r)?.sheetCommissionByCustomer?.[state.rateCustomer]};
  const sourceNotice=state.month==='2026-11'&&r?.sheetContractMultiplier!=null?'11월 원본 계약배수·이익배수 적용':profit.reason;
  $('#commissionPolicyNote').textContent=`SK매직 지급정책 · ${sourceNotice} · 정산 전 예상액${selectedFrameData(r)?' · 프레임 수수료 별도 계산 후 합산':''}`;
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
// 월 구독료를 합산하더라도 프레임 수수료는 별도의 원본 요금행에서 계산합니다.
// 원본 지급액과 지급률이 일치하면 엑셀 원본 수수료를 그대로 사용합니다.
function frameCommissionFor(frame, chosenPayout){
  if(!frame)return null;
  const r=frame.row, t=state.rateCustomer;
  const term=Number(r.sheetContractMultipliersByCustomer?.[t]??r.sheetContractMultiplier??referencePolicy.termMultiplier?.[String(r.contractYears)]);
  const profit=Number(r.sheetProfitMultiplier??suggestedProfitMultiplier(frame.product).value);
  const originalPayout=r.sheetPayoutRates?.[t]??referencePolicy.rateByType?.[saleTypeForCustomer(t)];
  const payout=Number.isFinite(chosenPayout)?chosenPayout:Number(originalPayout);
  const sourceFee=r.sheetCommissionByCustomer?.[t];
  if(!Number.isFinite(term)||term<=0||!Number.isFinite(profit)||profit<=0||!Number.isFinite(payout))return null;
  const fromSource=sourceFee!=null && Number.isFinite(Number(sourceFee)) &&
    originalPayout!=null && Math.abs(payout-Number(originalPayout))<1e-10;
  const fee=fromSource?Number(sourceFee):Math.round(frame.monthly*term*profit*payout/10)*10;
  return {fee,term,profit,payout,fromSource,
    provenance:fromSource?'11월 원본 엑셀 수수료':r.sourceSheet?'프레임 고유 배수 재계산':'참고 정책식 추정 · 원본 수수료 미확인'};
}
function updateCommission(){
  const amount=Number($('#applyPrice').textContent.replace(/[^\d]/g,''))||0;
  const c=Number($('#contractMultiplier').value), pm=Number($('#profitMultiplier').value);
  const rr=$('#payoutRate').value, rate=rr===''?NaN:Number(rr)/100;
  const extra=Number($('#extraCommission').value||0);
  const breakdown=$('#mattressCommissionDetails'), r=selectedRow();
  const isMattress=isMattressCore(state.product), frame=selectedFrameData(r);
  breakdown.classList.toggle('hidden',!isMattress||!frame);
  if(amount&&c>0&&pm>0&&Number.isFinite(rate)){
    const base=state.commissionSourceBaseline;
    // 추가수수료 입력 여부와 관계없이 기본 수수료는 원본 값을 먼저 적용합니다.
    const sourceMatch=base && amount===base.monthly && c===base.contract &&
      pm===base.profit && Math.abs(rate-base.payout)<1e-10 && Number.isFinite(base.fee);
    const mattressFee=sourceMatch?Number(base.fee):Math.round(amount*c*pm*rate/10)*10;
    const frameInfo=frame?frameCommissionFor(frame,rate):null;
    if(frame&&!frameInfo){
      $('#commissionResult').textContent='프레임 수수료 확인 필요';
      $('#commissionResult').dataset.value='';
      $('#commissionResult').dataset.frame='';
      $('#mattressCommissionValue').textContent=fmt(mattressFee);
      $('#frameCommissionValue').textContent='계산 불가';
      $('#frameCommissionBasis').textContent='프레임 원본 수수료 기준 확인이 필요합니다.';
      return;
    }
    const frameFee=frameInfo?.fee||0;
    const total=mattressFee+frameFee+extra;
    $('#commissionResult').textContent=fmt(total);
    $('#commissionResult').dataset.value=total;
    $('#commissionResult').dataset.mattress=mattressFee;
    $('#commissionResult').dataset.frame=frameFee;
    $('#commissionResult').dataset.frameProvenance=frameInfo?.provenance||'';
    if(frame){
      $('#mattressCommissionValue').textContent=fmt(mattressFee);
      $('#frameCommissionValue').textContent=fmt(frameFee);
      $('#frameCommissionLabel').textContent=`${frame.product.title} 수수료`;
      $('#frameCommissionExtraRow').classList.toggle('hidden',!extra);
      $('#frameCommissionExtraValue').textContent=fmt(extra);
      $('#frameCommissionCombined').textContent=fmt(total);
      $('#frameCommissionBasis').textContent=`프레임 ${frameInfo.provenance} · 의무배수 ${frameInfo.term} · 이익배수 ${frameInfo.profit} · 지급률 ${Math.round(frameInfo.payout*1000)/10}% · 산정식 직접 조정은 매트리스에만 적용 (지급률은 양쪽 공통)`;
    }
  }else{
    $('#commissionResult').textContent='정책값 입력 필요';
    $('#commissionResult').dataset.value='';
    $('#commissionResult').dataset.mattress='';
    $('#commissionResult').dataset.frame='';
  }
}
['contractMultiplier','profitMultiplier','payoutRate','extraCommission'].forEach(id=>$('#'+id).addEventListener('input',updateCommission));

function openSheet(id){
  state.product=products.find(p=>p.apiId===id);
  state.sel={management:'셀프형',contractYears:6};
  state.customerType='전체'; state.rateCustomer=null; state.promoId=null;state.commissionType=null;state.frameProductId=null;state.frameEnabled=false;state.frameHalfOptOut=false;
  renderCalc(); $('#sheet').classList.remove('hidden'); $('#backdrop').classList.remove('hidden'); document.body.style.overflow='hidden';
}
function toast(m){const t=$('#toast'); t.textContent=m; t.classList.add('show'); clearTimeout(toast.tm); toast.tm=setTimeout(()=>t.classList.remove('show'),1300);}
$('#addBtn').onclick=()=>{
  const r=selectedRow(), p=selectedPromo(); const apply=Number($('#applyPrice').textContent.replace(/[^\d]/g,''))||0;
  if(!apply){toast('선택 조건의 최종가격이 없습니다. 가격표를 확인해 주세요.');return;}
  if($('#commissionResult').dataset.value===''){toast('계약기간과 수수료 정책을 확인해 주세요.');return;}
  const selectedFrame=selectedFrameData(r);
  if(isMattressCore(state.product)&&state.frameEnabled&&!selectedFrame){toast('프레임 종류와 사이즈·의무기간을 확인하세요.');return;}
  const commission=Number($('#commissionResult').dataset.value||0);
  const mattressCommission=Number($('#commissionResult').dataset.mattress||commission);
  const frameCommission=Number($('#commissionResult').dataset.frame||0);
  const frameCommissionProvenance=$('#commissionResult').dataset.frameProvenance||'';
  const isHalfPromo=!!(p&&p.discountMonths&&p.promoPrice);
  const afterBase=isHalfPromo?Number(p.priceAfterDiscount||p.basePriceInPromo||apply):apply;
  const bundle=isMattressCore(state.product)?bundleMonthData(r):null;
  // 화면과 계산내역은 같은 원본 기반 합산 함수를 공유합니다.
  const monthly=bundle?bundle.first:(isHalfPromo?Number(p.promoPrice):apply);
  const afterMonthly=bundle?bundle.after:afterBase;
  const bundlePromoMonths=bundle?bundle.promoMonths:(isHalfPromo?Number(p.discountMonths):0);
  state.cart.unshift({id:Date.now(),month:state.month,title:state.product.title,model:state.product.model,condition:r?rowSummary(r):'사용연차별',promo:p?p.promoName:'',monthly,afterMonthly,
    promoMonths:bundlePromoMonths,baseMonthly:apply,frameHalfApplied:!!bundle?.frameOffer,
    frameModel:selectedFrame?.product.model||null, frameTitle:selectedFrame?.product.title||null, frameMonthly:selectedFrame?.monthly||0,
    mattressCommission,frameCommission,frameCommissionProvenance,
    customer:state.rateCustomer,commissionType:state.commissionType,commission});
  localStorage.setItem(CART_KEY,JSON.stringify(state.cart)); renderCart(); toast('계산내역에 추가했습니다'); closeSheet();
};
function renderCart(){
  const current=state.cart.filter(x=>x.month===state.month);
  const other=state.cart.filter(x=>x.month!==state.month);
  const isLegacyFrame=x=>!!x.frameModel&&!Object.prototype.hasOwnProperty.call(x,'frameCommission');
  const validated=current.filter(x=>!isLegacyFrame(x));
  const itemMarkup=(x,excluded=false)=>{
    const oldFrame=isLegacyFrame(x);
    const priceText=x.promoMonths?`처음 ${x.promoMonths}개월 월 ${fmt(x.monthly)} · 이후 월 ${fmt(x.afterMonthly)}`:`월 ${fmt(x.monthly)}`;
    return `<div class="cart-item"><div><b>${x.title}</b><small>${x.month||'기준월 미확인'} · ${x.model} · ${x.condition} · ${x.customer||'가격유형'} / ${x.commissionType||'정책확인'}${x.promo?' · '+x.promo:''}${x.frameModel?' · '+x.frameTitle+' ('+x.frameModel+') '+fmt(x.frameMonthly):''} · ${priceText}${x.frameModel?(oldFrame?' · ⚠️ 이전 프레임 수수료 누락 기록: 삭제 후 재계산 필요':` · 수수료: 매트리스 ${fmt(x.mattressCommission)} + 프레임 ${fmt(x.frameCommission)}${x.frameCommissionProvenance?.includes('추정')?' (프레임 추정)':''}`):''}${excluded||oldFrame?' · 합계 제외':''}</small></div><div><strong>${oldFrame?'재계산 필요':x.commission?fmt(x.commission):'정책값 미입력'}</strong><button data-remove="${x.id}" type="button">삭제</button></div></div>`;
  };
  $('#cartList').innerHTML=(current.length?current.map(x=>itemMarkup(x)).join(''):'<div class="cart-empty">현재 기준월 계산내역이 없습니다.</div>')+
    (other.length?`<div class="cart-empty" style="font-weight:700">다른 기준월 / 기준월 미확인 계산내역 ${other.length}건 (현재 합계에서 제외)</div>`+other.map(x=>itemMarkup(x,true)).join(''):'');
  document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{state.cart=state.cart.filter(x=>String(x.id)!==b.dataset.remove); localStorage.setItem(CART_KEY,JSON.stringify(state.cart)); renderCart();});
  const sale=validated.reduce((s,x)=>s+Number(x.commission||0),0);
  const bracket=(referencePolicy.brackets||[]).find(b=>validated.length>=b.min&&(b.max===null||validated.length<=b.max));
  const incentive=Math.round(sale*(bracket?.rate||0));
  $('#saleCommissionTotal').textContent=fmt(sale);
  $('#incentiveRate').textContent=`${state.month.replace('-','.')} · ${validated.length}건${validated.length!==current.length?` (이전 프레임 미검증 ${current.length-validated.length}건 제외)`:''} · ${Math.round((bracket?.rate||0)*100)}%`;
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
  $('#monthSelect').onchange=e=>{ closeSheet(); loadMonth(e.target.value); $('#monthCurrent').textContent=monthText(); state.category='전체'; state.sub='전체'; state.search=''; $('#searchInput').value=''; $('#listTitle').textContent='전체 제품'; renderCats(); renderSub(); renderProducts(); renderCart(); toast(`${monthText()} 기준 가격으로 변경했습니다`); };
}

$('#brandReload').addEventListener('click', () => window.location.reload());

if(localStorage.getItem('sk_release_month_migrated')!=='2026-11'){
  state.month='2026-11';
  localStorage.setItem('sk_selected_month','2026-11');
  localStorage.setItem('sk_release_month_migrated','2026-11');
}
loadMonth(state.month);
renderMonthSelect();
renderCats(); renderSub(); renderProducts(); renderCart();
