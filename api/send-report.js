// Отправка отчёта ГФД в Telegram через @gfd_otchet_bot. ENV: TG_BOT_TOKEN, TG_CHAT_ID.
const BASE = 'https://gfd-avtopark.vercel.app';
const csv = rows => '﻿' + rows.map(r => r.join(';')).join('\r\n');
const getJSON = async p => (await fetch(BASE + p + '?t=' + Date.now())).json();
const ru = s => (s && s.length===10) ? s.slice(8,10)+'.'+s.slice(5,7)+'.'+s.slice(0,4) : s;
const periodLabel = o => ({today:'сегодня',yesterday:'вчера',monthavg:'среднее за 30 дней',date:ru(o.date),range:ru(o.from)+'–'+ru(o.to)})[o.mode||'today'] || 'сегодня';

async function buildKtg(o){
  const d = (await getJSON('/data/own-ktg.json')).daily || [];
  let sel=[], head=['Дата','КТГ %','Исправны','Всего','В ремонте'], note='';
  if(o.mode==='today') sel=d.slice(-1);
  else if(o.mode==='yesterday') sel=d.slice(-2,-1);
  else if(o.mode==='date') sel=d.filter(x=>x.date===o.date);
  else if(o.mode==='range') sel=d.filter(x=>x.date>=o.from&&x.date<=o.to);
  else if(o.mode==='monthavg'){ const m=d.slice(-30); const avg=Math.round(m.reduce((a,x)=>a+x.ktg,0)/(m.length||1)*10)/10; sel=[{date:'среднее 30 дн',ktg:avg,ready:'',total:'',repair:''}]; note='среднее '+avg+'%'; }
  const rows=[head, ...sel.map(x=>[ru(x.date)||x.date, x.ktg, x.ready, x.total, x.repair])];
  const val = note || (sel.length? ('КТГ '+sel[sel.length-1].ktg+'%') : 'нет данных');
  return {summary:`📉 КТГ собственного парка · ${periodLabel(o)}\n${val}`, file:'ГФД_КТГ.csv', csv:csv(rows)};
}

async function build(report, o){
  if(report==='ktg') return buildKtg(o);
  if(report==='own'){
    const d=await getJSON('/data/own-fleet.json');
    const on=d.filter(v=>v.status==='На линии').length, gaz=d.filter(v=>v.kind==='Газель').length, larg=d.filter(v=>v.kind==='Ларгус').length, rem=d.filter(v=>v.status==='Ремонт'||v.status==='Капремонт').length;
    const rows=[['Госномер','Марка','Тип','Класс','Проект','Статус','Готовность','Пробег','АТП','ДК до','ОСАГО до','Пропуск СК'],
      ...d.map(v=>[v.plate,v.brand,v.type,v.kind,v.project,v.status,v.ready?'исправна':'—',v.mileage,v.atp,v.dk||'',v.osago||'',v.sk||'нет'])];
    return {summary:`🚚 Собственный автопарк\nВсего: ${d.length} · на линии: ${on} · газели: ${gaz} · ларгусы: ${larg} · в ремонте: ${rem}`, file:'ГФД_собственный_парк.csv', csv:csv(rows)};
  }
  if(report==='hired'){
    const d=await getJSON('/data/hired-fleet.json');
    const on=d.filter(h=>h.onLine).length, act=d.filter(h=>h.status==='active').length, rt=d.reduce((s,h)=>s+(h.routesDone||0),0);
    const rows=[['Госномер','Контрагент','Телефон','Регистрация','Маршрутов','Проекты','Статус','На линии','Ставка'],
      ...d.map(h=>[h.plate,h.contractor,h.phone,h.registered,h.routesDone,(h.projects||[]).join(', '),h.status,h.onLine?'да':'нет',h.rate])];
    return {summary:`🤝 Привлечённый парк\nВсего: ${d.length} · на линии: ${on} · активных: ${act} · маршрутов: ${rt.toLocaleString('ru-RU')}`, file:'ГФД_привлечённый_парк.csv', csv:csv(rows)};
  }
  if(report==='stores'){
    const d=await getJSON('/data/stores.json');
    const act=d.filter(s=>s.status==='active').length, rT=d.reduce((a,s)=>a+(s.routesToday||0),0), ot=d.length?Math.round(d.reduce((a,s)=>a+(s.onTime||0),0)/d.length):0;
    const rows=[['ID','Магазин','Город','Проект','Маршр. сегодня','За месяц','Свои','Частники','В срок %','Статус'],
      ...d.map(s=>[s.id,s.name,s.city,s.project,s.routesToday,s.routesMonth,s.ownCars,s.hiredCars,s.onTime,s.status])];
    return {summary:`🏬 Магазины\nВсего: ${d.length} · работают: ${act} · маршрутов сегодня: ${rT} · в срок: ${ot}%`, file:'ГФД_магазины.csv', csv:csv(rows)};
  }
  if(report==='candidates'){
    const d=await getJSON('/data/candidates.json');
    const lem=d.filter(c=>c.project==='Лемана Про').length, hh=d.filter(c=>c.status==='принят').length;
    const rows=[['ФИО','Телефон','Проект','Должность','Заявка','Выход','Статус','Источник'],
      ...d.map(c=>[c.name,c.phone,c.project,c.position,c.applied,c.startDay,c.status,c.source])];
    return {summary:`👥 Кадры\nКандидатов: ${d.length} · на Лемана Про: ${lem} · принято: ${hh}`, file:'ГФД_кадры.csv', csv:csv(rows)};
  }
  if(report==='stats'){
    const d=(await getJSON('/data/stats.json')).rows||[];
    const stores=[...new Set(d.map(r=>r.store))];
    const closed=d.reduce((a,r)=>a+r.closed,0), planned=d.reduce((a,r)=>a+r.planned,0), compl=planned?Math.round(closed/planned*100):0;
    const agg=stores.map(s=>{const rs=d.filter(r=>r.store===s);const c=rs.reduce((a,r)=>a+r.closed,0),p=rs.reduce((a,r)=>a+r.planned,0);return [s,rs[0]?rs[0].project:'',c,p,p?Math.round(c/p*100):0,rs.length?Math.round(rs.reduce((a,r)=>a+r.onTime,0)/rs.length):0];});
    return {summary:`📊 Статистика маршрутов (30 дней)\nЗакрыто: ${closed.toLocaleString('ru-RU')} из ${planned.toLocaleString('ru-RU')} · план: ${compl}%`, file:'ГФД_статистика.csv', csv:csv([['Магазин','Проект','Закрыто','План','Выполнение %','В срок %'],...agg])};
  }
  // summary
  const [own,hired,stores,routes]=await Promise.all([getJSON('/data/own-fleet.json'),getJSON('/data/hired-fleet.json'),getJSON('/data/stores.json'),getJSON('/data/routes.json')]);
  const ownOn=own.filter(v=>v.status==='На линии').length, hiredOn=hired.filter(h=>h.onLine).length;
  const rt=(routes.daily||[]).length?routes.daily[routes.daily.length-1].routes:0;
  const rows=[['Показатель','Значение'],['Маршрутов сегодня',rt],['ТС на линии (всего)',ownOn+hiredOn],['Свои на линии',ownOn],['Частники на линии',hiredOn],['Свои в ремонте',own.filter(v=>v.status==='Ремонт'||v.status==='Капремонт').length],['Магазинов',stores.length]];
  return {summary:`📋 Сводный отчёт ГФД · ${new Date().toLocaleDateString('ru-RU')}\nМаршрутов сегодня: ${rt}\nНа линии: ${ownOn+hiredOn} (свои ${ownOn} + частники ${hiredOn})`, file:'ГФД_сводный.csv', csv:csv(rows)};
}

export default async function handler(req, res){
  if(req.method !== 'POST'){ res.status(405).json({error:'POST only'}); return; }
  const token=process.env.TG_BOT_TOKEN, chatId=process.env.TG_CHAT_ID;
  if(!token || !chatId){ res.status(500).json({error:'TG_BOT_TOKEN / TG_CHAT_ID не заданы'}); return; }
  try{
    const b=req.body||{};
    const { summary, file, csv:csvText } = await build(b.report||'summary', {mode:b.mode,date:b.date,from:b.from,to:b.to});
    const form=new FormData();
    form.append('chat_id', chatId);
    form.append('caption', summary);
    form.append('document', new Blob([csvText],{type:'text/csv'}), file);
    const tg=await fetch(`https://api.telegram.org/bot${token}/sendDocument`,{method:'POST',body:form});
    const out=await tg.json();
    if(!out.ok){ res.status(502).json({error:'telegram: '+(out.description||'unknown')}); return; }
    res.status(200).json({ok:true, sent:file});
  }catch(e){ res.status(500).json({error:String(e && e.message || e)}); }
}
