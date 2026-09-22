# Авто-тесты фронта (fe-check)

Чекер на Playwright: грузит сайт в реальном браузере и ищет типовые дефекты вёрстки —
**наложения элементов**, горизонтальный оверфлоу, ошибки консоли и битые запросы —
по всем вкладкам и на 4 ширинах экрана (desktop / laptop / tablet / mobile). Делает скриншоты.

## Установка
```bash
npm install
npx playwright install chromium
```

## Запуск
```bash
npm run check                 # по проду https://gfd-avtopark.vercel.app
node tools/fe-check.mjs <URL>  # по любому адресу
```

Результат: список проблем в консоли + `screenshots/*.png` + `screenshots/report.json`.
Если всё чисто — «Проблем не найдено».
