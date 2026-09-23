#!/usr/bin/env python3
# Читает 4 Google-таблицы (по ID из gfd_sheets.json) через сервис-аккаунт ОБЕ2
# и раскладывает в public/data/*.json в формате приложения. Затем можно деплоить.
import json, os, sys
from google.oauth2 import service_account
from google.auth.transport.requests import AuthorizedSession

KEY='/root/obe2-autosync/sa-key.json'
CFG='/root/gfd-avtopark/gfd_sheets.json'   # {"own":{"id":...},"hired":{"id":...},"stores":{"id":...},"candidates":{"id":...}}
D='/root/gfd-avtopark/public/data'
sess=AuthorizedSession(service_account.Credentials.from_service_account_file(
    KEY, scopes=['https://www.googleapis.com/auth/spreadsheets.readonly']))

def read_tab(sid, tab):
    r=sess.get(f'https://sheets.googleapis.com/v4/spreadsheets/{sid}/values/{tab}?majorDimension=ROWS')
    r.raise_for_status(); vals=r.json().get('values',[])
    if not vals: return []
    head=[h.strip() for h in vals[0]]; out=[]
    for row in vals[1:]:
        row=row+['']*(len(head)-len(row))
        out.append({head[i]:row[i] for i in range(len(head))})
    return out

def read_sheet(sid):
    meta=sess.get(f'https://sheets.googleapis.com/v4/spreadsheets/{sid}?fields=sheets.properties.title')
    meta.raise_for_status()
    return read_tab(sid, meta.json()['sheets'][0]['properties']['title'])

def read_own(sid):
    # 3 вкладки: на линии / Исправна на АТП / неисправна (причина)
    def veh(r, status, ready):
        return {'plate':r.get('Госномер',''),'brand':r.get('Марка',''),'type':r.get('Класс',''),
                'kind':r.get('Класс',''),'project':r.get('Проект',''),'status':status,'ready':ready,
                'mileage':i(r.get('Пробег',0)),'atp':r.get('АТП',''),
                'dk':r.get('ДК до',''),'osago':r.get('ОСАГО до',''),
                'sk':('' if r.get('Пропуск СК','').strip().lower() in ('','нет','—') else r.get('Пропуск СК',''))}
    out=[]
    for r in read_tab(sid,'на линии'):
        if r.get('Госномер'): out.append(veh(r,'На линии',True))
    for r in read_tab(sid,'Исправна на АТП'):
        if r.get('Госномер'): out.append(veh(r,'Резерв',True))
    for r in read_tab(sid,'неисправна (причина)'):
        if not r.get('Госномер'): continue
        prich=(r.get('Причина','') or '').strip().lower()
        st='Капремонт' if 'капремонт' in prich else 'Ремонт'
        v=veh(r,st,False); out.append(v)
    return out

def i(x):
    try: return int(str(x).replace(' ','').replace('\xa0','') or 0)
    except: return 0

# статусы из таблицы (по аналогии с "расход по АТП") → 4 корзины приложения
STATUS_MAP={'на линии':'На линии','готова':'На линии','исправна':'На линии',
            'капремонт':'Капремонт','кап.ремонт':'Капремонт','кап ремонт':'Капремонт',
            'резерв':'Резерв','переоформление':'Резерв'}
def map_status(s):
    k=(s or '').strip().lower()
    return STATUS_MAP.get(k, 'Ремонт' if k else 'На линии')  # прочие неисправности → Ремонт

def build():
    cfg=json.load(open(CFG,encoding='utf-8'))
    res={}
    if 'own' in cfg:
        res['own-fleet.json']=read_own(cfg['own']['id'])
    if 'hired' in cfg:
        rows=read_sheet(cfg['hired']['id']); res['hired-fleet.json']=[{
            'plate':r.get('Госномер',''),'contractor':r.get('Контрагент',''),'phone':r.get('Телефон',''),
            'registered':r.get('Дата регистрации',''),'routesDone':i(r.get('Маршрутов выполнено',0)),
            'projects':[p.strip() for p in r.get('Проекты','').split(',') if p.strip()],
            'status':r.get('Статус',''),'onLine': r.get('На линии','').strip().lower() in ('да','yes','true','1'),
            'rate':i(r.get('Ставка',0)),
        } for r in rows if r.get('Госномер')]
    if 'stores' in cfg:
        rows=read_sheet(cfg['stores']['id']); res['stores.json']=[{
            'id':r.get('ID',''),'name':r.get('Магазин',''),'city':r.get('Город',''),'address':r.get('Адрес',''),
            'project':r.get('Проект',''),'routesToday':i(r.get('Маршрутов сегодня',0)),'routesMonth':i(r.get('Маршрутов за месяц',0)),
            'ownCars':i(r.get('Свои ТС',0)),'hiredCars':i(r.get('Частники',0)),'onTime':i(r.get('В срок %',0)),
            'status':r.get('Статус','') or 'active',
        } for r in rows if r.get('Магазин')]
    if 'candidates' in cfg:
        rows=read_sheet(cfg['candidates']['id']); res['candidates.json']=[{
            'name':r.get('ФИО',''),'phone':r.get('Телефон',''),'project':r.get('Проект',''),
            'position':r.get('Должность',''),'applied':r.get('Дата заявки',''),'startDay':r.get('Дата выхода',''),
            'status':r.get('Статус',''),'source':r.get('Источник',''),
        } for r in rows if r.get('ФИО')]
    for fn,data in res.items():
        json.dump(data, open(os.path.join(D,fn),'w'), ensure_ascii=False, indent=1)
        print(f'  {fn}: {len(data)} строк')
    return res

if __name__=='__main__':
    print('Синхронизация из Google-таблиц:'); build(); print('Готово. Данные обновлены в public/data.')
