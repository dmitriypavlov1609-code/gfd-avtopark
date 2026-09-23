#!/usr/bin/env python3
# Заполняет уже созданные пользователем Google-таблицы данными (SA пишет в чужой файл — квота не нужна).
# Конфиг gfd_sheets.json: {"own":{"id":...},"hired":{"id":...},"stores":{"id":...},"candidates":{"id":...}}
import json, os, sys, random
from google.oauth2 import service_account
from google.auth.transport.requests import AuthorizedSession

KEY='/root/obe2-autosync/sa-key.json'
CFG='/root/gfd-avtopark/gfd_sheets.json'
D='/root/gfd-avtopark/public/data'
sess=AuthorizedSession(service_account.Credentials.from_service_account_file(
    KEY, scopes=['https://www.googleapis.com/auth/spreadsheets']))
jload=lambda f: json.load(open(os.path.join(D,f),encoding='utf-8'))
random.seed(7)

def first_tab(sid):
    m=sess.get(f'https://sheets.googleapis.com/v4/spreadsheets/{sid}?fields=sheets.properties.title')
    m.raise_for_status(); return m.json()['sheets'][0]['properties']['title']

def fill(sid, header, rows):
    tab=first_tab(sid)
    sess.post(f'https://sheets.googleapis.com/v4/spreadsheets/{sid}/values/{tab}:clear').raise_for_status()
    r=sess.put(f'https://sheets.googleapis.com/v4/spreadsheets/{sid}/values/{tab}!A1?valueInputOption=RAW',
               json={'values':[header]+rows})
    r.raise_for_status(); return tab, len(rows)

def rows_own():
    d=jload('own-fleet.json'); out=[]
    for v in d:
        fuel=round(random.uniform(17,23),1) if v['kind']=='Газель' else round(random.uniform(9,12),1)
        norm=20.0 if v['kind']=='Газель' else 10.5
        out.append([v['plate'],v['brand'],v['type'],v['kind'],v['project'],v['status'],
                    'исправна' if v['ready'] else '—',v['mileage'],v['atp'],
                    v.get('dk',''),v.get('osago',''),v.get('sk') or 'нет',fuel,norm])
    return (['Госномер','Марка','Тип','Класс','Проект','Статус','Готовность','Пробег','АТП',
             'ДК до','ОСАГО до','Пропуск СК до','Расход факт л/100км','Норма л/100км'], out)

def rows_hired():
    d=jload('hired-fleet.json')
    h=['Госномер','Контрагент','Телефон','Дата регистрации','Маршрутов выполнено','Проекты','Статус','На линии','Ставка']
    return (h,[[x['plate'],x['contractor'],x['phone'],x['registered'],x['routesDone'],
               ', '.join(x.get('projects',[])),x['status'],'да' if x['onLine'] else 'нет',x['rate']] for x in d])

def rows_stores():
    d=jload('stores.json')
    h=['ID','Магазин','Город','Адрес','Проект','Маршрутов сегодня','Маршрутов за месяц','Свои ТС','Частники','В срок %','Статус']
    return (h,[[s['id'],s['name'],s['city'],s['address'],s['project'],s['routesToday'],s['routesMonth'],
               s['ownCars'],s['hiredCars'],s['onTime'],s['status']] for s in d])

def rows_cand():
    d=jload('candidates.json')
    h=['ФИО','Телефон','Проект','Должность','Дата заявки','Дата выхода','Статус','Источник']
    return (h,[[c['name'],c['phone'],c['project'],c['position'],c['applied'],c['startDay'],c['status'],c['source']] for c in d])

BUILD={'own':rows_own,'hired':rows_hired,'stores':rows_stores,'candidates':rows_cand}

if __name__=='__main__':
    cfg=json.load(open(CFG,encoding='utf-8'))
    only=sys.argv[1:] or list(cfg.keys())
    for k in only:
        if k not in cfg: continue
        h,rows=BUILD[k]()
        tab,n=fill(cfg[k]['id'], h, rows)
        print(f'{k}: заполнено {n} строк в лист "{tab}"  ({cfg[k]["id"]})')
