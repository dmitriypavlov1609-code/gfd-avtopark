
const {useState, useEffect, useRef, useMemo, Fragment} = React;
const KEY_STORAGE = 'aboba_claude_key';

/* ============================================================ */
/* DATA — реалистичные моковые                                 */
/* ============================================================ */

const INTEGRATIONS = [
  {ic:'C', name:'Anthropic Claude', desc:'AI-агент автопарка (tool use, отчёты)', status:'connected', kind:'core'},
  {ic:'GS', name:'Google Sheets · Собственный парк', desc:'ТС, статусы, проекты, пробег', status:'planned', kind:'data'},
  {ic:'GS', name:'Google Sheets · Привлечённый парк', desc:'частники, регистрация, маршруты', status:'planned', kind:'data'},
  {ic:'GS', name:'Google Sheets · Магазины', desc:'маршруты по точкам, «в срок %»', status:'planned', kind:'data'},
  {ic:'GS', name:'Google Sheets · Кадры', desc:'кандидаты, проекты, даты выхода', status:'planned', kind:'data'},
  {ic:'TG', name:'Telegram Bot · Отчёты', desc:'@otchetRZ_bot — отправка отчётов руководству', status:'planned', kind:'channel'},
  {ic:'XL', name:'Автосинхронизация · VPS', desc:'cron + сервис-аккаунт (как в ОБЕ2)', status:'pending', kind:'data'},
];

/* ============================================================ */
/* CLAUDE STREAM                                                */
/* ============================================================ */
const SYSTEM = `Ты — внутренний AI-помощник автопарка ГФД. Отвечаешь по-русски, кратко и по делу. Помогаешь менеджерам с данными по собственному парку, частникам, магазинам, маршрутам, статистике и кадрам.`;

async function* claudeStream({system, messages, model='claude-haiku-4-5-20251001', max_tokens=600}){
  const key = localStorage.getItem(KEY_STORAGE) || '';
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST',
    headers:{'x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true','content-type':'application/json'},
    body: JSON.stringify({model, max_tokens, system, messages, stream:true})
  });
  if(!r.ok) throw new Error('claude ' + r.status);
  const reader = r.body.getReader(); const dec = new TextDecoder();
  let buf = '';
  while(true){
    const {done, value} = await reader.read();
    if(done) break;
    buf += dec.decode(value, {stream:true});
    const lines = buf.split('\n'); buf = lines.pop() || '';
    for(const ln of lines){
      if(!ln.startsWith('data: ')) continue;
      try{
        const d = JSON.parse(ln.slice(6));
        if(d.type === 'content_block_delta' && d.delta?.type === 'text_delta') yield d.delta.text;
      }catch{}
    }
  }
}
async function* fakeStream(text, perCh=10){
  const chunks = text.match(/[\S]+\s*|\s+/g) || [text];
  for(const c of chunks){ yield c; await new Promise(r=>setTimeout(r, perCh * (c.length + Math.random()*8))); }
}

/* ============================================================ */
/* ICONS — minimal inline SVG                                   */
/* ============================================================ */
const Ic = ({d, w=16, h=16}) => <svg width={w} height={h} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
const IC = {
  dash: <Ic d={<><path d="M3 13h8V3H3v10zm10 8h8V11h-8v10zM3 21h8v-6H3v6zM13 3v6h8V3h-8z"/></>}/>,
  book: <Ic d={<><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>}/>,
  car: <Ic d={<><path d="M5 17h14M3 17V10l3-5h12l3 5v7M3 17v3h3v-3M21 17v3h-3v-3"/><circle cx="7.5" cy="14" r="1"/><circle cx="16.5" cy="14" r="1"/></>}/>,
  chat: <Ic d={<><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></>}/>,
  user: <Ic d={<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>}/>,
  sync: <Ic d={<><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></>}/>,
  cog: <Ic d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>}/>,
  refresh: <Ic d={<><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></>}/>,
  search: <Ic d={<><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></>}/>,
  plus: <Ic d={<><path d="M12 5v14M5 12h14"/></>}/>,
  send: <Ic d={<><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></>}/>,
  spark: <Ic d={<><path d="M12 2v6M12 16v6M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h6M16 12h6M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24"/></>}/>,
  tool: <Ic d={<><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></>}/>,
};

/* ============================================================ */
/* COMPONENTS                                                   */
/* ============================================================ */
const NAV = [
  {id:'dash', label:'Главный дашборд', ic:IC.dash, count:''},
  {id:'fleet', label:'Собственный автопарк', ic:IC.car, count:'46'},
  {id:'book', label:'Привлечённый парк', ic:IC.book, count:'32'},
  {id:'cust', label:'Магазины', ic:IC.user, count:'12'},
  {id:'sync', label:'Статистика', ic:IC.sync, count:''},
  {id:'asst', label:'AI агент', ic:IC.spark, count:'live', highlight:true},
  {id:'convo', label:'Кадры', ic:IC.chat, count:''},
];
const NAV_BOTTOM = [
  {id:'reports', label:'Отчёты', ic:IC.book, count:''},
  {id:'sett', label:'Настройки', ic:IC.cog, count:''},
];

function Sidebar({page, setPage, mode, open}){
  return (
    <div className={'side'+(open?' open':'')}>
      <div className="side-brand">
        <div className="logo">Г</div>
        <div className="name">ГФД<small>Автопарк · система учёта</small></div>
      </div>
      <div className="side-section">Меню</div>
      <div className="side-nav">
        {NAV.map(n => (
          <div key={n.id} className={'side-item ' + (page === n.id ? 'active' : '') + (n.highlight ? ' highlight' : '')} onClick={()=>setPage(n.id)}>
            {n.ic}
            <span>{n.label}</span>
            {n.count && <span className={'count ' + (n.count === 'live' ? 'live' : '')}>{n.count === 'live' ? '● live' : n.count}</span>}
          </div>
        ))}
      </div>
      <div className="side-section">Прочее</div>
      <div className="side-nav">
        {NAV_BOTTOM.map(n => (
          <div key={n.id} className={'side-item ' + (page === n.id ? 'active' : '')} onClick={()=>setPage(n.id)}>
            {n.ic}<span>{n.label}</span>
          </div>
        ))}
      </div>
      <div className="side-foot" onClick={()=>{ if(confirm('Выйти из системы?')){ sessionStorage.removeItem('gfd_auth'); window.location.reload(); } }} style={{cursor:'pointer'}} title="Выйти">
        <div className="avatar">А</div>
        <div className="user">Администратор<small>Выйти →</small></div>
      </div>
    </div>
  );
}

function Topbar({crumb, mode, actions, onMenu}){
  return (
    <div className="topbar">
      <button className="hamb" onClick={onMenu} aria-label="Меню">☰</button>
      <div className="crumb">{crumb.map((c,i)=><Fragment key={i}>{i?<span style={{margin:'0 6px',color:'var(--cream-4)'}}>/</span>:null}{i===crumb.length-1?<b>{c}</b>:<span>{c}</span>}</Fragment>)}</div>
      <div className="search">{IC.search}<input placeholder="Поиск…" /><span className="key">⌘K</span></div>
      {actions}
    </div>
  );
}

/* ----------------- сортировка таблиц ----------------- */
function useSort(initKey, initDir){
  const [sortKey,setSortKey]=useState(initKey||null);
  const [dir,setDir]=useState(initDir||'asc');
  const onSort=k=>{ if(sortKey===k){ setDir(d=>d==='asc'?'desc':'asc'); } else { setSortKey(k); setDir('asc'); } };
  const apply=(rows,acc)=>{
    if(!sortKey) return rows;
    const get=(acc&&acc[sortKey])||(r=>r[sortKey]);
    const s=[...rows].sort((a,b)=>{
      const va=get(a), vb=get(b);
      if(typeof va==='number' && typeof vb==='number') return va-vb;
      if(typeof va==='boolean' && typeof vb==='boolean') return (va?1:0)-(vb?1:0);
      return String(va==null?'':va).localeCompare(String(vb==null?'':vb),'ru',{numeric:true});
    });
    return dir==='asc'?s:s.reverse();
  };
  return {sortKey,dir,onSort,apply};
}
function SortTh({k,sort,children,style}){
  const active=sort.sortKey===k;
  return <th onClick={()=>sort.onSort(k)} style={{cursor:'pointer',userSelect:'none',whiteSpace:'nowrap',color:active?'var(--coral)':undefined,...(style||{})}}>{children}<span style={{opacity:active?1:.35,marginLeft:4,fontSize:10}}>{active?(sort.dir==='asc'?'▲':'▼'):'⇅'}</span></th>;
}

/* ----------------- общие: график/период/дата ----------------- */
function aggSeries(daily,get,period,mode){
  mode=mode||'sum';
  const agg=a=>mode==='sum'?a.reduce((s,x)=>s+x,0):Math.round(a.reduce((s,x)=>s+x,0)/(a.length||1));
  if(period==='day') return daily.slice(-30).map(d=>({label:d.date.slice(8,10)+'.'+d.date.slice(5,7),v:get(d),date:d.date}));
  if(period==='week'){const wk={};daily.forEach(d=>{const dt=new Date(d.date);const mon=new Date(dt);mon.setDate(dt.getDate()-((dt.getDay()+6)%7));const k=mon.toISOString().slice(0,10);(wk[k]=wk[k]||[]).push(get(d));});return Object.entries(wk).slice(-12).map(([k,a])=>({label:k.slice(8,10)+'.'+k.slice(5,7),v:agg(a)}));}
  const mo={};const NM=['','янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];daily.forEach(d=>{const k=d.date.slice(0,7);(mo[k]=mo[k]||[]).push(get(d));});return Object.entries(mo).slice(-6).map(([k,a])=>({label:NM[+k.slice(5,7)],v:agg(a)}));
}
function AreaChart({series,color='var(--coral)',height=190,gid='g',unit=''}){
  const [hi,setHi]=useState(null);
  const W=680,H=height,P=10,n=series.length;
  const max=Math.max(1,...series.map(s=>s.v)),min=Math.min(0,...series.map(s=>s.v));
  const xp=i=>n>1?P+i*(W-2*P)/(n-1):W/2, yp=v=>(H-P)-(v-min)/((max-min)||1)*(H-2*P);
  const line=series.map((s,i)=>(i?'L':'M')+xp(i).toFixed(1)+' '+yp(s.v).toFixed(1)).join(' ');
  const area=n?line+` L ${xp(n-1).toFixed(1)} ${H-P} L ${xp(0).toFixed(1)} ${H-P} Z`:'';
  const onMove=e=>{ if(!n) return; const r=e.currentTarget.getBoundingClientRect(); let i=Math.round(((e.clientX-r.left)/r.width)*(n-1)); i=Math.max(0,Math.min(n-1,i)); setHi(i); };
  const hpct=hi!=null?(xp(hi)/W*100):0;
  return (<div style={{position:'relative'}} onMouseMove={onMove} onMouseLeave={()=>setHi(null)}>
    {hi!=null && series[hi] && (
      <div style={{position:'absolute',top:-2,left:`${Math.max(6,Math.min(94,hpct))}%`,transform:'translateX(-50%)',background:'var(--panel-2)',border:'1px solid var(--line-2)',borderRadius:8,padding:'4px 10px',fontSize:12,whiteSpace:'nowrap',zIndex:2,pointerEvents:'none',boxShadow:'0 6px 20px -6px rgba(0,0,0,.6)'}}>
        <span style={{display:'inline-block',width:8,height:8,borderRadius:2,background:color,marginRight:6,verticalAlign:'middle'}}></span>
        <span style={{color:'var(--cream-3)',fontFamily:"'JetBrains Mono', monospace",fontSize:10.5}}>{series[hi].label}</span>{' '}
        <b style={{color:'var(--cream)'}}>{series[hi].v}{unit}</b>
      </div>
    )}
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height,display:'block'}} preserveAspectRatio="none">
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.32"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      {[0.25,0.5,0.75].map((g,i)=>(<line key={i} x1={P} x2={W-P} y1={P+g*(H-2*P)} y2={P+g*(H-2*P)} stroke="var(--line)" strokeWidth="1"/>))}
      {area&&<path d={area} fill={`url(#${gid})`}/>}
      {line&&<path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round"/>}
      {hi!=null && <line x1={xp(hi)} x2={xp(hi)} y1={P} y2={H-P} stroke={color} strokeWidth="1" strokeDasharray="4 3" opacity="0.6"/>}
      {series.map((s,i)=>(<circle key={i} cx={xp(i)} cy={yp(s.v)} r={hi===i?4.5:2.2} fill={color} stroke="var(--panel)" strokeWidth={hi===i?1.5:0}/>))}
    </svg>
    <div className="util-legend" style={{marginTop:6,justifyContent:'space-between',color:'var(--cream-3)',fontFamily:"'JetBrains Mono', monospace",fontSize:10.5}}>
      {series.filter((_,i)=>n<=12||i%Math.ceil(n/12)===0).map((s,i)=>(<span key={i}>{s.label}</span>))}
    </div>
  </div>);
}
function PBtns({period,set}){return <div className="actions" style={{display:'flex',gap:8,flexWrap:'wrap'}}>{['day','week','month'].map(p=>(<button key={p} className={period===p?'primary':''} onClick={()=>set(p)}>{({day:'день',week:'неделя',month:'месяц'})[p]}</button>))}</div>;}
const DINP={background:'var(--panel-2)',border:'1px solid var(--line-2)',borderRadius:8,color:'var(--cream)',padding:'5px 8px',fontSize:12,colorScheme:'dark'};
const fmtRu=s=>s?s.slice(8,10)+'.'+s.slice(5,7)+'.'+s.slice(0,4):'';

/* ----------------- DASHBOARD ----------------- */
function Dashboard({setPage}){
  const [own,setOwn]=useState([]);
  const [hired,setHired]=useState([]);
  const [daily,setDaily]=useState([]);
  const [period,setPeriod]=useState('day');
  const [metric,setMetric]=useState('routes');
  const [picked,setPicked]=useState('');
  useEffect(()=>{
    fetch('/data/own-fleet.json').then(r=>r.json()).then(setOwn).catch(()=>{});
    fetch('/data/hired-fleet.json').then(r=>r.json()).then(setHired).catch(()=>{});
    fetch('/data/routes.json').then(r=>r.json()).then(d=>setDaily(d.daily||[])).catch(()=>{});
  },[]);

  const PROJ=['Лемана Про','Магнит','Х5 Retail','Озон','ВкусВилл','Самокат'];
  const ownOnLine = own.filter(v=>v.status==='На линии');
  const hiredOnLine = hired.filter(h=>h.onLine);
  const routesToday = daily.length ? daily[daily.length-1].routes : 0;
  const routesPrev  = daily.length>1 ? daily[daily.length-2].routes : 0;
  const routesDelta = routesToday - routesPrev;
  const totalOnLine = ownOnLine.length + hiredOnLine.length;

  const byProject = PROJ.map(p=>{
    const o = ownOnLine.filter(v=>v.project===p).length;
    const h = hiredOnLine.filter(x=>(x.projects||[]).includes(p)).length;
    return {project:p, own:o, hired:h, total:o+h};
  }).sort((a,b)=>b.total-a.total);
  const maxProj = Math.max(1,...byProject.map(p=>p.total));

  // 4 метрики для клика по карточкам; routes — поток (сумма), остальные — запас (среднее)
  const METRICS={
    routes:{label:'Маршруты', get:d=>d.routes, agg:'sum', kpi:routesToday},
    total:{label:'ТС на линии', get:d=>(d.own_on||0)+(d.hired_on||0), agg:'avg', kpi:totalOnLine},
    own:{label:'Свои на линии', get:d=>d.own_on||0, agg:'avg', kpi:ownOnLine.length},
    hired:{label:'Частники на линии', get:d=>d.hired_on||0, agg:'avg', kpi:hiredOnLine.length},
  };
  const M=METRICS[metric], gv=M.get, agg=a=>M.agg==='sum'?a.reduce((s,x)=>s+x,0):Math.round(a.reduce((s,x)=>s+x,0)/(a.length||1));

  const series = (()=>{
    if(period==='day') return daily.slice(-30).map(d=>({label:d.date.slice(8,10)+'.'+d.date.slice(5,7), v:gv(d), date:d.date}));
    if(period==='week'){
      const wk={};
      daily.forEach(d=>{ const dt=new Date(d.date); const mon=new Date(dt); mon.setDate(dt.getDate()-((dt.getDay()+6)%7)); const k=mon.toISOString().slice(0,10); (wk[k]=wk[k]||[]).push(gv(d)); });
      return Object.entries(wk).slice(-12).map(([k,a])=>({label:k.slice(8,10)+'.'+k.slice(5,7), v:agg(a)}));
    }
    const mo={}; const NM=['','янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
    daily.forEach(d=>{ const k=d.date.slice(0,7); (mo[k]=mo[k]||[]).push(gv(d)); });
    return Object.entries(mo).slice(-6).map(([k,a])=>({label:NM[+k.slice(5,7)], v:agg(a)}));
  })();

  const pickedRow = picked ? daily.find(d=>d.date===picked) : null;
  const pickedVal = pickedRow ? gv(pickedRow) : null;
  const dmin = daily.length ? daily[0].date : '';
  const dmax = daily.length ? daily[daily.length-1].date : '';
  const fmtDate = s => s ? s.slice(8,10)+'.'+s.slice(5,7)+'.'+s.slice(0,4) : '';

  const W=680,H=210,P=10;
  const max=Math.max(1,...series.map(s=>s.v));
  const min=Math.min(0,...series.map(s=>s.v));
  const n=series.length;
  const xp=i=> n>1 ? P + i*(W-2*P)/(n-1) : W/2;
  const yp=v=> (H-P) - (v-min)/((max-min)||1)*(H-2*P);
  const line = series.map((s,i)=>(i?'L':'M')+xp(i).toFixed(1)+' '+yp(s.v).toFixed(1)).join(' ');
  const area = n ? line+` L ${xp(n-1).toFixed(1)} ${H-P} L ${xp(0).toFixed(1)} ${H-P} Z` : '';

  const today=new Date();
  const NMO=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  const dateStr=today.getDate()+' '+NMO[today.getMonth()]+' '+today.getFullYear();

  const download=()=>{
    let csv='﻿Главный дашборд · маршруты на '+dateStr+'\n\n';
    csv+='Показатель;Значение\n';
    csv+='Маршрутов сегодня;'+routesToday+'\nТС на линии (всего);'+totalOnLine+'\nСвои на линии;'+ownOnLine.length+'\nЧастники на линии;'+hiredOnLine.length+'\n\n';
    csv+='Проект;Свои на линии;Частники на линии;Всего на линии\n';
    byProject.forEach(r=>{ csv+=`${r.project};${r.own};${r.hired};${r.total}\n`; });
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    a.download='ГФД_маршруты_'+today.toISOString().slice(0,10)+'.csv'; a.click();
  };

  const PBTN=(id,txt)=>(
    <button className={period===id?'primary':''} onClick={()=>setPeriod(id)}>{txt}</button>
  );

  return (
    <Fragment>
      <div className="page-head">
        <div>
          <h1>Главный дашборд</h1>
          <div className="sub">► маршруты на сегодня · {dateStr}</div>
        </div>
        <div className="actions">
          <button className="primary" onClick={download}>↓ Скачать отчёт</button>
        </div>
      </div>

      <div className="stats">
        {[
          {k:'routes', l:'маршрутов сегодня', v:routesToday, d:<span className={'delta '+(routesDelta>=0?'up':'down')}>{routesDelta>=0?'+':''}{routesDelta} vs вчера</span>},
          {k:'total', l:'ТС на линии', v:totalOnLine, d:<span className="lab">свои + частники</span>},
          {k:'own', l:'свои на линии', v:ownOnLine.length, d:<span className="lab">из {own.length} в парке</span>},
          {k:'hired', l:'частники на линии', v:hiredOnLine.length, d:<span className="lab">из {hired.length} привлечённых</span>},
        ].map(c=>(
          <div key={c.k} className="stat" onClick={()=>setMetric(c.k)}
            style={{cursor:'pointer',outline:metric===c.k?'1.5px solid var(--coral)':'1.5px solid transparent',outlineOffset:-1,transition:'outline-color .15s'}}>
            <div className="l">► {c.l} {metric===c.k?'▾':''}</div><div className="v">{c.v}</div><div className="d">{c.d}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="h">
          <div className="t">Динамика · {M.label}</div>
          <div className="actions" style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
            {PBTN('day','день')}{PBTN('week','неделя')}{PBTN('month','месяц')}
            <input type="date" value={picked} min={dmin} max={dmax} onChange={e=>setPicked(e.target.value)}
              style={{background:'var(--panel-2)',border:'1px solid var(--line-2)',borderRadius:8,color:'var(--cream)',padding:'5px 8px',fontSize:12,colorScheme:'dark'}}/>
            {picked && <button onClick={()=>setPicked('')}>сброс</button>}
          </div>
        </div>
        <div className="b">
          {picked && (
            <div style={{marginBottom:12,padding:'10px 14px',borderRadius:10,background:'var(--panel-2)',border:'1px solid var(--line-2)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{color:'var(--cream-2)',fontSize:13}}>{M.label} на <b style={{color:'var(--cream)'}}>{fmtDate(picked)}</b></span>
              <b style={{color:'var(--coral)',fontFamily:"'JetBrains Mono', monospace",fontSize:18}}>{pickedVal!=null?pickedVal:'нет данных'}</b>
            </div>
          )}
          <AreaChart series={series} color="var(--coral)" gid="rg" height={210}/>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="h"><div className="t">На линии по проектам · сегодня</div><div className="m">{totalOnLine} ТС</div></div>
          <div className="b flush">
            <table className="tbl">
              <thead><tr><th>Проект</th><th>Свои</th><th>Частники</th><th>Всего</th><th></th></tr></thead>
              <tbody>
                {byProject.map((r,i)=>(
                  <tr key={i}>
                    <td data-label="Проект"><span className="pri">{r.project}</span></td>
                    <td data-label="Свои">{r.own}</td>
                    <td data-label="Частники">{r.hired}</td>
                    <td data-label="Всего"><b style={{color:'var(--cream)'}}>{r.total}</b></td>
                    <td className="cellbar" style={{width:120}}>
                      <div style={{height:6,borderRadius:4,background:'var(--line)',overflow:'hidden'}}>
                        <div style={{height:'100%',width:(r.total/maxProj*100)+'%',background:'var(--coral)'}}></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="h"><div className="t">Структура выхода на линию</div><div className="m">свои / частники</div></div>
          <div className="b">
            <div className="util-bar">
              <div className="seg rented" style={{width:(totalOnLine?ownOnLine.length/totalOnLine*100:50)+'%'}}></div>
              <div className="seg avail" style={{width:(totalOnLine?hiredOnLine.length/totalOnLine*100:50)+'%'}}></div>
            </div>
            <div className="util-legend">
              <span>свои {ownOnLine.length}</span>
              <span className="l2">частники {hiredOnLine.length}</span>
            </div>
            <div style={{marginTop:18,paddingTop:18,borderTop:'1px solid var(--line)'}}>
              {[
                {n:'Маршрутов сегодня', v:routesToday},
                {n:'Своих ТС на линии', v:ownOnLine.length+' / '+own.length},
                {n:'Частников на линии', v:hiredOnLine.length+' / '+hired.length},
                {n:'Своих в ремонте', v:own.filter(v=>v.status==='Ремонт'||v.status==='Капремонт').length},
                {n:'Проектов активно', v:byProject.filter(p=>p.total>0).length},
              ].map((r,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:i<4?'1px dashed var(--line)':'none',fontSize:13}}>
                  <span style={{color:'var(--cream-2)'}}>{r.n}</span>
                  <span style={{fontFamily:"'JetBrains Mono', monospace",fontSize:12,color:'var(--cream)'}}>{r.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
}

/* ----------------- ПРИВЛЕЧЁННЫЙ ПАРК (частники) ----------------- */
function Bookings(){
  const [rows,setRows]=useState([]);
  const [filter,setFilter]=useState('all');
  const [q,setQ]=useState('');
  const [log,setLog]=useState({});
  const [day,setDay]=useState('2026-09-23');
  const sort=useSort();
  useEffect(()=>{
    fetch('/data/hired-fleet.json?t='+Date.now()).then(r=>r.json()).then(setRows).catch(()=>setRows([]));
    fetch('/data/hired-log.json?t='+Date.now()).then(r=>r.json()).then(setLog).catch(()=>{});
  },[]);
  const dayList=(log[day]||[]);

  const SL={active:'Активен',soon:'Истекает',end:'Завершён'};
  const SC={active:'#5DCB94',soon:'#FFB84A',end:'#8B8377'};
  const pill=s=>{const c=SC[s]||'#8B8377';return <span style={{fontSize:'11.5px',fontWeight:600,padding:'3px 10px',borderRadius:'8px',color:c,background:c+'26',whiteSpace:'nowrap'}}>{SL[s]||s}</span>;};

  const total=rows.length;
  const onLine=rows.filter(r=>r.onLine).length;
  const active=rows.filter(r=>r.status==='active').length;
  const doneRoutes=rows.reduce((s,r)=>s+(r.routesDone||0),0);

  const filtered=sort.apply(rows.filter(r=>{
    const okF = filter==='all' || (filter==='online'?r.onLine:r.status===filter);
    const okQ = !q || (r.plate+' '+r.contractor+' '+(r.projects||[]).join(' ')).toLowerCase().includes(q.toLowerCase());
    return okF && okQ;
  }), {contractor:r=>r.contractor, routesDone:r=>r.routesDone, projects:r=>(r.projects||[]).join(', '), onLine:r=>r.onLine?1:0});

  const download=()=>{
    const head=['Госномер','Контрагент','Телефон','Дата регистрации','Маршрутов выполнено','Проекты','Статус','На линии','Ставка'];
    const lines=[head.join(';'),...rows.map(r=>[r.plate,r.contractor,r.phone,r.registered,r.routesDone,(r.projects||[]).join(', '),SL[r.status]||r.status,r.onLine?'да':'нет',r.rate].join(';'))];
    const blob=new Blob(['﻿'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ГФД_привлечённый_парк_'+new Date().toISOString().slice(0,10)+'.csv';document.body.appendChild(a);a.click();a.remove();
  };
  const FB=(id,txt)=>(<button onClick={()=>setFilter(id)} style={{borderColor:filter===id?'var(--coral)':'var(--line-2)',color:filter===id?'var(--coral)':'var(--cream-2)'}}>{txt}</button>);

  return (
    <Fragment>
      <div className="page-head">
        <div>
          <h1>Привлечённый парк</h1>
          <div className="sub">► частники · регистрация, маршруты, проекты</div>
        </div>
        <div className="actions">
          <button className="primary" onClick={download}>↓ Скачать отчёт</button>
        </div>
      </div>

      <div className="stats">
        <div className="stat"><div className="l">► всего частников</div><div className="v">{total}</div><div className="d"><span className="lab">в реестре</span></div></div>
        <div className="stat"><div className="l">► на линии сегодня</div><div className="v">{onLine}</div><div className="d"><span className="delta up">{total?Math.round(onLine/total*100):0}%</span><span className="lab">от реестра</span></div></div>
        <div className="stat"><div className="l">► активные договоры</div><div className="v">{active}</div><div className="d"><span className="lab">не завершены</span></div></div>
        <div className="stat"><div className="l">► маршрутов выполнено</div><div className="v">{doneRoutes.toLocaleString('ru-RU')}</div><div className="d"><span className="lab">за всё время</span></div></div>
      </div>

      <div className="card">
        <div className="h">
          <div className="t">Кто работал по дням</div>
          <div className="actions" style={{display:'flex',gap:8,alignItems:'center'}}>
            <input type="date" value={day} min="2026-08-25" max="2026-09-23" onChange={e=>setDay(e.target.value)} style={DINP}/>
            <span className="m">{dayList.length} на линии</span>
          </div>
        </div>
        <div className="b flush">
          <table className="tbl">
            <thead><tr><th>Госномер</th><th>Контрагент</th><th>Проект</th><th>Маршрут</th></tr></thead>
            <tbody>
              {dayList.length? dayList.map((r,i)=>(
                <tr key={i}>
                  <td data-label="Госномер"><span className="id">{r.plate}</span></td>
                  <td data-label="Контрагент"><span className="pri">{r.contractor}</span></td>
                  <td data-label="Проект" style={{fontSize:12,color:'var(--cream-2)'}}>{r.project}</td>
                  <td data-label="Маршрут" style={{fontFamily:"'JetBrains Mono', monospace",fontSize:12,color:'var(--coral)'}}>{r.route}</td>
                </tr>
              )) : <tr><td colSpan={4} style={{color:'var(--cream-3)',textAlign:'center',padding:16}}>Нет данных на {fmtRu(day)}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="h">
          <div className="t">Реестр частников</div>
          <div className="actions" style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="поиск: номер / ИП / проект" style={{background:'var(--panel-2)',border:'1px solid var(--line-2)',borderRadius:8,color:'var(--cream)',padding:'6px 10px',fontSize:12,minWidth:200}}/>
            {FB('all','все')}{FB('online','на линии')}{FB('active','активные')}{FB('soon','истекают')}{FB('end','завершённые')}
          </div>
        </div>
        <div className="b flush">
          <table className="tbl">
            <thead><tr>
              <SortTh k="plate" sort={sort}>Госномер</SortTh><SortTh k="contractor" sort={sort}>Контрагент</SortTh><SortTh k="registered" sort={sort}>Регистрация</SortTh><SortTh k="routesDone" sort={sort}>Маршрутов</SortTh><SortTh k="projects" sort={sort}>Проекты</SortTh><SortTh k="rate" sort={sort}>Ставка</SortTh><SortTh k="onLine" sort={sort}>На линии</SortTh><SortTh k="status" sort={sort}>Статус</SortTh>
            </tr></thead>
            <tbody>
              {filtered.map((r,i)=>(
                <tr key={i}>
                  <td data-label="Госномер"><span className="id">{r.plate}</span></td>
                  <td data-label="Контрагент"><span className="pri">{r.contractor}</span><span className="sec">{r.phone}</span></td>
                  <td data-label="Регистрация" style={{color:'var(--cream-3)',fontSize:12}}>{r.registered}</td>
                  <td data-label="Маршрутов"><b style={{color:'var(--cream)'}}>{r.routesDone}</b></td>
                  <td data-label="Проекты" style={{fontSize:12,color:'var(--cream-2)',maxWidth:220}}>{(r.projects||[]).join(', ')}</td>
                  <td data-label="Ставка" style={{fontFamily:"'JetBrains Mono', monospace",fontSize:12}}>{r.rate} ₽</td>
                  <td data-label="На линии">{r.onLine ? <span style={{color:'var(--green)',fontWeight:600}}>● да</span> : <span style={{color:'var(--cream-3)'}}>—</span>}</td>
                  <td data-label="Статус">{pill(r.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Fragment>
  );
}

/* ----------------- FLEET ----------------- */
function Fleet(){
  const [rows,setRows]=useState([]);
  const [q,setQ]=useState('');
  const [ktg,setKtg]=useState([]);
  const [kper,setKper]=useState('day');
  const [collapsed,setCollapsed]=useState(false);
  const [view,setView]=useState('fleet'); // fleet | docs
  const [log,setLog]=useState({});
  const [day,setDay]=useState('2026-09-23');
  const sort=useSort();
  useEffect(()=>{
    fetch('/data/own-fleet.json?t='+Date.now()).then(r=>r.json()).then(setRows).catch(()=>setRows([]));
    fetch('/data/own-ktg.json?t='+Date.now()).then(r=>r.json()).then(d=>setKtg(d.daily||[])).catch(()=>{});
    fetch('/data/own-log.json?t='+Date.now()).then(r=>r.json()).then(setLog).catch(()=>{});
  },[]);
  const dayList=(log[day]||[]);
  const dayKtg=(ktg.find(x=>x.date===day)||{}).ktg;
  const SC={'На линии':'#5DCB94','Ремонт':'#FFB84A','Капремонт':'#FF6464','Резерв':'#4A8FA8'};
  const pill=s=>{const c=SC[s]||'#8B8377';return <span style={{fontSize:'11.5px',fontWeight:600,padding:'3px 10px',borderRadius:'8px',color:c,background:c+'26',whiteSpace:'nowrap'}}>{s}</span>;};
  const total=rows.length, on=rows.filter(v=>v.status==='На линии').length;
  const gaz=rows.filter(v=>v.kind==='Газель').length, larg=rows.filter(v=>v.kind==='Ларгус').length;
  const rem=rows.filter(v=>v.status==='Ремонт'||v.status==='Капремонт').length;
  const pm={}; rows.forEach(v=>{(pm[v.project]=pm[v.project]||{t:0,on:0});pm[v.project].t++;if(v.status==='На линии')pm[v.project].on++;});
  const projects=Object.entries(pm).sort((a,b)=>b[1].t-a[1].t);
  const dnum=s=>{if(!s)return 0;const p=s.split('.');return +(p[2]+p[1]+p[0]);};
  const fleetRows=sort.apply(
    rows.filter(v=>!q || [v.plate,v.brand,v.type,v.kind,v.project,v.status,v.atp].join(' ').toLowerCase().includes(q.toLowerCase())),
    {brand:v=>v.brand+' '+v.type, ready:v=>v.ready?1:0, dk:v=>dnum(v.dk), osago:v=>dnum(v.osago), sk:v=>dnum(v.sk)}
  );

  // КТГ (коэффициент технической готовности) — динамика как в ОБЕ2
  const ktgNow = total ? Math.round((total-rem)/total*100) : 0; // КТГ = исправные (на линии + резерв) / всего
  const ktgAvg = a=>Math.round(a.reduce((s,x)=>s+x,0)/(a.length||1));
  const kSeries=(()=>{
    if(kper==='day') return ktg.slice(-30).map(d=>({label:d.date.slice(8,10)+'.'+d.date.slice(5,7), v:d.ktg}));
    if(kper==='week'){ const wk={}; ktg.forEach(d=>{const dt=new Date(d.date);const mon=new Date(dt);mon.setDate(dt.getDate()-((dt.getDay()+6)%7));const k=mon.toISOString().slice(0,10);(wk[k]=wk[k]||[]).push(d.ktg);}); return Object.entries(wk).slice(-12).map(([k,a])=>({label:k.slice(8,10)+'.'+k.slice(5,7),v:ktgAvg(a)})); }
    const mo={}; const NM=['','янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек']; ktg.forEach(d=>{const k=d.date.slice(0,7);(mo[k]=mo[k]||[]).push(d.ktg);}); return Object.entries(mo).slice(-6).map(([k,a])=>({label:NM[+k.slice(5,7)],v:ktgAvg(a)}));
  })();
  const KW=680,KH=190,KP=10,kn=kSeries.length;
  const kmax=Math.max(100,...kSeries.map(s=>s.v)),kmin=Math.min(60,...kSeries.map(s=>s.v));
  const kx=i=>kn>1?KP+i*(KW-2*KP)/(kn-1):KW/2, ky=v=>(KH-KP)-(v-kmin)/((kmax-kmin)||1)*(KH-2*KP);
  const kline=kSeries.map((s,i)=>(i?'L':'M')+kx(i).toFixed(1)+' '+ky(s.v).toFixed(1)).join(' ');
  const karea=kn?kline+` L ${kx(kn-1).toFixed(1)} ${KH-KP} L ${kx(0).toFixed(1)} ${KH-KP} Z`:'';
  const KB=(id,txt)=>(<button className={kper===id?'primary':''} onClick={()=>setKper(id)}>{txt}</button>);
  // документы: подсветка по сроку (просрочено / скоро / ок)
  const parseD=s=>{if(!s)return null;const p=s.split('.');return new Date(+p[2],+p[1]-1,+p[0]);};
  const TODAY=new Date(2026,8,23);
  const docCell=s=>{ if(!s) return <span style={{color:'var(--cream-4)'}}>нет</span>; const d=parseD(s); const days=d?(d-TODAY)/86400000:0; const c=days<0?'#FF6464':days<30?'#FFB84A':'#5DCB94'; return <span style={{color:c,fontFamily:"'JetBrains Mono', monospace",fontSize:12,whiteSpace:'nowrap'}}>{s}</span>; };
  const dkExp=rows.filter(v=>{const d=parseD(v.dk);return d&&d<TODAY;}).length;
  const osExp=rows.filter(v=>{const d=parseD(v.osago);return d&&d<TODAY;}).length;
  const download=()=>{
    const head=['Госномер','Марка','Тип','Класс','Проект','Статус','Готовность','Пробег','АТП'];
    const lines=[head.join(';'),...rows.map(v=>[v.plate,v.brand,v.type,v.kind,v.project,v.status,v.ready?'исправна':'—',v.mileage,v.atp].join(';'))];
    const blob=new Blob(['﻿'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ГФД_собственный_парк_'+new Date().toISOString().slice(0,10)+'.csv';document.body.appendChild(a);a.click();a.remove();
  };
  return (
    <Fragment>
      <div className="page-head">
        <div><h1>Собственный автопарк</h1><div className="sub">► {total} ТС · исправных {on} · в ремонте {rem}</div></div>
        <div className="actions"><button className="primary" onClick={download}>↓ Скачать отчёт</button></div>
      </div>
      <div className="stats">
        <div className="stat"><div className="l">► всего ТС</div><div className="v">{total}</div><div className="d"><span className="lab">собственный парк</span></div></div>
        <div className="stat"><div className="l">► исправные · на линии</div><div className="v">{on}</div><div className="d"><span className="delta up">{total?Math.round(on/total*100):0}%</span><span className="lab">готовность</span></div></div>
        <div className="stat"><div className="l">► газели</div><div className="v">{gaz}</div><div className="d"><span className="lab">осн. развоз</span></div></div>
        <div className="stat"><div className="l">► ларгусы</div><div className="v">{larg}</div><div className="d"><span className="lab">лёгкий развоз</span></div></div>
        <div className="stat"><div className="l">► в ремонте</div><div className="v">{rem}</div><div className="d"><span className="lab">требуют внимания</span></div></div>
      </div>
      <div className="grid-2">
        <div className="card"><div className="h"><div className="t">По проектам</div><div className="m">на линии / всего</div></div><div className="b">
          {projects.map(([p,x])=>(
            <div key={p} style={{marginBottom:'13px'}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'13px',marginBottom:'6px'}}><span>{p}</span><span style={{color:'var(--cream-3)',fontFamily:"'JetBrains Mono',monospace"}}>{x.on}/{x.t}</span></div>
              <div style={{height:'8px',borderRadius:'5px',background:'var(--bg-4)',overflow:'hidden'}}><div style={{height:'100%',width:(x.t?Math.round(x.on/x.t*100):0)+'%',background:'linear-gradient(90deg,var(--coral),var(--coral-deep))'}}></div></div>
            </div>
          ))}
        </div></div>
        <div className="card"><div className="h"><div className="t">Структура</div></div><div className="b">
          {[['Газели',gaz,'#FF6B47'],['Ларгусы / каблуки',larg,'#4A8FA8'],['Исправные',on,'#5DCB94'],['В ремонте',rem,'#FFB84A']].map(a=>(
            <div key={a[0]} style={{marginBottom:'13px'}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'13px',marginBottom:'6px'}}><span>{a[0]}</span><span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:600}}>{a[1]}</span></div>
              <div style={{height:'8px',borderRadius:'5px',background:'var(--bg-4)',overflow:'hidden'}}><div style={{height:'100%',width:(total?Math.round(a[1]/total*100):0)+'%',background:a[2]}}></div></div>
            </div>
          ))}
        </div></div>
      </div>
      <div className="card" style={{marginTop:'16px'}}>
        <div className="h">
          <div className="t">Аналитика · КТГ (коэффициент технической готовности)</div>
          <div className="actions" style={{display:'flex',gap:8,alignItems:'center'}}>
            <span style={{fontFamily:"'JetBrains Mono', monospace",fontSize:18,fontWeight:700,color:ktgNow>=75?'var(--green)':'var(--warn)'}}>{ktgNow}%</span>
            {KB('day','день')}{KB('week','неделя')}{KB('month','месяц')}
          </div>
        </div>
        <div className="b">
          <AreaChart series={kSeries} color="var(--green)" gid="kg" height={190} unit="%"/>
          <div style={{marginTop:12,paddingTop:12,borderTop:'1px solid var(--line)',display:'flex',gap:24,fontSize:13,flexWrap:'wrap'}}>
            <span style={{color:'var(--cream-2)'}}>Исправны: <b style={{color:'var(--cream)'}}>{total-rem}</b> / {total}</span>
            <span style={{color:'var(--cream-2)'}}>В ремонте: <b style={{color:'var(--warn)'}}>{rem}</b></span>
            <span style={{color:'var(--cream-2)'}}>КТГ сейчас: <b style={{color:ktgNow>=75?'var(--green)':'var(--warn)'}}>{ktgNow}%</b></span>
          </div>
        </div>
      </div>

      <div className="card" style={{marginTop:'16px'}}>
        <div className="h">
          <div className="t">Кто работал по дням</div>
          <div className="actions" style={{display:'flex',gap:8,alignItems:'center'}}>
            <input type="date" value={day} min="2026-08-25" max="2026-09-23" onChange={e=>setDay(e.target.value)} style={DINP}/>
            {dayKtg!=null && <span className="m" style={{color:dayKtg>=75?'var(--green)':'var(--warn)'}}>КТГ {dayKtg}%</span>}
            <span className="m">{dayList.length} на линии</span>
          </div>
        </div>
        <div className="b flush">
          <table className="tbl">
            <thead><tr><th>Водитель</th><th>Госномер</th><th>Проект</th><th>Маршрут</th></tr></thead>
            <tbody>
              {dayList.length? dayList.map((r,i)=>(
                <tr key={i}>
                  <td data-label="Водитель"><span className="pri">{r.driver}</span></td>
                  <td data-label="Госномер"><span className="id">{r.plate}</span></td>
                  <td data-label="Проект" style={{fontSize:12,color:'var(--cream-2)'}}>{r.project}</td>
                  <td data-label="Маршрут" style={{fontFamily:"'JetBrains Mono', monospace",fontSize:12,color:'var(--coral)'}}>{r.route}</td>
                </tr>
              )) : <tr><td colSpan={4} style={{color:'var(--cream-3)',textAlign:'center',padding:16}}>Нет данных на {fmtRu(day)}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{marginTop:'16px'}}>
        <div className="h">
          <div className="t">Список ТС {view==='docs' && (dkExp||osExp)?<span style={{color:'#FF6464',fontSize:12,fontWeight:600,marginLeft:8}}>· просрочено: ДК {dkExp} / ОСАГО {osExp}</span>:null}</div>
          <div className="actions" style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
            <button className={view==='fleet'?'primary':''} onClick={()=>setView('fleet')}>Транспорт</button>
            <button className={view==='docs'?'primary':''} onClick={()=>setView('docs')}>Документы</button>
            {!collapsed && <input value={q} onChange={e=>setQ(e.target.value)} placeholder="поиск: номер / марка / проект / АТП" style={{background:'var(--panel-2)',border:'1px solid var(--line-2)',borderRadius:8,color:'var(--cream)',padding:'6px 10px',fontSize:12,minWidth:200}}/>}
            <span className="m">{fleetRows.length} / {total}</span>
            <button onClick={()=>setCollapsed(c=>!c)}>{collapsed?'▸ Показать':'▾ Свернуть'}</button>
          </div>
        </div>
        {!collapsed && <div className="b flush"><table className="tbl">
          {view==='fleet' ? (
            <thead><tr>
              <SortTh k="plate" sort={sort}>Госномер</SortTh>
              <SortTh k="brand" sort={sort}>Марка / тип</SortTh>
              <SortTh k="project" sort={sort}>Проект</SortTh>
              <SortTh k="status" sort={sort}>Статус</SortTh>
              <SortTh k="ready" sort={sort}>Готовность</SortTh>
              <SortTh k="mileage" sort={sort}>Пробег</SortTh>
              <SortTh k="atp" sort={sort}>АТП</SortTh>
            </tr></thead>
          ) : (
            <thead><tr>
              <SortTh k="plate" sort={sort}>Госномер</SortTh>
              <SortTh k="brand" sort={sort}>Марка / тип</SortTh>
              <SortTh k="dk" sort={sort}>Диагностическая карта</SortTh>
              <SortTh k="osago" sort={sort}>ОСАГО (страховка)</SortTh>
              <SortTh k="sk" sort={sort}>Пропуск СК</SortTh>
              <SortTh k="status" sort={sort}>Статус</SortTh>
            </tr></thead>
          )}
          <tbody>{fleetRows.map(v=> view==='fleet' ? (
            <tr key={v.plate}><td data-label="Госномер"><span className="pri">{v.plate}</span></td><td data-label="Марка / тип">{v.brand}<span className="sec">{v.type}</span></td><td data-label="Проект">{v.project}</td><td data-label="Статус">{pill(v.status)}</td><td data-label="Готовность" style={{color:v.ready?'var(--green)':'var(--cream-4)'}}>{v.ready?'исправна':'—'}</td><td data-label="Пробег"><span className="id">{v.mileage.toLocaleString('ru-RU')}</span></td><td data-label="АТП" style={{color:'var(--cream-3)'}}>{v.atp}</td></tr>
          ) : (
            <tr key={v.plate}><td data-label="Госномер"><span className="pri">{v.plate}</span></td><td data-label="Марка / тип">{v.brand}<span className="sec">{v.type}</span></td><td data-label="Диагност. карта">{docCell(v.dk)}</td><td data-label="ОСАГО">{docCell(v.osago)}</td><td data-label="Пропуск СК">{docCell(v.sk)}</td><td data-label="Статус">{pill(v.status)}</td></tr>
          ))}</tbody>
        </table></div>}
        {collapsed && <div className="b" style={{color:'var(--cream-3)',fontSize:13}}>Список скрыт · {total} ТС. Нажмите «Показать».</div>}
      </div>
    </Fragment>
  );
}

/* ----------------- КАДРЫ (кандидаты) ----------------- */
function Conversations(){
  const [rows,setRows]=useState([]);
  const [log,setLog]=useState([]);
  const [fs,setFs]=useState('all');
  const [fp,setFp]=useState('all');
  const [q,setQ]=useState('');
  const [metric,setMetric]=useState('applications');
  const [period,setPeriod]=useState('day');
  const [picked,setPicked]=useState('');
  const sort=useSort();
  useEffect(()=>{
    fetch('/data/candidates.json?t='+Date.now()).then(r=>r.json()).then(setRows).catch(()=>setRows([]));
    fetch('/data/kadry-log.json?t='+Date.now()).then(r=>r.json()).then(d=>setLog(d.daily||[])).catch(()=>{});
  },[]);

  const SC={'новый':'#4A8FA8','собеседование':'#FFB84A','оформление':'#FF6B47','принят':'#5DCB94','отказ':'#8B8377'};
  const pill=s=>{const c=SC[s]||'#8B8377';return <span style={{fontSize:'11.5px',fontWeight:600,padding:'3px 10px',borderRadius:'8px',color:c,background:c+'26',whiteSpace:'nowrap'}}>{s}</span>;};

  const total=rows.length;
  const lemana=rows.filter(c=>c.project==='Лемана Про').length;
  const hired=rows.filter(c=>c.status==='принят').length;
  const projects=[...new Set(rows.map(c=>c.project))];

  const MET={applications:{label:'Заявки',color:'var(--sea)'},interviews:{label:'Собеседования',color:'var(--warn)'},hires:{label:'Приёмы',color:'var(--green)'}};
  const sum30=k=>log.slice(-30).reduce((s,d)=>s+(d[k]||0),0);
  const series=aggSeries(log,d=>d[metric]||0,period,'sum');
  const pickedRow=picked?log.find(d=>d.date===picked):null;
  const dmin=log.length?log[0].date:''; const dmax=log.length?log[log.length-1].date:'';
  const pRu=fmtRu(picked);
  const dayCands=picked?rows.filter(c=>c.applied===pRu||c.startDay===pRu):[];

  const filtered=sort.apply(
    rows.filter(c=>(fs==='all'||c.status===fs)&&(fp==='all'||c.project===fp)&&(!q||[c.name,c.project,c.position,c.source,c.phone].join(' ').toLowerCase().includes(q.toLowerCase()))),
    {name:c=>c.name, startDay:c=>c.startDay.split('.').reverse().join(''), applied:c=>c.applied.split('.').reverse().join('')}
  );

  const dmap={}; rows.forEach(c=>{ if(c.status!=='отказ') dmap[c.startDay]=(dmap[c.startDay]||0)+1; });
  const byDay=Object.entries(dmap).sort((a,b)=>{const p=s=>s.split('.').reverse().join('');return p(a[0])<p(b[0])?-1:1;}).slice(0,8);
  const maxDay=Math.max(1,...byDay.map(d=>d[1]));

  const download=()=>{
    const head=['ФИО','Телефон','Проект','Должность','Дата заявки','Дата выхода','Статус','Источник'];
    const lines=[head.join(';'),...rows.map(c=>[c.name,c.phone,c.project,c.position,c.applied,c.startDay,c.status,c.source].join(';'))];
    const blob=new Blob(['﻿'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ГФД_кадры_'+new Date().toISOString().slice(0,10)+'.csv';document.body.appendChild(a);a.click();a.remove();
  };
  const FB=(id,txt)=>(<button onClick={()=>setFs(id)} style={{borderColor:fs===id?'var(--coral)':'var(--line-2)',color:fs===id?'var(--coral)':'var(--cream-2)'}}>{txt}</button>);

  return (
    <Fragment>
      <div className="page-head">
        <div>
          <h1>Кадры</h1>
          <div className="sub">► кандидаты и статистика найма · день / неделя / месяц</div>
        </div>
        <div className="actions">
          <button className="primary" onClick={download}>↓ Скачать отчёт</button>
        </div>
      </div>

      <div className="stats">
        {[['applications','заявки (30 дн)'],['interviews','собеседования (30 дн)'],['hires','приёмы (30 дн)']].map(([k,l])=>(
          <div key={k} className="stat" onClick={()=>setMetric(k)} style={{cursor:'pointer',outline:metric===k?'1.5px solid var(--coral)':'1.5px solid transparent',outlineOffset:-1}}>
            <div className="l">► {l} {metric===k?'▾':''}</div><div className="v">{sum30(k)}</div><div className="d"><span className="lab">клик → график</span></div>
          </div>
        ))}
        <div className="stat" onClick={()=>setFp(fp==='Лемана Про'?'all':'Лемана Про')} style={{cursor:'pointer',outline:fp==='Лемана Про'?'1.5px solid var(--coral)':'1.5px solid transparent',outlineOffset:-1}}><div className="l">► на Лемана Про {fp==='Лемана Про'?'▾':''}</div><div className="v">{lemana}</div><div className="d"><span className="delta up">{total?Math.round(lemana/total*100):0}%</span><span className="lab">клик → фильтр</span></div></div>
      </div>

      <div className="card">
        <div className="h">
          <div className="t">Динамика найма · {MET[metric].label}</div>
          <div className="actions" style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
            <PBtns period={period} set={setPeriod}/>
            <input type="date" value={picked} min={dmin} max={dmax} onChange={e=>setPicked(e.target.value)} style={DINP}/>
            {picked && <button onClick={()=>setPicked('')}>сброс</button>}
          </div>
        </div>
        <div className="b">
          {pickedRow && (
            <div style={{marginBottom:12,padding:'10px 14px',borderRadius:10,background:'var(--panel-2)',border:'1px solid var(--line-2)',display:'flex',gap:20,flexWrap:'wrap',fontSize:13}}>
              <span style={{color:'var(--cream-2)'}}>На <b style={{color:'var(--cream)'}}>{fmtRu(picked)}</b>:</span>
              <span style={{color:'var(--sea)'}}>заявки {pickedRow.applications}</span>
              <span style={{color:'var(--warn)'}}>собеседования {pickedRow.interviews}</span>
              <span style={{color:'var(--green)'}}>приёмы {pickedRow.hires}</span>
            </div>
          )}
          <AreaChart series={series} color={MET[metric].color} gid="kad"/>
        </div>
      </div>

      {picked && (
        <div className="card">
          <div className="h"><div className="t">Кандидаты на {fmtRu(picked)}</div><div className="m">{dayCands.length} чел · заявка/выход</div></div>
          <div className="b flush">
            <table className="tbl">
              <thead><tr><th>ФИО</th><th>Проект</th><th>Должность</th><th>Событие</th><th>Статус</th></tr></thead>
              <tbody>
                {dayCands.length? dayCands.map((c,i)=>(
                  <tr key={i}>
                    <td data-label="ФИО"><span className="pri">{c.name}</span></td>
                    <td data-label="Проект" style={{fontSize:12,color:'var(--cream-2)'}}>{c.project}</td>
                    <td data-label="Должность" style={{fontSize:12,color:'var(--cream-2)'}}>{c.position}</td>
                    <td data-label="Событие" style={{fontSize:12,color:'var(--cream-3)'}}>{c.applied===pRu?'заявка':''}{c.applied===pRu&&c.startDay===pRu?' · ':''}{c.startDay===pRu?'выход':''}</td>
                    <td data-label="Статус">{pill(c.status)}</td>
                  </tr>
                )) : <tr><td colSpan={5} style={{color:'var(--cream-3)',textAlign:'center',padding:16}}>Нет событий на эту дату</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <div className="h"><div className="t">Выход кандидатов по дням</div><div className="m">ближайшие даты</div></div>
        <div className="b">
          {byDay.map((d,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'7px 0',borderBottom:i<byDay.length-1?'1px dashed var(--line)':'none'}}>
              <span style={{fontFamily:"'JetBrains Mono', monospace",fontSize:12,color:'var(--cream-2)',minWidth:80}}>{d[0]}</span>
              <div style={{flex:1,height:8,borderRadius:5,background:'var(--line)',overflow:'hidden'}}><div style={{height:'100%',width:(d[1]/maxDay*100)+'%',background:'var(--coral)'}}></div></div>
              <b style={{color:'var(--cream)',minWidth:22,textAlign:'right'}}>{d[1]}</b>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="h">
          <div className="t">Кандидаты</div>
          <div className="actions" style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="поиск: ФИО / должность / источник" style={{background:'var(--panel-2)',border:'1px solid var(--line-2)',borderRadius:8,color:'var(--cream)',padding:'6px 10px',fontSize:12,minWidth:200}}/>
            <select value={fp} onChange={e=>setFp(e.target.value)} style={{background:'var(--panel-2)',border:'1px solid var(--line-2)',borderRadius:8,color:'var(--cream)',padding:'6px 10px',fontSize:12}}>
              <option value="all">Все проекты</option>
              {projects.map((p,i)=>(<option key={i} value={p}>{p}</option>))}
            </select>
            {FB('all','все')}{FB('новый','новые')}{FB('собеседование','собес.')}{FB('оформление','оформл.')}{FB('принят','приняты')}
          </div>
        </div>
        <div className="b flush">
          <table className="tbl">
            <thead><tr><SortTh k="name" sort={sort}>ФИО</SortTh><SortTh k="project" sort={sort}>Проект</SortTh><SortTh k="position" sort={sort}>Должность</SortTh><SortTh k="applied" sort={sort}>Заявка</SortTh><SortTh k="startDay" sort={sort}>Выход</SortTh><SortTh k="source" sort={sort}>Источник</SortTh><SortTh k="status" sort={sort}>Статус</SortTh></tr></thead>
            <tbody>
              {filtered.map((c,i)=>(
                <tr key={i}>
                  <td data-label="ФИО"><span className="pri">{c.name}</span><span className="sec">{c.phone}</span></td>
                  <td data-label="Проект" style={{fontSize:12,color:'var(--cream-2)'}}>{c.project}</td>
                  <td data-label="Должность" style={{fontSize:12,color:'var(--cream-2)'}}>{c.position}</td>
                  <td data-label="Заявка" style={{fontFamily:"'JetBrains Mono', monospace",fontSize:11.5,color:'var(--cream-3)'}}>{c.applied}</td>
                  <td data-label="Выход" style={{fontFamily:"'JetBrains Mono', monospace",fontSize:11.5,color:'var(--cream)'}}>{c.startDay}</td>
                  <td data-label="Источник" style={{fontSize:12,color:'var(--cream-3)'}}>{c.source}</td>
                  <td data-label="Статус">{pill(c.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Fragment>
  );
}

/* ----------------- CUSTOMERS ----------------- */
function Customers(){
  const [rows,setRows]=useState([]);
  const [q,setQ]=useState('');
  const [stats,setStats]=useState([]);
  const [sel,setSel]=useState(null);   // выбранный магазин (провал)
  const [day,setDay]=useState('2026-09-23');
  const sort=useSort();
  useEffect(()=>{
    fetch('/data/stores.json?t='+Date.now()).then(r=>r.json()).then(setRows).catch(()=>setRows([]));
    fetch('/data/stats.json?t='+Date.now()).then(r=>r.json()).then(d=>setStats(d.rows||[])).catch(()=>{});
  },[]);
  // детализация выбранного магазина
  const selRows=sel?stats.filter(r=>r.store===sel.name).sort((a,b)=>a.date<b.date?-1:1):[];
  const selClosed=selRows.reduce((a,r)=>a+r.closed,0), selPlanned=selRows.reduce((a,r)=>a+r.planned,0);
  const selCompl=selPlanned?Math.round(selClosed/selPlanned*100):0;
  const selOT=selRows.length?Math.round(selRows.reduce((a,r)=>a+r.onTime,0)/selRows.length):0;
  const selSeries=selRows.map(r=>({label:r.date.slice(8,10)+'.'+r.date.slice(5,7),v:r.closed,date:r.date}));
  const selDay=sel?selRows.find(r=>r.date===day):null;
  const total=rows.length;
  const active=rows.filter(s=>s.status==='active').length;
  const rToday=rows.reduce((a,s)=>a+(s.routesToday||0),0);
  const rMonth=rows.reduce((a,s)=>a+(s.routesMonth||0),0);
  const avgOT=rows.length?Math.round(rows.reduce((a,s)=>a+(s.onTime||0),0)/rows.length):0;
  const maxT=Math.max(1,...rows.map(s=>s.routesToday||0));
  const storeRows=sort.apply(
    rows.filter(s=>!q||[s.id,s.name,s.city,s.address,s.project].join(' ').toLowerCase().includes(q.toLowerCase())),
    {}
  );
  const stpill=s=>{const c=s==='active'?'#5DCB94':'#FFB84A';return <span style={{fontSize:'11.5px',fontWeight:600,padding:'3px 10px',borderRadius:'8px',color:c,background:c+'26'}}>{s==='active'?'Работает':'Пауза'}</span>;};
  const download=()=>{
    const head=['ID','Магазин','Город','Адрес','Проект','Маршрутов сегодня','Маршрутов за месяц','Свои ТС','Частники','В срок %','Статус'];
    const lines=[head.join(';'),...rows.map(s=>[s.id,s.name,s.city,s.address,s.project,s.routesToday,s.routesMonth,s.ownCars,s.hiredCars,s.onTime,s.status==='active'?'работает':'пауза'].join(';'))];
    const blob=new Blob(['﻿'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ГФД_магазины_'+new Date().toISOString().slice(0,10)+'.csv';document.body.appendChild(a);a.click();a.remove();
  };
  return (
    <Fragment>
      <div className="page-head">
        <div>
          <h1>Магазины</h1>
          <div className="sub">► точки обслуживания · маршруты и закреплённый транспорт</div>
        </div>
        <div className="actions">
          <button className="primary" onClick={download}>↓ Скачать отчёт</button>
        </div>
      </div>

      <div className="stats">
        <div className="stat"><div className="l">► всего магазинов</div><div className="v">{total}</div><div className="d"><span className="lab">точек</span></div></div>
        <div className="stat"><div className="l">► работают</div><div className="v">{active}</div><div className="d"><span className="lab">активных сегодня</span></div></div>
        <div className="stat"><div className="l">► маршрутов сегодня</div><div className="v">{rToday}</div><div className="d"><span className="lab">по всем точкам</span></div></div>
        <div className="stat"><div className="l">► в срок · среднее</div><div className="v">{avgOT}%</div><div className="d"><span className="delta up">за месяц {rMonth.toLocaleString('ru-RU')}</span></div></div>
      </div>

      {sel && (
        <div className="card">
          <div className="h">
            <div className="t">{sel.name} · статистика по дням</div>
            <div className="actions" style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
              <input type="date" value={day} min="2026-08-25" max="2026-09-23" onChange={e=>setDay(e.target.value)} style={DINP}/>
              <button onClick={()=>setSel(null)}>✕ закрыть</button>
            </div>
          </div>
          <div className="b">
            <div className="stats" style={{margin:'0 0 14px'}}>
              <div className="stat"><div className="l">► закрыто (30 дн)</div><div className="v">{selClosed}</div><div className="d"><span className="lab">план {selPlanned}</span></div></div>
              <div className="stat"><div className="l">► выполнение</div><div className="v">{selCompl}%</div><div className="d"><span className="lab">за месяц</span></div></div>
              <div className="stat"><div className="l">► в срок · среднее</div><div className="v">{selOT}%</div><div className="d"><span className="lab">{sel.project}</span></div></div>
              <div className="stat"><div className="l">► на {fmtRu(day)}</div><div className="v">{selDay?selDay.closed:'—'}</div><div className="d"><span className="lab">{selDay?('план '+selDay.planned+' · в срок '+selDay.onTime+'%'):'нет данных'}</span></div></div>
            </div>
            <div style={{fontSize:12,color:'var(--cream-3)',marginBottom:6}}>Закрытые маршруты по дням</div>
            <AreaChart series={selSeries} color="var(--coral)" gid="storechart" height={200}/>
          </div>
        </div>
      )}

      <div className="card">
        <div className="h">
          <div className="t">Список магазинов <span className="m" style={{fontWeight:400}}>· клик по строке → статистика магазина</span></div>
          <div className="actions" style={{display:'flex',gap:8,alignItems:'center'}}>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="поиск: магазин / город / проект" style={{background:'var(--panel-2)',border:'1px solid var(--line-2)',borderRadius:8,color:'var(--cream)',padding:'6px 10px',fontSize:12,minWidth:200}}/>
            <span className="m">{storeRows.length} / {total}</span>
          </div>
        </div>
        <div className="b flush">
          <table className="tbl">
            <thead><tr><SortTh k="id" sort={sort}>ID</SortTh><SortTh k="name" sort={sort}>Магазин</SortTh><SortTh k="project" sort={sort}>Проект</SortTh><SortTh k="routesToday" sort={sort}>Маршр. сегодня</SortTh><SortTh k="routesMonth" sort={sort}>За месяц</SortTh><SortTh k="ownCars" sort={sort}>Свои</SortTh><SortTh k="hiredCars" sort={sort}>Частники</SortTh><SortTh k="onTime" sort={sort}>В срок</SortTh><SortTh k="status" sort={sort}>Статус</SortTh></tr></thead>
            <tbody>
              {storeRows.map((s,i)=>(
                <tr key={i} style={{cursor:'pointer'}} onClick={()=>{setSel(s); if(typeof window!=='undefined') window.scrollTo({top:0,behavior:'smooth'});}}>
                  <td data-label="ID"><span className="id">{s.id}</span></td>
                  <td data-label="Магазин"><span className="pri">{s.name}</span><span className="sec">{s.address}</span></td>
                  <td data-label="Проект" style={{fontSize:12,color:'var(--cream-2)'}}>{s.project}</td>
                  <td data-label="Маршр. сегодня">
                    <div style={{display:'flex',alignItems:'center',gap:8,minWidth:90}}>
                      <b style={{color:'var(--cream)'}}>{s.routesToday}</b>
                      <div style={{flex:1,height:5,minWidth:40,borderRadius:4,background:'var(--line)',overflow:'hidden'}}><div style={{height:'100%',width:(s.routesToday/maxT*100)+'%',background:'var(--coral)'}}></div></div>
                    </div>
                  </td>
                  <td data-label="За месяц" style={{fontFamily:"'JetBrains Mono', monospace",fontSize:12}}>{s.routesMonth}</td>
                  <td data-label="Свои ТС">{s.ownCars}</td>
                  <td data-label="Частники">{s.hiredCars}</td>
                  <td data-label="В срок"><span style={{color:s.onTime>=95?'var(--green)':'var(--warn)',fontWeight:600}}>{s.onTime}%</span></td>
                  <td data-label="Статус">{stpill(s.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Fragment>
  );
}

/* ----------------- СТАТИСТИКА (закрытые маршруты) ----------------- */
function SyncPage(){
  const [rows,setRows]=useState([]);
  const [store,setStore]=useState('all');
  const [day,setDay]=useState('2026-09-23');
  const [ktg,setKtg]=useState([]);
  const [ownLog,setOwnLog]=useState({});
  const [hiredLog,setHiredLog]=useState({});
  const [kad,setKad]=useState([]);
  const sort=useSort();
  useEffect(()=>{
    fetch('/data/stats.json?t='+Date.now()).then(r=>r.json()).then(d=>setRows(d.rows||[])).catch(()=>setRows([]));
    fetch('/data/own-ktg.json?t='+Date.now()).then(r=>r.json()).then(d=>setKtg(d.daily||[])).catch(()=>{});
    fetch('/data/own-log.json?t='+Date.now()).then(r=>r.json()).then(setOwnLog).catch(()=>{});
    fetch('/data/hired-log.json?t='+Date.now()).then(r=>r.json()).then(setHiredLog).catch(()=>{});
    fetch('/data/kadry-log.json?t='+Date.now()).then(r=>r.json()).then(d=>setKad(d.daily||[])).catch(()=>{});
  },[]);

  // финальная статистика на выбранный день
  const dayStoreRows=rows.filter(r=>r.date===day);
  const dayClosed=dayStoreRows.reduce((a,r)=>a+r.closed,0);
  const dayPlanned=dayStoreRows.reduce((a,r)=>a+r.planned,0);
  const dayKtg=(ktg.find(x=>x.date===day)||{}).ktg;
  const dayOwn=(ownLog[day]||[]).length;
  const dayHired=(hiredLog[day]||[]).length;
  const dayHires=(kad.find(x=>x.date===day)||{}).hires;
  const storeDay=store!=='all'?dayStoreRows.find(r=>r.store===store):null;

  const stores=[...new Set(rows.map(r=>r.store))];
  const scoped=store==='all'?rows:rows.filter(r=>r.store===store);
  const closed=scoped.reduce((a,r)=>a+r.closed,0);
  const planned=scoped.reduce((a,r)=>a+r.planned,0);
  const compl=planned?Math.round(closed/planned*100):0;
  const avgOT=scoped.length?Math.round(scoped.reduce((a,r)=>a+r.onTime,0)/scoped.length):0;

  const byStore=stores.map(s=>{
    const rs=rows.filter(r=>r.store===s);
    const c=rs.reduce((a,r)=>a+r.closed,0), p=rs.reduce((a,r)=>a+r.planned,0);
    return {store:s,project:rs[0]?rs[0].project:'',closed:c,planned:p,compl:p?Math.round(c/p*100):0,ot:rs.length?Math.round(rs.reduce((a,r)=>a+r.onTime,0)/rs.length):0};
  }).sort((a,b)=>b.closed-a.closed);

  const dmap={}; scoped.forEach(r=>{dmap[r.date]=(dmap[r.date]||0)+r.closed;});
  const series=Object.entries(dmap).sort().map(([d,v])=>({label:d.slice(8,10)+'.'+d.slice(5,7),v}));
  const W=680,H=190,P=10,n=series.length;
  const max=Math.max(1,...series.map(s=>s.v)),min=Math.min(0,...series.map(s=>s.v));
  const xp=i=>n>1?P+i*(W-2*P)/(n-1):W/2, yp=v=>(H-P)-(v-min)/((max-min)||1)*(H-2*P);
  const line=series.map((s,i)=>(i?'L':'M')+xp(i).toFixed(1)+' '+yp(s.v).toFixed(1)).join(' ');
  const area=n?line+` L ${xp(n-1).toFixed(1)} ${H-P} L ${xp(0).toFixed(1)} ${H-P} Z`:'';

  const download=()=>{
    const head=['Магазин','Проект','Закрыто маршрутов','Запланировано','Выполнение %','В срок %'];
    const lines=[head.join(';'),...byStore.map(s=>[s.store,s.project,s.closed,s.planned,s.compl,s.ot].join(';'))];
    const blob=new Blob(['﻿'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ГФД_статистика_маршрутов_'+new Date().toISOString().slice(0,10)+'.csv';document.body.appendChild(a);a.click();a.remove();
  };

  return (
    <Fragment>
      <div className="page-head">
        <div>
          <h1>Статистика</h1>
          <div className="sub">► финальная статистика · маршруты, КТГ, парк и кадры по любому дню</div>
        </div>
        <div className="actions" style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <input type="date" value={day} min="2026-08-25" max="2026-09-23" onChange={e=>setDay(e.target.value)} style={DINP}/>
          <select value={store} onChange={e=>setStore(e.target.value)} style={{background:'var(--panel-2)',border:'1px solid var(--line-2)',borderRadius:8,color:'var(--cream)',padding:'6px 10px',fontSize:12}}>
            <option value="all">Все магазины</option>
            {stores.map((s,i)=>(<option key={i} value={s}>{s}</option>))}
          </select>
          <button className="primary" onClick={download}>↓ Скачать отчёт</button>
        </div>
      </div>

      <div className="card">
        <div className="h"><div className="t">Финальная статистика на {fmtRu(day)}</div><div className="m">итог по дню</div></div>
        <div className="b">
          <div className="stats" style={{margin:0}}>
            <div className="stat"><div className="l">► маршрутов закрыто</div><div className="v">{dayClosed}</div><div className="d"><span className="lab">план {dayPlanned}</span></div></div>
            <div className="stat"><div className="l">► КТГ парка</div><div className="v">{dayKtg!=null?dayKtg+'%':'—'}</div><div className="d"><span className="lab">тех. готовность</span></div></div>
            <div className="stat"><div className="l">► свои на линии</div><div className="v">{dayOwn}</div><div className="d"><span className="lab">водителей</span></div></div>
            <div className="stat"><div className="l">► частники на линии</div><div className="v">{dayHired}</div><div className="d"><span className="lab">+ приёмы {dayHires!=null?dayHires:0}</span></div></div>
          </div>
          {storeDay && (
            <div style={{marginTop:14,paddingTop:14,borderTop:'1px solid var(--line)',display:'flex',gap:22,flexWrap:'wrap',fontSize:13}}>
              <span style={{color:'var(--cream-2)'}}>{store} на {fmtRu(day)}:</span>
              <span style={{color:'var(--cream)'}}>закрыто <b>{storeDay.closed}</b> / план {storeDay.planned}</span>
              <span style={{color:storeDay.onTime>=90?'var(--green)':'var(--warn)'}}>в срок {storeDay.onTime}%</span>
            </div>
          )}
          {store!=='all' && !storeDay && <div style={{marginTop:12,color:'var(--cream-3)',fontSize:13}}>Нет данных по «{store}» на {fmtRu(day)}</div>}
        </div>
      </div>

      <div className="stats">
        <div className="stat"><div className="l">► закрыто маршрутов</div><div className="v">{closed.toLocaleString('ru-RU')}</div><div className="d"><span className="lab">за 30 дней</span></div></div>
        <div className="stat"><div className="l">► выполнение плана</div><div className="v">{compl}%</div><div className="d"><span className={'delta '+(compl>=90?'up':'down')}>{closed}/{planned}</span></div></div>
        <div className="stat"><div className="l">► в срок · среднее</div><div className="v">{avgOT}%</div><div className="d"><span className="lab">по выборке</span></div></div>
        <div className="stat"><div className="l">► магазинов в отчёте</div><div className="v">{store==='all'?stores.length:1}</div><div className="d"><span className="lab">точек</span></div></div>
      </div>

      <div className="card">
        <div className="h"><div className="t">Динамика закрытых маршрутов</div><div className="m">{store==='all'?'все магазины':store}</div></div>
        <div className="b">
          <AreaChart series={series} color="var(--coral)" gid="sg" height={190}/>
        </div>
      </div>

      <div className="card">
        <div className="h"><div className="t">По магазинам · итоги 30 дней</div><div className="m">{byStore.length} точек</div></div>
        <div className="b flush">
          <table className="tbl">
            <thead><tr><SortTh k="store" sort={sort}>Магазин</SortTh><SortTh k="project" sort={sort}>Проект</SortTh><SortTh k="closed" sort={sort}>Закрыто</SortTh><SortTh k="planned" sort={sort}>План</SortTh><SortTh k="compl" sort={sort}>Выполнение</SortTh><SortTh k="ot" sort={sort}>В срок</SortTh></tr></thead>
            <tbody>
              {(sort.sortKey?sort.apply(byStore,{}):byStore).map((s,i)=>(
                <tr key={i} style={{cursor:'pointer'}} onClick={()=>{setStore(s.store); if(typeof window!=='undefined') window.scrollTo({top:0,behavior:'smooth'});}}>
                  <td data-label="Магазин"><span className="pri">{s.store}</span></td>
                  <td data-label="Проект" style={{fontSize:12,color:'var(--cream-2)'}}>{s.project}</td>
                  <td data-label="Закрыто"><b style={{color:'var(--cream)'}}>{s.closed}</b></td>
                  <td data-label="План" style={{color:'var(--cream-3)'}}>{s.planned}</td>
                  <td data-label="Выполнение">
                    <div style={{display:'flex',alignItems:'center',gap:8,minWidth:90}}>
                      <span style={{color:s.compl>=90?'var(--green)':'var(--warn)',fontWeight:600,minWidth:34}}>{s.compl}%</span>
                      <div style={{flex:1,height:5,minWidth:40,borderRadius:4,background:'var(--line)',overflow:'hidden'}}><div style={{height:'100%',width:s.compl+'%',background:s.compl>=90?'var(--green)':'var(--warn)'}}></div></div>
                    </div>
                  </td>
                  <td data-label="В срок">{s.ot}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Fragment>
  );
}

/* ----------------- SETTINGS ----------------- */
function Settings(){
  const [sched,setSched]=useState({times:[],enabled:true});
  const [schedStatus,setSchedStatus]=useState('');
  useEffect(()=>{ fetch('/api/schedule').then(r=>r.json()).then(d=>{ if(d&&Array.isArray(d.times)) setSched({times:d.times,enabled:d.enabled!==false}); }).catch(()=>{}); },[]);
  const setTime=(i,v)=>setSched(s=>({...s,times:s.times.map((t,j)=>j===i?v:t)}));
  const addTime=()=>setSched(s=>({...s,times:[...s.times,'09:00']}));
  const delTime=i=>setSched(s=>({...s,times:s.times.filter((_,j)=>j!==i)}));
  const saveSched=async()=>{
    setSchedStatus('…');
    try{ const r=await fetch('/api/schedule',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({times:sched.times.filter(Boolean),enabled:sched.enabled})}); const o=await r.json(); setSchedStatus(o.ok?'✓ сохранено':('⚠ '+(o.error||'ошибка'))); }
    catch(e){ setSchedStatus('⚠ сеть'); }
    setTimeout(()=>setSchedStatus(''),4000);
  };
  return (
    <Fragment>
      <div className="page-head">
        <div>
          <h1>Настройки</h1>
          <div className="sub">► расписание отчётов · AI-движок · интеграции</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="h"><div className="t">Отправка отчётов · расписание</div><div className="m">@gfd_otchet_bot</div></div>
          <div className="b">
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
              <button className={sched.enabled?'primary':''} onClick={()=>setSched(s=>({...s,enabled:!s.enabled}))}>{sched.enabled?'● Включено':'○ Выключено'}</button>
              <span style={{color:'var(--cream-3)',fontSize:12}}>сводный отчёт в Telegram руководителю</span>
            </div>
            <label style={{fontSize:12,color:'var(--cream-2)'}}>Время отправки (МСК)</label>
            <div style={{display:'flex',flexWrap:'wrap',gap:8,margin:'8px 0 12px'}}>
              {sched.times.map((t,i)=>(
                <span key={i} style={{display:'inline-flex',alignItems:'center',gap:4,background:'var(--panel-2)',border:'1px solid var(--line-2)',borderRadius:8,padding:'2px 4px 2px 8px'}}>
                  <input type="time" value={t} onChange={e=>setTime(i,e.target.value)} style={{background:'transparent',border:0,color:'var(--cream)',fontSize:13,colorScheme:'dark'}}/>
                  <button onClick={()=>delTime(i)} style={{padding:'2px 8px'}}>×</button>
                </span>
              ))}
              <button onClick={addTime}>+ время</button>
            </div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <button className="primary" onClick={saveSched}>Сохранить расписание</button>
              {schedStatus && <span style={{fontSize:12,color:schedStatus[0]==='✓'?'var(--green)':schedStatus==='…'?'var(--cream-3)':'var(--warn)'}}>{schedStatus}</span>}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="h"><div className="t">AI-движок · Claude</div><div className="m">подключён на сервере</div></div>
          <div className="b">
            <div style={{marginBottom:14}}><span className="pill avail">● ключ в защищённом окружении</span></div>
            <div className="field">
              <label>модель AI-агента (tool use)</label>
              <input value="claude-sonnet-5" readOnly />
            </div>
            <div className="field">
              <label>модель быстрых сводок</label>
              <input value="claude-haiku-4-5" readOnly />
            </div>
          </div>
        </div>
      </div>

      <div style={{height:14}}/>

      <div className="card">
        <div className="h"><div className="t">Интеграции</div><div className="m">{INTEGRATIONS.length} сервисов</div></div>
        <div className="b flush">
          {INTEGRATIONS.map((it,i) => (
            <div key={i} className="integration">
              <div className="ico">{it.ic}</div>
              <div className="info">
                <div className="name">{it.name}</div>
                <div className="desc">{it.desc}</div>
              </div>
              <div className="right">
                {it.status === 'connected' && <span className="pill avail">подключено</span>}
                {it.status === 'pending' && <span className="pill pending">ожидает</span>}
                {it.status === 'review' && <span className="pill maint">в обзоре</span>}
                {it.status === 'disconnected' && <span className="pill cancelled">отключено</span>}
                {it.status === 'planned' && <span className="pill done">в плане</span>}
                <button>настроить</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Fragment>
  );
}

/* ============================================================ */
/* AI ASSISTANT WITH TOOL USE                                   */
/* ============================================================ */
const GFD = {own:[],hired:[],stores:[],stats:[],candidates:[],routes:[]};
async function loadGFD(){
  const j=async u=>{try{return await (await fetch(u+'?t='+Date.now())).json();}catch(e){return null;}};
  const [o,h,s,st,c,r]=await Promise.all([j('/data/own-fleet.json'),j('/data/hired-fleet.json'),j('/data/stores.json'),j('/data/stats.json'),j('/data/candidates.json'),j('/data/routes.json')]);
  if(o)GFD.own=o; if(h)GFD.hired=h; if(s)GFD.stores=s; if(st)GFD.stats=st.rows||[]; if(c)GFD.candidates=c; if(r)GFD.routes=r.daily||[];
}

const SYSTEM_ASSISTANT = `Ты — внутренний AI-помощник менеджеров автопарка ГФД. Работаешь как агент с набором инструментов для работы с системой учёта.

ПРИНЦИПЫ:
- Когда спрашивают про данные (собственный парк, частники, магазины, маршруты, статистика, кадры) — обязательно вызывай нужный инструмент, не отвечай по памяти.
- Если задача многошаговая — вызывай инструменты последовательно.
- В финальном ответе кратко резюмируй результат. По-русски, по делу, без воды.
- Числа всегда бери из инструментов, никогда не выдумывай.
- Если данных не хватает — задай ОДИН уточняющий вопрос.

КОНТЕКСТ: автопарк ГФД возит маршруты для магазинов (Лемана Про, Магнит, Х5, Озон, ВкусВилл, Самокат). Есть собственные ТС (газели, ларгусы) и привлечённые частники. Кадры — кандидаты-водители на проекты.`;

const TOOLS = [
  {name:'query_own_fleet', description:'Filter own vehicles (собственный автопарк). Use for own cars, on-line count, repairs, by project.',
    input_schema:{type:'object',properties:{status:{type:'string',enum:['На линии','Ремонт','Капремонт','Резерв','all']},kind:{type:'string',enum:['Газель','Ларгус']},project:{type:'string',description:'Partial project name'}}}},
  {name:'query_hired', description:'Filter contractors (привлечённый парк / частники): registration, routes done, projects, who is on line.',
    input_schema:{type:'object',properties:{status:{type:'string',enum:['active','soon','end','all']},on_line:{type:'boolean'},project:{type:'string'}}}},
  {name:'query_stores', description:'Filter stores (магазины): routes per store today/month, assigned vehicles, on-time %.',
    input_schema:{type:'object',properties:{project:{type:'string'},status:{type:'string',enum:['active','pause','all']}}}},
  {name:'query_candidates', description:'Filter candidates (кадры): hiring pipeline, candidates per project (esp. Лемана Про), start days.',
    input_schema:{type:'object',properties:{project:{type:'string'},status:{type:'string',enum:['новый','собеседование','оформление','принят','отказ']}}}},
  {name:'get_stats', description:'Returns an aggregate metric. Use for KPI questions.',
    input_schema:{type:'object',properties:{metric:{type:'string',enum:['routes_today','on_line_total','on_line_own','on_line_hired','closed_routes_30d','by_project_today','fleet_condition']}},required:['metric']}},
  {name:'send_report', description:'Queue a report to be sent to management via Telegram. Use when user asks to send/prepare a report to Telegram.',
    input_schema:{type:'object',properties:{report:{type:'string',description:'собственный парк / частники / магазины / статистика / кадры / сводный'},channel:{type:'string',enum:['telegram']}},required:['report']}}
];

const TOOL_LABELS = {
  query_own_fleet:'Собственный парк',
  query_hired:'Привлечённый парк (частники)',
  query_stores:'Магазины',
  query_candidates:'Кадры (кандидаты)',
  get_stats:'Метрики и статистика',
  send_report:'Отправить отчёт в Telegram'
};

const TOOL_DESCRIPTIONS = {
  query_own_fleet:'AI ищет свои ТС по статусу (на линии / ремонт / резерв), классу (газель/ларгус), проекту. Примеры: «Сколько газелей на линии?», «Что в ремонте?», «Свои ТС на Лемана Про»',
  query_hired:'AI находит частников по статусу, проектам, кто на линии; считает выполненные маршруты. Примеры: «Сколько частников на линии?», «Кто возит Магнит?», «Договоры, что скоро истекают»',
  query_stores:'AI смотрит магазины: маршруты сегодня/за месяц, закреплённые свои/частники, «в срок %». Примеры: «Маршруты по магазинам сегодня», «Какие точки на Озоне?»',
  query_candidates:'AI работает с кадрами: кандидаты по проектам и статусам, даты выхода. Примеры: «Сколько кандидатов на Лемана Про?», «Кто оформляется на этой неделе?»',
  get_stats:'AI достаёт метрики: маршрутов сегодня, на линии свои/частники, закрытые маршруты за 30 дней, разбивка по проектам, состояние парка. Примеры: «Сколько маршрутов сегодня?», «Выполнение плана за месяц»',
  send_report:'AI ставит отчёт в очередь на отправку руководству в Telegram (как в ОБЕ2). Примеры: «Отправь сводный отчёт в ТГ», «Пришли отчёт по частникам»'
};
function execTool(name, input){
  const D=GFD;
  if(name==='query_own_fleet'){
    let r=[...D.own];
    if(input.status&&input.status!=='all') r=r.filter(v=>v.status===input.status);
    if(input.kind) r=r.filter(v=>v.kind===input.kind);
    if(input.project) r=r.filter(v=>(v.project||'').toLowerCase().includes(input.project.toLowerCase()));
    return {count:r.length, on_line:r.filter(v=>v.status==='На линии').length,
      vehicles:r.slice(0,12).map(v=>({plate:v.plate,brand:v.brand,kind:v.kind,project:v.project,status:v.status,atp:v.atp}))};
  }
  if(name==='query_hired'){
    let r=[...D.hired];
    if(input.status&&input.status!=='all') r=r.filter(h=>h.status===input.status);
    if(typeof input.on_line==='boolean') r=r.filter(h=>!!h.onLine===input.on_line);
    if(input.project) r=r.filter(h=>(h.projects||[]).some(p=>p.toLowerCase().includes(input.project.toLowerCase())));
    return {count:r.length, on_line:r.filter(h=>h.onLine).length, total_routes_done:r.reduce((s,h)=>s+(h.routesDone||0),0),
      contractors:r.slice(0,12).map(h=>({plate:h.plate,contractor:h.contractor,registered:h.registered,routes_done:h.routesDone,projects:h.projects,status:h.status,on_line:h.onLine}))};
  }
  if(name==='query_stores'){
    let r=[...D.stores];
    if(input.project) r=r.filter(s=>(s.project||'').toLowerCase().includes(input.project.toLowerCase()));
    if(input.status&&input.status!=='all') r=r.filter(s=>s.status===input.status);
    return {count:r.length, routes_today_total:r.reduce((s,x)=>s+(x.routesToday||0),0),
      stores:r.slice(0,12).map(s=>({id:s.id,name:s.name,project:s.project,routes_today:s.routesToday,routes_month:s.routesMonth,own_cars:s.ownCars,hired_cars:s.hiredCars,on_time_pct:s.onTime,status:s.status}))};
  }
  if(name==='query_candidates'){
    let r=[...D.candidates];
    if(input.project) r=r.filter(c=>(c.project||'').toLowerCase().includes(input.project.toLowerCase()));
    if(input.status) r=r.filter(c=>c.status===input.status);
    return {count:r.length, hired:r.filter(c=>c.status==='принят').length,
      candidates:r.slice(0,12).map(c=>({name:c.name,project:c.project,position:c.position,applied:c.applied,start_day:c.startDay,status:c.status,source:c.source}))};
  }
  if(name==='get_stats'){
    const own=D.own, hired=D.hired, routes=D.routes, stats=D.stats;
    const ownOn=own.filter(v=>v.status==='На линии').length;
    const hiredOn=hired.filter(h=>h.onLine).length;
    const routesToday=routes.length?routes[routes.length-1].routes:0;
    const closed=stats.reduce((a,r)=>a+r.closed,0), planned=stats.reduce((a,r)=>a+r.planned,0);
    const PROJ=['Лемана Про','Магнит','Х5 Retail','Озон','ВкусВилл','Самокат'];
    const M={
      routes_today:{value:routesToday, unit:'маршрутов'},
      on_line_total:{value:ownOn+hiredOn, own:ownOn, hired:hiredOn},
      on_line_own:{value:ownOn, of_total:own.length},
      on_line_hired:{value:hiredOn, of_total:hired.length},
      closed_routes_30d:{value:closed, planned:planned, completion_pct:planned?Math.round(closed/planned*100):0},
      by_project_today: PROJ.map(p=>({project:p, own:own.filter(v=>v.status==='На линии'&&v.project===p).length, hired:hired.filter(h=>h.onLine&&(h.projects||[]).includes(p)).length})),
      fleet_condition:{on_line:ownOn, repair:own.filter(v=>v.status==='Ремонт'||v.status==='Капремонт').length, reserve:own.filter(v=>v.status==='Резерв').length, total:own.length}
    };
    return M[input.metric]||{error:'unknown metric'};
  }
  if(name==='send_report'){
    return {status:'queued', report:input.report||'сводный', channel:input.channel||'telegram',
      recipient:'@otchetRZ_bot · ЛС руководителя', eta:'1-2 минуты',
      note:'Отправка в Telegram настраивается через VPS + Xray-прокси, как в ОБЕ2.', report_id:'RPT-'+Math.floor(Math.random()*99999)};
  }
  return {error:'unknown tool: '+name};
}
/* call Claude with tools (non-streaming for simplicity in tool loop) */
async function callClaudeWithTools({messages, system, tools, model='claude-sonnet-5', max_tokens=2000}){
  // Ключ — на сервере (env Vercel). Браузер ходит через свой прокси /api/ai-chat.
  const r = await fetch('/api/ai-chat', {
    method:'POST',
    headers:{'content-type':'application/json'},
    body: JSON.stringify({model, max_tokens, system, messages, tools})
  });
  if(!r.ok){
    const err = await r.text();
    throw new Error('claude ' + r.status + ' · ' + err.slice(0,200));
  }
  return r.json();
}

/* run agent loop: keep calling Claude until no more tool_use */
async function runAgent({prompt, history, onEvent, onError}){
  history.push({role:'user', content: prompt});
  onEvent({type:'user', text: prompt});
  let safetyMax = 6;
  while(safetyMax-- > 0){
    onEvent({type:'thinking'});
    let response;
    try{
      response = await callClaudeWithTools({messages: history, system: SYSTEM_ASSISTANT, tools: TOOLS});
    }catch(err){
      onError(err.message);
      return;
    }
    onEvent({type:'thinking_done'});
    history.push({role:'assistant', content: response.content});
    // process content blocks
    for(const block of response.content){
      if(block.type === 'text' && block.text){
        onEvent({type:'text', text: block.text});
      } else if(block.type === 'tool_use'){
        onEvent({type:'tool_start', id: block.id, name: block.name, input: block.input});
        const result = execTool(block.name, block.input);
        onEvent({type:'tool_end', id: block.id, name: block.name, output: result});
      }
    }
    if(response.stop_reason !== 'tool_use'){
      onEvent({type:'done'});
      return;
    }
    // send tool results
    const toolUses = response.content.filter(b => b.type === 'tool_use');
    history.push({
      role: 'user',
      content: toolUses.map(tu => ({
        type: 'tool_result',
        tool_use_id: tu.id,
        content: JSON.stringify(execTool(tu.name, tu.input))
      }))
    });
  }
  onError('Превышен лимит вызовов tools (6)');
}

/* Demo mode: fake scripted agent runs */
const DEMO_SCRIPTS = {
  online: {text_pre:'Сейчас посмотрю, сколько ТС на линии.', tools:[{name:'get_stats',input:{metric:'on_line_total'},delay:450},{name:'get_stats',input:{metric:'by_project_today'},delay:500}], text_post:'Готово — сводка на линии в карточках выше: свои + частники и разбивка по проектам. Нужно — выгружу в отчёт или отправлю в Telegram.'},
  repair: {text_pre:'Проверю собственный парк в ремонте.', tools:[{name:'query_own_fleet',input:{status:'Ремонт'},delay:500}], text_post:'Показал ТС в ремонте (карточка выше) — по каждой видно проект и АТП. Могу добавить капремонт и резерв.'},
  candidates: {text_pre:'Смотрю кандидатов на Лемана Про.', tools:[{name:'query_candidates',input:{project:'Лемана Про'},delay:550}], text_post:'Кандидаты на Лемана Про — в карточке выше, с датами выхода и статусом воронки. Могу отфильтровать только оформляющихся.'},
  stores: {text_pre:'Проверю магазины и выполнение плана.', tools:[{name:'query_stores',input:{},delay:500},{name:'get_stats',input:{metric:'closed_routes_30d'},delay:450}], text_post:'Данные по магазинам и выполнению плана за 30 дней — выше. Точки ниже 90% стоит взять на контроль.'},
  report: {text_pre:'Подготовлю сводный отчёт и поставлю на отправку в Telegram.', tools:[{name:'get_stats',input:{metric:'on_line_total'},delay:400},{name:'send_report',input:{report:'сводный',channel:'telegram'},delay:700}], text_post:'Сводный отчёт поставлен в очередь на отправку в Telegram руководству. Реальная отправка подключается через VPS + Xray-прокси, как в ОБЕ2.'},
  default: {text_pre:'Сейчас разберусь.', tools:[{name:'get_stats',input:{metric:'routes_today'},delay:450}], text_post:'Готово — ключевая цифра в карточке выше. Могу разложить по проектам, магазинам или парку.'}
};

function pickDemoScript(prompt){
  const p=(prompt||'').toLowerCase();
  if(p.includes('на линии')||p.includes('линии')||p.includes('свои и частник')) return DEMO_SCRIPTS.online;
  if(p.includes('ремонт')||p.includes('капремонт')||p.includes('сломан')) return DEMO_SCRIPTS.repair;
  if(p.includes('кандидат')||p.includes('кадр')||p.includes('лемана')||p.includes('выход')) return DEMO_SCRIPTS.candidates;
  if(p.includes('магазин')||p.includes('план')||p.includes('в срок')||p.includes('точк')) return DEMO_SCRIPTS.stores;
  if(p.includes('отчёт')||p.includes('отчет')||p.includes('telegram')||p.includes('тг')||p.includes('отправ')) return DEMO_SCRIPTS.report;
  return DEMO_SCRIPTS.default;
}
async function* fakeText(text, perCh=8){
  const chunks = text.match(/[\S]+\s*|\s+/g) || [text];
  for(const c of chunks){ yield c; await new Promise(r=>setTimeout(r, perCh * (c.length + Math.random()*6))); }
}

async function runDemoAgent({prompt, onEvent}){
  onEvent({type:'user', text: prompt});
  const script = pickDemoScript(prompt);
  // pre-text streamed
  onEvent({type:'thinking'});
  await new Promise(r=>setTimeout(r, 300));
  onEvent({type:'thinking_done'});
  let preAcc = '';
  for await(const chunk of fakeText(script.text_pre, 10)){
    preAcc += chunk;
    onEvent({type:'text_stream', text: preAcc});
  }
  // tools
  for(const t of script.tools){
    const id = 'demo-' + Math.random().toString(36).slice(2,8);
    onEvent({type:'tool_start', id, name:t.name, input:t.input});
    await new Promise(r=>setTimeout(r, t.delay));
    onEvent({type:'tool_end', id, name:t.name, output: execTool(t.name, t.input)});
  }
  // post-text streamed
  await new Promise(r=>setTimeout(r, 300));
  let postAcc = '';
  for await(const chunk of fakeText(script.text_post, 8)){
    postAcc += chunk;
    onEvent({type:'text_stream', text: postAcc});
  }
  onEvent({type:'done'});
}

/* ----------------- ASSISTANT CHAT PAGE ----------------- */
const SUGGESTIONS = [
  {label:'Сколько ТС на линии сегодня — свои и частники?', prompt:'Сколько ТС на линии сегодня — свои и частники, и разбивка по проектам?'},
  {label:'Покажи собственный парк в ремонте', prompt:'Покажи собственные ТС в ремонте и капремонте'},
  {label:'Сколько кандидатов на Лемана Про и когда выходят?', prompt:'Сколько кандидатов на Лемана Про и какие даты выхода?'},
  {label:'Какие магазины ниже плана?', prompt:'Покажи магазины и выполнение плана за 30 дней — где ниже 90%?'},
  {label:'Сколько частников на линии и кто возит Магнит?', prompt:'Сколько частников на линии и кто из них возит Магнит?'},
  {label:'Подготовь сводный отчёт и отправь в Telegram', prompt:'Подготовь сводный отчёт по автопарку и отправь в Telegram руководству'},
];
function ToolCallCard({call}){
  const [open, setOpen] = useState(false);
  const inputStr = JSON.stringify(call.input, null, 2);
  const inputCompact = Object.entries(call.input).map(([k,v]) => `${k}=${JSON.stringify(v)}`).join(', ');
  return (
    <div className="tool-call">
      <div className="head">
        <span className="nm">{TOOL_LABELS[call.name]||call.name}<i className="en">{call.name}</i></span>
        <span className={'status ' + (call.output ? 'done' : 'running')}>
          {call.output ? '✓ ' : <span className="pulse"></span>}
          {call.output ? 'done' : 'running'}
        </span>
      </div>
      <div className="input">
        <b>input:</b> {inputCompact || '{}'}
      </div>
      {call.output && (
        <div className="output">
          <pre>{renderToolOutput(call.name, call.output)}</pre>
        </div>
      )}
    </div>
  );
}

function renderToolOutput(name, out){
  if(out.error) return '⚠ ' + out.error;
  if(name === 'query_own_fleet'){
    return `${out.count} ТС · на линии ${out.on_line}\n` + (out.vehicles||[]).slice(0,6).map(v=>`  • ${v.plate} · ${v.brand} · ${v.kind} · ${v.project} · ${v.status}`).join('\n');
  }
  if(name === 'query_hired'){
    return `${out.count} частников · на линии ${out.on_line} · маршрутов всего ${out.total_routes_done}\n` + (out.contractors||[]).slice(0,6).map(h=>`  • ${h.plate} · ${h.contractor} · ${h.routes_done} маршр. · ${(h.projects||[]).join(', ')} · ${h.on_line?'на линии':'—'}`).join('\n');
  }
  if(name === 'query_stores'){
    return `${out.count} магазинов · маршрутов сегодня ${out.routes_today_total}\n` + (out.stores||[]).slice(0,6).map(s=>`  • ${s.name} · сегодня ${s.routes_today} · свои ${s.own_cars}/частн. ${s.hired_cars} · в срок ${s.on_time_pct}%`).join('\n');
  }
  if(name === 'query_candidates'){
    return `${out.count} кандидатов · принято ${out.hired}\n` + (out.candidates||[]).slice(0,6).map(c=>`  • ${c.name} · ${c.project} · ${c.position} · выход ${c.start_day} · ${c.status}`).join('\n');
  }
  if(name === 'get_stats'){
    if(Array.isArray(out)) return out.map(r=>`  • ${r.project}: свои ${r.own} / частники ${r.hired}`).join('\n');
    if(typeof out==='object') return Object.entries(out).map(([k,v])=>`  ${k}: ${typeof v==='object'?JSON.stringify(v):v}`).join('\n');
    return String(out);
  }
  if(name === 'send_report'){
    return `► статус: ${out.status}\n► отчёт: ${out.report}\n► канал: ${out.channel} (${out.recipient})\n► ETA: ${out.eta}\n► id: ${out.report_id}\n► ${out.note}`;
  }
  return JSON.stringify(out, null, 2).slice(0, 500);
}
function AssistantChat(){
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const historyRef = useRef([]);
  const bodyRef = useRef(null);

  useEffect(() => {
    if(bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => { loadGFD(); }, []);

  function appendItem(item){
    setMessages(m => [...m, item]);
  }
  function updateLast(updater){
    setMessages(m => {
      const next = [...m];
      next[next.length-1] = updater(next[next.length-1]);
      return next;
    });
  }
  function updateToolById(id, updater){
    setMessages(m => m.map(item => item.kind === 'tool' && item.id === id ? updater(item) : item));
  }

  async function send(text){
    if(!text.trim() || busy) return;
    setBusy(true);
    setDraft('');
    appendItem({kind:'user', text});

    if(!GFD.own.length) await loadGFD();
    const isLive = true; // ключ на сервере (env Vercel) — агент всегда работает вживую

    const onEvent = (e) => {
      if(e.type === 'user') return;
      if(e.type === 'thinking'){
        // could show typing
      }
      if(e.type === 'thinking_done'){
        // noop
      }
      if(e.type === 'text'){
        appendItem({kind:'bot', text: e.text});
      }
      if(e.type === 'text_stream'){
        // accumulating stream (demo mode)
        setMessages(m => {
          const last = m[m.length-1];
          if(last && last.kind === 'bot-stream'){
            return [...m.slice(0,-1), {...last, text: e.text}];
          }
          return [...m, {kind:'bot-stream', text: e.text}];
        });
      }
      if(e.type === 'tool_start'){
        appendItem({kind:'tool', id:e.id, name:e.name, input:e.input, output:null});
      }
      if(e.type === 'tool_end'){
        updateToolById(e.id, t => ({...t, output: e.output}));
      }
      if(e.type === 'done'){
        // finalize bot-stream into bot
        setMessages(m => m.map(item => item.kind === 'bot-stream' ? {kind:'bot', text:item.text} : item));
        setBusy(false);
      }
    };
    const onError = (msg) => {
      appendItem({kind:'bot', text:'⚠ Ошибка: ' + msg + '\n\nПереключаюсь на demo-режим.'});
      runDemoAgent({prompt:text, onEvent}).finally(()=>setBusy(false));
    };

    if(isLive){
      try{
        await runAgent({prompt: text, history: historyRef.current, onEvent, onError});
      }catch(err){
        onError(err.message);
      }
    } else {
      await runDemoAgent({prompt: text, onEvent});
    }
  }

  return (
    <Fragment>
      <div className="page-head">
        <div>
          <h1>AI агент</h1>
          <div className="sub">► claude sonnet 5 · 6 инструментов · работает с данными автопарка</div>
        </div>
        <div className="actions">
          <button onClick={()=>{setMessages([]); historyRef.current=[];}}>новый чат</button>
        </div>
      </div>

      <div className="asst-host">
        <div className="asst-main">
          <div className="asst-body" ref={bodyRef}>
            {messages.length === 0 && (
              <div className="asst-greeting">
                <h4>Чем помочь?</h4>
                <p>Я работаю с системой учёта автопарка: смотрю собственный парк и частников, магазины и маршруты, статистику и кадры; считаю метрики; готовлю отчёты и ставлю их на отправку в Telegram.</p>
                <p style={{marginTop:8}}>Все вызовы происходят через <code>tool use</code> — увидите карточки запросов с входными данными и результатами прямо в чате. Работает вживую: ключ Claude подключён на сервере.</p>
              </div>
            )}
            {messages.map((m, i) => {
              if(m.kind === 'user') return <div key={i} className="asst-msg user">{m.text}</div>;
              if(m.kind === 'bot' || m.kind === 'bot-stream') return (
                <div key={i} className="asst-msg bot">
                  <div className="meta">claude sonnet 5 {m.kind === 'bot-stream' ? '· streaming' : ''}</div>
                  <div className="body">{m.text}</div>
                </div>
              );
              if(m.kind === 'tool') return <ToolCallCard key={i} call={m}/>;
              return null;
            })}
            {busy && messages.length > 0 && messages[messages.length-1].kind !== 'bot-stream' && (
              <div className="typing"><span/><span/><span/></div>
            )}
          </div>
          <form className="asst-input" onSubmit={e=>{e.preventDefault(); send(draft);}}>
            <textarea
              value={draft}
              onChange={e=>setDraft(e.target.value)}
              placeholder="Спросите про автопарк — парк, частники, магазины, маршруты, кадры. Я подберу инструменты сам."
              onKeyDown={e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send(draft); } }}
              rows={2}
              disabled={busy}
            />
            <button type="submit" className="primary" disabled={busy || !draft.trim()}>{busy ? '…' : 'отправить'}</button>
          </form>
        </div>

        <div className="asst-side">
          <div className="card">
            <div className="h"><div className="t">Подсказки</div></div>
            <div className="b">
              <div className="asst-suggest">
                {SUGGESTIONS.map((s,i) => (
                  <button key={i} className="sg" onClick={()=>send(s.prompt)} disabled={busy}>{s.label}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="h"><div className="t">Доступные инструменты</div><div className="m">{TOOLS.length}</div></div>
            <div className="b flush">
              <div className="tool-list">
                {TOOLS.map((t,i) => <details key={i} className="t-detail"><summary className="t">{TOOL_LABELS[t.name]||t.name}</summary><div className="t-desc">{TOOL_DESCRIPTIONS[t.name]||""}</div></details>)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
}

/* ============================================================ */
/* APP                                                          */
/* ============================================================ */
function Reports(){
  const REP=[
    {key:'ktg', t:'КТГ собственного парка', d:'коэф. тех. готовности · сегодня / вчера / среднее / за период'},
    {key:'own', t:'Собственный автопарк', d:'ТС · статусы, проекты, пробег, АТП'},
    {key:'hired', t:'Привлечённый парк', d:'частники · регистрация, маршруты, проекты'},
    {key:'stores', t:'Магазины', d:'точки · маршруты, транспорт, «в срок %»'},
    {key:'candidates', t:'Кадры', d:'кандидаты · проекты, даты выхода, статусы'},
    {key:'stats', t:'Статистика маршрутов', d:'закрытые маршруты по магазинам · план'},
    {key:'summary', t:'Сводный отчёт', d:'ключевые показатели автопарка'},
  ];
  const [status,setStatus]=useState({});
  const [mode,setMode]=useState('today');
  const [date,setDate]=useState('2026-09-23');
  const [from,setFrom]=useState('2026-08-25');
  const [to,setTo]=useState('2026-09-23');
  const opts=()=>({mode,date,from,to});
  const periodLabel=()=>({today:'сегодня',yesterday:'вчера',monthavg:'среднее за 30 дней',date:fmtRu(date),range:fmtRu(from)+'–'+fmtRu(to)})[mode];

  const dlKtg=async()=>{
    const d=(await (await fetch('/data/own-ktg.json?t='+Date.now())).json()).daily||[];
    const head=['Дата','КТГ %','Исправны','Всего','В ремонте'];
    let sel=[];
    if(mode==='today') sel=d.slice(-1);
    else if(mode==='yesterday') sel=d.slice(-2,-1);
    else if(mode==='date') sel=d.filter(x=>x.date===date);
    else if(mode==='range') sel=d.filter(x=>x.date>=from&&x.date<=to);
    else if(mode==='monthavg'){ const m=d.slice(-30); const avg=Math.round(m.reduce((a,x)=>a+x.ktg,0)/(m.length||1)*10)/10; sel=[{date:'среднее 30 дн',ktg:avg,ready:'',total:'',repair:''}]; }
    const lines=[('КТГ собственного парка · '+periodLabel()),head.join(';'),...sel.map(x=>[x.date.length===10?fmtRu(x.date):x.date,x.ktg,x.ready,x.total,x.repair].join(';'))];
    return '﻿'+lines.join('\r\n');
  };
  const dl=async(r)=>{
    try{
      let text;
      if(r.key==='ktg'){ text=await dlKtg(); }
      else if(['own','hired','stores','candidates'].includes(r.key)){ text=await (await fetch('/data/'+({own:'own-fleet',hired:'hired-fleet',stores:'stores',candidates:'candidates'})[r.key]+'.csv?t='+Date.now())).text(); }
      else if(r.key==='stats'){
        const rows=((await (await fetch('/data/stats.json?t='+Date.now())).json()).rows)||[];
        const stores=[...new Set(rows.map(x=>x.store))];
        const agg=stores.map(s=>{const rs=rows.filter(x=>x.store===s);const c=rs.reduce((a,x)=>a+x.closed,0),p=rs.reduce((a,x)=>a+x.planned,0);return [s,rs[0]?rs[0].project:'',c,p,p?Math.round(c/p*100):0,rs.length?Math.round(rs.reduce((a,x)=>a+x.onTime,0)/rs.length):0];});
        text='﻿'+[['Магазин','Проект','Закрыто','План','Выполнение %','В срок %'].join(';'),...agg.map(x=>x.join(';'))].join('\r\n');
      } else {
        const [own,hired,stores,routes]=await Promise.all(['/data/own-fleet.json','/data/hired-fleet.json','/data/stores.json','/data/routes.json'].map(u=>fetch(u+'?t='+Date.now()).then(x=>x.json())));
        const ownOn=own.filter(v=>v.status==='На линии').length, hiredOn=hired.filter(h=>h.onLine).length;
        const rt=(routes.daily||[]).length?routes.daily[routes.daily.length-1].routes:0;
        text='﻿'+[['Показатель','Значение'].join(';'),['Маршрутов сегодня',rt].join(';'),['ТС на линии (всего)',ownOn+hiredOn].join(';'),['Свои на линии',ownOn].join(';'),['Частники на линии',hiredOn].join(';'),['Магазинов',stores.length].join(';')].join('\r\n');
      }
      const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));
      a.download=r.key+'_'+new Date().toISOString().slice(0,10)+'.csv';document.body.appendChild(a);a.click();a.remove();
    }catch(e){}
  };
  const sendTG=async(r)=>{
    setStatus(s=>({...s,[r.key]:'…'}));
    try{
      const res=await fetch('/api/send-report',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({report:r.key,...opts()})});
      const out=await res.json();
      setStatus(s=>({...s,[r.key]: out.ok ? '✓ отправлено' : ('⚠ '+(out.error||'ошибка'))}));
    }catch(e){ setStatus(s=>({...s,[r.key]:'⚠ сеть'})); }
    setTimeout(()=>setStatus(s=>({...s,[r.key]:undefined})),5000);
  };
  const MB=(id,txt)=>(<button className={mode===id?'primary':''} onClick={()=>setMode(id)}>{txt}</button>);
  return (
    <Fragment>
      <div className="page-head">
        <div>
          <h1>Отчёты</h1>
          <div className="sub">► выгрузки и отправка в Telegram (@gfd_otchet_bot) · выбор периода</div>
        </div>
      </div>

      <div className="card">
        <div className="h"><div className="t">Период отчётов</div><div className="m">применяется ко всем</div></div>
        <div className="b">
          <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
            {MB('today','сегодня')}{MB('yesterday','вчера')}{MB('monthavg','среднее за месяц')}{MB('date','дата')}{MB('range','период')}
            {mode==='date' && <input type="date" value={date} min="2026-06-26" max="2026-09-23" onChange={e=>setDate(e.target.value)} style={DINP}/>}
            {mode==='range' && <span style={{display:'flex',gap:6,alignItems:'center',color:'var(--cream-3)',fontSize:12}}>с <input type="date" value={from} min="2026-06-26" max="2026-09-23" onChange={e=>setFrom(e.target.value)} style={DINP}/> по <input type="date" value={to} min="2026-06-26" max="2026-09-23" onChange={e=>setTo(e.target.value)} style={DINP}/></span>}
            <span className="m" style={{marginLeft:'auto'}}>выбрано: {periodLabel()}</span>
          </div>
        </div>
      </div>

      <div style={{height:14}}/>
      <div className="card">
        <div className="h"><div className="t">Доступные отчёты</div><div className="m">CSV · UTF-8 · период: {periodLabel()}</div></div>
        <div className="b flush">
          {REP.map((r,i)=>(
            <div key={i} className="sync-row" style={{borderBottom:i<REP.length-1?'1px solid var(--line)':'none'}}>
              <div className="ico">{r.key==='ktg'?'КТГ':'CSV'}</div>
              <div><div className="name">{r.t}</div><div className="desc">{r.d}</div></div>
              <div></div>
              <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',justifyContent:'flex-end'}}>
                {status[r.key] && <span style={{fontSize:12,color:status[r.key][0]==='✓'?'var(--green)':status[r.key]==='…'?'var(--cream-3)':'var(--warn)'}}>{status[r.key]}</span>}
                <button className="primary" onClick={()=>dl(r)}>↓ Скачать</button>
                <button onClick={()=>sendTG(r)} disabled={status[r.key]==='…'}>✈ В Telegram</button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </Fragment>
  );
}

function App(){
  const [page, setPageRaw] = useState('dash');
  const [navOpen, setNavOpen] = useState(false);
  const [mode] = useState(true); // ключ Claude на сервере — агент всегда подключён
  const setPage = (id) => { setPageRaw(id); setNavOpen(false); }; // переход закрывает мобильное меню

  const CRUMB = {
    dash: ['ГФД CRM', 'Главный дашборд'],
    asst: ['ГФД CRM', 'AI агент'],
    book: ['ГФД CRM', 'Привлечённый парк'],
    fleet: ['ГФД CRM', 'Собственный автопарк'],
    convo: ['ГФД CRM', 'Кадры'],
    cust: ['ГФД CRM', 'Магазины'],
    sync: ['ГФД CRM', 'Статистика'],
    reports: ['ГФД CRM', 'Отчёты'],
    sett: ['ГФД CRM', 'Настройки'],
  };
  const ACTIONS = {};

  return (
    <div className="app">
      <div className={'nav-overlay'+(navOpen?' open':'')} onClick={()=>setNavOpen(false)}></div>
      <Sidebar page={page} setPage={setPage} mode={mode} open={navOpen} />
      <div className="main">
        <Topbar crumb={CRUMB[page]} mode={mode} actions={ACTIONS[page]} onMenu={()=>setNavOpen(o=>!o)} />
        <div className="content">
          {page === 'dash' && <Dashboard setPage={setPage}/>}
          {page === 'asst' && <AssistantChat/>}
          {page === 'book' && <Bookings/>}
          {page === 'fleet' && <Fleet/>}
          {page === 'convo' && <Conversations/>}
          {page === 'cust' && <Customers/>}
          {page === 'sync' && <SyncPage/>}
          {page === 'sett' && <Settings/>}
          {page === 'reports' && <Reports/>}
        </div>
      </div>
    </div>
  );
}


function Login({onOk}){
  const [u,setU]=useState(''),[p,setP]=useState(''),[er,setEr]=useState(false);
  const go=()=>{ if(u.trim().toLowerCase()==='admin' && p==='gfd2026'){ sessionStorage.setItem('gfd_auth','1'); onOk(); } else setEr(true); };
  const onKey=e=>{ if(e.key==='Enter') go(); };
  const S={
    wrap:{minHeight:'100vh',display:'grid',placeItems:'center',background:'#0B1F33',fontFamily:"'Manrope',sans-serif"},
    card:{width:340,background:'#0E2841',border:'1px solid rgba(245,239,230,.10)',borderRadius:16,padding:'34px 30px',boxShadow:'0 24px 70px -24px rgba(0,0,0,.75)'},
    logo:{width:52,height:52,borderRadius:13,background:'linear-gradient(135deg,#FF6B47,#D74A28)',display:'grid',placeItems:'center',color:'#fff',fontWeight:800,fontSize:24,margin:'0 auto 18px'},
    h:{textAlign:'center',margin:'0 0 4px',fontSize:20,fontWeight:700,color:'#F5EFE6'},
    sub:{textAlign:'center',margin:'0 0 24px',fontSize:12.5,color:'#8B8377'},
    inp:{width:'100%',boxSizing:'border-box',padding:'12px 14px',marginBottom:12,borderRadius:10,border:'1px solid rgba(245,239,230,.14)',background:'rgba(245,239,230,.05)',color:'#F5EFE6',fontSize:14,outline:'none',fontFamily:'inherit'},
    btn:{width:'100%',padding:'13px',borderRadius:10,border:0,background:'linear-gradient(100deg,#FF6B47,#D74A28)',color:'#fff',fontWeight:700,fontSize:14,cursor:'pointer',fontFamily:'inherit',marginTop:4},
    err:{color:'#f87171',fontSize:12.5,textAlign:'center',marginTop:12}
  };
  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.logo}>Г</div>
        <h2 style={S.h}>ГФД Автопарк</h2>
        <div style={S.sub}>Вход в систему учёта</div>
        <input style={S.inp} placeholder="Логин" value={u} onChange={e=>setU(e.target.value)} onKeyDown={onKey} autoFocus/>
        <input style={S.inp} type="password" placeholder="Пароль" value={p} onChange={e=>setP(e.target.value)} onKeyDown={onKey}/>
        <button style={S.btn} onClick={go}>Войти</button>
        {er && <div style={S.err}>Неверный логин или пароль</div>}
      </div>
    </div>
  );
}

function Root(){
  const [authed,setAuthed]=useState(sessionStorage.getItem('gfd_auth')==='1');
  if(!authed) return <Login onOk={()=>setAuthed(true)}/>;
  return <App/>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root/>);
