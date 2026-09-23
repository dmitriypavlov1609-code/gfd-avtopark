#!/usr/bin/env python3
# Генерит исторические логи для календарных функций: кто в какой день работал/на каком маршруте + динамика кадров.
import json, random, datetime, os
D='/root/gfd-avtopark/public/data'
random.seed(2026)
END=datetime.date(2026,9,23)
jload=lambda f: json.load(open(os.path.join(D,f),encoding='utf-8'))
own=jload('own-fleet.json'); hired=jload('hired-fleet.json')

DRIVERS=['Иванов А.','Петров С.','Сидоров В.','Кузнецов Д.','Смирнов И.','Попов Н.','Волков Р.','Морозов К.',
 'Егоров В.','Новиков Г.','Фёдоров М.','Козлов П.','Соколов Ю.','Лебедев А.','Семёнов О.','Павлов Д.',
 'Голубев И.','Богданов Р.','Воробьёв Т.','Никитин Е.','Захаров Л.','Орлов В.','Титов Г.','Макаров С.',
 'Крылов А.','Гусев М.','Киселёв Д.','Беляев Р.','Тарасов В.','Белов И.','Комаров П.','Щербаков А.']
PCODE={'Лемана Про':'ЛП','Магнит':'МГ','Х5 Retail':'Х5','Озон':'ОЗ','ВкусВилл':'ВВ','Самокат':'СМ'}
def route(project,seed):
    c=PCODE.get(project,'МР'); return f'МР-{c}{(seed%40)+1:02d}'
# закрепим водителя за машиной (стабильно)
for i,v in enumerate(own): v['_drv']=DRIVERS[i%len(DRIVERS)]

def workday(day): return day.weekday()<5 or random.random()<0.5  # будни + часть выходных

own_log={}; hired_log={}
for d in range(29,-1,-1):
    day=END-datetime.timedelta(days=d); k=day.strftime('%Y-%m-%d'); wk=day.weekday()
    # собственные на линии в этот день
    pool=[v for v in own if v['status'] in ('На линии','Резерв')]
    n=random.randint(26,32) if wk<5 else random.randint(18,24)
    sel=random.sample(pool,min(n,len(pool)))
    own_log[k]=[{'plate':v['plate'],'driver':v['_drv'],'project':v['project'],'route':route(v['project'],hash(v['plate']))} for v in sel]
    # частники на линии
    hp=[h for h in hired if h.get('status')!='end']
    n2=random.randint(20,26) if wk<5 else random.randint(12,18)
    sel2=random.sample(hp,min(n2,len(hp)))
    hired_log[k]=[{'plate':h['plate'],'contractor':h['contractor'],
                   'project':random.choice(h.get('projects') or ['Лемана Про']),
                   'route':route((h.get('projects') or ['Лемана Про'])[0],hash(h['plate']))} for h in sel2]

json.dump(own_log,open(os.path.join(D,'own-log.json'),'w'),ensure_ascii=False)
json.dump(hired_log,open(os.path.join(D,'hired-log.json'),'w'),ensure_ascii=False)

# динамика кадров (90 дней): заявки / собеседования / приёмы
kad=[]
for d in range(89,-1,-1):
    day=END-datetime.timedelta(days=d); wk=day.weekday()
    ap=0 if wk>=5 and random.random()<0.5 else random.randint(0,5)
    iv=max(0,int(ap*0.6)+random.randint(-1,1))
    hr=max(0,int(iv*0.5)+random.randint(-1,1))
    kad.append({'date':day.strftime('%Y-%m-%d'),'applications':ap,'interviews':iv,'hires':hr})
json.dump({'daily':kad},open(os.path.join(D,'kadry-log.json'),'w'),ensure_ascii=False)

print('own-log дней:',len(own_log),'| пример:',len(own_log[END.strftime("%Y-%m-%d")]),'машин сегодня')
print('hired-log дней:',len(hired_log),'| сегодня частников:',len(hired_log[END.strftime("%Y-%m-%d")]))
print('kadry-log дней:',len(kad),'| приёмов всего:',sum(x["hires"] for x in kad))
