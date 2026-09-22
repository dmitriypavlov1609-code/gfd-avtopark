const {
  useState,
  useEffect,
  useRef,
  useMemo,
  Fragment
} = React;
const KEY_STORAGE = 'aboba_claude_key';

/* ============================================================ */
/* DATA — реалистичные моковые                                 */
/* ============================================================ */

const INTEGRATIONS = [{
  ic: 'C',
  name: 'Anthropic Claude',
  desc: 'AI-агент автопарка (tool use, отчёты)',
  status: 'connected',
  kind: 'core'
}, {
  ic: 'GS',
  name: 'Google Sheets · Собственный парк',
  desc: 'ТС, статусы, проекты, пробег',
  status: 'planned',
  kind: 'data'
}, {
  ic: 'GS',
  name: 'Google Sheets · Привлечённый парк',
  desc: 'частники, регистрация, маршруты',
  status: 'planned',
  kind: 'data'
}, {
  ic: 'GS',
  name: 'Google Sheets · Магазины',
  desc: 'маршруты по точкам, «в срок %»',
  status: 'planned',
  kind: 'data'
}, {
  ic: 'GS',
  name: 'Google Sheets · Кадры',
  desc: 'кандидаты, проекты, даты выхода',
  status: 'planned',
  kind: 'data'
}, {
  ic: 'TG',
  name: 'Telegram Bot · Отчёты',
  desc: '@otchetRZ_bot — отправка отчётов руководству',
  status: 'planned',
  kind: 'channel'
}, {
  ic: 'XL',
  name: 'Автосинхронизация · VPS',
  desc: 'cron + сервис-аккаунт (как в ОБЕ2)',
  status: 'pending',
  kind: 'data'
}];

/* ============================================================ */
/* CLAUDE STREAM                                                */
/* ============================================================ */
const SYSTEM = `Ты — внутренний AI-помощник автопарка ГФД. Отвечаешь по-русски, кратко и по делу. Помогаешь менеджерам с данными по собственному парку, частникам, магазинам, маршрутам, статистике и кадрам.`;
async function* claudeStream({
  system,
  messages,
  model = 'claude-haiku-4-5-20251001',
  max_tokens = 600
}) {
  const key = localStorage.getItem(KEY_STORAGE) || '';
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model,
      max_tokens,
      system,
      messages,
      stream: true
    })
  });
  if (!r.ok) throw new Error('claude ' + r.status);
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  while (true) {
    const {
      done,
      value
    } = await reader.read();
    if (done) break;
    buf += dec.decode(value, {
      stream: true
    });
    const lines = buf.split('\n');
    buf = lines.pop() || '';
    for (const ln of lines) {
      if (!ln.startsWith('data: ')) continue;
      try {
        const d = JSON.parse(ln.slice(6));
        if (d.type === 'content_block_delta' && d.delta?.type === 'text_delta') yield d.delta.text;
      } catch {}
    }
  }
}
async function* fakeStream(text, perCh = 10) {
  const chunks = text.match(/[\S]+\s*|\s+/g) || [text];
  for (const c of chunks) {
    yield c;
    await new Promise(r => setTimeout(r, perCh * (c.length + Math.random() * 8)));
  }
}

/* ============================================================ */
/* ICONS — minimal inline SVG                                   */
/* ============================================================ */
const Ic = ({
  d,
  w = 16,
  h = 16
}) => /*#__PURE__*/React.createElement("svg", {
  width: w,
  height: h,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.7",
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, d);
const IC = {
  dash: /*#__PURE__*/React.createElement(Ic, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M3 13h8V3H3v10zm10 8h8V11h-8v10zM3 21h8v-6H3v6zM13 3v6h8V3h-8z"
    }))
  }),
  book: /*#__PURE__*/React.createElement(Ic, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "4",
      width: "18",
      height: "18",
      rx: "2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M16 2v4M8 2v4M3 10h18"
    }))
  }),
  car: /*#__PURE__*/React.createElement(Ic, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M5 17h14M3 17V10l3-5h12l3 5v7M3 17v3h3v-3M21 17v3h-3v-3"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "7.5",
      cy: "14",
      r: "1"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "16.5",
      cy: "14",
      r: "1"
    }))
  }),
  chat: /*#__PURE__*/React.createElement(Ic, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
    }))
  }),
  user: /*#__PURE__*/React.createElement(Ic, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "7",
      r: "4"
    }))
  }),
  sync: /*#__PURE__*/React.createElement(Ic, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M23 4v6h-6M1 20v-6h6"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
    }))
  }),
  cog: /*#__PURE__*/React.createElement(Ic, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "3"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
    }))
  }),
  refresh: /*#__PURE__*/React.createElement(Ic, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M23 4v6h-6M1 20v-6h6"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
    }))
  }),
  search: /*#__PURE__*/React.createElement(Ic, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "11",
      cy: "11",
      r: "8"
    }), /*#__PURE__*/React.createElement("path", {
      d: "m21 21-4.35-4.35"
    }))
  }),
  plus: /*#__PURE__*/React.createElement(Ic, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M12 5v14M5 12h14"
    }))
  }),
  send: /*#__PURE__*/React.createElement(Ic, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M22 2 11 13M22 2l-7 20-4-9-9-4z"
    }))
  }),
  spark: /*#__PURE__*/React.createElement(Ic, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M12 2v6M12 16v6M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h6M16 12h6M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24"
    }))
  }),
  tool: /*#__PURE__*/React.createElement(Ic, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
    }))
  })
};

/* ============================================================ */
/* COMPONENTS                                                   */
/* ============================================================ */
const NAV = [{
  id: 'dash',
  label: 'Главный дашборд',
  ic: IC.dash,
  count: ''
}, {
  id: 'fleet',
  label: 'Собственный автопарк',
  ic: IC.car,
  count: '46'
}, {
  id: 'book',
  label: 'Привлечённый парк',
  ic: IC.book,
  count: '32'
}, {
  id: 'cust',
  label: 'Магазины',
  ic: IC.user,
  count: '12'
}, {
  id: 'sync',
  label: 'Статистика',
  ic: IC.sync,
  count: ''
}, {
  id: 'asst',
  label: 'AI агент',
  ic: IC.spark,
  count: 'live',
  highlight: true
}, {
  id: 'convo',
  label: 'Кадры',
  ic: IC.chat,
  count: ''
}];
const NAV_BOTTOM = [{
  id: 'reports',
  label: 'Отчёты',
  ic: IC.book,
  count: ''
}, {
  id: 'sett',
  label: 'Настройки',
  ic: IC.cog,
  count: ''
}];
function Sidebar({
  page,
  setPage,
  mode
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "side"
  }, /*#__PURE__*/React.createElement("div", {
    className: "side-brand"
  }, /*#__PURE__*/React.createElement("div", {
    className: "logo"
  }, "Г"), /*#__PURE__*/React.createElement("div", {
    className: "name"
  }, "ГФД", /*#__PURE__*/React.createElement("small", null, "Автопарк · система учёта"))), /*#__PURE__*/React.createElement("div", {
    className: "side-section"
  }, "Меню"), /*#__PURE__*/React.createElement("div", {
    className: "side-nav"
  }, NAV.map(n => /*#__PURE__*/React.createElement("div", {
    key: n.id,
    className: 'side-item ' + (page === n.id ? 'active' : '') + (n.highlight ? ' highlight' : ''),
    onClick: () => setPage(n.id)
  }, n.ic, /*#__PURE__*/React.createElement("span", null, n.label), n.count && /*#__PURE__*/React.createElement("span", {
    className: 'count ' + (n.count === 'live' ? 'live' : '')
  }, n.count === 'live' ? '● live' : n.count)))), /*#__PURE__*/React.createElement("div", {
    className: "side-section"
  }, "Прочее"), /*#__PURE__*/React.createElement("div", {
    className: "side-nav"
  }, NAV_BOTTOM.map(n => /*#__PURE__*/React.createElement("div", {
    key: n.id,
    className: 'side-item ' + (page === n.id ? 'active' : ''),
    onClick: () => setPage(n.id)
  }, n.ic, /*#__PURE__*/React.createElement("span", null, n.label)))), /*#__PURE__*/React.createElement("div", {
    className: "side-foot"
  }, /*#__PURE__*/React.createElement("div", {
    className: "avatar"
  }, "МК"), /*#__PURE__*/React.createElement("div", {
    className: "user"
  }, "Максим Кравченко", /*#__PURE__*/React.createElement("small", null, "Manager · BG office"))));
}
function Topbar({
  crumb,
  mode,
  actions
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "topbar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "crumb"
  }, crumb.map((c, i) => /*#__PURE__*/React.createElement(Fragment, {
    key: i
  }, i ? /*#__PURE__*/React.createElement("span", {
    style: {
      margin: '0 6px',
      color: 'var(--cream-4)'
    }
  }, "/") : null, i === crumb.length - 1 ? /*#__PURE__*/React.createElement("b", null, c) : /*#__PURE__*/React.createElement("span", null, c)))), /*#__PURE__*/React.createElement("div", {
    className: "search"
  }, IC.search, /*#__PURE__*/React.createElement("input", {
    placeholder: "Поиск…"
  }), /*#__PURE__*/React.createElement("span", {
    className: "key"
  }, "⌘K")), actions);
}

/* ----------------- сортировка таблиц ----------------- */
function useSort(initKey, initDir) {
  const [sortKey, setSortKey] = useState(initKey || null);
  const [dir, setDir] = useState(initDir || 'asc');
  const onSort = k => {
    if (sortKey === k) {
      setDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(k);
      setDir('asc');
    }
  };
  const apply = (rows, acc) => {
    if (!sortKey) return rows;
    const get = acc && acc[sortKey] || (r => r[sortKey]);
    const s = [...rows].sort((a, b) => {
      const va = get(a),
        vb = get(b);
      if (typeof va === 'number' && typeof vb === 'number') return va - vb;
      if (typeof va === 'boolean' && typeof vb === 'boolean') return (va ? 1 : 0) - (vb ? 1 : 0);
      return String(va == null ? '' : va).localeCompare(String(vb == null ? '' : vb), 'ru', {
        numeric: true
      });
    });
    return dir === 'asc' ? s : s.reverse();
  };
  return {
    sortKey,
    dir,
    onSort,
    apply
  };
}
function SortTh({
  k,
  sort,
  children,
  style
}) {
  const active = sort.sortKey === k;
  return /*#__PURE__*/React.createElement("th", {
    onClick: () => sort.onSort(k),
    style: {
      cursor: 'pointer',
      userSelect: 'none',
      whiteSpace: 'nowrap',
      color: active ? 'var(--coral)' : undefined,
      ...(style || {})
    }
  }, children, /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: active ? 1 : .35,
      marginLeft: 4,
      fontSize: 10
    }
  }, active ? sort.dir === 'asc' ? '▲' : '▼' : '⇅'));
}

/* ----------------- DASHBOARD ----------------- */
function Dashboard({
  setPage
}) {
  const [own, setOwn] = useState([]);
  const [hired, setHired] = useState([]);
  const [daily, setDaily] = useState([]);
  const [period, setPeriod] = useState('day');
  useEffect(() => {
    fetch('/data/own-fleet.json').then(r => r.json()).then(setOwn).catch(() => {});
    fetch('/data/hired-fleet.json').then(r => r.json()).then(setHired).catch(() => {});
    fetch('/data/routes.json').then(r => r.json()).then(d => setDaily(d.daily || [])).catch(() => {});
  }, []);
  const PROJ = ['Лемана Про', 'Магнит', 'Х5 Retail', 'Озон', 'ВкусВилл', 'Самокат'];
  const ownOnLine = own.filter(v => v.status === 'На линии');
  const hiredOnLine = hired.filter(h => h.onLine);
  const routesToday = daily.length ? daily[daily.length - 1].routes : 0;
  const routesPrev = daily.length > 1 ? daily[daily.length - 2].routes : 0;
  const routesDelta = routesToday - routesPrev;
  const totalOnLine = ownOnLine.length + hiredOnLine.length;
  const byProject = PROJ.map(p => {
    const o = ownOnLine.filter(v => v.project === p).length;
    const h = hiredOnLine.filter(x => (x.projects || []).includes(p)).length;
    return {
      project: p,
      own: o,
      hired: h,
      total: o + h
    };
  }).sort((a, b) => b.total - a.total);
  const maxProj = Math.max(1, ...byProject.map(p => p.total));
  const series = (() => {
    if (period === 'day') return daily.slice(-30).map(d => ({
      label: d.date.slice(8, 10) + '.' + d.date.slice(5, 7),
      v: d.routes
    }));
    if (period === 'week') {
      const wk = {};
      daily.forEach(d => {
        const dt = new Date(d.date);
        const mon = new Date(dt);
        mon.setDate(dt.getDate() - (dt.getDay() + 6) % 7);
        const k = mon.toISOString().slice(0, 10);
        wk[k] = (wk[k] || 0) + d.routes;
      });
      return Object.entries(wk).slice(-12).map(([k, v]) => ({
        label: k.slice(8, 10) + '.' + k.slice(5, 7),
        v
      }));
    }
    const mo = {};
    const NM = ['', 'янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    daily.forEach(d => {
      const k = d.date.slice(0, 7);
      mo[k] = (mo[k] || 0) + d.routes;
    });
    return Object.entries(mo).slice(-6).map(([k, v]) => ({
      label: NM[+k.slice(5, 7)],
      v
    }));
  })();
  const W = 680,
    H = 210,
    P = 10;
  const max = Math.max(1, ...series.map(s => s.v));
  const min = Math.min(0, ...series.map(s => s.v));
  const n = series.length;
  const xp = i => n > 1 ? P + i * (W - 2 * P) / (n - 1) : W / 2;
  const yp = v => H - P - (v - min) / (max - min || 1) * (H - 2 * P);
  const line = series.map((s, i) => (i ? 'L' : 'M') + xp(i).toFixed(1) + ' ' + yp(s.v).toFixed(1)).join(' ');
  const area = n ? line + ` L ${xp(n - 1).toFixed(1)} ${H - P} L ${xp(0).toFixed(1)} ${H - P} Z` : '';
  const today = new Date();
  const NMO = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const dateStr = today.getDate() + ' ' + NMO[today.getMonth()] + ' ' + today.getFullYear();
  const download = () => {
    let csv = '﻿Главный дашборд · маршруты на ' + dateStr + '\n\n';
    csv += 'Показатель;Значение\n';
    csv += 'Маршрутов сегодня;' + routesToday + '\nТС на линии (всего);' + totalOnLine + '\nСвои на линии;' + ownOnLine.length + '\nЧастники на линии;' + hiredOnLine.length + '\n\n';
    csv += 'Проект;Свои на линии;Частники на линии;Всего на линии\n';
    byProject.forEach(r => {
      csv += `${r.project};${r.own};${r.hired};${r.total}\n`;
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], {
      type: 'text/csv;charset=utf-8'
    }));
    a.download = 'ГФД_маршруты_' + today.toISOString().slice(0, 10) + '.csv';
    a.click();
  };
  const PBTN = (id, txt) => /*#__PURE__*/React.createElement("button", {
    className: period === id ? 'primary' : '',
    onClick: () => setPeriod(id)
  }, txt);
  return /*#__PURE__*/React.createElement(Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "page-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, "Главный дашборд"), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "► маршруты на сегодня · ", dateStr)), /*#__PURE__*/React.createElement("div", {
    className: "actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "primary",
    onClick: download
  }, "↓ Скачать отчёт"))), /*#__PURE__*/React.createElement("div", {
    className: "stats"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "► маршрутов сегодня"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, routesToday), /*#__PURE__*/React.createElement("div", {
    className: "d"
  }, /*#__PURE__*/React.createElement("span", {
    className: 'delta ' + (routesDelta >= 0 ? 'up' : 'down')
  }, routesDelta >= 0 ? '+' : '', routesDelta), /*#__PURE__*/React.createElement("span", {
    className: "lab"
  }, "vs вчера"))), /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "► ТС на линии"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, totalOnLine), /*#__PURE__*/React.createElement("div", {
    className: "d"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lab"
  }, "свои + частники"))), /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "► свои на линии"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, ownOnLine.length), /*#__PURE__*/React.createElement("div", {
    className: "d"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lab"
  }, "из ", own.length, " в парке"))), /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "► частники на линии"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, hiredOnLine.length), /*#__PURE__*/React.createElement("div", {
    className: "d"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lab"
  }, "из ", hired.length, " привлечённых")))), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "Динамика маршрутов"), /*#__PURE__*/React.createElement("div", {
    className: "actions",
    style: {
      display: 'flex',
      gap: 8
    }
  }, PBTN('day', 'день'), PBTN('week', 'неделя'), PBTN('month', 'месяц'))), /*#__PURE__*/React.createElement("div", {
    className: "b"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: `0 0 ${W} ${H}`,
    style: {
      width: '100%',
      height: 210,
      display: 'block'
    },
    preserveAspectRatio: "none"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "rg",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "var(--coral)",
    stopOpacity: "0.35"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "var(--coral)",
    stopOpacity: "0"
  }))), [0.25, 0.5, 0.75].map((g, i) => /*#__PURE__*/React.createElement("line", {
    key: i,
    x1: P,
    x2: W - P,
    y1: P + g * (H - 2 * P),
    y2: P + g * (H - 2 * P),
    stroke: "var(--line)",
    strokeWidth: "1"
  })), area && /*#__PURE__*/React.createElement("path", {
    d: area,
    fill: "url(#rg)"
  }), line && /*#__PURE__*/React.createElement("path", {
    d: line,
    fill: "none",
    stroke: "var(--coral)",
    strokeWidth: "2.5",
    strokeLinejoin: "round",
    strokeLinecap: "round"
  }), n > 0 && /*#__PURE__*/React.createElement("circle", {
    cx: xp(n - 1),
    cy: yp(series[n - 1].v),
    r: "4.5",
    fill: "var(--coral)",
    stroke: "var(--panel)",
    strokeWidth: "2"
  })), /*#__PURE__*/React.createElement("div", {
    className: "util-legend",
    style: {
      marginTop: 6,
      justifyContent: 'space-between',
      color: 'var(--cream-3)',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 10.5
    }
  }, series.filter((_, i) => n <= 12 || i % Math.ceil(n / 12) === 0).map((s, i) => /*#__PURE__*/React.createElement("span", {
    key: i
  }, s.label))))), /*#__PURE__*/React.createElement("div", {
    className: "grid-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "На линии по проектам · сегодня"), /*#__PURE__*/React.createElement("div", {
    className: "m"
  }, totalOnLine, " ТС")), /*#__PURE__*/React.createElement("div", {
    className: "b flush"
  }, /*#__PURE__*/React.createElement("table", {
    className: "tbl"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Проект"), /*#__PURE__*/React.createElement("th", null, "Свои"), /*#__PURE__*/React.createElement("th", null, "Частники"), /*#__PURE__*/React.createElement("th", null, "Всего"), /*#__PURE__*/React.createElement("th", null))), /*#__PURE__*/React.createElement("tbody", null, byProject.map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: i
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    className: "pri"
  }, r.project)), /*#__PURE__*/React.createElement("td", null, r.own), /*#__PURE__*/React.createElement("td", null, r.hired), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("b", {
    style: {
      color: 'var(--cream)'
    }
  }, r.total)), /*#__PURE__*/React.createElement("td", {
    style: {
      width: 120
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 6,
      borderRadius: 4,
      background: 'var(--line)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: r.total / maxProj * 100 + '%',
      background: 'var(--coral)'
    }
  }))))))))), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "Структура выхода на линию"), /*#__PURE__*/React.createElement("div", {
    className: "m"
  }, "свои / частники")), /*#__PURE__*/React.createElement("div", {
    className: "b"
  }, /*#__PURE__*/React.createElement("div", {
    className: "util-bar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "seg rented",
    style: {
      width: (totalOnLine ? ownOnLine.length / totalOnLine * 100 : 50) + '%'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "seg avail",
    style: {
      width: (totalOnLine ? hiredOnLine.length / totalOnLine * 100 : 50) + '%'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "util-legend"
  }, /*#__PURE__*/React.createElement("span", null, "свои ", ownOnLine.length), /*#__PURE__*/React.createElement("span", {
    className: "l2"
  }, "частники ", hiredOnLine.length)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18,
      paddingTop: 18,
      borderTop: '1px solid var(--line)'
    }
  }, [{
    n: 'Маршрутов сегодня',
    v: routesToday
  }, {
    n: 'Своих ТС на линии',
    v: ownOnLine.length + ' / ' + own.length
  }, {
    n: 'Частников на линии',
    v: hiredOnLine.length + ' / ' + hired.length
  }, {
    n: 'Своих в ремонте',
    v: own.filter(v => v.status === 'Ремонт' || v.status === 'Капремонт').length
  }, {
    n: 'Проектов активно',
    v: byProject.filter(p => p.total > 0).length
  }].map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '8px 0',
      borderBottom: i < 4 ? '1px dashed var(--line)' : 'none',
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--cream-2)'
    }
  }, r.n), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 12,
      color: 'var(--cream)'
    }
  }, r.v))))))));
}

/* ----------------- ПРИВЛЕЧЁННЫЙ ПАРК (частники) ----------------- */
function Bookings() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const sort = useSort();
  useEffect(() => {
    fetch('/data/hired-fleet.json?t=' + Date.now()).then(r => r.json()).then(setRows).catch(() => setRows([]));
  }, []);
  const SL = {
    active: 'Активен',
    soon: 'Истекает',
    end: 'Завершён'
  };
  const SC = {
    active: '#5DCB94',
    soon: '#FFB84A',
    end: '#8B8377'
  };
  const pill = s => {
    const c = SC[s] || '#8B8377';
    return /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '11.5px',
        fontWeight: 600,
        padding: '3px 10px',
        borderRadius: '8px',
        color: c,
        background: c + '26',
        whiteSpace: 'nowrap'
      }
    }, SL[s] || s);
  };
  const total = rows.length;
  const onLine = rows.filter(r => r.onLine).length;
  const active = rows.filter(r => r.status === 'active').length;
  const doneRoutes = rows.reduce((s, r) => s + (r.routesDone || 0), 0);
  const filtered = sort.apply(rows.filter(r => {
    const okF = filter === 'all' || (filter === 'online' ? r.onLine : r.status === filter);
    const okQ = !q || (r.plate + ' ' + r.contractor + ' ' + (r.projects || []).join(' ')).toLowerCase().includes(q.toLowerCase());
    return okF && okQ;
  }), {
    contractor: r => r.contractor,
    routesDone: r => r.routesDone,
    projects: r => (r.projects || []).join(', '),
    onLine: r => r.onLine ? 1 : 0
  });
  const download = () => {
    const head = ['Госномер', 'Контрагент', 'Телефон', 'Дата регистрации', 'Маршрутов выполнено', 'Проекты', 'Статус', 'На линии', 'Ставка'];
    const lines = [head.join(';'), ...rows.map(r => [r.plate, r.contractor, r.phone, r.registered, r.routesDone, (r.projects || []).join(', '), SL[r.status] || r.status, r.onLine ? 'да' : 'нет', r.rate].join(';'))];
    const blob = new Blob(['﻿' + lines.join('\r\n')], {
      type: 'text/csv;charset=utf-8'
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ГФД_привлечённый_парк_' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  const FB = (id, txt) => /*#__PURE__*/React.createElement("button", {
    onClick: () => setFilter(id),
    style: {
      borderColor: filter === id ? 'var(--coral)' : 'var(--line-2)',
      color: filter === id ? 'var(--coral)' : 'var(--cream-2)'
    }
  }, txt);
  return /*#__PURE__*/React.createElement(Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "page-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, "Привлечённый парк"), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "► частники · регистрация, маршруты, проекты")), /*#__PURE__*/React.createElement("div", {
    className: "actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "primary",
    onClick: download
  }, "↓ Скачать отчёт"))), /*#__PURE__*/React.createElement("div", {
    className: "stats"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "► всего частников"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, total), /*#__PURE__*/React.createElement("div", {
    className: "d"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lab"
  }, "в реестре"))), /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "► на линии сегодня"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, onLine), /*#__PURE__*/React.createElement("div", {
    className: "d"
  }, /*#__PURE__*/React.createElement("span", {
    className: "delta up"
  }, total ? Math.round(onLine / total * 100) : 0, "%"), /*#__PURE__*/React.createElement("span", {
    className: "lab"
  }, "от реестра"))), /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "► активные договоры"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, active), /*#__PURE__*/React.createElement("div", {
    className: "d"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lab"
  }, "не завершены"))), /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "► маршрутов выполнено"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, doneRoutes.toLocaleString('ru-RU')), /*#__PURE__*/React.createElement("div", {
    className: "d"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lab"
  }, "за всё время")))), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "Реестр частников"), /*#__PURE__*/React.createElement("div", {
    className: "actions",
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'center',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "поиск: номер / ИП / проект",
    style: {
      background: 'var(--panel-2)',
      border: '1px solid var(--line-2)',
      borderRadius: 8,
      color: 'var(--cream)',
      padding: '6px 10px',
      fontSize: 12,
      minWidth: 200
    }
  }), FB('all', 'все'), FB('online', 'на линии'), FB('active', 'активные'), FB('soon', 'истекают'), FB('end', 'завершённые'))), /*#__PURE__*/React.createElement("div", {
    className: "b flush"
  }, /*#__PURE__*/React.createElement("table", {
    className: "tbl"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement(SortTh, {
    k: "plate",
    sort: sort
  }, "Госномер"), /*#__PURE__*/React.createElement(SortTh, {
    k: "contractor",
    sort: sort
  }, "Контрагент"), /*#__PURE__*/React.createElement(SortTh, {
    k: "registered",
    sort: sort
  }, "Регистрация"), /*#__PURE__*/React.createElement(SortTh, {
    k: "routesDone",
    sort: sort
  }, "Маршрутов"), /*#__PURE__*/React.createElement(SortTh, {
    k: "projects",
    sort: sort
  }, "Проекты"), /*#__PURE__*/React.createElement(SortTh, {
    k: "rate",
    sort: sort
  }, "Ставка"), /*#__PURE__*/React.createElement(SortTh, {
    k: "onLine",
    sort: sort
  }, "На линии"), /*#__PURE__*/React.createElement(SortTh, {
    k: "status",
    sort: sort
  }, "Статус"))), /*#__PURE__*/React.createElement("tbody", null, filtered.map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: i
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    className: "id"
  }, r.plate)), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    className: "pri"
  }, r.contractor), /*#__PURE__*/React.createElement("span", {
    className: "sec"
  }, r.phone)), /*#__PURE__*/React.createElement("td", {
    style: {
      color: 'var(--cream-3)',
      fontSize: 12
    }
  }, r.registered), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("b", {
    style: {
      color: 'var(--cream)'
    }
  }, r.routesDone)), /*#__PURE__*/React.createElement("td", {
    style: {
      fontSize: 12,
      color: 'var(--cream-2)',
      maxWidth: 220
    }
  }, (r.projects || []).join(', ')), /*#__PURE__*/React.createElement("td", {
    style: {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 12
    }
  }, r.rate, " ₽"), /*#__PURE__*/React.createElement("td", null, r.onLine ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--green)',
      fontWeight: 600
    }
  }, "● да") : /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--cream-3)'
    }
  }, "—")), /*#__PURE__*/React.createElement("td", null, pill(r.status)))))))));
}

/* ----------------- FLEET ----------------- */
function Fleet() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const sort = useSort();
  useEffect(() => {
    fetch('/data/own-fleet.json?t=' + Date.now()).then(r => r.json()).then(setRows).catch(() => setRows([]));
  }, []);
  const SC = {
    'На линии': '#5DCB94',
    'Ремонт': '#FFB84A',
    'Капремонт': '#FF6464',
    'Резерв': '#4A8FA8'
  };
  const pill = s => {
    const c = SC[s] || '#8B8377';
    return /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '11.5px',
        fontWeight: 600,
        padding: '3px 10px',
        borderRadius: '8px',
        color: c,
        background: c + '26',
        whiteSpace: 'nowrap'
      }
    }, s);
  };
  const total = rows.length,
    on = rows.filter(v => v.status === 'На линии').length;
  const gaz = rows.filter(v => v.kind === 'Газель').length,
    larg = rows.filter(v => v.kind === 'Ларгус').length;
  const rem = rows.filter(v => v.status === 'Ремонт' || v.status === 'Капремонт').length;
  const pm = {};
  rows.forEach(v => {
    pm[v.project] = pm[v.project] || {
      t: 0,
      on: 0
    };
    pm[v.project].t++;
    if (v.status === 'На линии') pm[v.project].on++;
  });
  const projects = Object.entries(pm).sort((a, b) => b[1].t - a[1].t);
  const fleetRows = sort.apply(rows.filter(v => !q || [v.plate, v.brand, v.type, v.kind, v.project, v.status, v.atp].join(' ').toLowerCase().includes(q.toLowerCase())), {
    brand: v => v.brand + ' ' + v.type,
    ready: v => v.ready ? 1 : 0
  });
  const download = () => {
    const head = ['Госномер', 'Марка', 'Тип', 'Класс', 'Проект', 'Статус', 'Готовность', 'Пробег', 'АТП'];
    const lines = [head.join(';'), ...rows.map(v => [v.plate, v.brand, v.type, v.kind, v.project, v.status, v.ready ? 'исправна' : '—', v.mileage, v.atp].join(';'))];
    const blob = new Blob(['﻿' + lines.join('\r\n')], {
      type: 'text/csv;charset=utf-8'
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ГФД_собственный_парк_' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  return /*#__PURE__*/React.createElement(Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "page-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, "Собственный автопарк"), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "► ", total, " ТС · исправных ", on, " · в ремонте ", rem)), /*#__PURE__*/React.createElement("div", {
    className: "actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "primary",
    onClick: download
  }, "↓ Скачать отчёт"))), /*#__PURE__*/React.createElement("div", {
    className: "stats"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "► всего ТС"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, total), /*#__PURE__*/React.createElement("div", {
    className: "d"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lab"
  }, "собственный парк"))), /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "► исправные · на линии"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, on), /*#__PURE__*/React.createElement("div", {
    className: "d"
  }, /*#__PURE__*/React.createElement("span", {
    className: "delta up"
  }, total ? Math.round(on / total * 100) : 0, "%"), /*#__PURE__*/React.createElement("span", {
    className: "lab"
  }, "готовность"))), /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "► газели"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, gaz), /*#__PURE__*/React.createElement("div", {
    className: "d"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lab"
  }, "осн. развоз"))), /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "► ларгусы"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, larg), /*#__PURE__*/React.createElement("div", {
    className: "d"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lab"
  }, "лёгкий развоз"))), /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "► в ремонте"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, rem), /*#__PURE__*/React.createElement("div", {
    className: "d"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lab"
  }, "требуют внимания")))), /*#__PURE__*/React.createElement("div", {
    className: "grid-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "По проектам"), /*#__PURE__*/React.createElement("div", {
    className: "m"
  }, "на линии / всего")), /*#__PURE__*/React.createElement("div", {
    className: "b"
  }, projects.map(([p, x]) => /*#__PURE__*/React.createElement("div", {
    key: p,
    style: {
      marginBottom: '13px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '13px',
      marginBottom: '6px'
    }
  }, /*#__PURE__*/React.createElement("span", null, p), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--cream-3)',
      fontFamily: "'JetBrains Mono',monospace"
    }
  }, x.on, "/", x.t)), /*#__PURE__*/React.createElement("div", {
    style: {
      height: '8px',
      borderRadius: '5px',
      background: 'var(--bg-4)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: (x.t ? Math.round(x.on / x.t * 100) : 0) + '%',
      background: 'linear-gradient(90deg,var(--coral),var(--coral-deep))'
    }
  })))))), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "Структура")), /*#__PURE__*/React.createElement("div", {
    className: "b"
  }, [['Газели', gaz, '#FF6B47'], ['Ларгусы / каблуки', larg, '#4A8FA8'], ['Исправные', on, '#5DCB94'], ['В ремонте', rem, '#FFB84A']].map(a => /*#__PURE__*/React.createElement("div", {
    key: a[0],
    style: {
      marginBottom: '13px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '13px',
      marginBottom: '6px'
    }
  }, /*#__PURE__*/React.createElement("span", null, a[0]), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'JetBrains Mono',monospace",
      fontWeight: 600
    }
  }, a[1])), /*#__PURE__*/React.createElement("div", {
    style: {
      height: '8px',
      borderRadius: '5px',
      background: 'var(--bg-4)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: (total ? Math.round(a[1] / total * 100) : 0) + '%',
      background: a[2]
    }
  }))))))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      marginTop: '16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "Список ТС"), /*#__PURE__*/React.createElement("div", {
    className: "actions",
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "поиск: номер / марка / проект / АТП",
    style: {
      background: 'var(--panel-2)',
      border: '1px solid var(--line-2)',
      borderRadius: 8,
      color: 'var(--cream)',
      padding: '6px 10px',
      fontSize: 12,
      minWidth: 220
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "m"
  }, fleetRows.length, " / ", total))), /*#__PURE__*/React.createElement("div", {
    className: "b flush"
  }, /*#__PURE__*/React.createElement("table", {
    className: "tbl"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement(SortTh, {
    k: "plate",
    sort: sort
  }, "Госномер"), /*#__PURE__*/React.createElement(SortTh, {
    k: "brand",
    sort: sort
  }, "Марка / тип"), /*#__PURE__*/React.createElement(SortTh, {
    k: "project",
    sort: sort
  }, "Проект"), /*#__PURE__*/React.createElement(SortTh, {
    k: "status",
    sort: sort
  }, "Статус"), /*#__PURE__*/React.createElement(SortTh, {
    k: "ready",
    sort: sort
  }, "Готовность"), /*#__PURE__*/React.createElement(SortTh, {
    k: "mileage",
    sort: sort
  }, "Пробег"), /*#__PURE__*/React.createElement(SortTh, {
    k: "atp",
    sort: sort
  }, "АТП"))), /*#__PURE__*/React.createElement("tbody", null, fleetRows.map(v => /*#__PURE__*/React.createElement("tr", {
    key: v.plate
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    className: "pri"
  }, v.plate)), /*#__PURE__*/React.createElement("td", null, v.brand, /*#__PURE__*/React.createElement("span", {
    className: "sec"
  }, v.type)), /*#__PURE__*/React.createElement("td", null, v.project), /*#__PURE__*/React.createElement("td", null, pill(v.status)), /*#__PURE__*/React.createElement("td", {
    style: {
      color: v.ready ? 'var(--green)' : 'var(--cream-4)'
    }
  }, v.ready ? 'исправна' : '—'), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    className: "id"
  }, v.mileage.toLocaleString('ru-RU'))), /*#__PURE__*/React.createElement("td", {
    style: {
      color: 'var(--cream-3)'
    }
  }, v.atp))))))));
}

/* ----------------- КАДРЫ (кандидаты) ----------------- */
function Conversations() {
  const [rows, setRows] = useState([]);
  const [fs, setFs] = useState('all');
  const [fp, setFp] = useState('all');
  const [q, setQ] = useState('');
  const sort = useSort();
  useEffect(() => {
    fetch('/data/candidates.json?t=' + Date.now()).then(r => r.json()).then(setRows).catch(() => setRows([]));
  }, []);
  const SC = {
    'новый': '#4A8FA8',
    'собеседование': '#FFB84A',
    'оформление': '#FF6B47',
    'принят': '#5DCB94',
    'отказ': '#8B8377'
  };
  const pill = s => {
    const c = SC[s] || '#8B8377';
    return /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '11.5px',
        fontWeight: 600,
        padding: '3px 10px',
        borderRadius: '8px',
        color: c,
        background: c + '26',
        whiteSpace: 'nowrap'
      }
    }, s);
  };
  const total = rows.length;
  const lemana = rows.filter(c => c.project === 'Лемана Про').length;
  const hired = rows.filter(c => c.status === 'принят').length;
  const inWork = rows.filter(c => c.status === 'собеседование' || c.status === 'оформление').length;
  const projects = [...new Set(rows.map(c => c.project))];
  const filtered = sort.apply(rows.filter(c => (fs === 'all' || c.status === fs) && (fp === 'all' || c.project === fp) && (!q || [c.name, c.project, c.position, c.source, c.phone].join(' ').toLowerCase().includes(q.toLowerCase()))), {
    name: c => c.name,
    startDay: c => c.startDay.split('.').reverse().join(''),
    applied: c => c.applied.split('.').reverse().join('')
  });

  // по дням выхода
  const dmap = {};
  rows.forEach(c => {
    if (c.status !== 'отказ') dmap[c.startDay] = (dmap[c.startDay] || 0) + 1;
  });
  const byDay = Object.entries(dmap).sort((a, b) => {
    const p = s => s.split('.').reverse().join('');
    return p(a[0]) < p(b[0]) ? -1 : 1;
  }).slice(0, 8);
  const maxDay = Math.max(1, ...byDay.map(d => d[1]));
  const download = () => {
    const head = ['ФИО', 'Телефон', 'Проект', 'Должность', 'Дата заявки', 'Дата выхода', 'Статус', 'Источник'];
    const lines = [head.join(';'), ...rows.map(c => [c.name, c.phone, c.project, c.position, c.applied, c.startDay, c.status, c.source].join(';'))];
    const blob = new Blob(['﻿' + lines.join('\r\n')], {
      type: 'text/csv;charset=utf-8'
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ГФД_кадры_' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  const FB = (id, txt) => /*#__PURE__*/React.createElement("button", {
    onClick: () => setFs(id),
    style: {
      borderColor: fs === id ? 'var(--coral)' : 'var(--line-2)',
      color: fs === id ? 'var(--coral)' : 'var(--cream-2)'
    }
  }, txt);
  return /*#__PURE__*/React.createElement(Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "page-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, "Кадры"), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "► кандидаты на проекты · выход по дням")), /*#__PURE__*/React.createElement("div", {
    className: "actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "primary",
    onClick: download
  }, "↓ Скачать отчёт"))), /*#__PURE__*/React.createElement("div", {
    className: "stats"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "► всего кандидатов"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, total), /*#__PURE__*/React.createElement("div", {
    className: "d"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lab"
  }, "в воронке"))), /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "► на Лемана Про"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, lemana), /*#__PURE__*/React.createElement("div", {
    className: "d"
  }, /*#__PURE__*/React.createElement("span", {
    className: "delta up"
  }, total ? Math.round(lemana / total * 100) : 0, "%"), /*#__PURE__*/React.createElement("span", {
    className: "lab"
  }, "от всех"))), /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "► принято"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, hired), /*#__PURE__*/React.createElement("div", {
    className: "d"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lab"
  }, "оформлены"))), /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "► в работе"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, inWork), /*#__PURE__*/React.createElement("div", {
    className: "d"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lab"
  }, "собеседование / оформление")))), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "Выход кандидатов по дням"), /*#__PURE__*/React.createElement("div", {
    className: "m"
  }, "ближайшие даты")), /*#__PURE__*/React.createElement("div", {
    className: "b"
  }, byDay.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '7px 0',
      borderBottom: i < byDay.length - 1 ? '1px dashed var(--line)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 12,
      color: 'var(--cream-2)',
      minWidth: 80
    }
  }, d[0]), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 8,
      borderRadius: 5,
      background: 'var(--line)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: d[1] / maxDay * 100 + '%',
      background: 'var(--coral)'
    }
  })), /*#__PURE__*/React.createElement("b", {
    style: {
      color: 'var(--cream)',
      minWidth: 22,
      textAlign: 'right'
    }
  }, d[1]))))), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "Кандидаты"), /*#__PURE__*/React.createElement("div", {
    className: "actions",
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'center',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "поиск: ФИО / должность / источник",
    style: {
      background: 'var(--panel-2)',
      border: '1px solid var(--line-2)',
      borderRadius: 8,
      color: 'var(--cream)',
      padding: '6px 10px',
      fontSize: 12,
      minWidth: 200
    }
  }), /*#__PURE__*/React.createElement("select", {
    value: fp,
    onChange: e => setFp(e.target.value),
    style: {
      background: 'var(--panel-2)',
      border: '1px solid var(--line-2)',
      borderRadius: 8,
      color: 'var(--cream)',
      padding: '6px 10px',
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: "all"
  }, "Все проекты"), projects.map((p, i) => /*#__PURE__*/React.createElement("option", {
    key: i,
    value: p
  }, p))), FB('all', 'все'), FB('новый', 'новые'), FB('собеседование', 'собес.'), FB('оформление', 'оформл.'), FB('принят', 'приняты'))), /*#__PURE__*/React.createElement("div", {
    className: "b flush"
  }, /*#__PURE__*/React.createElement("table", {
    className: "tbl"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement(SortTh, {
    k: "name",
    sort: sort
  }, "ФИО"), /*#__PURE__*/React.createElement(SortTh, {
    k: "project",
    sort: sort
  }, "Проект"), /*#__PURE__*/React.createElement(SortTh, {
    k: "position",
    sort: sort
  }, "Должность"), /*#__PURE__*/React.createElement(SortTh, {
    k: "applied",
    sort: sort
  }, "Заявка"), /*#__PURE__*/React.createElement(SortTh, {
    k: "startDay",
    sort: sort
  }, "Выход"), /*#__PURE__*/React.createElement(SortTh, {
    k: "source",
    sort: sort
  }, "Источник"), /*#__PURE__*/React.createElement(SortTh, {
    k: "status",
    sort: sort
  }, "Статус"))), /*#__PURE__*/React.createElement("tbody", null, filtered.map((c, i) => /*#__PURE__*/React.createElement("tr", {
    key: i
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    className: "pri"
  }, c.name), /*#__PURE__*/React.createElement("span", {
    className: "sec"
  }, c.phone)), /*#__PURE__*/React.createElement("td", {
    style: {
      fontSize: 12,
      color: 'var(--cream-2)'
    }
  }, c.project), /*#__PURE__*/React.createElement("td", {
    style: {
      fontSize: 12,
      color: 'var(--cream-2)'
    }
  }, c.position), /*#__PURE__*/React.createElement("td", {
    style: {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 11.5,
      color: 'var(--cream-3)'
    }
  }, c.applied), /*#__PURE__*/React.createElement("td", {
    style: {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 11.5,
      color: 'var(--cream)'
    }
  }, c.startDay), /*#__PURE__*/React.createElement("td", {
    style: {
      fontSize: 12,
      color: 'var(--cream-3)'
    }
  }, c.source), /*#__PURE__*/React.createElement("td", null, pill(c.status)))))))));
}

/* ----------------- CUSTOMERS ----------------- */
function Customers() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const sort = useSort();
  useEffect(() => {
    fetch('/data/stores.json?t=' + Date.now()).then(r => r.json()).then(setRows).catch(() => setRows([]));
  }, []);
  const total = rows.length;
  const active = rows.filter(s => s.status === 'active').length;
  const rToday = rows.reduce((a, s) => a + (s.routesToday || 0), 0);
  const rMonth = rows.reduce((a, s) => a + (s.routesMonth || 0), 0);
  const avgOT = rows.length ? Math.round(rows.reduce((a, s) => a + (s.onTime || 0), 0) / rows.length) : 0;
  const maxT = Math.max(1, ...rows.map(s => s.routesToday || 0));
  const storeRows = sort.apply(rows.filter(s => !q || [s.id, s.name, s.city, s.address, s.project].join(' ').toLowerCase().includes(q.toLowerCase())), {});
  const stpill = s => {
    const c = s === 'active' ? '#5DCB94' : '#FFB84A';
    return /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '11.5px',
        fontWeight: 600,
        padding: '3px 10px',
        borderRadius: '8px',
        color: c,
        background: c + '26'
      }
    }, s === 'active' ? 'Работает' : 'Пауза');
  };
  const download = () => {
    const head = ['ID', 'Магазин', 'Город', 'Адрес', 'Проект', 'Маршрутов сегодня', 'Маршрутов за месяц', 'Свои ТС', 'Частники', 'В срок %', 'Статус'];
    const lines = [head.join(';'), ...rows.map(s => [s.id, s.name, s.city, s.address, s.project, s.routesToday, s.routesMonth, s.ownCars, s.hiredCars, s.onTime, s.status === 'active' ? 'работает' : 'пауза'].join(';'))];
    const blob = new Blob(['﻿' + lines.join('\r\n')], {
      type: 'text/csv;charset=utf-8'
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ГФД_магазины_' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  return /*#__PURE__*/React.createElement(Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "page-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, "Магазины"), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "► точки обслуживания · маршруты и закреплённый транспорт")), /*#__PURE__*/React.createElement("div", {
    className: "actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "primary",
    onClick: download
  }, "↓ Скачать отчёт"))), /*#__PURE__*/React.createElement("div", {
    className: "stats"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "► всего магазинов"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, total), /*#__PURE__*/React.createElement("div", {
    className: "d"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lab"
  }, "точек"))), /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "► работают"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, active), /*#__PURE__*/React.createElement("div", {
    className: "d"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lab"
  }, "активных сегодня"))), /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "► маршрутов сегодня"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, rToday), /*#__PURE__*/React.createElement("div", {
    className: "d"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lab"
  }, "по всем точкам"))), /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "► в срок · среднее"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, avgOT, "%"), /*#__PURE__*/React.createElement("div", {
    className: "d"
  }, /*#__PURE__*/React.createElement("span", {
    className: "delta up"
  }, "за месяц ", rMonth.toLocaleString('ru-RU'))))), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "Список магазинов"), /*#__PURE__*/React.createElement("div", {
    className: "actions",
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "поиск: магазин / город / проект",
    style: {
      background: 'var(--panel-2)',
      border: '1px solid var(--line-2)',
      borderRadius: 8,
      color: 'var(--cream)',
      padding: '6px 10px',
      fontSize: 12,
      minWidth: 200
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "m"
  }, storeRows.length, " / ", total))), /*#__PURE__*/React.createElement("div", {
    className: "b flush"
  }, /*#__PURE__*/React.createElement("table", {
    className: "tbl"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement(SortTh, {
    k: "id",
    sort: sort
  }, "ID"), /*#__PURE__*/React.createElement(SortTh, {
    k: "name",
    sort: sort
  }, "Магазин"), /*#__PURE__*/React.createElement(SortTh, {
    k: "project",
    sort: sort
  }, "Проект"), /*#__PURE__*/React.createElement(SortTh, {
    k: "routesToday",
    sort: sort
  }, "Маршр. сегодня"), /*#__PURE__*/React.createElement(SortTh, {
    k: "routesMonth",
    sort: sort
  }, "За месяц"), /*#__PURE__*/React.createElement(SortTh, {
    k: "ownCars",
    sort: sort
  }, "Свои"), /*#__PURE__*/React.createElement(SortTh, {
    k: "hiredCars",
    sort: sort
  }, "Частники"), /*#__PURE__*/React.createElement(SortTh, {
    k: "onTime",
    sort: sort
  }, "В срок"), /*#__PURE__*/React.createElement(SortTh, {
    k: "status",
    sort: sort
  }, "Статус"))), /*#__PURE__*/React.createElement("tbody", null, storeRows.map((s, i) => /*#__PURE__*/React.createElement("tr", {
    key: i
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    className: "id"
  }, s.id)), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    className: "pri"
  }, s.name), /*#__PURE__*/React.createElement("span", {
    className: "sec"
  }, s.address)), /*#__PURE__*/React.createElement("td", {
    style: {
      fontSize: 12,
      color: 'var(--cream-2)'
    }
  }, s.project), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("b", {
    style: {
      color: 'var(--cream)'
    }
  }, s.routesToday), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 5,
      minWidth: 40,
      borderRadius: 4,
      background: 'var(--line)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: s.routesToday / maxT * 100 + '%',
      background: 'var(--coral)'
    }
  })))), /*#__PURE__*/React.createElement("td", {
    style: {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 12
    }
  }, s.routesMonth), /*#__PURE__*/React.createElement("td", null, s.ownCars), /*#__PURE__*/React.createElement("td", null, s.hiredCars), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    style: {
      color: s.onTime >= 95 ? 'var(--green)' : 'var(--warn)',
      fontWeight: 600
    }
  }, s.onTime, "%")), /*#__PURE__*/React.createElement("td", null, stpill(s.status)))))))));
}

/* ----------------- СТАТИСТИКА (закрытые маршруты) ----------------- */
function SyncPage() {
  const [rows, setRows] = useState([]);
  const [store, setStore] = useState('all');
  const sort = useSort();
  useEffect(() => {
    fetch('/data/stats.json?t=' + Date.now()).then(r => r.json()).then(d => setRows(d.rows || [])).catch(() => setRows([]));
  }, []);
  const stores = [...new Set(rows.map(r => r.store))];
  const scoped = store === 'all' ? rows : rows.filter(r => r.store === store);
  const closed = scoped.reduce((a, r) => a + r.closed, 0);
  const planned = scoped.reduce((a, r) => a + r.planned, 0);
  const compl = planned ? Math.round(closed / planned * 100) : 0;
  const avgOT = scoped.length ? Math.round(scoped.reduce((a, r) => a + r.onTime, 0) / scoped.length) : 0;
  const byStore = stores.map(s => {
    const rs = rows.filter(r => r.store === s);
    const c = rs.reduce((a, r) => a + r.closed, 0),
      p = rs.reduce((a, r) => a + r.planned, 0);
    return {
      store: s,
      project: rs[0] ? rs[0].project : '',
      closed: c,
      planned: p,
      compl: p ? Math.round(c / p * 100) : 0,
      ot: rs.length ? Math.round(rs.reduce((a, r) => a + r.onTime, 0) / rs.length) : 0
    };
  }).sort((a, b) => b.closed - a.closed);
  const dmap = {};
  scoped.forEach(r => {
    dmap[r.date] = (dmap[r.date] || 0) + r.closed;
  });
  const series = Object.entries(dmap).sort().map(([d, v]) => ({
    label: d.slice(8, 10) + '.' + d.slice(5, 7),
    v
  }));
  const W = 680,
    H = 190,
    P = 10,
    n = series.length;
  const max = Math.max(1, ...series.map(s => s.v)),
    min = Math.min(0, ...series.map(s => s.v));
  const xp = i => n > 1 ? P + i * (W - 2 * P) / (n - 1) : W / 2,
    yp = v => H - P - (v - min) / (max - min || 1) * (H - 2 * P);
  const line = series.map((s, i) => (i ? 'L' : 'M') + xp(i).toFixed(1) + ' ' + yp(s.v).toFixed(1)).join(' ');
  const area = n ? line + ` L ${xp(n - 1).toFixed(1)} ${H - P} L ${xp(0).toFixed(1)} ${H - P} Z` : '';
  const download = () => {
    const head = ['Магазин', 'Проект', 'Закрыто маршрутов', 'Запланировано', 'Выполнение %', 'В срок %'];
    const lines = [head.join(';'), ...byStore.map(s => [s.store, s.project, s.closed, s.planned, s.compl, s.ot].join(';'))];
    const blob = new Blob(['﻿' + lines.join('\r\n')], {
      type: 'text/csv;charset=utf-8'
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ГФД_статистика_маршрутов_' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  return /*#__PURE__*/React.createElement(Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "page-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, "Статистика"), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "► закрытые маршруты по магазинам · последние 30 дней")), /*#__PURE__*/React.createElement("div", {
    className: "actions",
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("select", {
    value: store,
    onChange: e => setStore(e.target.value),
    style: {
      background: 'var(--panel-2)',
      border: '1px solid var(--line-2)',
      borderRadius: 8,
      color: 'var(--cream)',
      padding: '6px 10px',
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: "all"
  }, "Все магазины"), stores.map((s, i) => /*#__PURE__*/React.createElement("option", {
    key: i,
    value: s
  }, s))), /*#__PURE__*/React.createElement("button", {
    className: "primary",
    onClick: download
  }, "↓ Скачать отчёт"))), /*#__PURE__*/React.createElement("div", {
    className: "stats"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "► закрыто маршрутов"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, closed.toLocaleString('ru-RU')), /*#__PURE__*/React.createElement("div", {
    className: "d"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lab"
  }, "за 30 дней"))), /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "► выполнение плана"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, compl, "%"), /*#__PURE__*/React.createElement("div", {
    className: "d"
  }, /*#__PURE__*/React.createElement("span", {
    className: 'delta ' + (compl >= 90 ? 'up' : 'down')
  }, closed, "/", planned))), /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "► в срок · среднее"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, avgOT, "%"), /*#__PURE__*/React.createElement("div", {
    className: "d"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lab"
  }, "по выборке"))), /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "► магазинов в отчёте"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, store === 'all' ? stores.length : 1), /*#__PURE__*/React.createElement("div", {
    className: "d"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lab"
  }, "точек")))), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "Динамика закрытых маршрутов"), /*#__PURE__*/React.createElement("div", {
    className: "m"
  }, store === 'all' ? 'все магазины' : store)), /*#__PURE__*/React.createElement("div", {
    className: "b"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: `0 0 ${W} ${H}`,
    style: {
      width: '100%',
      height: 190,
      display: 'block'
    },
    preserveAspectRatio: "none"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "sg",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "var(--coral)",
    stopOpacity: "0.32"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "var(--coral)",
    stopOpacity: "0"
  }))), [0.33, 0.66].map((g, i) => /*#__PURE__*/React.createElement("line", {
    key: i,
    x1: P,
    x2: W - P,
    y1: P + g * (H - 2 * P),
    y2: P + g * (H - 2 * P),
    stroke: "var(--line)",
    strokeWidth: "1"
  })), area && /*#__PURE__*/React.createElement("path", {
    d: area,
    fill: "url(#sg)"
  }), line && /*#__PURE__*/React.createElement("path", {
    d: line,
    fill: "none",
    stroke: "var(--coral)",
    strokeWidth: "2.5",
    strokeLinejoin: "round"
  }), n > 0 && /*#__PURE__*/React.createElement("circle", {
    cx: xp(n - 1),
    cy: yp(series[n - 1].v),
    r: "4",
    fill: "var(--coral)"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "По магазинам · итоги 30 дней"), /*#__PURE__*/React.createElement("div", {
    className: "m"
  }, byStore.length, " точек")), /*#__PURE__*/React.createElement("div", {
    className: "b flush"
  }, /*#__PURE__*/React.createElement("table", {
    className: "tbl"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement(SortTh, {
    k: "store",
    sort: sort
  }, "Магазин"), /*#__PURE__*/React.createElement(SortTh, {
    k: "project",
    sort: sort
  }, "Проект"), /*#__PURE__*/React.createElement(SortTh, {
    k: "closed",
    sort: sort
  }, "Закрыто"), /*#__PURE__*/React.createElement(SortTh, {
    k: "planned",
    sort: sort
  }, "План"), /*#__PURE__*/React.createElement(SortTh, {
    k: "compl",
    sort: sort
  }, "Выполнение"), /*#__PURE__*/React.createElement(SortTh, {
    k: "ot",
    sort: sort
  }, "В срок"))), /*#__PURE__*/React.createElement("tbody", null, (sort.sortKey ? sort.apply(byStore, {}) : byStore).map((s, i) => /*#__PURE__*/React.createElement("tr", {
    key: i,
    style: {
      cursor: 'pointer'
    },
    onClick: () => setStore(s.store)
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    className: "pri"
  }, s.store)), /*#__PURE__*/React.createElement("td", {
    style: {
      fontSize: 12,
      color: 'var(--cream-2)'
    }
  }, s.project), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("b", {
    style: {
      color: 'var(--cream)'
    }
  }, s.closed)), /*#__PURE__*/React.createElement("td", {
    style: {
      color: 'var(--cream-3)'
    }
  }, s.planned), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: s.compl >= 90 ? 'var(--green)' : 'var(--warn)',
      fontWeight: 600,
      minWidth: 34
    }
  }, s.compl, "%"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 5,
      minWidth: 40,
      borderRadius: 4,
      background: 'var(--line)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: s.compl + '%',
      background: s.compl >= 90 ? 'var(--green)' : 'var(--warn)'
    }
  })))), /*#__PURE__*/React.createElement("td", null, s.ot, "%"))))))));
}

/* ----------------- SETTINGS ----------------- */
function Settings() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(KEY_STORAGE) || '');
  const [saved, setSaved] = useState(false);
  function save() {
    if (apiKey.trim()) localStorage.setItem(KEY_STORAGE, apiKey.trim());else localStorage.removeItem(KEY_STORAGE);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      window.location.reload();
    }, 700);
  }
  return /*#__PURE__*/React.createElement(Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "page-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, "Настройки"), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "► интеграции · API-ключи · команда"))), /*#__PURE__*/React.createElement("div", {
    className: "grid-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "AI-движок · Claude"), /*#__PURE__*/React.createElement("div", {
    className: "m"
  }, "опубликовать ключ")), /*#__PURE__*/React.createElement("div", {
    className: "b"
  }, /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "API key Anthropic"), /*#__PURE__*/React.createElement("input", {
    type: "password",
    value: apiKey,
    onChange: e => setApiKey(e.target.value),
    placeholder: "sk-ant-…"
  }), /*#__PURE__*/React.createElement("div", {
    className: "help"
  }, "Ключ хранится в браузере (localStorage), отправляется напрямую в Anthropic API. ", /*#__PURE__*/React.createElement("a", {
    href: "https://console.anthropic.com/settings/keys",
    target: "_blank"
  }, "получить ключ →"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "primary",
    onClick: save
  }, saved ? '✓ сохранено' : 'сохранить'), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setApiKey('');
      localStorage.removeItem(KEY_STORAGE);
      window.location.reload();
    }
  }, "очистить")))), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "Параметры модели")), /*#__PURE__*/React.createElement("div", {
    className: "b"
  }, /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "модель AI-агента (tool use)"), /*#__PURE__*/React.createElement("input", {
    value: "claude-sonnet-5",
    readOnly: true
  }), /*#__PURE__*/React.createElement("div", {
    className: "help"
  }, "Работает с данными автопарка через инструменты, готовит отчёты.")), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "модель быстрых сводок"), /*#__PURE__*/React.createElement("input", {
    value: "claude-haiku-4-5",
    readOnly: true
  }), /*#__PURE__*/React.createElement("div", {
    className: "help"
  }, "Быстрые ответы и короткие сводки по парку и маршрутам."))))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 14
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "Интеграции"), /*#__PURE__*/React.createElement("div", {
    className: "m"
  }, INTEGRATIONS.length, " сервисов")), /*#__PURE__*/React.createElement("div", {
    className: "b flush"
  }, INTEGRATIONS.map((it, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "integration"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ico"
  }, it.ic), /*#__PURE__*/React.createElement("div", {
    className: "info"
  }, /*#__PURE__*/React.createElement("div", {
    className: "name"
  }, it.name), /*#__PURE__*/React.createElement("div", {
    className: "desc"
  }, it.desc)), /*#__PURE__*/React.createElement("div", {
    className: "right"
  }, it.status === 'connected' && /*#__PURE__*/React.createElement("span", {
    className: "pill avail"
  }, "подключено"), it.status === 'pending' && /*#__PURE__*/React.createElement("span", {
    className: "pill pending"
  }, "ожидает"), it.status === 'review' && /*#__PURE__*/React.createElement("span", {
    className: "pill maint"
  }, "в обзоре"), it.status === 'disconnected' && /*#__PURE__*/React.createElement("span", {
    className: "pill cancelled"
  }, "отключено"), it.status === 'planned' && /*#__PURE__*/React.createElement("span", {
    className: "pill done"
  }, "в плане"), /*#__PURE__*/React.createElement("button", null, "настроить")))))));
}

/* ============================================================ */
/* AI ASSISTANT WITH TOOL USE                                   */
/* ============================================================ */
const GFD = {
  own: [],
  hired: [],
  stores: [],
  stats: [],
  candidates: [],
  routes: []
};
async function loadGFD() {
  const j = async u => {
    try {
      return await (await fetch(u + '?t=' + Date.now())).json();
    } catch (e) {
      return null;
    }
  };
  const [o, h, s, st, c, r] = await Promise.all([j('/data/own-fleet.json'), j('/data/hired-fleet.json'), j('/data/stores.json'), j('/data/stats.json'), j('/data/candidates.json'), j('/data/routes.json')]);
  if (o) GFD.own = o;
  if (h) GFD.hired = h;
  if (s) GFD.stores = s;
  if (st) GFD.stats = st.rows || [];
  if (c) GFD.candidates = c;
  if (r) GFD.routes = r.daily || [];
}
const SYSTEM_ASSISTANT = `Ты — внутренний AI-помощник менеджеров автопарка ГФД. Работаешь как агент с набором инструментов для работы с системой учёта.

ПРИНЦИПЫ:
- Когда спрашивают про данные (собственный парк, частники, магазины, маршруты, статистика, кадры) — обязательно вызывай нужный инструмент, не отвечай по памяти.
- Если задача многошаговая — вызывай инструменты последовательно.
- В финальном ответе кратко резюмируй результат. По-русски, по делу, без воды.
- Числа всегда бери из инструментов, никогда не выдумывай.
- Если данных не хватает — задай ОДИН уточняющий вопрос.

КОНТЕКСТ: автопарк ГФД возит маршруты для магазинов (Лемана Про, Магнит, Х5, Озон, ВкусВилл, Самокат). Есть собственные ТС (газели, ларгусы) и привлечённые частники. Кадры — кандидаты-водители на проекты.`;
const TOOLS = [{
  name: 'query_own_fleet',
  description: 'Filter own vehicles (собственный автопарк). Use for own cars, on-line count, repairs, by project.',
  input_schema: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['На линии', 'Ремонт', 'Капремонт', 'Резерв', 'all']
      },
      kind: {
        type: 'string',
        enum: ['Газель', 'Ларгус']
      },
      project: {
        type: 'string',
        description: 'Partial project name'
      }
    }
  }
}, {
  name: 'query_hired',
  description: 'Filter contractors (привлечённый парк / частники): registration, routes done, projects, who is on line.',
  input_schema: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['active', 'soon', 'end', 'all']
      },
      on_line: {
        type: 'boolean'
      },
      project: {
        type: 'string'
      }
    }
  }
}, {
  name: 'query_stores',
  description: 'Filter stores (магазины): routes per store today/month, assigned vehicles, on-time %.',
  input_schema: {
    type: 'object',
    properties: {
      project: {
        type: 'string'
      },
      status: {
        type: 'string',
        enum: ['active', 'pause', 'all']
      }
    }
  }
}, {
  name: 'query_candidates',
  description: 'Filter candidates (кадры): hiring pipeline, candidates per project (esp. Лемана Про), start days.',
  input_schema: {
    type: 'object',
    properties: {
      project: {
        type: 'string'
      },
      status: {
        type: 'string',
        enum: ['новый', 'собеседование', 'оформление', 'принят', 'отказ']
      }
    }
  }
}, {
  name: 'get_stats',
  description: 'Returns an aggregate metric. Use for KPI questions.',
  input_schema: {
    type: 'object',
    properties: {
      metric: {
        type: 'string',
        enum: ['routes_today', 'on_line_total', 'on_line_own', 'on_line_hired', 'closed_routes_30d', 'by_project_today', 'fleet_condition']
      }
    },
    required: ['metric']
  }
}, {
  name: 'send_report',
  description: 'Queue a report to be sent to management via Telegram. Use when user asks to send/prepare a report to Telegram.',
  input_schema: {
    type: 'object',
    properties: {
      report: {
        type: 'string',
        description: 'собственный парк / частники / магазины / статистика / кадры / сводный'
      },
      channel: {
        type: 'string',
        enum: ['telegram']
      }
    },
    required: ['report']
  }
}];
const TOOL_LABELS = {
  query_own_fleet: 'Собственный парк',
  query_hired: 'Привлечённый парк (частники)',
  query_stores: 'Магазины',
  query_candidates: 'Кадры (кандидаты)',
  get_stats: 'Метрики и статистика',
  send_report: 'Отправить отчёт в Telegram'
};
const TOOL_DESCRIPTIONS = {
  query_own_fleet: 'AI ищет свои ТС по статусу (на линии / ремонт / резерв), классу (газель/ларгус), проекту. Примеры: «Сколько газелей на линии?», «Что в ремонте?», «Свои ТС на Лемана Про»',
  query_hired: 'AI находит частников по статусу, проектам, кто на линии; считает выполненные маршруты. Примеры: «Сколько частников на линии?», «Кто возит Магнит?», «Договоры, что скоро истекают»',
  query_stores: 'AI смотрит магазины: маршруты сегодня/за месяц, закреплённые свои/частники, «в срок %». Примеры: «Маршруты по магазинам сегодня», «Какие точки на Озоне?»',
  query_candidates: 'AI работает с кадрами: кандидаты по проектам и статусам, даты выхода. Примеры: «Сколько кандидатов на Лемана Про?», «Кто оформляется на этой неделе?»',
  get_stats: 'AI достаёт метрики: маршрутов сегодня, на линии свои/частники, закрытые маршруты за 30 дней, разбивка по проектам, состояние парка. Примеры: «Сколько маршрутов сегодня?», «Выполнение плана за месяц»',
  send_report: 'AI ставит отчёт в очередь на отправку руководству в Telegram (как в ОБЕ2). Примеры: «Отправь сводный отчёт в ТГ», «Пришли отчёт по частникам»'
};
function execTool(name, input) {
  const D = GFD;
  if (name === 'query_own_fleet') {
    let r = [...D.own];
    if (input.status && input.status !== 'all') r = r.filter(v => v.status === input.status);
    if (input.kind) r = r.filter(v => v.kind === input.kind);
    if (input.project) r = r.filter(v => (v.project || '').toLowerCase().includes(input.project.toLowerCase()));
    return {
      count: r.length,
      on_line: r.filter(v => v.status === 'На линии').length,
      vehicles: r.slice(0, 12).map(v => ({
        plate: v.plate,
        brand: v.brand,
        kind: v.kind,
        project: v.project,
        status: v.status,
        atp: v.atp
      }))
    };
  }
  if (name === 'query_hired') {
    let r = [...D.hired];
    if (input.status && input.status !== 'all') r = r.filter(h => h.status === input.status);
    if (typeof input.on_line === 'boolean') r = r.filter(h => !!h.onLine === input.on_line);
    if (input.project) r = r.filter(h => (h.projects || []).some(p => p.toLowerCase().includes(input.project.toLowerCase())));
    return {
      count: r.length,
      on_line: r.filter(h => h.onLine).length,
      total_routes_done: r.reduce((s, h) => s + (h.routesDone || 0), 0),
      contractors: r.slice(0, 12).map(h => ({
        plate: h.plate,
        contractor: h.contractor,
        registered: h.registered,
        routes_done: h.routesDone,
        projects: h.projects,
        status: h.status,
        on_line: h.onLine
      }))
    };
  }
  if (name === 'query_stores') {
    let r = [...D.stores];
    if (input.project) r = r.filter(s => (s.project || '').toLowerCase().includes(input.project.toLowerCase()));
    if (input.status && input.status !== 'all') r = r.filter(s => s.status === input.status);
    return {
      count: r.length,
      routes_today_total: r.reduce((s, x) => s + (x.routesToday || 0), 0),
      stores: r.slice(0, 12).map(s => ({
        id: s.id,
        name: s.name,
        project: s.project,
        routes_today: s.routesToday,
        routes_month: s.routesMonth,
        own_cars: s.ownCars,
        hired_cars: s.hiredCars,
        on_time_pct: s.onTime,
        status: s.status
      }))
    };
  }
  if (name === 'query_candidates') {
    let r = [...D.candidates];
    if (input.project) r = r.filter(c => (c.project || '').toLowerCase().includes(input.project.toLowerCase()));
    if (input.status) r = r.filter(c => c.status === input.status);
    return {
      count: r.length,
      hired: r.filter(c => c.status === 'принят').length,
      candidates: r.slice(0, 12).map(c => ({
        name: c.name,
        project: c.project,
        position: c.position,
        applied: c.applied,
        start_day: c.startDay,
        status: c.status,
        source: c.source
      }))
    };
  }
  if (name === 'get_stats') {
    const own = D.own,
      hired = D.hired,
      routes = D.routes,
      stats = D.stats;
    const ownOn = own.filter(v => v.status === 'На линии').length;
    const hiredOn = hired.filter(h => h.onLine).length;
    const routesToday = routes.length ? routes[routes.length - 1].routes : 0;
    const closed = stats.reduce((a, r) => a + r.closed, 0),
      planned = stats.reduce((a, r) => a + r.planned, 0);
    const PROJ = ['Лемана Про', 'Магнит', 'Х5 Retail', 'Озон', 'ВкусВилл', 'Самокат'];
    const M = {
      routes_today: {
        value: routesToday,
        unit: 'маршрутов'
      },
      on_line_total: {
        value: ownOn + hiredOn,
        own: ownOn,
        hired: hiredOn
      },
      on_line_own: {
        value: ownOn,
        of_total: own.length
      },
      on_line_hired: {
        value: hiredOn,
        of_total: hired.length
      },
      closed_routes_30d: {
        value: closed,
        planned: planned,
        completion_pct: planned ? Math.round(closed / planned * 100) : 0
      },
      by_project_today: PROJ.map(p => ({
        project: p,
        own: own.filter(v => v.status === 'На линии' && v.project === p).length,
        hired: hired.filter(h => h.onLine && (h.projects || []).includes(p)).length
      })),
      fleet_condition: {
        on_line: ownOn,
        repair: own.filter(v => v.status === 'Ремонт' || v.status === 'Капремонт').length,
        reserve: own.filter(v => v.status === 'Резерв').length,
        total: own.length
      }
    };
    return M[input.metric] || {
      error: 'unknown metric'
    };
  }
  if (name === 'send_report') {
    return {
      status: 'queued',
      report: input.report || 'сводный',
      channel: input.channel || 'telegram',
      recipient: '@otchetRZ_bot · ЛС руководителя',
      eta: '1-2 минуты',
      note: 'Отправка в Telegram настраивается через VPS + Xray-прокси, как в ОБЕ2.',
      report_id: 'RPT-' + Math.floor(Math.random() * 99999)
    };
  }
  return {
    error: 'unknown tool: ' + name
  };
}
/* call Claude with tools (non-streaming for simplicity in tool loop) */
async function callClaudeWithTools({
  messages,
  system,
  tools,
  model = 'claude-sonnet-5',
  max_tokens = 2000
}) {
  const key = (localStorage.getItem(KEY_STORAGE) || '').trim();
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model,
      max_tokens,
      system,
      messages,
      tools
    })
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error('claude ' + r.status + ' · ' + err.slice(0, 200));
  }
  return r.json();
}

/* run agent loop: keep calling Claude until no more tool_use */
async function runAgent({
  prompt,
  history,
  onEvent,
  onError
}) {
  history.push({
    role: 'user',
    content: prompt
  });
  onEvent({
    type: 'user',
    text: prompt
  });
  let safetyMax = 6;
  while (safetyMax-- > 0) {
    onEvent({
      type: 'thinking'
    });
    let response;
    try {
      response = await callClaudeWithTools({
        messages: history,
        system: SYSTEM_ASSISTANT,
        tools: TOOLS
      });
    } catch (err) {
      onError(err.message);
      return;
    }
    onEvent({
      type: 'thinking_done'
    });
    history.push({
      role: 'assistant',
      content: response.content
    });
    // process content blocks
    for (const block of response.content) {
      if (block.type === 'text' && block.text) {
        onEvent({
          type: 'text',
          text: block.text
        });
      } else if (block.type === 'tool_use') {
        onEvent({
          type: 'tool_start',
          id: block.id,
          name: block.name,
          input: block.input
        });
        const result = execTool(block.name, block.input);
        onEvent({
          type: 'tool_end',
          id: block.id,
          name: block.name,
          output: result
        });
      }
    }
    if (response.stop_reason !== 'tool_use') {
      onEvent({
        type: 'done'
      });
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
  online: {
    text_pre: 'Сейчас посмотрю, сколько ТС на линии.',
    tools: [{
      name: 'get_stats',
      input: {
        metric: 'on_line_total'
      },
      delay: 450
    }, {
      name: 'get_stats',
      input: {
        metric: 'by_project_today'
      },
      delay: 500
    }],
    text_post: 'Готово — сводка на линии в карточках выше: свои + частники и разбивка по проектам. Нужно — выгружу в отчёт или отправлю в Telegram.'
  },
  repair: {
    text_pre: 'Проверю собственный парк в ремонте.',
    tools: [{
      name: 'query_own_fleet',
      input: {
        status: 'Ремонт'
      },
      delay: 500
    }],
    text_post: 'Показал ТС в ремонте (карточка выше) — по каждой видно проект и АТП. Могу добавить капремонт и резерв.'
  },
  candidates: {
    text_pre: 'Смотрю кандидатов на Лемана Про.',
    tools: [{
      name: 'query_candidates',
      input: {
        project: 'Лемана Про'
      },
      delay: 550
    }],
    text_post: 'Кандидаты на Лемана Про — в карточке выше, с датами выхода и статусом воронки. Могу отфильтровать только оформляющихся.'
  },
  stores: {
    text_pre: 'Проверю магазины и выполнение плана.',
    tools: [{
      name: 'query_stores',
      input: {},
      delay: 500
    }, {
      name: 'get_stats',
      input: {
        metric: 'closed_routes_30d'
      },
      delay: 450
    }],
    text_post: 'Данные по магазинам и выполнению плана за 30 дней — выше. Точки ниже 90% стоит взять на контроль.'
  },
  report: {
    text_pre: 'Подготовлю сводный отчёт и поставлю на отправку в Telegram.',
    tools: [{
      name: 'get_stats',
      input: {
        metric: 'on_line_total'
      },
      delay: 400
    }, {
      name: 'send_report',
      input: {
        report: 'сводный',
        channel: 'telegram'
      },
      delay: 700
    }],
    text_post: 'Сводный отчёт поставлен в очередь на отправку в Telegram руководству. Реальная отправка подключается через VPS + Xray-прокси, как в ОБЕ2.'
  },
  default: {
    text_pre: 'Сейчас разберусь.',
    tools: [{
      name: 'get_stats',
      input: {
        metric: 'routes_today'
      },
      delay: 450
    }],
    text_post: 'Готово — ключевая цифра в карточке выше. Могу разложить по проектам, магазинам или парку.'
  }
};
function pickDemoScript(prompt) {
  const p = (prompt || '').toLowerCase();
  if (p.includes('на линии') || p.includes('линии') || p.includes('свои и частник')) return DEMO_SCRIPTS.online;
  if (p.includes('ремонт') || p.includes('капремонт') || p.includes('сломан')) return DEMO_SCRIPTS.repair;
  if (p.includes('кандидат') || p.includes('кадр') || p.includes('лемана') || p.includes('выход')) return DEMO_SCRIPTS.candidates;
  if (p.includes('магазин') || p.includes('план') || p.includes('в срок') || p.includes('точк')) return DEMO_SCRIPTS.stores;
  if (p.includes('отчёт') || p.includes('отчет') || p.includes('telegram') || p.includes('тг') || p.includes('отправ')) return DEMO_SCRIPTS.report;
  return DEMO_SCRIPTS.default;
}
async function* fakeText(text, perCh = 8) {
  const chunks = text.match(/[\S]+\s*|\s+/g) || [text];
  for (const c of chunks) {
    yield c;
    await new Promise(r => setTimeout(r, perCh * (c.length + Math.random() * 6)));
  }
}
async function runDemoAgent({
  prompt,
  onEvent
}) {
  onEvent({
    type: 'user',
    text: prompt
  });
  const script = pickDemoScript(prompt);
  // pre-text streamed
  onEvent({
    type: 'thinking'
  });
  await new Promise(r => setTimeout(r, 300));
  onEvent({
    type: 'thinking_done'
  });
  let preAcc = '';
  for await (const chunk of fakeText(script.text_pre, 10)) {
    preAcc += chunk;
    onEvent({
      type: 'text_stream',
      text: preAcc
    });
  }
  // tools
  for (const t of script.tools) {
    const id = 'demo-' + Math.random().toString(36).slice(2, 8);
    onEvent({
      type: 'tool_start',
      id,
      name: t.name,
      input: t.input
    });
    await new Promise(r => setTimeout(r, t.delay));
    onEvent({
      type: 'tool_end',
      id,
      name: t.name,
      output: execTool(t.name, t.input)
    });
  }
  // post-text streamed
  await new Promise(r => setTimeout(r, 300));
  let postAcc = '';
  for await (const chunk of fakeText(script.text_post, 8)) {
    postAcc += chunk;
    onEvent({
      type: 'text_stream',
      text: postAcc
    });
  }
  onEvent({
    type: 'done'
  });
}

/* ----------------- ASSISTANT CHAT PAGE ----------------- */
const SUGGESTIONS = [{
  label: 'Сколько ТС на линии сегодня — свои и частники?',
  prompt: 'Сколько ТС на линии сегодня — свои и частники, и разбивка по проектам?'
}, {
  label: 'Покажи собственный парк в ремонте',
  prompt: 'Покажи собственные ТС в ремонте и капремонте'
}, {
  label: 'Сколько кандидатов на Лемана Про и когда выходят?',
  prompt: 'Сколько кандидатов на Лемана Про и какие даты выхода?'
}, {
  label: 'Какие магазины ниже плана?',
  prompt: 'Покажи магазины и выполнение плана за 30 дней — где ниже 90%?'
}, {
  label: 'Сколько частников на линии и кто возит Магнит?',
  prompt: 'Сколько частников на линии и кто из них возит Магнит?'
}, {
  label: 'Подготовь сводный отчёт и отправь в Telegram',
  prompt: 'Подготовь сводный отчёт по автопарку и отправь в Telegram руководству'
}];
function ToolCallCard({
  call
}) {
  const [open, setOpen] = useState(false);
  const inputStr = JSON.stringify(call.input, null, 2);
  const inputCompact = Object.entries(call.input).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(', ');
  return /*#__PURE__*/React.createElement("div", {
    className: "tool-call"
  }, /*#__PURE__*/React.createElement("div", {
    className: "head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "nm"
  }, TOOL_LABELS[call.name] || call.name, /*#__PURE__*/React.createElement("i", {
    className: "en"
  }, call.name)), /*#__PURE__*/React.createElement("span", {
    className: 'status ' + (call.output ? 'done' : 'running')
  }, call.output ? '✓ ' : /*#__PURE__*/React.createElement("span", {
    className: "pulse"
  }), call.output ? 'done' : 'running')), /*#__PURE__*/React.createElement("div", {
    className: "input"
  }, /*#__PURE__*/React.createElement("b", null, "input:"), " ", inputCompact || '{}'), call.output && /*#__PURE__*/React.createElement("div", {
    className: "output"
  }, /*#__PURE__*/React.createElement("pre", null, renderToolOutput(call.name, call.output))));
}
function renderToolOutput(name, out) {
  if (out.error) return '⚠ ' + out.error;
  if (name === 'query_own_fleet') {
    return `${out.count} ТС · на линии ${out.on_line}\n` + (out.vehicles || []).slice(0, 6).map(v => `  • ${v.plate} · ${v.brand} · ${v.kind} · ${v.project} · ${v.status}`).join('\n');
  }
  if (name === 'query_hired') {
    return `${out.count} частников · на линии ${out.on_line} · маршрутов всего ${out.total_routes_done}\n` + (out.contractors || []).slice(0, 6).map(h => `  • ${h.plate} · ${h.contractor} · ${h.routes_done} маршр. · ${(h.projects || []).join(', ')} · ${h.on_line ? 'на линии' : '—'}`).join('\n');
  }
  if (name === 'query_stores') {
    return `${out.count} магазинов · маршрутов сегодня ${out.routes_today_total}\n` + (out.stores || []).slice(0, 6).map(s => `  • ${s.name} · сегодня ${s.routes_today} · свои ${s.own_cars}/частн. ${s.hired_cars} · в срок ${s.on_time_pct}%`).join('\n');
  }
  if (name === 'query_candidates') {
    return `${out.count} кандидатов · принято ${out.hired}\n` + (out.candidates || []).slice(0, 6).map(c => `  • ${c.name} · ${c.project} · ${c.position} · выход ${c.start_day} · ${c.status}`).join('\n');
  }
  if (name === 'get_stats') {
    if (Array.isArray(out)) return out.map(r => `  • ${r.project}: свои ${r.own} / частники ${r.hired}`).join('\n');
    if (typeof out === 'object') return Object.entries(out).map(([k, v]) => `  ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join('\n');
    return String(out);
  }
  if (name === 'send_report') {
    return `► статус: ${out.status}\n► отчёт: ${out.report}\n► канал: ${out.channel} (${out.recipient})\n► ETA: ${out.eta}\n► id: ${out.report_id}\n► ${out.note}`;
  }
  return JSON.stringify(out, null, 2).slice(0, 500);
}
function AssistantChat() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const historyRef = useRef([]);
  const bodyRef = useRef(null);
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages]);
  useEffect(() => {
    loadGFD();
  }, []);
  function appendItem(item) {
    setMessages(m => [...m, item]);
  }
  function updateLast(updater) {
    setMessages(m => {
      const next = [...m];
      next[next.length - 1] = updater(next[next.length - 1]);
      return next;
    });
  }
  function updateToolById(id, updater) {
    setMessages(m => m.map(item => item.kind === 'tool' && item.id === id ? updater(item) : item));
  }
  async function send(text) {
    if (!text.trim() || busy) return;
    setBusy(true);
    setDraft('');
    appendItem({
      kind: 'user',
      text
    });
    if (!GFD.own.length) await loadGFD();
    const isLive = (localStorage.getItem(KEY_STORAGE) || '').startsWith('sk-ant-');
    const onEvent = e => {
      if (e.type === 'user') return;
      if (e.type === 'thinking') {
        // could show typing
      }
      if (e.type === 'thinking_done') {
        // noop
      }
      if (e.type === 'text') {
        appendItem({
          kind: 'bot',
          text: e.text
        });
      }
      if (e.type === 'text_stream') {
        // accumulating stream (demo mode)
        setMessages(m => {
          const last = m[m.length - 1];
          if (last && last.kind === 'bot-stream') {
            return [...m.slice(0, -1), {
              ...last,
              text: e.text
            }];
          }
          return [...m, {
            kind: 'bot-stream',
            text: e.text
          }];
        });
      }
      if (e.type === 'tool_start') {
        appendItem({
          kind: 'tool',
          id: e.id,
          name: e.name,
          input: e.input,
          output: null
        });
      }
      if (e.type === 'tool_end') {
        updateToolById(e.id, t => ({
          ...t,
          output: e.output
        }));
      }
      if (e.type === 'done') {
        // finalize bot-stream into bot
        setMessages(m => m.map(item => item.kind === 'bot-stream' ? {
          kind: 'bot',
          text: item.text
        } : item));
        setBusy(false);
      }
    };
    const onError = msg => {
      appendItem({
        kind: 'bot',
        text: '⚠ Ошибка: ' + msg + '\n\nПереключаюсь на demo-режим.'
      });
      runDemoAgent({
        prompt: text,
        onEvent
      }).finally(() => setBusy(false));
    };
    if (isLive) {
      try {
        await runAgent({
          prompt: text,
          history: historyRef.current,
          onEvent,
          onError
        });
      } catch (err) {
        onError(err.message);
      }
    } else {
      await runDemoAgent({
        prompt: text,
        onEvent
      });
    }
  }
  return /*#__PURE__*/React.createElement(Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "page-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, "AI агент"), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "► claude sonnet 5 · 6 инструментов · работает с данными автопарка")), /*#__PURE__*/React.createElement("div", {
    className: "actions"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setMessages([]);
      historyRef.current = [];
    }
  }, "новый чат"))), /*#__PURE__*/React.createElement("div", {
    className: "asst-host"
  }, /*#__PURE__*/React.createElement("div", {
    className: "asst-main"
  }, /*#__PURE__*/React.createElement("div", {
    className: "asst-body",
    ref: bodyRef
  }, messages.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "asst-greeting"
  }, /*#__PURE__*/React.createElement("h4", null, "Чем помочь?"), /*#__PURE__*/React.createElement("p", null, "Я работаю с системой учёта автопарка: смотрю собственный парк и частников, магазины и маршруты, статистику и кадры; считаю метрики; готовлю отчёты и ставлю их на отправку в Telegram."), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 8
    }
  }, "Все вызовы происходят через ", /*#__PURE__*/React.createElement("code", null, "tool use"), " — увидите карточки запросов с входными данными и результатами прямо в чате. Чтобы это работало по-настоящему — вставьте ключ Anthropic в Настройках.")), messages.map((m, i) => {
    if (m.kind === 'user') return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "asst-msg user"
    }, m.text);
    if (m.kind === 'bot' || m.kind === 'bot-stream') return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "asst-msg bot"
    }, /*#__PURE__*/React.createElement("div", {
      className: "meta"
    }, "claude sonnet 5 ", m.kind === 'bot-stream' ? '· streaming' : ''), /*#__PURE__*/React.createElement("div", {
      className: "body"
    }, m.text));
    if (m.kind === 'tool') return /*#__PURE__*/React.createElement(ToolCallCard, {
      key: i,
      call: m
    });
    return null;
  }), busy && messages.length > 0 && messages[messages.length - 1].kind !== 'bot-stream' && /*#__PURE__*/React.createElement("div", {
    className: "typing"
  }, /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null))), /*#__PURE__*/React.createElement("form", {
    className: "asst-input",
    onSubmit: e => {
      e.preventDefault();
      send(draft);
    }
  }, /*#__PURE__*/React.createElement("textarea", {
    value: draft,
    onChange: e => setDraft(e.target.value),
    placeholder: "Спросите про автопарк — парк, частники, магазины, маршруты, кадры. Я подберу инструменты сам.",
    onKeyDown: e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send(draft);
      }
    },
    rows: 2,
    disabled: busy
  }), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    className: "primary",
    disabled: busy || !draft.trim()
  }, busy ? '…' : 'отправить'))), /*#__PURE__*/React.createElement("div", {
    className: "asst-side"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "Подсказки")), /*#__PURE__*/React.createElement("div", {
    className: "b"
  }, /*#__PURE__*/React.createElement("div", {
    className: "asst-suggest"
  }, SUGGESTIONS.map((s, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    className: "sg",
    onClick: () => send(s.prompt),
    disabled: busy
  }, s.label))))), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "Доступные инструменты"), /*#__PURE__*/React.createElement("div", {
    className: "m"
  }, TOOLS.length)), /*#__PURE__*/React.createElement("div", {
    className: "b flush"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tool-list"
  }, TOOLS.map((t, i) => /*#__PURE__*/React.createElement("details", {
    key: i,
    className: "t-detail"
  }, /*#__PURE__*/React.createElement("summary", {
    className: "t"
  }, TOOL_LABELS[t.name] || t.name), /*#__PURE__*/React.createElement("div", {
    className: "t-desc"
  }, TOOL_DESCRIPTIONS[t.name] || "")))))))));
}

/* ============================================================ */
/* APP                                                          */
/* ============================================================ */
function Reports() {
  const REP = [{
    key: 'own',
    t: 'Собственный автопарк',
    d: 'ТС · статусы, проекты, пробег, АТП',
    f: '/data/own-fleet.csv',
    n: 'ГФД_собственный_парк'
  }, {
    key: 'hired',
    t: 'Привлечённый парк',
    d: 'частники · регистрация, маршруты, проекты',
    f: '/data/hired-fleet.csv',
    n: 'ГФД_привлечённый_парк'
  }, {
    key: 'stores',
    t: 'Магазины',
    d: 'точки · маршруты, транспорт, «в срок %»',
    f: '/data/stores.csv',
    n: 'ГФД_магазины'
  }, {
    key: 'candidates',
    t: 'Кадры',
    d: 'кандидаты · проекты, даты выхода, статусы',
    f: '/data/candidates.csv',
    n: 'ГФД_кадры'
  }, {
    key: 'stats',
    t: 'Статистика маршрутов',
    d: 'закрытые маршруты по магазинам · план · 30 дней',
    f: null,
    n: 'ГФД_статистика_маршрутов'
  }, {
    key: 'summary',
    t: 'Сводный отчёт',
    d: 'ключевые показатели автопарка на сегодня',
    f: null,
    n: 'ГФД_сводный'
  }];
  const [status, setStatus] = useState({});
  const dl = async r => {
    try {
      let text;
      if (r.f) {
        text = await (await fetch(r.f + '?t=' + Date.now())).text();
      } else if (r.key === 'stats') {
        const d = await (await fetch('/data/stats.json?t=' + Date.now())).json();
        const rows = d.rows || [];
        const stores = [...new Set(rows.map(x => x.store))];
        const agg = stores.map(s => {
          const rs = rows.filter(x => x.store === s);
          const c = rs.reduce((a, x) => a + x.closed, 0),
            p = rs.reduce((a, x) => a + x.planned, 0);
          return [s, rs[0] ? rs[0].project : '', c, p, p ? Math.round(c / p * 100) : 0, rs.length ? Math.round(rs.reduce((a, x) => a + x.onTime, 0) / rs.length) : 0];
        });
        text = '﻿' + [['Магазин', 'Проект', 'Закрыто маршрутов', 'Запланировано', 'Выполнение %', 'В срок %'].join(';'), ...agg.map(x => x.join(';'))].join('\r\n');
      } else {
        const [own, hired, stores, routes] = await Promise.all(['/data/own-fleet.json', '/data/hired-fleet.json', '/data/stores.json', '/data/routes.json'].map(u => fetch(u + '?t=' + Date.now()).then(x => x.json())));
        const ownOn = own.filter(v => v.status === 'На линии').length,
          hiredOn = hired.filter(h => h.onLine).length;
        const rt = (routes.daily || []).length ? routes.daily[routes.daily.length - 1].routes : 0;
        text = '﻿' + [['Показатель', 'Значение'].join(';'), ['Маршрутов сегодня', rt].join(';'), ['ТС на линии (всего)', ownOn + hiredOn].join(';'), ['Свои на линии', ownOn].join(';'), ['Частники на линии', hiredOn].join(';'), ['Магазинов', stores.length].join(';')].join('\r\n');
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([text], {
        type: 'text/csv;charset=utf-8'
      }));
      a.download = r.n + '_' + new Date().toISOString().slice(0, 10) + '.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {}
  };
  const sendTG = async r => {
    setStatus(s => ({
      ...s,
      [r.key]: '…'
    }));
    try {
      const res = await fetch('/api/send-report', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          report: r.key
        })
      });
      const out = await res.json();
      setStatus(s => ({
        ...s,
        [r.key]: out.ok ? '✓ отправлено' : '⚠ ' + (out.error || 'ошибка')
      }));
    } catch (e) {
      setStatus(s => ({
        ...s,
        [r.key]: '⚠ сеть'
      }));
    }
    setTimeout(() => setStatus(s => ({
      ...s,
      [r.key]: undefined
    })), 4000);
  };
  return /*#__PURE__*/React.createElement(Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "page-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, "Отчёты"), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "► выгрузки по автопарку · CSV (Excel) · отправка в Telegram (@gfd_otchet_bot)"))), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "Доступные отчёты"), /*#__PURE__*/React.createElement("div", {
    className: "m"
  }, "CSV · UTF-8")), /*#__PURE__*/React.createElement("div", {
    className: "b flush"
  }, REP.map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "sync-row",
    style: {
      borderBottom: i < REP.length - 1 ? '1px solid var(--line)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ico"
  }, "CSV"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "name"
  }, r.t), /*#__PURE__*/React.createElement("div", {
    className: "desc"
  }, r.d)), /*#__PURE__*/React.createElement("div", null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'center'
    }
  }, status[r.key] && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: status[r.key][0] === '✓' ? 'var(--green)' : status[r.key] === '…' ? 'var(--cream-3)' : 'var(--warn)'
    }
  }, status[r.key]), /*#__PURE__*/React.createElement("button", {
    className: "primary",
    onClick: () => dl(r)
  }, "↓ Скачать"), /*#__PURE__*/React.createElement("button", {
    onClick: () => sendTG(r),
    disabled: status[r.key] === '…'
  }, "✈ В Telegram")))))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 14
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "Отправка в Telegram"), /*#__PURE__*/React.createElement("div", {
    className: "m"
  }, "@gfd_otchet_bot")), /*#__PURE__*/React.createElement("div", {
    className: "b"
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--cream-2)',
      fontSize: 13,
      margin: 0,
      lineHeight: 1.6
    }
  }, "Кнопка «✈ В Telegram» отправляет отчёт файлом в чат руководителя через бота ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: 'var(--cream)'
    }
  }, "@gfd_otchet_bot"), ". Автоматическая рассылка по расписанию — следующим шагом (по схеме ОБЕ2)."))));
}
function App() {
  const [page, setPage] = useState('dash');
  const [mode, setMode] = useState(false);
  useEffect(() => {
    setMode((localStorage.getItem(KEY_STORAGE) || '').startsWith('sk-ant-'));
    function onStorage() {
      setMode((localStorage.getItem(KEY_STORAGE) || '').startsWith('sk-ant-'));
    }
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
    sett: ['ГФД CRM', 'Настройки']
  };
  const ACTIONS = {};
  return /*#__PURE__*/React.createElement("div", {
    className: "app"
  }, /*#__PURE__*/React.createElement(Sidebar, {
    page: page,
    setPage: setPage,
    mode: mode
  }), /*#__PURE__*/React.createElement("div", {
    className: "main"
  }, /*#__PURE__*/React.createElement(Topbar, {
    crumb: CRUMB[page],
    mode: mode,
    actions: ACTIONS[page]
  }), /*#__PURE__*/React.createElement("div", {
    className: "content"
  }, page === 'dash' && /*#__PURE__*/React.createElement(Dashboard, {
    setPage: setPage
  }), page === 'asst' && /*#__PURE__*/React.createElement(AssistantChat, null), page === 'book' && /*#__PURE__*/React.createElement(Bookings, null), page === 'fleet' && /*#__PURE__*/React.createElement(Fleet, null), page === 'convo' && /*#__PURE__*/React.createElement(Conversations, null), page === 'cust' && /*#__PURE__*/React.createElement(Customers, null), page === 'sync' && /*#__PURE__*/React.createElement(SyncPage, null), page === 'sett' && /*#__PURE__*/React.createElement(Settings, null), page === 'reports' && /*#__PURE__*/React.createElement(Reports, null))));
}
function Login({
  onOk
}) {
  const [u, setU] = useState(''),
    [p, setP] = useState(''),
    [er, setEr] = useState(false);
  const go = () => {
    if (u.trim().toLowerCase() === 'admin' && p === 'gfd2026') {
      sessionStorage.setItem('gfd_auth', '1');
      onOk();
    } else setEr(true);
  };
  const onKey = e => {
    if (e.key === 'Enter') go();
  };
  const S = {
    wrap: {
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      background: '#0B1F33',
      fontFamily: "'Manrope',sans-serif"
    },
    card: {
      width: 340,
      background: '#0E2841',
      border: '1px solid rgba(245,239,230,.10)',
      borderRadius: 16,
      padding: '34px 30px',
      boxShadow: '0 24px 70px -24px rgba(0,0,0,.75)'
    },
    logo: {
      width: 52,
      height: 52,
      borderRadius: 13,
      background: 'linear-gradient(135deg,#FF6B47,#D74A28)',
      display: 'grid',
      placeItems: 'center',
      color: '#fff',
      fontWeight: 800,
      fontSize: 24,
      margin: '0 auto 18px'
    },
    h: {
      textAlign: 'center',
      margin: '0 0 4px',
      fontSize: 20,
      fontWeight: 700,
      color: '#F5EFE6'
    },
    sub: {
      textAlign: 'center',
      margin: '0 0 24px',
      fontSize: 12.5,
      color: '#8B8377'
    },
    inp: {
      width: '100%',
      boxSizing: 'border-box',
      padding: '12px 14px',
      marginBottom: 12,
      borderRadius: 10,
      border: '1px solid rgba(245,239,230,.14)',
      background: 'rgba(245,239,230,.05)',
      color: '#F5EFE6',
      fontSize: 14,
      outline: 'none',
      fontFamily: 'inherit'
    },
    btn: {
      width: '100%',
      padding: '13px',
      borderRadius: 10,
      border: 0,
      background: 'linear-gradient(100deg,#FF6B47,#D74A28)',
      color: '#fff',
      fontWeight: 700,
      fontSize: 14,
      cursor: 'pointer',
      fontFamily: 'inherit',
      marginTop: 4
    },
    err: {
      color: '#f87171',
      fontSize: 12.5,
      textAlign: 'center',
      marginTop: 12
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    style: S.wrap
  }, /*#__PURE__*/React.createElement("div", {
    style: S.card
  }, /*#__PURE__*/React.createElement("div", {
    style: S.logo
  }, "Г"), /*#__PURE__*/React.createElement("h2", {
    style: S.h
  }, "ГФД Автопарк"), /*#__PURE__*/React.createElement("div", {
    style: S.sub
  }, "Вход в систему учёта"), /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    placeholder: "Логин",
    value: u,
    onChange: e => setU(e.target.value),
    onKeyDown: onKey,
    autoFocus: true
  }), /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "password",
    placeholder: "Пароль",
    value: p,
    onChange: e => setP(e.target.value),
    onKeyDown: onKey
  }), /*#__PURE__*/React.createElement("button", {
    style: S.btn,
    onClick: go
  }, "Войти"), er && /*#__PURE__*/React.createElement("div", {
    style: S.err
  }, "Неверный логин или пароль")));
}
function Root() {
  const [authed, setAuthed] = useState(sessionStorage.getItem('gfd_auth') === '1');
  if (!authed) return /*#__PURE__*/React.createElement(Login, {
    onOk: () => setAuthed(true)
  });
  return /*#__PURE__*/React.createElement(App, null);
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(Root, null));