
const {useState, useEffect, useRef, useMemo, Fragment} = React;
const KEY_STORAGE = 'aboba_claude_key';

/* ============================================================ */
/* DATA — реалистичные моковые                                 */
/* ============================================================ */

const FLEET = [
  {id:'V-001', model:'BMW Z4 sDrive20i', cat:'cabrio', plate:'BG 0421-XY', km:42830, status:'rented', next:'17·05', price:65},
  {id:'V-002', model:'Mini Cooper S Cabrio', cat:'cabrio', plate:'BG 1144-OG', km:38120, status:'avail', next:'—', price:58},
  {id:'V-003', model:'BMW i3', cat:'electric', plate:'BG 9087-AB', km:25400, status:'rented', next:'19·05', price:24},
  {id:'V-004', model:'BMW X5', cat:'suv', plate:'BG 5512-DK', km:67200, status:'rented', next:'22·05', price:90},
  {id:'V-005', model:'VW Touran', cat:'minivan', plate:'BG 3309-QM', km:81500, status:'avail', next:'—', price:38},
  {id:'V-006', model:'Skoda Karoq', cat:'suv', plate:'BG 7748-NS', km:54300, status:'maint', next:'service 16·05', price:34},
  {id:'V-007', model:'VW UP!', cat:'mini', plate:'BG 4421-AA', km:96400, status:'avail', next:'—', price:18},
  {id:'V-008', model:'Skoda Fabia', cat:'compact', plate:'BG 0091-VB', km:71200, status:'rented', next:'15·05', price:20},
  {id:'V-009', model:'Harley Sportster S', cat:'moto', plate:'BG MOT-12', km:18200, status:'avail', next:'—', price:95},
  {id:'V-010', model:'Piaggio MP3 400', cat:'moto', plate:'BG MOT-08', km:24800, status:'rented', next:'14·05', price:45},
  {id:'V-011', model:'BMW 320d', cat:'sedan', plate:'BG 2233-FF', km:52100, status:'avail', next:'—', price:39},
  {id:'V-012', model:'Hyundai Tucson', cat:'suv', plate:'BG 6677-SS', km:48900, status:'rented', next:'16·05', price:36},
  {id:'V-013', model:'Seat Ibiza', cat:'compact', plate:'BG 8800-PR', km:62400, status:'avail', next:'—', price:22},
  {id:'V-014', model:'BMW 1 Series', cat:'compact', plate:'BG 1212-LK', km:39800, status:'rented', next:'21·05', price:46},
  {id:'V-015', model:'Smart Fortwo Cabrio', cat:'mini', plate:'BG 4040-MN', km:34200, status:'avail', next:'—', price:30},
  {id:'V-016', model:'VW Transporter', cat:'van', plate:'BG 5555-TT', km:104800, status:'rented', next:'24·05', price:78},
  {id:'V-017', model:'Skoda Kamiq', cat:'compact', plate:'BG 9911-WX', km:28700, status:'avail', next:'—', price:32},
  {id:'V-018', model:'VW Sharan', cat:'minivan', plate:'BG 3434-DD', km:74500, status:'maint', next:'service 18·05', price:42},
  {id:'V-019', model:'Hyundai i20', cat:'compact', plate:'BG 7070-RR', km:58300, status:'avail', next:'—', price:20},
  {id:'V-020', model:'VW Passat B8', cat:'sedan', plate:'BG 1818-LL', km:81000, status:'rented', next:'13·05', price:48},
];

const BOOKINGS = [
  {id:'B-2026-1042', cust:'Иван П.', phone:'+7 925 ***-31-87', car:'BMW Z4 sDrive20i', from:'12·05·26', to:'17·05·26', status:'active', total:325, paid:325, ch:'whatsapp', lang:'ru', src:'IG DM'},
  {id:'B-2026-1041', cust:'Marko D.', phone:'+381 64 ***-22-04', car:'BMW i3', from:'12·05·26', to:'19·05·26', status:'active', total:168, paid:168, ch:'site', lang:'sr', src:'organic'},
  {id:'B-2026-1040', cust:'Анна К.', phone:'+7 916 ***-08-71', car:'VW Touran', from:'14·05·26', to:'21·05·26', status:'pending', total:266, paid:80, ch:'whatsapp', lang:'ru', src:'IG DM'},
  {id:'B-2026-1039', cust:'James W.', phone:'+44 7700 ***44', car:'BMW X5', from:'13·05·26', to:'22·05·26', status:'active', total:810, paid:810, ch:'tg', lang:'en', src:'Discover Cars'},
  {id:'B-2026-1038', cust:'Дмитрий В.', phone:'+7 968 ***-92-12', car:'Piaggio MP3 400', from:'11·05·26', to:'14·05·26', status:'active', total:135, paid:135, ch:'site', lang:'ru', src:'IG bio'},
  {id:'B-2026-1037', cust:'Stefan J.', phone:'+381 60 ***-71-49', car:'Skoda Fabia', from:'09·05·26', to:'15·05·26', status:'active', total:120, paid:120, ch:'site', lang:'sr', src:'Yandex Maps'},
  {id:'B-2026-1036', cust:'Сергей М.', phone:'+7 905 ***-04-19', car:'BMW 1 Series', from:'14·05·26', to:'21·05·26', status:'pending', total:322, paid:0, ch:'whatsapp', lang:'ru', src:'Hotel referral'},
  {id:'B-2026-1035', cust:'Mila R.', phone:'+381 65 ***-12-90', car:'VW Passat B8', from:'10·05·26', to:'13·05·26', status:'done', total:144, paid:144, ch:'tg', lang:'sr', src:'organic'},
  {id:'B-2026-1034', cust:'Игорь Л.', phone:'+7 902 ***-71-33', car:'BMW Z4 sDrive20i', from:'05·05·26', to:'09·05·26', status:'done', total:260, paid:260, ch:'whatsapp', lang:'ru', src:'IG DM'},
  {id:'B-2026-1033', cust:'Никита Б.', phone:'+7 925 ***-66-04', car:'Skoda Fabia', from:'08·05·26', to:'11·05·26', status:'cancelled', total:60, paid:0, ch:'site', lang:'ru', src:'organic'},
];

const CUSTOMERS = [
  {id:'C-1024', name:'Иван Платонов', phone:'+7 925 ***-31-87', lang:'ru', since:'2024·11', trips:7, spent:1820, cashback:182},
  {id:'C-1023', name:'Marko Đorđević', phone:'+381 64 ***-22-04', lang:'sr', since:'2024·07', trips:12, spent:3140, cashback:314},
  {id:'C-1022', name:'Анна Кравцова', phone:'+7 916 ***-08-71', lang:'ru', since:'2025·01', trips:4, spent:980, cashback:98},
  {id:'C-1021', name:'James Whittaker', phone:'+44 7700 ***44', lang:'en', since:'2025·03', trips:2, spent:1260, cashback:126},
  {id:'C-1020', name:'Дмитрий Воронов', phone:'+7 968 ***-92-12', lang:'ru', since:'2024·02', trips:9, spent:1810, cashback:181},
  {id:'C-1019', name:'Stefan Jovanović', phone:'+381 60 ***-71-49', lang:'sr', since:'2023·09', trips:18, spent:4290, cashback:429},
  {id:'C-1018', name:'Сергей Мирошин', phone:'+7 905 ***-04-19', lang:'ru', since:'2025·04', trips:1, spent:322, cashback:32},
  {id:'C-1017', name:'Mila Radović', phone:'+381 65 ***-12-90', lang:'sr', since:'2024·06', trips:6, spent:1480, cashback:148},
];

const CONVOS = [
  {id:'CV-1', name:'Иван Платонов', last:'Хорошо, тогда жду подтверждение на WhatsApp', time:'12:42', unread:0, ch:'whatsapp', lang:'ru', status:'ai'},
  {id:'CV-2', name:'Marko Đorđević', last:'Ok, dolazim u 14:30 na Square Nine', time:'12:18', unread:0, ch:'instagram', lang:'sr', status:'ai'},
  {id:'CV-3', name:'Анна Кравцова', last:'А можно с детским креслом?', time:'11:54', unread:2, ch:'whatsapp', lang:'ru', status:'human'},
  {id:'CV-4', name:'James Whittaker', last:'Thanks! See you on Thursday', time:'11:02', unread:0, ch:'telegram', lang:'en', status:'done'},
  {id:'CV-5', name:'Дмитрий Воронов', last:'Шлем какого размера? У меня L', time:'10:48', unread:1, ch:'whatsapp', lang:'ru', status:'ai'},
  {id:'CV-6', name:'Stefan Jovanović', last:'Treba mi auto za 3 nedelje, BMW po mogućnosti', time:'10:22', unread:0, ch:'telegram', lang:'sr', status:'ai'},
  {id:'CV-7', name:'Mila Radović', last:'Hvala, fakturu sam dobila', time:'09:55', unread:0, ch:'whatsapp', lang:'sr', status:'done'},
  {id:'CV-8', name:'+7 968 ***-44-21', last:'Здравствуйте, у вас есть Z4 на длинные?', time:'09:18', unread:3, ch:'instagram', lang:'ru', status:'human'},
  {id:'CV-9', name:'Сергей Мирошин', last:'Ок, прилечу 14 числа', time:'вчера', unread:0, ch:'whatsapp', lang:'ru', status:'done'},
  {id:'CV-10', name:'+44 7912 ***-09', last:'How do I extend my rental?', time:'вчера', unread:1, ch:'site-chat', lang:'en', status:'ai'},
];

const CONVO_MESSAGES = {
  'CV-1': [
    {who:'bot', meta:'AI помощник · ru', text:'Здравствуйте, Иван! Z4 sDrive20i на 12-17 мая — €260 за 4 дня + €40 cross-border Черногория. Подвезти на BEG или в отель?'},
    {who:'user', text:'В отель, Square Nine, около 14:30'},
    {who:'bot', meta:'AI помощник', text:'Зафиксировал: Z4, 12 мая, 14:30, Square Nine. Cashback 10% (€26) пойдёт на следующую поездку. Высылаю подтверждение?'},
    {who:'user', text:'Хорошо, тогда жду подтверждение на WhatsApp'},
  ],
  'CV-2': [
    {who:'bot', meta:'AI помощник · sr', text:'Marko, BMW i3 dostupan 12-19 maj. €168 ukupno (7 dana × €24), bez depozita. Cashback 10% (€16,80) na sledeću rezervaciju. Da potvrdim?'},
    {who:'user', text:'Da, ali treba mi i punjač na noć'},
    {who:'bot', meta:'AI помощник', text:'Mobilni 22 kW punjač — €8/dan. Ukupno €224. Predaja u Zemunu ili na aerodromu?'},
    {who:'user', text:'Ok, dolazim u 14:30 na Square Nine'},
  ],
  'CV-3': [
    {who:'bot', meta:'AI помощник · ru', text:'Анна, VW Touran на 14-21 мая — €266 за 7 дней. Семейная машина, 7 мест, багажник большой.'},
    {who:'user', text:'А можно с детским креслом?'},
  ],
  'CV-5': [
    {who:'bot', meta:'AI помощник · ru', text:'Дмитрий, Piaggio MP3 на выходные — €135 за 3 дня. Шлем и куртка в комплекте. Категория B водительского права подходит (3 колеса).'},
    {who:'user', text:'Шлем какого размера? У меня L'},
  ],
};

const SOURCES = [
  {ic:'Wz', name:'Wazzup24 · WhatsApp Business', desc:'Сообщения, статусы, шаблоны', when:'2 мин назад', items:'24 чата · 47 сообщений'},
  {ic:'IG', name:'Instagram Direct', desc:'DM via Meta Business', when:'5 мин назад', items:'12 чатов'},
  {ic:'TG', name:'Telegram Bot', desc:'@gfd_belgrade_bot', when:'1 мин назад', items:'8 чатов'},
  {ic:'XL', name:'Catalog Sync · Google Sheets', desc:'Парк, цены, доступность', when:'12 мин назад', items:'107 авто'},
  {ic:'Yn', name:'Yandex Maps · отзывы', desc:'Reviews + answers', when:'1 ч назад', items:'342 отзыва'},
  {ic:'TG', name:'TG Channel · посты', desc:'@gfd_rent — 8 200 подписчиков', when:'4 ч назад', items:'164 поста'},
  {ic:'DR', name:'Google Drive · документы', desc:'Договоры, страховые', when:'вчера 18:42', items:'1 248 файлов'},
];

const INTEGRATIONS = [
  {ic:'C', name:'Anthropic Claude', desc:'AI-помощник, content factory, ranker', status:'connected', kind:'core'},
  {ic:'Wz', name:'Wazzup24', desc:'WhatsApp Business + унифицированный API', status:'connected', kind:'channel'},
  {ic:'IG', name:'Meta Business · Instagram', desc:'Direct messages, content publish', status:'connected', kind:'channel'},
  {ic:'TG', name:'Telegram Bot API', desc:'@gfd_belgrade_bot', status:'connected', kind:'channel'},
  {ic:'Yn', name:'Yandex Maps Business', desc:'Reviews + бизнес-карточка', status:'connected', kind:'data'},
  {ic:'GS', name:'Google Sheets · Catalog', desc:'Машины, цены, расписание', status:'connected', kind:'data'},
  {ic:'$', name:'Stripe', desc:'Платежи, чеки, refunds', status:'pending', kind:'payment'},
  {ic:'TT', name:'TikTok Content Posting', desc:'Auto-publish reels', status:'review', kind:'channel'},
  {ic:'YT', name:'YouTube Shorts', desc:'Auto-publish vertical video', status:'disconnected', kind:'channel'},
  {ic:'DC', name:'Discover Cars · API', desc:'Aggregator listings sync', status:'planned', kind:'data'},
];

/* ============================================================ */
/* CLAUDE STREAM                                                */
/* ============================================================ */
const SYSTEM = `Ты — AI-помощник ГФД Rent A Car (Белград). Отвечаешь на языке пользователя (RU / SR / EN), кратко (2-3 абзаца), тёплым деловым тоном.

Каталог (€/день): BMW Z4 cabrio 65, BMW i3 24, Mini Cabrio 58, BMW X5 90, VW Touran 38, Skoda Karoq 34, Skoda Fabia 20, VW UP! 18, Harley Sportster S 95 (только выходные), Piaggio MP3 400 45, BMW 320d 39, Hyundai Tucson 36.

Политика: cashback 10% от каждой поездки (на следующую). Long-term ≥1 нед — без депозита. Cross-border: Черногория €40, Хорватия €50, БиГ €40. Доставка в BEG и отели Белграда бесплатно. Принимаем cash + карты Mir/Visa/MC.`;

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

function Sidebar({page, setPage, mode}){
  return (
    <div className="side">
      <div className="side-brand">
        <div className="logo">Г</div>
        <div className="name">ГФД<small>aboba dev × MiP · CRM</small></div>
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
      <div className="side-foot">
        <div className="avatar">МК</div>
        <div className="user">Максим Кравченко<small>Manager · BG office</small></div>
      </div>
    </div>
  );
}

function Topbar({crumb, mode, actions}){
  return (
    <div className="topbar">
      <div className="crumb">{crumb.map((c,i)=><Fragment key={i}>{i?<span style={{margin:'0 6px',color:'var(--cream-4)'}}>/</span>:null}{i===crumb.length-1?<b>{c}</b>:<span>{c}</span>}</Fragment>)}</div>
      <div className="search">{IC.search}<input placeholder="Поиск…" /><span className="key">⌘K</span></div>
      {actions}
    </div>
  );
}

/* ----------------- DASHBOARD ----------------- */
function Dashboard({setPage}){
  const [own,setOwn]=useState([]);
  const [hired,setHired]=useState([]);
  const [daily,setDaily]=useState([]);
  const [period,setPeriod]=useState('day');
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

  const series = (()=>{
    if(period==='day') return daily.slice(-30).map(d=>({label:d.date.slice(8,10)+'.'+d.date.slice(5,7), v:d.routes}));
    if(period==='week'){
      const wk={};
      daily.forEach(d=>{ const dt=new Date(d.date); const mon=new Date(dt); mon.setDate(dt.getDate()-((dt.getDay()+6)%7)); const k=mon.toISOString().slice(0,10); wk[k]=(wk[k]||0)+d.routes; });
      return Object.entries(wk).slice(-12).map(([k,v])=>({label:k.slice(8,10)+'.'+k.slice(5,7), v}));
    }
    const mo={}; const NM=['','янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
    daily.forEach(d=>{ const k=d.date.slice(0,7); mo[k]=(mo[k]||0)+d.routes; });
    return Object.entries(mo).slice(-6).map(([k,v])=>({label:NM[+k.slice(5,7)], v}));
  })();

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
        <div className="stat"><div className="l">► маршрутов сегодня</div><div className="v">{routesToday}</div><div className="d"><span className={'delta '+(routesDelta>=0?'up':'down')}>{routesDelta>=0?'+':''}{routesDelta}</span><span className="lab">vs вчера</span></div></div>
        <div className="stat"><div className="l">► ТС на линии</div><div className="v">{totalOnLine}</div><div className="d"><span className="lab">свои + частники</span></div></div>
        <div className="stat"><div className="l">► свои на линии</div><div className="v">{ownOnLine.length}</div><div className="d"><span className="lab">из {own.length} в парке</span></div></div>
        <div className="stat"><div className="l">► частники на линии</div><div className="v">{hiredOnLine.length}</div><div className="d"><span className="lab">из {hired.length} привлечённых</span></div></div>
      </div>

      <div className="card">
        <div className="h">
          <div className="t">Динамика маршрутов</div>
          <div className="actions" style={{display:'flex',gap:8}}>{PBTN('day','день')}{PBTN('week','неделя')}{PBTN('month','месяц')}</div>
        </div>
        <div className="b">
          <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:210,display:'block'}} preserveAspectRatio="none">
            <defs>
              <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--coral)" stopOpacity="0.35"/>
                <stop offset="100%" stopColor="var(--coral)" stopOpacity="0"/>
              </linearGradient>
            </defs>
            {[0.25,0.5,0.75].map((g,i)=>(<line key={i} x1={P} x2={W-P} y1={P+g*(H-2*P)} y2={P+g*(H-2*P)} stroke="var(--line)" strokeWidth="1"/>))}
            {area && <path d={area} fill="url(#rg)"/>}
            {line && <path d={line} fill="none" stroke="var(--coral)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>}
            {n>0 && <circle cx={xp(n-1)} cy={yp(series[n-1].v)} r="4.5" fill="var(--coral)" stroke="var(--panel)" strokeWidth="2"/>}
          </svg>
          <div className="util-legend" style={{marginTop:6,justifyContent:'space-between',color:'var(--cream-3)',fontFamily:"'JetBrains Mono', monospace",fontSize:10.5}}>
            {series.filter((_,i)=>n<=12||i%Math.ceil(n/12)===0).map((s,i)=>(<span key={i}>{s.label}</span>))}
          </div>
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
                    <td><span className="pri">{r.project}</span></td>
                    <td>{r.own}</td>
                    <td>{r.hired}</td>
                    <td><b style={{color:'var(--cream)'}}>{r.total}</b></td>
                    <td style={{width:120}}>
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

/* ----------------- BOOKINGS ----------------- */
function Bookings(){
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? BOOKINGS : BOOKINGS.filter(b => b.status === filter);
  return (
    <Fragment>
      <div className="page-head">
        <div>
          <h1>Бронирования</h1>
          <div className="sub">► {BOOKINGS.length} активных · последние 10 показано</div>
        </div>
        <div className="actions">
          <button onClick={()=>setFilter('all')} style={{borderColor: filter==='all' ? 'var(--coral)' : 'var(--line-2)', color: filter==='all' ? 'var(--coral)' : 'var(--cream-2)'}}>все</button>
          <button onClick={()=>setFilter('active')} style={{borderColor: filter==='active' ? 'var(--coral)' : 'var(--line-2)', color: filter==='active' ? 'var(--coral)' : 'var(--cream-2)'}}>active</button>
          <button onClick={()=>setFilter('pending')} style={{borderColor: filter==='pending' ? 'var(--coral)' : 'var(--line-2)', color: filter==='pending' ? 'var(--coral)' : 'var(--cream-2)'}}>pending</button>
          <button onClick={()=>setFilter('done')} style={{borderColor: filter==='done' ? 'var(--coral)' : 'var(--line-2)', color: filter==='done' ? 'var(--coral)' : 'var(--cream-2)'}}>done</button>
          <button className="primary">+ новая</button>
        </div>
      </div>

      <div className="card">
        <div className="b flush">
          <table className="tbl">
            <thead><tr>
              <th>ID</th><th>Клиент</th><th>Машина</th><th>Период</th><th>Канал</th><th>Источник</th><th>Сумма</th><th>Оплачено</th><th>Статус</th>
            </tr></thead>
            <tbody>
              {filtered.map(b=>(
                <tr key={b.id}>
                  <td><span className="id">{b.id}</span></td>
                  <td><span className="pri">{b.cust}</span><span className="sec">{b.phone} · <span className="lang-flag">{b.lang}</span></span></td>
                  <td>{b.car}</td>
                  <td><span className="id">{b.from} → {b.to}</span></td>
                  <td><span className="chan">{b.ch}</span></td>
                  <td style={{color:'var(--cream-3)',fontSize:12}}>{b.src}</td>
                  <td><b style={{color:'var(--cream)'}}>€{b.total}</b></td>
                  <td><span style={{color: b.paid >= b.total ? 'var(--green)' : 'var(--warn)', fontWeight:600}}>€{b.paid}</span></td>
                  <td><span className={'pill ' + b.status}>{b.status}</span></td>
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
  useEffect(()=>{ fetch('/data/own-fleet.json?t='+Date.now()).then(r=>r.json()).then(setRows).catch(()=>setRows([])); },[]);
  const SC={'На линии':'#5DCB94','Ремонт':'#FFB84A','Капремонт':'#FF6464','Резерв':'#4A8FA8'};
  const pill=s=>{const c=SC[s]||'#8B8377';return <span style={{fontSize:'11.5px',fontWeight:600,padding:'3px 10px',borderRadius:'8px',color:c,background:c+'26',whiteSpace:'nowrap'}}>{s}</span>;};
  const total=rows.length, on=rows.filter(v=>v.status==='На линии').length;
  const gaz=rows.filter(v=>v.kind==='Газель').length, larg=rows.filter(v=>v.kind==='Ларгус').length;
  const rem=rows.filter(v=>v.status==='Ремонт'||v.status==='Капремонт').length;
  const pm={}; rows.forEach(v=>{(pm[v.project]=pm[v.project]||{t:0,on:0});pm[v.project].t++;if(v.status==='На линии')pm[v.project].on++;});
  const projects=Object.entries(pm).sort((a,b)=>b[1].t-a[1].t);
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
        <div className="h"><div className="t">Список ТС</div><div className="m">{total} машин · тест-данные (Google-таблица)</div></div>
        <div className="b flush"><table className="tbl">
          <thead><tr><th>Госномер</th><th>Марка / тип</th><th>Проект</th><th>Статус</th><th>Готовность</th><th>Пробег</th><th>АТП</th></tr></thead>
          <tbody>{rows.map(v=>(
            <tr key={v.plate}><td><span className="pri">{v.plate}</span></td><td>{v.brand}<span className="sec">{v.type}</span></td><td>{v.project}</td><td>{pill(v.status)}</td><td style={{color:v.ready?'var(--green)':'var(--cream-4)'}}>{v.ready?'исправна':'—'}</td><td><span className="id">{v.mileage.toLocaleString('ru-RU')}</span></td><td style={{color:'var(--cream-3)'}}>{v.atp}</td></tr>
          ))}</tbody>
        </table></div>
      </div>
    </Fragment>
  );
}

/* ----------------- CONVERSATIONS ----------------- */
function Conversations(){
  const [activeId, setActiveId] = useState('CV-1');
  const [msgs, setMsgs] = useState(() => ({ ...CONVO_MESSAGES }));
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef(null);

  const conv = CONVOS.find(c => c.id === activeId);
  const currentMsgs = msgs[activeId] || [];

  useEffect(() => {
    if(bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [currentMsgs.length, activeId]);

  async function send(text){
    if(!text.trim()) return;
    const newUser = {who:'user', text};
    const updated = [...currentMsgs, newUser];
    setMsgs(m => ({...m, [activeId]: updated}));
    setDraft('');
    setBusy(true);

    // typing
    setMsgs(m => ({...m, [activeId]: [...updated, {who:'typing'}]}));
    await new Promise(r=>setTimeout(r, 280));

    const isLive = (localStorage.getItem(KEY_STORAGE)||'').startsWith('sk-ant-');
    const messages = updated.map(m => ({role: m.who==='user'?'user':'assistant', content: m.text || ''})).filter(m => m.content);

    let acc = '';
    const fallback = pickFakeReply(text, conv?.lang || 'ru');
    try{
      const gen = isLive
        ? claudeStream({system:SYSTEM, messages})
        : fakeStream(fallback, 11);
      let first = true;
      for await (const chunk of gen){
        acc += chunk;
        setMsgs(m => {
          const list = [...updated];
          list.push({who:'bot', meta: 'AI помощник · ' + (conv?.lang || 'ru'), text: acc});
          return {...m, [activeId]: list};
        });
      }
    }catch(err){
      acc = fallback;
      setMsgs(m => {
        const list = [...updated];
        list.push({who:'bot', meta:'demo · scripted', text: acc});
        return {...m, [activeId]: list};
      });
    }
    setBusy(false);
  }

  function pickFakeReply(text, lang){
    const t = text.toLowerCase();
    if(lang === 'sr'){
      return 'Razumem. Pripremam ponudu sa tačnim datumima — pokazujem 3 opcije za narednih 14 dana. Šaljem na WhatsApp za 2 minuta. Cashback od 10% se obračunava automatski.';
    }
    if(lang === 'en'){
      return 'Got it. I will prepare the booking confirmation in the next minute. Pickup at BEG airport at 14:30 — Z4 with full insurance. Your 10% cashback (≈€26) will apply to your next ride.';
    }
    if(t.includes('кресл')){
      return 'Да, детское кресло Group 1 (9-18 кг) — бесплатно в этом сезоне. Доставим вместе с машиной. У вас один ребёнок или нужно два кресла?';
    }
    if(t.includes('шлем')){
      return 'L шлем — есть. Также куртка размер 50, перчатки L. Всё в комплекте по €0 — это в стоимости. Доставка к отелю в 12:00 или утром 11 числа?';
    }
    return 'Понял! Готовлю подтверждение, отправлю на WhatsApp в течение пары минут. Cashback 10% (€26) пойдёт на следующую поездку — он начисляется автоматически после возврата.';
  }

  return (
    <Fragment>
      <div className="page-head">
        <div>
          <h1>Переписки</h1>
          <div className="sub">► AI-помощник + операторы · 3 канала</div>
        </div>
        <div className="actions">
          <button>фильтр</button>
          <button>экспорт</button>
        </div>
      </div>

      <div className="convo-host">
        <div className="convo-list">
          <div className="convo-list-h">
            <h3>Активные · {CONVOS.length}</h3>
            <div className="filter">все каналы ↓</div>
          </div>
          <div className="convo-list-body">
            {CONVOS.map(c => (
              <div key={c.id} className={'convo ' + (c.id === activeId ? 'active' : '')} onClick={()=>setActiveId(c.id)}>
                <div className="top">
                  <span className="name">{c.name}</span>
                  <span className="time">{c.time}</span>
                </div>
                <div className="preview">{c.last}</div>
                <div className="meta">
                  <span className="chan">{c.ch}</span>
                  <span className="lang-flag">{c.lang}</span>
                  {c.status === 'ai' && <span className="pill avail" style={{padding:'1px 6px',fontSize:9}}>AI</span>}
                  {c.status === 'human' && <span className="pill pending" style={{padding:'1px 6px',fontSize:9}}>human</span>}
                </div>
                {c.unread > 0 && <span className="unread">{c.unread}</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="convo-detail">
          {conv ? (
            <Fragment>
              <div className="convo-detail-h">
                <div className="avatar">{(conv.name||'?').split(' ').map(s=>s[0]).slice(0,2).join('')}</div>
                <div>
                  <div className="name">{conv.name}</div>
                  <div className="meta">{conv.ch} · {conv.lang} · {conv.id}</div>
                </div>
                <div className="actions">
                  <button>передать оператору</button>
                  <button>создать бронь</button>
                </div>
              </div>
              <div className="convo-body" ref={bodyRef}>
                {currentMsgs.map((m, i) => m.who === 'typing' ? (
                  <div key={i} className="typing"><span/><span/><span/></div>
                ) : (
                  <div key={i} className={'msg ' + (m.who === 'user' ? 'user' : 'bot')}>
                    {m.meta && <div className="meta">{m.meta}</div>}
                    {m.text}
                  </div>
                ))}
              </div>
              <form className="convo-input" onSubmit={e => {e.preventDefault(); send(draft);}}>
                <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Напишите ответ (AI или оператор)…" disabled={busy} />
                <button type="submit" disabled={busy || !draft.trim()}>{busy ? '…' : 'отправить'}</button>
              </form>
            </Fragment>
          ) : (
            <div className="convo-empty"><b>Выберите переписку</b>Слева список активных диалогов с AI-помощником и операторами.</div>
          )}
        </div>
      </div>
    </Fragment>
  );
}

/* ----------------- CUSTOMERS ----------------- */
function Customers(){
  return (
    <Fragment>
      <div className="page-head">
        <div>
          <h1>Клиенты</h1>
          <div className="sub">► {CUSTOMERS.length} в выборке · всего 2 184</div>
        </div>
        <div className="actions">
          <button>фильтр</button>
          <button>экспорт CSV</button>
          <button className="primary">+ клиент</button>
        </div>
      </div>

      <div className="card">
        <div className="b flush">
          <table className="tbl">
            <thead><tr><th>ID</th><th>Имя</th><th>Контакт</th><th>Язык</th><th>С нами с</th><th>Поездок</th><th>Сумма</th><th>Cashback</th></tr></thead>
            <tbody>
              {CUSTOMERS.map(c => (
                <tr key={c.id}>
                  <td><span className="id">{c.id}</span></td>
                  <td><span className="pri">{c.name}</span></td>
                  <td><span style={{fontFamily:"'JetBrains Mono', monospace",fontSize:12,color:'var(--cream-2)'}}>{c.phone}</span></td>
                  <td><span className="lang-flag">{c.lang}</span></td>
                  <td><span style={{fontFamily:"'JetBrains Mono', monospace",fontSize:12,color:'var(--cream-3)'}}>{c.since}</span></td>
                  <td>{c.trips}</td>
                  <td><b style={{color:'var(--cream)'}}>€{c.spent.toLocaleString('en-US').replace(',',' ')}</b></td>
                  <td><span className="cashback">€{c.cashback}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Fragment>
  );
}

/* ----------------- SYNC ----------------- */
function SyncPage(){
  const [refreshing, setRefreshing] = useState(null);
  function doSync(name){
    setRefreshing(name);
    setTimeout(() => setRefreshing(null), 1300);
  }
  return (
    <Fragment>
      <div className="page-head">
        <div>
          <h1>Источники данных</h1>
          <div className="sub">► auto-sync каждые 5 минут · последние операции</div>
        </div>
        <div className="actions">
          <button className="primary">синхронизировать всё</button>
        </div>
      </div>

      <div className="card">
        <div className="h"><div className="t">Подключённые источники</div><div className="m">{SOURCES.length} активных</div></div>
        <div className="b flush">
          {SOURCES.map((s,i) => (
            <div key={i} className="sync-row">
              <div className="ico">{s.ic}</div>
              <div>
                <div className="name">{s.name}</div>
                <div className="desc">{s.desc} · {s.items}</div>
              </div>
              <div></div>
              <div style={{display:'flex',alignItems:'center',gap:14}}>
                <div className="when"><b style={{color:'var(--green)',fontFamily:'inherit',fontSize:10,letterSpacing:'.12em'}}>● синхрон</b>{s.when}</div>
                <button onClick={()=>doSync(s.name)} disabled={refreshing===s.name}>{refreshing===s.name ? '…' : 'сейчас'}</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Fragment>
  );
}

/* ----------------- SETTINGS ----------------- */
function Settings(){
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(KEY_STORAGE) || '');
  const [saved, setSaved] = useState(false);
  function save(){
    if(apiKey.trim()) localStorage.setItem(KEY_STORAGE, apiKey.trim());
    else localStorage.removeItem(KEY_STORAGE);
    setSaved(true);
    setTimeout(()=>{setSaved(false); window.location.reload();}, 700);
  }
  return (
    <Fragment>
      <div className="page-head">
        <div>
          <h1>Настройки</h1>
          <div className="sub">► интеграции · API-ключи · команда</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="h"><div className="t">AI-движок · Claude</div><div className="m">опубликовать ключ</div></div>
          <div className="b">
            <div className="field">
              <label>API key Anthropic</label>
              <input type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="sk-ant-…" />
              <div className="help">Ключ хранится в браузере (localStorage), отправляется напрямую в Anthropic API. <a href="https://console.anthropic.com/settings/keys" target="_blank">получить ключ →</a></div>
            </div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <button className="primary" onClick={save}>{saved ? '✓ сохранено' : 'сохранить'}</button>
              <button onClick={()=>{setApiKey(''); localStorage.removeItem(KEY_STORAGE); window.location.reload();}}>очистить</button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="h"><div className="t">Параметры модели</div></div>
          <div className="b">
            <div className="field">
              <label>чат-модель (диалоги с клиентами)</label>
              <input value="claude-haiku-4-5" readOnly />
              <div className="help">Быстрая, дешёвая, оптимальна для чатов на 3 языках.</div>
            </div>
            <div className="field">
              <label>контент-модель (генерация постов)</label>
              <input value="claude-sonnet-4-6" readOnly />
              <div className="help">Используется в content factory и для генерации описаний машин.</div>
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
const SYSTEM_ASSISTANT = `Ты — внутренний AI-помощник менеджеров ГФД Rent A Car в Белграде. Ты работаешь как агент с набором инструментов для работы с CRM.

ПРИНЦИПЫ:
- Когда спрашивают про данные (бронирования, парк, клиенты, метрики) — обязательно вызывай нужный инструмент, не отвечай по памяти.
- Если задача требует нескольких шагов — вызывай инструменты последовательно (например: сначала query_customers чтобы найти сегмент, потом send_promo чтобы отправить рассылку).
- В финальном ответе кратко резюмируй что сделал и какой результат. По-русски, по делу, без воды.
- Числа всегда из инструментов, никогда не выдумывай.
- Если данных не хватает — задай ОДИН уточняющий вопрос.

ПАРК: 107 автомобилей в Белграде (BMW, Mini, VW, Skoda, Hyundai, Harley, Piaggio). Long-term без депозита от 1 нед, cashback 10% автоматически.`;

const TOOLS = [
  {
    name: 'query_bookings',
    description: 'Filter and return bookings. Use for questions about specific bookings, recent activity, counts by status, etc.',
    input_schema: {
      type: 'object',
      properties: {
        status: {type:'string', enum:['active','pending','done','cancelled','all'], description:'Filter by booking status'},
        car_model: {type:'string', description:'Partial car model match (e.g. "BMW Z4")'},
        customer_lang: {type:'string', enum:['ru','sr','en'], description:'Filter by customer language'},
        min_total: {type:'number', description:'Minimum booking total in EUR'}
      }
    }
  },
  {
    name: 'query_fleet',
    description: 'Filter cars in fleet. Use for availability, utilization, maintenance scheduling questions.',
    input_schema: {
      type: 'object',
      properties: {
        status: {type:'string', enum:['rented','avail','maint','all']},
        category: {type:'string', enum:['cabrio','suv','sedan','compact','mini','electric','moto','minivan','van']},
        model: {type:'string', description:'Partial model name'}
      }
    }
  },
  {
    name: 'query_customers',
    description: 'Filter customers. Use for segmentation, VIP identification, language-based targeting.',
    input_schema: {
      type: 'object',
      properties: {
        lang: {type:'string', enum:['ru','sr','en']},
        min_spent: {type:'number', description:'Min total spent in EUR'},
        min_trips: {type:'number'}
      }
    }
  },
  {
    name: 'get_analytics',
    description: 'Returns aggregate business metric. Use for KPI questions.',
    input_schema: {
      type: 'object',
      properties: {
        metric: {type:'string', enum:['revenue_today','revenue_week','revenue_month','fleet_utilization','nps_30','active_rentals_count','top_car_models','source_breakdown'], description:'Which metric to fetch'}
      },
      required: ['metric']
    }
  },
  {
    name: 'send_promo',
    description: 'Send promotional message to customers matching segment. Returns delivery report. Use this when user asks to send a promo, discount, or announcement.',
    input_schema: {
      type: 'object',
      properties: {
        segment: {type:'string', description:'Human-readable segment description (e.g. "VIP RU-speaking with >€2000 LTV")'},
        message: {type:'string', description:'Promo message body, max 200 chars'},
        channel: {type:'string', enum:['whatsapp','telegram','both']}
      },
      required: ['segment','message','channel']
    }
  },
  {
    name: 'generate_post',
    description: 'Generates social media post text for a specific car model in specified platform/language. Returns post body + hashtags.',
    input_schema: {
      type: 'object',
      properties: {
        car_model: {type:'string', description:'Model from fleet (e.g. "BMW Z4", "Harley")'},
        platform: {type:'string', enum:['instagram','tiktok','youtube_shorts','vk','telegram']},
        lang: {type:'string', enum:['ru','sr','en']}
      },
      required: ['car_model','platform','lang']
    }
  },
  {
    name: 'check_competitor',
    description: 'Returns competitor info: prices for benchmark car (BMW 320d), social metrics, recent activity.',
    input_schema: {
      type: 'object',
      properties: {
        competitor: {type:'string', enum:['sixt','zim','nevian','citycar','booom','all']}
      },
      required: ['competitor']
    }
  },
  {
    name: 'adjust_pricing',
    description: 'Adjust daily rental price for a car model. Returns confirmation with old → new price and how many cars affected.',
    input_schema: {
      type: 'object',
      properties: {
        car_model: {type:'string', description:'Model name'},
        new_price_eur: {type:'number', description:'New price per day in EUR'}
      },
      required: ['car_model','new_price_eur']
    }
  }
];

/* tool executor — operates on mock CRM data */
/* русские названия инструментов для интерфейса */
const TOOL_LABELS = {
  query_bookings: 'Найти бронирования',
  query_fleet: 'Найти машины в парке',
  query_customers: 'Найти клиентов',
  get_analytics: 'Метрики и аналитика',
  send_promo: 'Отправить рассылку клиентам',
  generate_post: 'Создать пост для соцсетей',
  check_competitor: 'Анализ конкурентов',
  adjust_pricing: 'Изменить цену авто'
};

const TOOL_DESCRIPTIONS = {
  query_bookings: 'AI находит и фильтрует бронирования по статусу, дате, машине или клиенту. Примеры: «Сколько активных аренд сегодня?», «Все бронирования BMW за неделю», «Кто бронировал на месяц или дольше?»',
  query_fleet: 'AI ищет машины в парке по статусу (свободна / в аренде / в сервисе), категории, модели. Примеры: «Какие BMW свободны?», «Сколько машин на ТО?», «Все кабриолеты в парке»',
  query_customers: 'AI находит клиентов по языку, числу поездок, общей сумме покупок. Примеры: «VIP с €2 000+ потрачено», «Все русскоязычные клиенты», «Кто давно не приезжал?»',
  get_analytics: 'AI достаёт ключевые бизнес-метрики: выручка, загрузка парка, NPS, конверсия, разбивка по каналам. Примеры: «Сколько мы заработали сегодня?», «Какая загрузка парка за неделю?», «Откуда самые лучшие клиенты?»',
  send_promo: 'AI отправляет рассылку выбранному сегменту через WhatsApp, Telegram или оба канала. Примеры: «Отправь скидку 15% русскоязычным VIP», «Уведоми всех с активной арендой об акции на следующую поездку»',
  generate_post: 'AI создаёт пост для Instagram, TikTok, YouTube Shorts, VK или Telegram про конкретную машину на любом из 3 языков. Примеры: «Сделай TikTok про BMW Z4 на сербском», «Пост в IG про Harley на русском»',
  check_competitor: 'AI смотрит что у конкурентов (Sixt, ZIM, NEVIAN, Booom): подписчики, посты, цены, активность в TikTok. Примеры: «Что у Sixt по BMW 320d?», «Кто публикует чаще нас?», «Сравни всех по подписчикам»',
  adjust_pricing: 'AI меняет цену аренды конкретной модели в парке. Примеры: «Подними BMW 320d на €5», «Снизь Skoda Fabia на эту неделю до €18», «Установи Z4 на €70 на выходные»'
};


function execTool(name, input){
  if(name === 'query_bookings'){
    let res = [...BOOKINGS];
    if(input.status && input.status !== 'all') res = res.filter(b => b.status === input.status);
    if(input.car_model) res = res.filter(b => b.car.toLowerCase().includes(input.car_model.toLowerCase()));
    if(input.customer_lang) res = res.filter(b => b.lang === input.customer_lang);
    if(input.min_total) res = res.filter(b => b.total >= input.min_total);
    return {
      count: res.length,
      total_revenue_eur: res.reduce((s,b)=>s+b.total, 0),
      bookings: res.slice(0,10).map(b => ({id:b.id, customer:b.cust, car:b.car, period:`${b.from}→${b.to}`, total:b.total, status:b.status, channel:b.ch, lang:b.lang}))
    };
  }
  if(name === 'query_fleet'){
    let res = [...FLEET];
    if(input.status && input.status !== 'all') res = res.filter(f => f.status === input.status);
    if(input.category) res = res.filter(f => f.cat === input.category);
    if(input.model) res = res.filter(f => f.model.toLowerCase().includes(input.model.toLowerCase()));
    return {
      count: res.length,
      avg_price_eur: res.length ? Math.round(res.reduce((s,f)=>s+f.price, 0) / res.length) : 0,
      cars: res.slice(0,12).map(f => ({id:f.id, model:f.model, plate:f.plate, status:f.status, km:f.km, price_per_day:f.price, next:f.next}))
    };
  }
  if(name === 'query_customers'){
    let res = [...CUSTOMERS];
    if(input.lang) res = res.filter(c => c.lang === input.lang);
    if(input.min_spent) res = res.filter(c => c.spent >= input.min_spent);
    if(input.min_trips) res = res.filter(c => c.trips >= input.min_trips);
    return {
      count: res.length,
      total_ltv_eur: res.reduce((s,c)=>s+c.spent, 0),
      total_cashback_owed_eur: res.reduce((s,c)=>s+c.cashback, 0),
      customers: res.slice(0,12).map(c => ({id:c.id, name:c.name, phone:c.phone, lang:c.lang, since:c.since, trips:c.trips, total_spent:c.spent, cashback:c.cashback}))
    };
  }
  if(name === 'get_analytics'){
    const metrics = {
      revenue_today: {value: 2184, unit:'EUR', delta:'+18% vs last week'},
      revenue_week: {value: 14820, unit:'EUR', delta:'+9% vs prev week'},
      revenue_month: {value: 58400, unit:'EUR', delta:'+12% YoY'},
      fleet_utilization: {value: 63.5, unit:'%', delta:'+2.1pp 7d', rented:67, available:32, maintenance:8},
      nps_30: {value: 72, delta:'+5', responses:184, promoters_pct:78, detractors_pct:6},
      active_rentals_count: {value: 68, delta:'+4 vs yesterday'},
      top_car_models: [
        {model:'BMW Z4 cabrio', utilization:'100%', revenue_week:1820},
        {model:'Mini Cooper S Cabrio', utilization:'80%', revenue_week:1624},
        {model:'BMW X5', utilization:'75%', revenue_week:2700},
        {model:'VW Touran', utilization:'75%', revenue_week:1064},
      ],
      source_breakdown: {
        instagram_dm: '34%',
        whatsapp_direct: '28%',
        organic_site: '18%',
        yandex_maps: '11%',
        partner_hotels: '6%',
        aggregators: '3%'
      }
    };
    return metrics[input.metric] || {error:'unknown metric'};
  }
  if(name === 'send_promo'){
    // mock segment count
    const seg = (input.segment||'').toLowerCase();
    let targetCount = 142;
    if(seg.includes('vip')||seg.includes('ltv')) targetCount = 87;
    if(seg.includes('русск')||seg.includes('ru')) targetCount = 96;
    if(seg.includes('срб')||seg.includes('sr')) targetCount = 64;
    if(seg.includes('long')||seg.includes('месяц')) targetCount = 38;
    const ts = new Date().toLocaleString('ru-RU');
    return {
      status: 'queued',
      segment_matched: targetCount + ' customers',
      channel: input.channel,
      message_preview: input.message,
      delivery_eta: '3-7 minutes',
      campaign_id: 'CMP-' + Math.floor(Math.random()*99999),
      timestamp: ts,
      note: 'Rate-limit: 60 msg/min via Wazzup24, queued in background.'
    };
  }
  if(name === 'generate_post'){
    const model = input.car_model || 'BMW Z4';
    const platform = input.platform;
    const lang = input.lang;
    const samples = {
      ru: {
        instagram: `${model}. Без депозита, кэшбэк 10%, доставим на BEG или в отель.\n\nЦенник от прошлогодних — не двигали. Бронируйте на длинные — выгоднее.`,
        tiktok: `${model} в Белграде. Звук в наушниках обязателен.\n\nКрыша вниз → Котор за 5 часов → ключи у нас.`,
        youtube_shorts: `Берём ${model}. Едем по Адриатике. Возвращаемся с историей.\n\nДоставка в BEG бесплатно, страховка cross-border оформляется онлайн.`,
        vk: `${model} в долгосрочной аренде от 1 недели — без депозита.\n\nПодробности и доступные даты — в личных сообщениях или на gfd.rs/long.`,
        telegram: `${model} · €${model.includes('Z4')?65:model.includes('Harley')?95:model.includes('Mini')?58:38}/день · cabrio season открыт.\n\nДоставим к рейсу или в отель. Cashback 10% автоматически.`
      },
      sr: {
        instagram: `${model}. Bez depozita, cashback 10%, dovozimo na BEG ili u hotel.`,
        tiktok: `${model} u Beogradu. Subota — Kotor — krov dole.`,
        youtube_shorts: `${model}. Pick it up. Drive Adriatic. Come back with stories.`,
        vk: `${model} dugoročno od 1 nedelje — bez depozita. Detalji u DM.`,
        telegram: `${model} · cabrio season je počeo. Dovozimo na aerodrom ili hotel.`
      },
      en: {
        instagram: `${model} weekend mood. No deposit, 10% cashback, airport delivery.\n\nLong-term from 1 week — better rates, no paperwork.`,
        tiktok: `${model} in Belgrade. Sound on.\n\nTop down → Adriatic → keys waiting at hotel.`,
        youtube_shorts: `Rent a ${model}. Drive the Adriatic. Free hotel delivery.\n\nCross-border to Montenegro, Croatia, Bosnia — all sorted online.`,
        vk: `${model} long-term from 1 week. No deposit. DM for dates.`,
        telegram: `${model} cabrio season is open. Free BEG airport delivery.`
      }
    };
    const tagsBank = {
      ru: '#gfd #белград #аренда_авто #serbia',
      sr: '#gfd #beograd #rentacar #adriatic',
      en: '#gfd #belgrade #cardrental #serbia #balkans'
    };
    return {
      platform,
      lang,
      car_model: model,
      body: (samples[lang]||samples.ru)[platform] || (samples[lang]||samples.ru).instagram,
      hashtags: tagsBank[lang] || tagsBank.ru,
      cta: 'gfd.rs/' + model.toLowerCase().replace(/[^a-z0-9]+/g,'-'),
      ready_for: 'queue (scheduled)'
    };
  }
  if(name === 'check_competitor'){
    const comp = input.competitor;
    const data = {
      sixt: {name:'Sixt Srbija', followers_ig:3354, weekly_posts:5, avg_er_pct:2.8, bmw_320d_eur_per_day:58, tiktok_followers:1200, recent_activity:'Подняли BMW 320d с €52 до €58 за последнюю неделю'},
      zim: {name:'ZIM Rent', followers_ig:1890, weekly_posts:2, avg_er_pct:3.2, bmw_320d_eur_per_day:42, tiktok_followers:0, recent_activity:'Низкая частота, акцент на ВКонтакте'},
      nevian: {name:'NEVIAN', followers_ig:2040, weekly_posts:4, avg_er_pct:3.7, bmw_320d_eur_per_day:44, tiktok_followers:320, recent_activity:'Запустили Reels-серию про Crna Gora'},
      citycar: {name:'City Car Beograd', followers_ig:1210, weekly_posts:1, avg_er_pct:5.8, bmw_320d_eur_per_day:36, tiktok_followers:0, recent_activity:'Высокий ER на формат «история клиента»'},
      booom: {name:'Booom', followers_ig:3802, weekly_posts:6, avg_er_pct:3.4, bmw_320d_eur_per_day:48, tiktok_followers:2100, recent_activity:'Стартовал TikTok 03/2026, уже 2.1K'},
    };
    const us = {name:'ГФД (us)', followers_ig:2517, weekly_posts:3, avg_er_pct:4.1, bmw_320d_eur_per_day:39, tiktok_followers:0};
    if(comp === 'all'){
      return {us, competitors:Object.values(data)};
    }
    return {us, competitor: data[comp]};
  }
  if(name === 'adjust_pricing'){
    const model = input.car_model;
    const matches = FLEET.filter(f => f.model.toLowerCase().includes((model||'').toLowerCase()));
    const old_price = matches.length ? matches[0].price : null;
    return {
      status: 'updated',
      car_model: model,
      cars_affected: matches.length,
      old_price_eur: old_price,
      new_price_eur: input.new_price_eur,
      delta_pct: old_price ? Math.round((input.new_price_eur - old_price) / old_price * 100) : null,
      effective_from: 'next booking',
      change_id: 'PR-' + Math.floor(Math.random()*99999)
    };
  }
  return {error: 'unknown tool: ' + name};
}

/* call Claude with tools (non-streaming for simplicity in tool loop) */
async function callClaudeWithTools({messages, system, tools, model='claude-sonnet-4-6', max_tokens=2000}){
  const key = (localStorage.getItem(KEY_STORAGE) || '').trim();
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST',
    headers:{'x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true','content-type':'application/json'},
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
  bookings: {
    text_pre: 'Сейчас посмотрю активные бронирования.',
    tools: [
      {name:'query_bookings', input:{status:'active'}, delay:500}
    ],
    text_post: 'Сейчас активных бронирований: 5. Общая выручка по ним — €1 698. Самые крупные — BMW X5 на 9 дней (€810) и Skoda Fabia на 6 дней (€120). Всё едет в зелёной зоне, проблем не вижу.'
  },
  vip: {
    text_pre: 'Найду VIP-клиентов и подготовлю промо.',
    tools: [
      {name:'query_customers', input:{lang:'ru', min_spent:1500}, delay:600},
      {name:'send_promo', input:{segment:'RU-speaking, LTV >€1 500', message:'Майская акция: −15% на long-term от 14 дней. Только до 25 мая.', channel:'both'}, delay:800}
    ],
    text_post: 'Готово. Сегмент «RU-speaking + LTV >€1 500» — 3 клиента (Иван П., Анна К., Дмитрий В.), в среднем €1 540 LTV. Промо ушло в WhatsApp + Telegram, ETA доставки 3-7 минут. Campaign ID сохранил в журнале.'
  },
  post: {
    text_pre: 'Сгенерирую пост в Instagram про Z4 на русском.',
    tools: [
      {name:'generate_post', input:{car_model:'BMW Z4', platform:'instagram', lang:'ru'}, delay:700}
    ],
    text_post: 'Пост готов и можно сразу добавлять в очередь публикаций. Текст без эмодзи (как в бренд-гайде), CTA с UTM на gfd.rs/bmw-z4. Если нужно — могу сделать варианты на сербском или английском.'
  },
  competitor: {
    text_pre: 'Проверю что у Sixt по BMW 320d.',
    tools: [
      {name:'check_competitor', input:{competitor:'sixt'}, delay:600}
    ],
    text_post: 'У Sixt BMW 320d сейчас €58/день, они подняли с €52 на прошлой неделе. У нас €39 — есть запас поднять до €44 без потери конкурентной позиции. Это даст +€5/день × 12 машин × средняя загрузка 65% ≈ €1 170/месяц дополнительно. Рекомендую обновить.'
  },
  utilization: {
    text_pre: 'Смотрю утилизацию парка и какие машины простаивают.',
    tools: [
      {name:'get_analytics', input:{metric:'fleet_utilization'}, delay:400},
      {name:'query_fleet', input:{status:'avail'}, delay:500}
    ],
    text_post: 'Загрузка 63.5%, в сервисе 8 машин (выше нормы). Свободные сегодня: VW UP! и Smart Fortwo — эконом-сегмент простаивает, можно дать промо «−20% на эконом до конца недели». Mini Cabrio и Z4 в 100% загрузке — поднимем цену на следующую неделю.'
  },
  default: {
    text_pre: 'Сейчас разберусь.',
    tools: [
      {name:'get_analytics', input:{metric:'revenue_today'}, delay:500}
    ],
    text_post: 'Готово. Сегодня выручка €2 184 (+18% vs прошлая неделя). Если нужно глубже — могу разложить по машинам, источникам или клиентским сегментам.'
  }
};

function pickDemoScript(prompt){
  const p = (prompt||'').toLowerCase();
  if(p.includes('броні') || p.includes('брон')) return DEMO_SCRIPTS.bookings;
  if(p.includes('vip') || p.includes('акци') || p.includes('пром') || p.includes('сегмент')) return DEMO_SCRIPTS.vip;
  if(p.includes('пост') || p.includes('сгенер') || p.includes('reels') || p.includes('instagram')) return DEMO_SCRIPTS.post;
  if(p.includes('sixt') || p.includes('конкурент') || p.includes('zim') || p.includes('booom')) return DEMO_SCRIPTS.competitor;
  if(p.includes('простаива') || p.includes('загрузк') || p.includes('утилиз') || p.includes('парк')) return DEMO_SCRIPTS.utilization;
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
  {label:'Сколько активных бронирований сейчас и на какую сумму?', prompt:'Сколько активных бронирований сейчас и на какую сумму?'},
  {label:'Найди VIP-клиентов (RU, LTV >€1500) и отправь им майскую акцию −15%', prompt:'Найди VIP-клиентов с русским языком и LTV больше €1500 — отправь им майскую акцию: −15% на long-term от 14 дней, до 25 мая. WhatsApp + Telegram.'},
  {label:'Сгенерируй пост в Instagram про BMW Z4 на русском', prompt:'Сгенерируй пост в Instagram про BMW Z4 на русском'},
  {label:'Что у Sixt с BMW 320d? Стоит ли поднимать цену?', prompt:'Что у Sixt с BMW 320d? Стоит ли поднимать цену?'},
  {label:'Какие машины простаивают и что с ними делать?', prompt:'Какие машины простаивают и что с ними делать?'},
  {label:'Какой самый прибыльный car-model на этой неделе?', prompt:'Какой самый прибыльный car-model на этой неделе?'},
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
  if(name === 'query_bookings'){
    return `${out.count} broни, на €${out.total_revenue_eur}\n` + out.bookings.slice(0,5).map(b => `  • ${b.id} · ${b.customer} · ${b.car} · €${b.total} · ${b.status}`).join('\n');
  }
  if(name === 'query_fleet'){
    return `${out.count} машин, ср.цена €${out.avg_price_eur}/день\n` + out.cars.slice(0,5).map(c => `  • ${c.model} · ${c.plate} · ${c.status} · €${c.price_per_day}/день · ${c.km.toLocaleString('ru-RU').replace(',',' ')} км`).join('\n');
  }
  if(name === 'query_customers'){
    return `${out.count} клиентов, LTV total €${out.total_ltv_eur}, cashback owed €${out.total_cashback_owed_eur}\n` + out.customers.slice(0,5).map(c => `  • ${c.name} · ${c.lang} · ${c.trips} trips · €${c.total_spent} LTV · €${c.cashback} cashback`).join('\n');
  }
  if(name === 'get_analytics'){
    if(Array.isArray(out)) return out.map(r => `  • ${r.model || JSON.stringify(r)}`).join('\n');
    if(typeof out === 'object'){
      return Object.entries(out).map(([k,v]) => `  ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join('\n');
    }
    return String(out);
  }
  if(name === 'send_promo'){
    return `► status: ${out.status}\n► ${out.segment_matched} via ${out.channel}\n► message: "${out.message_preview}"\n► ETA: ${out.delivery_eta}\n► campaign: ${out.campaign_id}`;
  }
  if(name === 'generate_post'){
    return `► ${out.platform.toUpperCase()} · ${out.lang.toUpperCase()} · ${out.car_model}\n\n${out.body}\n\n${out.hashtags}\n\n► CTA: ${out.cta}`;
  }
  if(name === 'check_competitor'){
    if(out.competitors){
      return out.competitors.map(c => `  • ${c.name} · IG ${c.followers_ig} · ${c.weekly_posts}п/нед · ER ${c.avg_er_pct}% · BMW 320d €${c.bmw_320d_eur_per_day}`).join('\n') + `\n  vs us · IG ${out.us.followers_ig} · €${out.us.bmw_320d_eur_per_day}`;
    }
    const c = out.competitor;
    return `► ${c.name}\n  followers IG: ${c.followers_ig}\n  weekly posts: ${c.weekly_posts}\n  avg ER: ${c.avg_er_pct}%\n  BMW 320d: €${c.bmw_320d_eur_per_day}/день\n  TikTok: ${c.tiktok_followers}\n  recent: ${c.recent_activity}\n► vs us · IG ${out.us.followers_ig} · €${out.us.bmw_320d_eur_per_day}`;
  }
  if(name === 'adjust_pricing'){
    return `► ${out.status}\n► ${out.car_model}: €${out.old_price_eur} → €${out.new_price_eur} (${out.delta_pct > 0 ? '+' : ''}${out.delta_pct}%)\n► затронуто авто: ${out.cars_affected}\n► действует с: ${out.effective_from}\n► change_id: ${out.change_id}`;
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

    const isLive = (localStorage.getItem(KEY_STORAGE)||'').startsWith('sk-ant-');

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
          <h1>AI помощник</h1>
          <div className="sub">► claude sonnet 4.6 · 8 инструментов · работает с реальными данными CRM</div>
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
                <p>Я работаю с CRM как менеджер: умею смотреть бронирования, парк, клиентов, метрики; отправлять промо; генерировать посты; сравнивать с конкурентами; менять цены.</p>
                <p style={{marginTop:8}}>Все вызовы происходят через <code>tool use</code> — увидите карточки запросов с входными данными и результатами прямо в чате. Чтобы это работало по-настоящему — вставьте ключ Anthropic в Настройках.</p>
              </div>
            )}
            {messages.map((m, i) => {
              if(m.kind === 'user') return <div key={i} className="asst-msg user">{m.text}</div>;
              if(m.kind === 'bot' || m.kind === 'bot-stream') return (
                <div key={i} className="asst-msg bot">
                  <div className="meta">claude sonnet 4.6 {m.kind === 'bot-stream' ? '· streaming' : ''}</div>
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
              placeholder="Спросите что угодно про CRM — данные, метрики, действия. Я подберу инструменты сам."
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
  return <div style={{padding:'24px'}}><h2 style={{margin:'0 0 8px'}}>Отчёты</h2><p style={{color:'var(--cream-4)'}}>Выгрузки, печатные формы и экспорт по автопарку — в разработке.</p></div>;
}

function App(){
  const [page, setPage] = useState('dash');
  const [mode, setMode] = useState(false);
  useEffect(() => {
    setMode((localStorage.getItem(KEY_STORAGE)||'').startsWith('sk-ant-'));
    function onStorage(){ setMode((localStorage.getItem(KEY_STORAGE)||'').startsWith('sk-ant-')); }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

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
  const ACTIONS = {
    sett: null,
    convo: <button onClick={()=>setPage('sett')}>добавить канал</button>,
    sync: <button onClick={()=>setPage('sett')}>добавить источник</button>,
  };

  return (
    <div className="app">
      <Sidebar page={page} setPage={setPage} mode={mode} />
      <div className="main">
        <Topbar crumb={CRUMB[page]} mode={mode} actions={ACTIONS[page]} />
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
