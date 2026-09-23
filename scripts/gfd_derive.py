#!/usr/bin/env python3
# Единый генератор ПРОИЗВОДНЫХ данных из ростера (own-fleet/hired-fleet/stores).
# Гарантирует, что «сегодня» сходится во всех разделах:
#   routesToday(дашборд) = сумма routesToday по магазинам
#   свои на линии = кол-во На линии = own-log[сегодня]
#   частники на линии = onLine = hired-log[сегодня]
#   КТГ(график, последний день) = КТГ расчётный из парка
import json, random, datetime, os
D='/root/gfd-avtopark/public/data'
random.seed(2026)
END=datetime.date(2026,9,23)
jload=lambda f: json.load(open(os.path.join(D,f),encoding='utf-8'))
jdump=lambda f,d: json.dump(d,open(os.path.join(D,f),'w'),ensure_ascii=False)

own=jload('own-fleet.json'); hired=jload('hired-fleet.json'); stores=jload('stores.json')

onLineOwn=[v for v in own if v.get('status')=='На линии']
reserveOwn=[v for v in own if v.get('status')=='Резерв']
remCount=sum(1 for v in own if v.get('status') in ('Ремонт','Капремонт'))
onLineHired=[h for h in hired if h.get('onLine')]
routesTodayTotal=sum(int(s.get('routesToday') or 0) for s in stores)
ktgNow=round((len(own)-remCount)/max(1,len(own))*100,1)

DRIVERS=['Иванов А.','Петров С.','Сидоров В.','Кузнецов Д.','Смирнов И.','Попов Н.','Волков Р.','Морозов К.',
 'Егоров В.','Новиков Г.','Фёдоров М.','Козлов П.','Соколов Ю.','Лебедев А.','Семёнов О.','Павлов Д.',
 'Голубев И.','Богданов Р.','Воробьёв Т.','Никитин Е.','Захаров Л.','Орлов В.','Титов Г.','Макаров С.',
 'Крылов А.','Гусев М.','Киселёв Д.','Беляев Р.','Тарасов В.','Белов И.','Комаров П.','Щербаков А.']
PCODE={'Лемана Про':'ЛП','Магнит':'МГ','Х5 Retail':'Х5','Озон':'ОЗ','ВкусВилл':'ВВ','Самокат':'СМ'}
def route(project,seed): return f"МР-{PCODE.get(project,'МР')}{(seed%40)+1:02d}"
for i,v in enumerate(own): v['_drv']=DRIVERS[i%len(DRIVERS)]

# ---- routes.json (90 дн): последний день привязан к ростеру ----
daily=[]; base=routesTodayTotal
for d in range(89,-1,-1):
    day=END-datetime.timedelta(days=d); wk=day.weekday()
    if d==0:
        routes=routesTodayTotal; oo=len(onLineOwn); hh=len(onLineHired)
    else:
        base+=(random.random()-0.45)*14; base=max(120,min(320,base))
        routes=int(base*(0.72 if wk>=5 else 1.0)+random.randint(-8,8)); routes=max(60,routes)
        oo=len(onLineOwn)+random.randint(-3,2) if wk<5 else max(0,len(onLineOwn)-random.randint(4,10))
        hh=len(onLineHired)+random.randint(-3,2) if wk<5 else max(0,len(onLineHired)-random.randint(4,9))
    daily.append({'date':day.strftime('%Y-%m-%d'),'routes':routes,'own_on':max(0,oo),'hired_on':max(0,hh)})
jdump('routes.json',{'daily':daily})

# ---- own-ktg.json (90 дн): последний день = КТГ расчётный ----
ktg=[]; k=ktgNow
for d in range(89,-1,-1):
    day=END-datetime.timedelta(days=d)
    if d==0:
        val=ktgNow; ready=len(own)-remCount; rep=remCount
    else:
        k+=(random.random()-0.5)*4; k=max(66,min(90,k)); val=round(k,1)
        ready=round(len(own)*val/100); rep=len(own)-ready
    ktg.append({'date':day.strftime('%Y-%m-%d'),'ktg':val,'ready':ready,'total':len(own),'repair':rep})
ktg[-1]={'date':END.strftime('%Y-%m-%d'),'ktg':ktgNow,'ready':len(own)-remCount,'total':len(own),'repair':remCount}
jdump('own-ktg.json',{'daily':ktg})

# ---- own-log / hired-log (30 дн): сегодня = точный список на линии ----
own_log={}; hired_log={}
poolOwn=onLineOwn+reserveOwn
for d in range(29,-1,-1):
    day=END-datetime.timedelta(days=d); k=day.strftime('%Y-%m-%d'); wk=day.weekday()
    if d==0:
        sel=onLineOwn                      # СЕГОДНЯ = ровно те, кто На линии
        sel2=onLineHired
    else:
        n=len(onLineOwn)+random.randint(-2,1) if wk<5 else max(6,len(onLineOwn)-random.randint(6,12))
        sel=random.sample(poolOwn,min(max(1,n),len(poolOwn)))
        hp=[h for h in hired if h.get('status')!='end']
        n2=len(onLineHired)+random.randint(-2,1) if wk<5 else max(4,len(onLineHired)-random.randint(5,10))
        sel2=random.sample(hp,min(max(1,n2),len(hp)))
    own_log[k]=[{'plate':v['plate'],'driver':v['_drv'],'project':v['project'],'route':route(v['project'],hash(v['plate']))} for v in sel]
    hired_log[k]=[{'plate':h['plate'],'contractor':h['contractor'],
                   'project':(h.get('projects') or ['Лемана Про'])[0],
                   'route':route((h.get('projects') or ['Лемана Про'])[0],hash(h['plate']))} for h in sel2]
jdump('own-log.json',own_log); jdump('hired-log.json',hired_log)

# ---- stats.json (30 дн): план на день = routesToday магазина (сумма планов = routesTodayTotal) ----
rows=[]
for d in range(29,-1,-1):
    day=(END-datetime.timedelta(days=d)).strftime('%Y-%m-%d')
    for s in stores:
        base=int(s.get('routesToday') or random.randint(8,30))
        if d==0:
            planned=base; closed=max(0,base-random.randint(0,3))   # сегодня в процессе
        else:
            planned=max(3,base+random.randint(-3,4)); closed=max(0,planned-random.randint(0,3))
        rows.append({'date':day,'store':s['name'],'project':s['project'],'planned':planned,'closed':closed,'onTime':random.randint(85,100)})
jdump('stats.json',{'rows':rows})

# ---- kadry-log.json (90 дн) ----
kad=[]
for d in range(89,-1,-1):
    day=END-datetime.timedelta(days=d); wk=day.weekday()
    ap=0 if wk>=5 and random.random()<0.5 else random.randint(0,5)
    iv=max(0,int(ap*0.6)+random.randint(-1,1)); hr=max(0,int(iv*0.5)+random.randint(-1,1))
    kad.append({'date':day.strftime('%Y-%m-%d'),'applications':ap,'interviews':iv,'hires':hr})
jdump('kadry-log.json',{'daily':kad})

print(f'РОСТЕР: всего {len(own)} · На линии {len(onLineOwn)} · Резерв {len(reserveOwn)} · Ремонт {remCount} · КТГ {ktgNow}%')
print(f'СВЕРКА today: routes={routesTodayTotal} own_on={len(onLineOwn)} hired_on={len(onLineHired)} | own-log={len(own_log[END.strftime("%Y-%m-%d")])} hired-log={len(hired_log[END.strftime("%Y-%m-%d")])}')
