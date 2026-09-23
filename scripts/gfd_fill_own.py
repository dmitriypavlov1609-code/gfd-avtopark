#!/usr/bin/env python3
# "ГФД свой парк" — вкладки как в "расход АТП ЮП": на линии / Исправна на АТП / неисправна (причина) + Сводка (КТГ).
import json, random
from google.oauth2 import service_account
from google.auth.transport.requests import AuthorizedSession

SID='1n86fW4Uir86ykT5digIf6aKzfr-eH_L_qzQLODwjh3c'
KEY='/root/obe2-autosync/sa-key.json'
sess=AuthorizedSession(service_account.Credentials.from_service_account_file(
    KEY, scopes=['https://www.googleapis.com/auth/spreadsheets']))
API=f'https://sheets.googleapis.com/v4/spreadsheets/{SID}'
d=json.load(open('/root/gfd-avtopark/public/data/own-fleet.json',encoding='utf-8'))
random.seed(11)

T_LINE='на линии'; T_ATP='Исправна на АТП'; T_BAD='неисправна (причина)'; T_SUM='Сводка'

# распределение: 30 на линии, 6 исправна на АТП, 10 неисправна (с причинами)
cats=(['line']*30+['atp']*6+
      ['bad:Капремонт']*3+['bad:Неисправна ДВС']*2+['bad:Шиномонтаж']*1+
      ['bad:Малярный цех']*1+['bad:Бренд']*1+['bad:ГБО неисправно']*1+['bad:Без страховки']*1)
random.shuffle(cats)
for v,c in zip(d,cats): v['cat']=c
d.sort(key=lambda v:(v['atp'], v['plate']))

def tab_id_map():
    m=sess.get(API+'?fields=sheets.properties(sheetId,title)'); m.raise_for_status()
    return {s['properties']['title']:s['properties']['sheetId'] for s in m.json()['sheets']}

# гарантируем нужные вкладки
titles=tab_id_map()
reqs=[]
# первую существующую вкладку переименуем в 'на линии', если её ещё нет
if T_LINE not in titles:
    first_id=list(titles.values())[0]
    reqs.append({'updateSheetProperties':{'properties':{'sheetId':first_id,'title':T_LINE},'fields':'title'}})
for t in [T_ATP,T_BAD,T_SUM]:
    if t not in titles: reqs.append({'addSheet':{'properties':{'title':t}}})
if reqs: sess.post(API+':batchUpdate',json={'requests':reqs}).raise_for_status()

def put(tab, values, mode='RAW'):
    sess.post(f'{API}/values/{tab}:clear').raise_for_status()
    sess.put(f'{API}/values/{tab}!A1?valueInputOption={mode}',json={'values':values}).raise_for_status()

H=['№','Госномер','Марка','Класс','Проект','АТП','Пробег','ДК до','ОСАГО до','Пропуск СК']
HB=['№','Госномер','Марка','Класс','Проект','АТП','Причина','Пробег','ДК до','ОСАГО до','Пропуск СК']
def base(v): return [v['plate'],v['brand'],v['kind'],v['project'],v['atp']]
def tail(v): return [v['mileage'],v.get('dk',''),v.get('osago',''),v.get('sk') or 'нет']

line=[v for v in d if v['cat']=='line']
atp=[v for v in d if v['cat']=='atp']
bad=[v for v in d if v['cat'].startswith('bad:')]

put(T_LINE,[H]+[[i]+base(v)+tail(v) for i,v in enumerate(line,1)])
put(T_ATP,[H]+[[i]+base(v)+tail(v) for i,v in enumerate(atp,1)])
put(T_BAD,[HB]+[[i]+base(v)+[v['cat'].split(':',1)[1]]+tail(v) for i,v in enumerate(bad,1)])

# сводка с формулами (КТГ = (на линии + исправна на АТП)/всего)
L=f"COUNTA('{T_LINE}'!B2:B1000)"; A=f"COUNTA('{T_ATP}'!B2:B1000)"; B=f"COUNTA('{T_BAD}'!B2:B1000)"
def cls(k): return f"COUNTIF('{T_LINE}'!D2:D1000;\"{k}\")+COUNTIF('{T_ATP}'!D2:D1000;\"{k}\")+COUNTIF('{T_BAD}'!D2:D1000;\"{k}\")"
summ=[['СВОДКА ПО ПАРКУ',''],
      ['Всего ТС',f'={L}+{A}+{B}'],
      ['На линии',f'={L}'],
      ['Исправна на АТП',f'={A}'],
      ['Неисправна',f'={B}'],
      ['Исправных всего (КТГ+)',f'={L}+{A}'],
      ['КТГ, %',f'=ROUND(({L}+{A})/({L}+{A}+{B})*100;1)'],
      ['— Газели',f'={cls("Газель")}'],
      ['— Ларгусы',f'={cls("Ларгус")}']]
put(T_SUM,summ,mode='USER_ENTERED')
print(f'на линии {len(line)} | исправна на АТП {len(atp)} | неисправна {len(bad)} | всего {len(d)}')
print('КТГ =', round((len(line)+len(atp))/len(d)*100,1),'%')
