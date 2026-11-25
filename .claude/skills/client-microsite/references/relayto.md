# RELAYTO: как страница живёт внутри хоста и как её поставлять

## Как RELAYTO встраивает HTML

Документ кладётся в `<iframe srcdoc>`, хост добавляет `html, body { height: 100%; margin: 0; padding: 0 }`. Выявлено на Westinghouse сравнением с живой страницей; `hostsim.mjs` воспроизводит именно это.

Что из этого ломается и как решено (всё уже в `assets/runtime/`):

| Проблема | Почему | Решение |
|---|---|---|
| Клик по пункту навбара перезагружает фрейм страницей хоста | в srcdoc `href="#id"` резолвится относительно URL хоста | все `a[href^="#"]` обрабатывает JS: `preventDefault` + `scrollIntoView` + фокус на цель (`microsite.js`) |
| Sticky-хедер уезжает через экран | sticky не выходит за родителя, а body высотой 100% | `html, body { height: auto !important; min-height: 100% }` (`microsite-base.css`) |
| Хедер не становится сплошным, прогресс стоит | страницу может крутить контейнер хоста, `window.scrollY` = 0, scroll-события не всплывают до window | скролл слушается на document в capture-фазе, позиция берётся у реального скроллера / из раскладки |
| Fixed-элементы ведут себя странно | хост может рендерить в трансформированной обёртке | хедер `sticky`, не `fixed` |
| YouTube «Error 153» локально | при `file://` нет referrer | при `file://` фасад открывает youtube.com в новой вкладке |
| Ссылка-переключатель `href="#mobile-nav"` прокручивает к меню | это не якорь, а toggle | ссылки с `aria-controls`/`uk-toggle`/`role=button` и цели `position: fixed`/`<dialog>` не прокручиваются |
| `localStorage` падает | в srcdoc хранилище может быть заблокировано | любые обращения в try/catch, без сохранения выбор живёт до конца визита (UAENO, переключатель языка) |

Veriff собирался до этих находок и в `hostsim` проваливает все 16 якорей навигации — поэтому рантайм обязателен, а `hostsim` — обязательная проверка.

## Режимы поставки

Во всех режимах CSS, JS и шрифты встроены в HTML (шрифты — data:, без мигания и лишних запросов). Отличается только то, где лежат картинки и видео.

### A. RELAYTO Files — по умолчанию (UAENO)

Хостинг файлов воркспейса: загружается **папка целиком, подпапки сохраняются**, файл доступен по
`https://cdn.relayto.com/workspace-assets/<workspace-id>/<путь внутри загруженного>`. Проверено на UAENO: webp и mp4 отдаются с правильным типом (видео тоже работает — проблема Westinghouse с mp4 тут не возникает), заголовок `access-control-allow-origin: *` есть.

1. Локальная версия с той же структурой папок, что будет загружена:
   ```
   node <skill>/scripts/pack.mjs . --root ./
   ```
   → `dist/index.html` (открывается локально), `dist/assets/img/…`, `dist/assets/video/…`, `dist/upload-list.json`.
2. Пользователь загружает папку `dist/assets` в RELAYTO Files и называет корневой URL воркспейса (`https://cdn.relayto.com/workspace-assets/<id>/`).
3. Версия для RELAYTO:
   ```
   node <skill>/scripts/pack.mjs . --root https://cdn.relayto.com/workspace-assets/<id>/ --out dist-relayto
   node <skill>/scripts/check_map.mjs --root https://cdn.relayto.com/workspace-assets/<id>/ --dist dist
   ```
   `check_map` проверяет каждый файл из `upload-list.json`: 200, тип, пиксельный размер совпадает с локальным. В UAENO так получились `dist/index.html` (локальный) и `dist/index.relayto.html` (для заливки).
4. `hostsim.mjs` и `qa.mjs … --allow-hosts cdn.relayto.com` на версии для RELAYTO.

**Кэш CDN — год** (`s-maxage=31536000`, у браузера 5 минут). Изменённый файл с тем же именем может ещё долго отдаваться старым. Меняешь картинку — меняй имя (`hero-orchestra-v2-1600.webp`) и пересобирай.

### B. Хаб RELAYTO (Westinghouse)

Каждый файл загружается в хаб как контент и получает свой URL с переименованием: `https://cdn-3.relayto.com/relayto/image/upload/media/files/<name>_<hash>.jpg`. Поэтому нужна карта имён.

1. `node <skill>/scripts/pack.mjs . --mode external` → плоская `dist/assets/` + `dist/upload-list.json`.
2. Пользователь грузит файлы в хаб (по хабу на проект, в Westinghouse — «westinghouse-assets-microsite»). Если в сессии есть коннектор RELAYTO, который умеет загружать файлы и отдавать URL, — можно через него, только с подтверждения.
3. `asset-urls.json`: `{ "hero-poster.jpg": "https://cdn-3.relayto.com/…/heroposter_b8c9….jpg" }` → `check_map.mjs asset-urls.json --local dist/assets` → `pack.mjs . --mode external --map asset-urls.json`.
4. Видео: в Westinghouse хаб не дал ссылку на mp4 — видео лежали во внешнем хранилище (Cloudflare R2) и тоже шли через карту. Форматы для хаба — jpg/png (webp в хабе не проверялся).

### C. Всё в одном файле

`node <skill>/scripts/pack.mjs . --mode inline` — картинки data:-URI (Veriff: ~1.9 МБ). Для выгрузки «одним файлом» или когда загрузка недоступна. Видео не встраиваются.

После публикации в любом режиме — открыть живую страницу RELAYTO и пройти скролл, навбар, якоря, видео, лайтбоксы, переключатель языка.

## Документы и ссылки на RELAYTO

- Брошюры, data sheets, туры, у которых есть RELAYTO-версии, открываются в лайтбоксе (`<a href="https://<client>.relayto.com/e/…" data-lightbox data-title="…">`). Перед использованием проверь, что каждая ссылка открывается (в Westinghouse их сохраняли и проверяли по одной).
- У PDF-презентации может быть RELAYTO-версия с интерактивным слоем (видео, хотспоты, ссылки) — см. `input-pdf.md`, шаг 6.
