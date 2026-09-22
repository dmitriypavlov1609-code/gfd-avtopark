// Прокси расписания отчётов: браузер (HTTPS) → эта функция → VPS-сервис (HTTP).
// Так обходим mixed-content (браузер не ходит на http-VPS напрямую).
// ENV: SCHED_URL (http://IP:PORT), SCHED_SECRET.
export default async function handler(req, res){
  const base = process.env.SCHED_URL, secret = process.env.SCHED_SECRET || '';
  if(!base){ res.status(500).json({error:'SCHED_URL не задан'}); return; }
  const headers = {'content-type':'application/json','x-sched-key':secret};
  try{
    if(req.method === 'GET'){
      const r = await fetch(base, {headers});
      const d = await r.json();
      res.status(200).json(d); return;
    }
    if(req.method === 'POST'){
      const r = await fetch(base, {method:'POST', headers, body: JSON.stringify(req.body||{})});
      const d = await r.json();
      res.status(r.ok?200:502).json(d); return;
    }
    res.status(405).json({error:'GET/POST only'});
  }catch(e){ res.status(502).json({error:'VPS недоступен: '+String(e && e.message || e)}); }
}
