---
name: "client-microsite"
description: Builds a branded single-page microsite (usually published in RELAYTO) by combining CONTENT from one source with the DESIGN and ASSETS of a client's website. Content source - a PDF deck/report, a ready HTML page (colleague or RELAYTO generator), or a page of an existing website. Content, structure and numbers are carried over 1:1; the client site gives tokens, components, photos and logos; a local navbar and optional enrichment are added; everything is verified and packed host-safe for RELAYTO. Use this skill whenever the user gives a client site URL together with a PDF, an HTML file or another page URL and wants "the same content in the client's design", a reskin, a rebrand, a microsite, a landing page from a deck, or says things like "перенести контент в дизайн сайта клиента", "сделай как для evinci / veriff", "сайт клиента + пдф", "рескин", "микросайт", "заэнричить", "локальный навбар", "залить в рилейто" — even if the word "microsite" is never used.
---

# Client microsite: контент из источника + дизайн сайта клиента

Скил собран из реальных проектов: **Westinghouse eVinci** (инпут — страница сайта), **Veriff × SIXT** (PDF-презентация), **UAENO** (готовый HTML коллеги) и **To This Land, We Belong** (двуязычный PDF-буклет UAENO, первый прогон самим скилом). Решения, принятые в них, зашиты в правила ниже и в справочники. Если правило кажется лишним — у него почти всегда есть причина из этих проектов, она указана рядом.

## 0. Старт: определить задачу

Выясни (из сообщения пользователя, не переспрашивай очевидное):

| Что | Варианты |
|---|---|
| Инпут контента | `pdf` · `html` (готовая страница коллеги / генератора RELAYTO) · `webpage` (URL страницы, чей контент переносим) |
| Сайт клиента | URL главной + страницы, где есть хорошие фото (about, gallery, stories, news) |
| Режим | **rebuild + enrich** (по умолчанию для `pdf` и `webpage`) · **reskin 1:1** (по умолчанию для `html`: структура и компоненты не меняются, enrichment только по просьбе) |
| Что убрать | пользователь обычно называет «пару вещей» — запиши их явно |
| Картинки | брать с сайта клиента (по умолчанию да); для `html`-инпута картинки исходника **заменяются полностью** |
| Поставка | **RELAYTO Files** (по умолчанию: папка `assets/` грузится целиком, URL `cdn.relayto.com/workspace-assets/<id>/…`) · хаб RELAYTO · всё в одном файле — см. `references/relayto.md` |

Затем прочитай справочник по типу инпута — **только нужный**:
- `pdf` → `references/input-pdf.md`
- `html` → `references/input-html.md`
- `webpage` → `references/input-webpage.md`

И всегда: `references/design-and-assets.md`, `references/relayto.md`, `references/verify.md`. Для режима enrich — `references/enrichment.md`.

### Структура проекта

```
<project>/
  source/            входные файлы (pdf, index.html коллеги, ссылки в source/README.md)
  content/           content.json (pdf) или inventory.json (html/webpage), report.md, ui-strings.json, link-map.json
  reference/         скриншоты: source/, site/, pdf-pages/, hostsim/, qa/; contact sheets
  assets-pool/       всё скачанное с сайта клиента + manifest.json
  assets/            то, что реально используется: img/, fonts/, video/
  styles/            tokens.css, microsite-base.css, main.css
  scripts/           microsite.js (из скила), main.js (своё)
  index.html         рабочая версия
  dist/              упакованный результат
  dist-relayto/      версия со ссылками на CDN RELAYTO (режим Files)
  asset-urls.json    имя файла → URL (только режим хаба)
  tools/             package.json с playwright (или в корне)
```

Подготовка (один раз на проект; у пользователя Windows — команды кроссплатформенные):
```
npm init -y && npm i -D playwright && npx playwright install chromium webkit firefox
pip install pymupdf            # только для pdf (pdf_extract.py, pdf_letters.py)
```
Скрипты скила лежат в `<skill>/scripts/` (путь к скилу — в заголовке, с которым он загружен). Запускай их из корня проекта: `node <skill>/scripts/inventory.mjs …`. Playwright они ищут в проекте.

## 1. Захват контента → источник истины

По справочнику инпута. Результат фазы:
- **pdf**: `content/content.json` + рендеры страниц + отчёт об исправленных артефактах извлечения.
- **html / webpage**: `content/inventory.json` (весь текст, **включая скрытый**: вкладки, аккордеоны, тултипы, offcanvas, alt, aria, meta) + скриншоты состояний.
- `content/report.md`: что на каждой странице/в каждой секции, что исправлено (было → стало), что сомнительно, что **оставлено как есть, хотя выглядит как ошибка** (данные не «чинятся»).

## 2. Захват дизайна и ассетов

```
node <skill>/scripts/capture_site.mjs https://client.com https://client.com/about https://client.com/gallery --out reference/site --download assets-pool
node <skill>/scripts/contact_sheet.mjs assets-pool --out reference/assets-contact-sheet.png
```
Дальше — `references/design-and-assets.md`: токены с пометкой источника, шрифты, компоненты, подбор фото под слоты (основной + 1–2 запасных), отсев плейсхолдеров.

## 3. ⛔ Остановка: план на подтверждение

Не начинай сборку, пока пользователь не подтвердил. План удобнее всего собрать страницей `reference/plan/index.html` (с превью фото по слотам и скриншотами) и в чате дать короткую выжимку — так было в UAENO. Первым разделом — **«Что нужно решить»**. Состав плана:
1. Карту контента и список исправлений/сомнений из фазы 1.
2. Токены (палитра, шрифты, шкала) — с источником каждого.
3. «Компонент источника → компонент в стиле клиента».
4. Локальный навбар: пункты (короткие подписи — это UI-строки), порядок, CTA, поведение на мобильном.
5. Enrichment по каждой секции (или «reskin: без изменений компонентов»).
6. Ассеты: слот → выбранное фото (+ запасные), логотипы, декор; что заменяется.
7. Все UI-строки, которых нет в источнике (`ui-strings.json`), и все замены ссылок (`link-map.json`).
8. Открытые вопросы (пустые слоты, видео, интерактивный слой из RELAYTO-версии, конфликты порядка навигации).

## 4. Сборка

- Подключи рантайм: скопируй `<skill>/assets/runtime/microsite.js` → `scripts/`, `microsite-base.css` → `styles/`. Свой код — в `scripts/main.js`. Рантайм уже решает проблемы встраивания в RELAYTO (якоря, sticky-хедер, скролл-контейнер) — не переписывай эти механизмы заново.
- Для `pdf` с таблицами и графиками надёжнее генерировать HTML из `content.json` скриптом сборки (как в Veriff `tools/build.mjs`): весь текст тогда физически приходит из одного файла.
- Ассеты пока локальные (`assets/…`), CDN-ссылки подставляет упаковка.

## 5. Проверки (подробно — `references/verify.md`)

```
node <skill>/scripts/inventory.mjs index.html --out content/result-inventory.json
node <skill>/scripts/compare.mjs content/content.json|inventory.json content/result-inventory.json --allow content/ui-strings.json --link-map content/link-map.json
node <skill>/scripts/pack.mjs . --root ./                  # затем hostsim и qa на dist/
node <skill>/scripts/hostsim.mjs dist/index.html
node <skill>/scripts/qa.mjs dist
```
Всё должно быть PASS или объяснено в отчёте как осознанное (например, автозапуск видео по решению пользователя).

## 6. Поставка в RELAYTO (подробно — `references/relayto.md`)

По умолчанию (RELAYTO Files):
```
node <skill>/scripts/pack.mjs . --root ./                         # dist/ — локальная версия, dist/assets — папка для загрузки
# пользователь загружает dist/assets в RELAYTO Files и даёт URL воркспейса
node <skill>/scripts/pack.mjs . --root https://cdn.relayto.com/workspace-assets/<id>/ --out dist-relayto
node <skill>/scripts/check_map.mjs --root https://cdn.relayto.com/workspace-assets/<id>/ --dist dist
node <skill>/scripts/hostsim.mjs dist-relayto/index.html
```
Режим хаба (`--mode external` + `--map asset-urls.json`) и «один файл» (`--mode inline`) — в справочнике. Финальный отчёт: что сделано по секциям, таблица замен изображений, UI-строки, решения по открытым вопросам, как запустить локально (`node <skill>/scripts/serve.mjs dist`).

## Правила, которые не нарушаются

1. **Текст 1:1.** Не переписывать, не сокращать, не перефразировать, не добавлять подзаголовки, пояснения, тултипы-определения. Исключения — только UI-строки из `ui-strings.json`, согласованные на шаге 3. Проверяется `compare.mjs`.
2. **Числа только из источника.** Каждое число на странице (включая подписи графиков) существует в источнике. Производные значения (разница шагов воронки, ширины баров) — только как визуал, не как новый текст.
3. **Данные не «чинятся».** Странности источника (две разные метрики approval rate, итог таблицы ≠ сумме, шаг воронки больше предыдущего) переносятся как есть и упоминаются в отчёте.
4. **Скрытый контент — тоже контент.** Вкладки, аккордеоны, тултипы, мобильное меню, alt, aria, meta description.
5. **`id` и `data-*` исходника сохраняются** (для html-инпута из генератора RELAYTO — `data-ai-slot`, `data-ai-role` и т.п.).
6. **С сайта клиента берётся только стиль и ассеты**, не его тексты. Проверки «я человек» на сайте не обходятся — `capture_site.mjs` останавливается, дальше по `design-and-assets.md`. Плейсхолдеры сайта («MUSICIAN NAME», «Description Description», `placeholder.png`) не используются.
7. **Безопасно для RELAYTO:** никаких голых `href="#…"` без рантайма, позиция скролла из раскладки, sticky а не fixed, `html, body { height: auto !important }`. Проверяется `hostsim.mjs`.
8. **Ничего стороннего до действия пользователя:** YouTube через фасад (nocookie), документы и видео в лайтбоксе — iframe создаётся по клику и уничтожается при закрытии.
9. **Доступность не хуже источника:** семантика, alt (переписывается под новое фото), фокус, клавиатура, контраст AA, `prefers-reduced-motion`.
10. **Не исправляй исходник молча.** Несовпадение порядка навбара и секций, пустые слоты, битые ссылки — в отчёт и в вопросы на шаге 3.
