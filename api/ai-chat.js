// Серверный прокси к Anthropic для AI-агента ГФД.
// Ключ живёт в env Vercel (ANTHROPIC_API_KEY) и НЕ виден в браузере — как в ОБЕ2.
export default async function handler(req, res){
  if(req.method !== 'POST'){ res.status(405).json({error:'POST only'}); return; }
  const key = process.env.ANTHROPIC_API_KEY;
  if(!key){ res.status(500).json({error:'ANTHROPIC_API_KEY не задан в окружении'}); return; }
  try{
    const { system, messages, tools, model, max_tokens } = req.body || {};
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{'x-api-key':key,'anthropic-version':'2023-06-01','content-type':'application/json'},
      body: JSON.stringify({ model: model || 'claude-sonnet-5', max_tokens: max_tokens || 2000, system, messages, tools })
    });
    const data = await r.json();
    if(!r.ok){ res.status(r.status).json({error:'claude ' + r.status, detail:data}); return; }
    res.status(200).json(data);
  }catch(e){ res.status(500).json({error:String(e && e.message || e)}); }
}
