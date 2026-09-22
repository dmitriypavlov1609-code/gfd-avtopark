// Отправка отчёта ГФД в Telegram через бота @gfd_otchet_bot.
// ENV: TG_BOT_TOKEN, TG_CHAT_ID. Vercel-функции достигают api.telegram.org напрямую.
const BASE = 'https://gfd-avtopark.vercel.app';

function csv(rows){ return '﻿' + rows.map(r => r.join(';')).join('\r\n'); }
async function getJSON(p){ const r = await fetch(BASE + p + '?t=' + Date.now()); return r.json(); }

async function build(report){
  if(report === 'own'){
    const d = await getJSON('/data/own-fleet.json');
    const on = d.filter(v=>v.status==='На линии').length;
    const gaz = d.filter(v=>v.kind==='Газель').length, larg = d.filter(v=>v.kind==='Ларгус').length;
    const rem = d.filter(v=>v.status==='Ремонт'||v.status==='Капремонт').length;
    const rows = [['Госномер','Марка','Тип','Класс','Проект','Статус','Готовность','Пробег','АТП'],
      ...d.map(v=>[v.plate,v.brand,v.type,v.kind,v.project,v.status,v.ready?'исправна':'—',v.mileage,v.atp])];
    return {title:'Собственный автопарк', summary:`🚚 Собственный автопарк\nВсего: ${d.length} · на линии: ${on} · газели: ${gaz} · ларгусы: ${larg} · в ремонте: ${rem}`, file:'ГФД_собственный_парк.csv', csv:csv(rows)};
  }
  if(report === 'hired'){
    const d = await getJSON('/data/hired-fleet.json');
    const on = d.filter(h=>h.onLine).length, act = d.filter(h=>h.status==='active').length;
    const routes = d.reduce((s,h)=>s+(h.routesDone||0),0);
    const rows = [['Госномер','Контрагент','Телефон','Дата регистрации','Маршрутов выполнено','Проекты','Статус','На линии','Ставка'],
      ...d.map(h=>[h.plate,h.contractor,h.phone,h.registered,h.routesDone,(h.projects||[]).join(', '),h.status,h.onLine?'да':'нет',h.rate])];
    return {title:'Привлечённый парк', summary:`🤝 Привлечённый парк\nВсего частников: ${d.length} · на линии: ${on} · активных: ${act} · маршрутов всего: ${routes.toLocaleString('ru-RU')}`, file:'ГФД_привлечённый_парк.csv', csv:csv(rows)};
  }
  if(report === 'stores'){
    const d = await getJSON('/data/stores.json');
    const act = d.filter(s=>s.status==='active').length;
    const rToday = d.reduce((a,s)=>a+(s.routesToday||0),0);
    const avgOT = d.length?Math.round(d.reduce((a,s)=>a+(s.onTime||0),0)/d.length):0;
    const rows = [['ID','Магазин','Город','Адрес','Проект','Маршрутов сегодня','Маршрутов за месяц','Свои ТС','Частники','В срок %','Статус'],
      ...d.map(s=>[s.id,s.name,s.city,s.address,s.project,s.routesToday,s.routesMonth,s.ownCars,s.hiredCars,s.onTime,s.status])];
    return {title:'Магазины', summary:`🏬 Магазины\nВсего: ${d.length} · работают: ${act} · маршрутов сегодня: ${rToday} · в срок (ср.): ${avgOT}%`, file:'ГФД_магазины.csv', csv:csv(rows)};
  }
  if(report === 'candidates'){
    const d = await getJSON('/data/candidates.json');
    const lemana = d.filter(c=>c.project==='Лемана Про').length;
    const hired = d.filter(c=>c.status==='принят').length;
    const work = d.filter(c=>c.status==='собеседование'||c.status==='оформление').length;
    const rows = [['ФИО','Телефон','Проект','Должность','Дата заявки','Дата выхода','Статус','Источник'],
      ...d.map(c=>[c.name,c.phone,c.project,c.position,c.applied,c.startDay,c.status,c.source])];
    return {title:'Кадры', summary:`👥 Кадры\nКандидатов: ${d.length} · на Лемана Про: ${lemana} · принято: ${hired} · в работе: ${work}`, file:'ГФД_кадры.csv', csv:csv(rows)};
  }
  if(report === 'stats'){
    const d = (await getJSON('/data/stats.json')).rows || [];
    const stores = [...new Set(d.map(r=>r.store))];
    const closed = d.reduce((a,r)=>a+r.closed,0), planned = d.reduce((a,r)=>a+r.planned,0);
    const compl = planned?Math.round(closed/planned*100):0;
    const agg = stores.map(s=>{const rs=d.filter(r=>r.store===s);const c=rs.reduce((a,r)=>a+r.closed,0),p=rs.reduce((a,r)=>a+r.planned,0);return [s,rs[0]?rs[0].project:'',c,p,p?Math.round(c/p*100):0,rs.length?Math.round(rs.reduce((a,r)=>a+r.onTime,0)/rs.length):0];});
    const rows = [['Магазин','Проект','Закрыто маршрутов','Запланировано','Выполнение %','В срок %'], ...agg];
    return {title:'Статистика маршрутов', summary:`📊 Статистика маршрутов (30 дней)\nЗакрыто: ${closed.toLocaleString('ru-RU')} из ${planned.toLocaleString('ru-RU')} · выполнение плана: ${compl}%`, file:'ГФД_статистика_маршрутов.csv', csv:csv(rows)};
  }
  // сводный
  const [own,hired,stores,routes] = await Promise.all([getJSON('/data/own-fleet.json'),getJSON('/data/hired-fleet.json'),getJSON('/data/stores.json'),getJSON('/data/routes.json')]);
  const ownOn = own.filter(v=>v.status==='На линии').length, hiredOn = hired.filter(h=>h.onLine).length;
  const routesToday = (routes.daily||[]).length ? routes.daily[routes.daily.length-1].routes : 0;
  const rows = [['Показатель','Значение'],
    ['Маршрутов сегодня', routesToday],['ТС на линии (всего)', ownOn+hiredOn],['Свои на линии', ownOn],['Частники на линии', hiredOn],
    ['Свои в ремонте', own.filter(v=>v.status==='Ремонт'||v.status==='Капремонт').length],['Магазинов', stores.length]];
  const dt = new Date().toLocaleDateString('ru-RU');
  return {title:'Сводный отчёт', summary:`📋 Сводный отчёт ГФД · ${dt}\nМаршрутов сегодня: ${routesToday}\nНа линии: ${ownOn+hiredOn} (свои ${ownOn} + частники ${hiredOn})`, file:'ГФД_сводный.csv', csv:csv(rows)};
}

export default async function handler(req, res){
  if(req.method !== 'POST'){ res.status(405).json({error:'POST only'}); return; }
  const token = process.env.TG_BOT_TOKEN, chatId = process.env.TG_CHAT_ID;
  if(!token || !chatId){ res.status(500).json({error:'TG_BOT_TOKEN / TG_CHAT_ID не заданы в окружении'}); return; }
  try{
    const report = (req.body && req.body.report) || 'summary';
    const { summary, file, csv:csvText } = await build(report);
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('caption', summary);
    form.append('document', new Blob([csvText], {type:'text/csv'}), file);
    const tg = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {method:'POST', body:form});
    const out = await tg.json();
    if(!out.ok){ res.status(502).json({error:'telegram: ' + (out.description||'unknown')}); return; }
    res.status(200).json({ok:true, sent:file});
  }catch(e){ res.status(500).json({error:String(e && e.message || e)}); }
}
