# $1=DAY_SAU $2=DAY_MAX → sinh eo bbs, đo số, so với kiem-tay
cd "S:/3appclaude/tools-local"; A="S:/3JS Studio/assets/r6-bobj"
DAY_SAU=$1 DAY_MAX=$2 node --import file:///S:/3appclaude/three-workspace-app/editor/packages/builder/node_modules/tsx/dist/loader.mjs r6-cung.mts --eo "$A/bbs/bbs-r6-actions.bobj" "$A/bbs/bbs-r6-eo-actions.bobj" | tail -1 | sed 's/.*đẩy/đẩy/'
cd "S:/3JS Studio" && node tools/r6-may-kiem.mjs --khong-anh --out output/r6-bobj/kiem-day > output/_tmp/kiem-day.log 2>&1
node -e "
const A=require('./output/r6-bobj/kiem-tay/so.json'),B=require('./output/r6-bobj/kiem-day/so.json');const b=Object.fromEntries(B.map(a=>[a.name,a]));
const v=(o,k)=>{const l=o?.loi.find(x=>x.key===k);return l?l.v:0};
console.log(['tayDau','tayThan','tayChong','lech','cham','giat'].map(k=>k+' '+A.filter(x=>v(x,k)).length+'→'+B.filter(x=>v(x,k)).length).join(' · '),'· điểm',A.reduce((s,x)=>s+x.score,0).toFixed(1),'→',B.reduce((s,x)=>s+x.score,0).toFixed(1))
console.log(['emote_disco_fever','emote_electro_shuffle','emote_crying','emote_sneeze','emote_threatening','emote_infinite_dab','emote_woah'].map(n=>n.slice(6)+' '+(Math.max(v(b[n],'tayDau'),v(b[n],'tayThan'))).toFixed(2)+'/'+v(b[n],'lech').toFixed(0)+'°').join(' · '))"
