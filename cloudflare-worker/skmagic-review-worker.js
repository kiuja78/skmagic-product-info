/**
 * SK Magic official review proxy (Cloudflare Worker)
 * GET /reviews?model=WPU-IAC606&page=1&photos=0
 * Public reviews only. Customer login cookies are never forwarded.
 */
const MODEL_MAP = {
  "WPU-IAC606": { goodsId:"G000069931", prdtCd:"WPUIAC606SNW", compGbCd:"10" }
};
const cors = {
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Methods":"GET, OPTIONS",
  "Access-Control-Allow-Headers":"Content-Type",
  "Cache-Control":"no-store"
};
function json(data,status=200){
  return new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8"}});
}
function cleanText(value){return String(value||"").replace(/\s+/g," ").trim();}
function imageOriginal(src){return String(src||"").replace(/_140x96(?=\.[a-z0-9]+(?:\?|$))/i,"");}
async function parseReviews(html){
  const reviews=[];let current=null;
  const transformed=new HTMLRewriter()
    .on(".toggleListNew li",{
      element(){current={id:"",content:"",author:"",date:"",images:[],tags:[],rating:"5.0"};},
      end(){if(current){current.content=cleanText(current.content);current.author=cleanText(current.author);current.date=cleanText(current.date);reviews.push(current);current=null;}}
    })
    .on(".toggleListNew .tit",{
      element(el){if(current){const m=(el.getAttribute("onclick")||"").match(/toggleContent\(this,\s*(\d+)/);if(m)current.id=m[1];}},
      text(t){if(current)current.content+=t.text;}
    })
    .on(".toggleListNew .date",{text(t){if(current)current.date+=t.text;}})
    .on(".toggleListNew .date .user",{text(t){if(current)current.author+=t.text;}})
    .on(".toggleListNew .tag a",{text(t){if(current){const v=cleanText(t.text);if(v)current.tags.push(v);}}})
    .on(".toggleListNew .thmb img",{element(el){if(current){const src=el.getAttribute("src");if(src)current.images.push(imageOriginal(new URL(src,"https://www.skmagic.com").href));}}})
    .transform(new Response(html));
  await transformed.text();
  return reviews.filter(r=>r.content||r.images.length);
}
function getCount(html,label){
  const pos=html.indexOf(label);if(pos<0)return 0;
  const part=html.slice(pos,pos+220);
  const m=part.match(/class=["']em["']>\s*([\d,]+)\s*</i);
  return m?Number(m[1].replace(/,/g,"")):0;
}
export default {
  async fetch(request){
    if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
    const url=new URL(request.url);
    if(url.pathname!=="/reviews")return json({error:"Not found"},404);
    if(request.method!=="GET")return json({error:"Method not allowed"},405);
    const model=(url.searchParams.get("model")||"").toUpperCase();
    const mapping=MODEL_MAP[model];
    if(!mapping)return json({error:"등록되지 않은 모델입니다.",model},404);
    const page=Math.max(1,Math.min(200,Number(url.searchParams.get("page")||1)));
    const photos=url.searchParams.get("photos")==="1";
    const body=new URLSearchParams({
      goodsId:mapping.goodsId,prdtCd:mapping.prdtCd,compGbCd:mapping.compGbCd,
      type:"",curPageNo:String(page),imgRegYn:photos?"Y":""
    });
    try{
      const upstream=await fetch("https://www.skmagic.com/goods/indexGoodsCommentList",{
        method:"POST",
        headers:{
          "Content-Type":"application/x-www-form-urlencoded; charset=UTF-8",
          "Accept":"text/html, */*; q=0.01",
          "Origin":"https://www.skmagic.com",
          "Referer":"https://www.skmagic.com/goods/indexGoodsDetail?goodsId="+mapping.goodsId
        },
        body
      });
      if(!upstream.ok)return json({error:"SK매직 공식몰 응답 오류",upstreamStatus:upstream.status},502);
      const html=await upstream.text();
      if(!html.includes("toggleListNew")&&!html.includes("전체 후기"))return json({error:"공식몰 후기 HTML을 확인할 수 없습니다."},502);
      const reviews=await parseReviews(html);
      const totalCount=getCount(html,photos?"포토 후기":"전체 후기")||reviews.length;
      return json({
        model:model,goodsId:mapping.goodsId,prdtCd:mapping.prdtCd,
        filter:photos?"photo":"all",page:page,totalCount:totalCount,
        totalPages:Math.max(1,Math.ceil(totalCount/5)),reviews:reviews,
        source:"SK매직 공식몰"
      });
    }catch(e){return json({error:"후기 조회 중 오류가 발생했습니다.",detail:String(e)},502);}
  }
};
