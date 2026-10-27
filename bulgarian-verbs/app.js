(function () {
  "use strict";
  var G = window.BG, VERBS = G.VERBS, TENSES = G.TENSES;
  var TBY = {}; TENSES.forEach(function (t) { TBY[t.id] = t; });
  var CORE = TENSES.filter(function (t) { return t.core; }), RARE = TENSES.filter(function (t) { return !t.core; });
  var GROUPS = [
    { id: "past", name: { ru: "Прошлое", bg: "Минало" }, t: ["aorist", "imperfect", "perfect", "pluperfect"] },
    { id: "now", name: { ru: "Сейчас", bg: "Сега" }, t: ["present"] },
    { id: "future", name: { ru: "Будущее", bg: "Бъдеще" }, t: ["future", "fip", "fp", "fpp"] },
    { id: "mood", name: { ru: "Другое", bg: "Други" }, t: ["cond", "impv"] }
  ];
  function groupOf(tid) { return GROUPS.filter(function (g) { return g.t.indexOf(tid) >= 0; })[0]; }
  var GRID_ORDER = [0, 3, 1, 4, 2, 5]; // аз ние / ти вие / той те

  /* ---------- UI strings ---------- */
  var U = {
    ru: {
      sub: "шпаргалка", tForm: "Форма", tTenses: "Времена", tVerbs: "Глаголы",
      impfS: "НСВ", pfS: "СВ", m: "м", f: "ж", neg: "не", sg: "ед. ч.", pl: "мн. ч.",
      legI: "несовершенный вид: процесс, повторение", legP: "совершенный вид: одно завершённое действие",
      legH: "жёлтым — выбранная часть слова и то, что изменилось", legTap: "Нажмите на часть формы, чтобы узнать, откуда она.",
      allPersons: "Все лица", aboutTense: "О времени",
      search: "Поиск: вземам, vzemam или «брать»",
      count: function (n) { return n + " " + plural(n, "глагол", "глагола", "глаголов"); },
      none: "Ничего не нашлось. Попробуйте форму «аз» (вземам) или русский перевод.",
      model: "модельный", back: "← Все глаголы", examples: "Примеры", tr: "Перевод",
      openBuilder: "Открыть в конструкторе →", more: "Подробнее", less: "Свернуть",
      choose: "Какое время выбрать?", aspectT: "НСВ или СВ?", rareT: "Редкие времена", stemsT: "Как получить основу",
      when: "Когда", signals: "Слова-сигналы", tips: "Ловушки", compare: "По-русски",
      negL: "Отрицание", qL: "Вопрос", group: "спр.", grid: "Все времена", formula: "Формула",
      tPractice: "Практика", mForms: "Формы", mAspect: "Вид", mTense: "Время",
      qForms: "Выберите правильную форму", qAspect: "НСВ или СВ? Вставьте глагол", qTense: "Какое время подходит?",
      right: "верно", streak: "серия", best: "рекорд", yes: "Верно!", no: "Неверно", next: "Дальше →",
      keys: "Клавиши: 1–4 — ответ, Enter — дальше", sigs: "Слова-сигналы", inBuilder: "Открыть в конструкторе",
      whyI: "НСВ: процесс, повторение, привычка.", whyP: "СВ: одно завершённое действие с результатом.",
      whyA: "СВ в форме настоящего времени не употребляется самостоятельно — только после «да», «ще», «ако», «когато» и т. п. Здесь возможен только НСВ.",
      whyB: "Запрет («не» + повелительное) — как правило, НСВ.",
      orig: "Так в оригинале из вашего списка:",
      stress: "Ударения", stressTitle: "Показывать ударения",
      foot: function (n) { return n + " " + plural(n, "пара", "пары", "пар") + " глаголов из списка Study in BG"; },
      train: "Что тренировать", allT: "Все времена", aspL: "Вид", both: "оба",
      noQ: "Под этот выбор нет упражнений.", pickAll: "Выбрать все времена",
      noAspInMode: "Вид в этом режиме выбирает задание, поэтому переключателя вида здесь нет.",
      hasT: "Вопросы этого режима есть только для времён:",
      say: "Произнести", ttsNo: "Озвучка недоступна: в этом браузере нет болгарского голоса.", close: "Закрыть",
      ttsH: "Озвучка", ttsOff: "Только голос системы", ttsGoogle: "Google (без ключа)", ttsEleven: "ElevenLabs (свой ключ)",
      ttsPrivacy: "Онлайн-озвучка отправляет озвучиваемый болгарский текст выбранному сервису. Ключ хранится только в этом браузере.",
      ttsKey: "API-ключ ElevenLabs", ttsVoice: "ID голоса (необязательно)", ttsNeedKey: "Вставьте ключ ElevenLabs, чтобы включить озвучку.",
      ttsOn: "Онлайн-озвучка включена", ttsFail: "Не получилось озвучить онлайн. Проверьте интернет и ключ.", ttsSet: "Настроить озвучку",
      ttsMac: "Mac / iPhone: Настройки → Универсальный доступ → Устная речь → Системный голос → Управлять голосами → Болгарский (Daria).",
      ttsWin: "Windows: Параметры → Время и язык → Язык и регион → добавьте болгарский и установите речь; затем перезапустите браузер.",
      ttsAnd: "Android: Настройки → Язык → Синтез речи (Google) → установите болгарский.",
      ttsAny: "Нужен голос болгарского языка в системе; после установки перезапустите браузер, кнопки 🔊 появятся сами.",
      irr: "неправ.", noPair: "без пары", impers: "безл.",
      qBtn: "вопрос", qTitle: "Вопрос с «ли»", prNone: "без", prL: "Краткие местоимения",
      sentNote: "Фразы без подлежащего. С подлежащим краткие слова встают перед глаголом: «Аз го видях», «Аз съм го виждал», «Ти видя ли го?»",
      fav: "Мои", allV: "Все", favAdd: "Добавить в мои", favDel: "Убрать из моих", favIn: "В моих",
      favEmpty: "Пока пусто. Нажмите ☆ у глагола, чтобы добавить его сюда.",
      favOnly: "Только мои глаголы", favNone: "В «Моих» пока нет глаголов — отметьте их звёздочкой во вкладке «Глаголы».",
      ansL: "Ответ", choiceL: "варианты", typeL: "ввод", typePh: "Напишите ответ", check: "Проверить",
      yourAns: "Ваш ответ:", rightAns: "Правильно:", alsoOk: "Тоже правильно. В задании имелось в виду:", hintV: "Глагол:",
      keysT: "Enter — проверить, потом дальше"
    },
    bg: {
      sub: "пищов", tForm: "Форма", tTenses: "Времена", tVerbs: "Глаголи",
      impfS: "НСВ", pfS: "СВ", m: "м", f: "ж", neg: "не", sg: "ед.ч.", pl: "мн.ч.",
      legI: "несвършен вид: процес, повторение", legP: "свършен вид: едно завършено действие",
      legH: "в жълто – избраната част от думата и промяната", legTap: "Докоснете част от формата, за да видите откъде идва.",
      allPersons: "Всички лица", aboutTense: "За времето",
      search: "Търсене: вземам, vzemam или „брать“",
      count: function (n) { return n + " " + (n === 1 ? "глагол" : "глагола"); },
      none: "Няма резултати. Опитайте с формата за „аз“ (вземам) или с превода.",
      model: "модел", back: "← Всички глаголи", examples: "Примери", tr: "Превод",
      openBuilder: "Отвори в конструктора →", more: "Още", less: "Скрий",
      choose: "Кое време да избера?", aspectT: "НСВ или СВ?", rareT: "Редки времена", stemsT: "Как се получава основата",
      when: "Кога", signals: "Сигнални думи", tips: "Капани", compare: "На руски",
      negL: "Отрицание", qL: "Въпрос", group: "спр.", grid: "Всички времена", formula: "Образуване",
      tPractice: "Упражнения", mForms: "Форми", mAspect: "Вид", mTense: "Време",
      qForms: "Изберете правилната форма", qAspect: "НСВ или СВ? Попълнете глагола", qTense: "Кое време е правилно?",
      right: "вярно", streak: "серия", best: "рекорд", yes: "Вярно!", no: "Грешно", next: "Напред →",
      keys: "Клавиши: 1–4 – отговор, Enter – напред", sigs: "Сигнални думи", inBuilder: "Отвори в конструктора",
      whyI: "НСВ: процес, повторение, навик.", whyP: "СВ: едно завършено действие с резултат.",
      whyA: "Свършеният вид в сегашно време не се употребява самостоятелно – само след „да“, „ще“, „ако“, „когато“ и др. Тук е възможен само НСВ.",
      whyB: "Забрана („не“ + повелително) – по правило НСВ.",
      orig: "Така е в оригинала от вашия списък:",
      stress: "Ударения", stressTitle: "Показвай ударенията",
      foot: function (n) { return n + " " + (n === 1 ? "двойка" : "двойки") + " глаголи от списъка на Study in BG"; },
      train: "Какво да упражнявам", allT: "Всички времена", aspL: "Вид", both: "двата",
      noQ: "Няма упражнения за този избор.", pickAll: "Избери всички времена",
      noAspInMode: "В този режим видът е част от задачата, затова тук няма превключвател за вид.",
      hasT: "В този режим има въпроси само за времената:",
      say: "Произнеси", ttsNo: "Озвучаването не е достъпно: в този браузър няма български глас.", close: "Затвори",
      ttsH: "Озвучаване", ttsOff: "Само гласът на системата", ttsGoogle: "Google (без ключ)", ttsEleven: "ElevenLabs (собствен ключ)",
      ttsPrivacy: "Онлайн озвучаването изпраща българския текст на избраната услуга. Ключът се пази само в този браузър.",
      ttsKey: "API ключ на ElevenLabs", ttsVoice: "ID на глас (по желание)", ttsNeedKey: "Поставете ключ на ElevenLabs, за да включите озвучаването.",
      ttsOn: "Онлайн озвучаването е включено", ttsFail: "Не се получи онлайн озвучаване. Проверете връзката и ключа.", ttsSet: "Настройки на озвучаването",
      ttsMac: "Mac / iPhone: Настройки → Достъпност → Изговорено съдържание → Системен глас → Управление на гласовете → Български (Daria).",
      ttsWin: "Windows: Настройки → Час и език → Език и регион → добавете български и инсталирайте говор; след това рестартирайте браузъра.",
      ttsAnd: "Android: Настройки → Език → Синтез на реч (Google) → инсталирайте български.",
      ttsAny: "Нужен е български глас в системата; след инсталиране рестартирайте браузъра – бутоните 🔊 ще се появят сами.",
      irr: "неправ.", noPair: "без двойка", impers: "безл.",
      qBtn: "въпрос", qTitle: "Въпрос с „ли“", prNone: "без", prL: "Кратки местоимения",
      sentNote: "Изрази без подлог. С подлог кратките думи са пред глагола: Аз го видях, Аз съм го виждал, Ти видя ли го?",
      fav: "Моите", allV: "Всички", favAdd: "Добави в моите", favDel: "Махни от моите", favIn: "В моите",
      favEmpty: "Още няма нищо. Натиснете ☆ до глагола, за да го добавите тук.",
      favOnly: "Само моите глаголи", favNone: "В „Моите“ още няма глаголи – отбележете ги със звездичка в раздела „Глаголи“.",
      ansL: "Отговор", choiceL: "избор", typeL: "писане", typePh: "Напишете отговора", check: "Провери",
      yourAns: "Вашият отговор:", rightAns: "Правилно:", alsoOk: "Също е правилно. В задачата се има предвид:", hintV: "Глагол:",
      keysT: "Enter – провери, после напред"
    }
  };
  function plural(n, one, few, many) {
    var a = n % 10, b = n % 100;
    return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many;
  }
  var CHIP = {
    ru: { present: "Настоящее", aorist: "Аорист", imperfect: "Имперфект", perfect: "Перфект", pluperfect: "Плюсквам\u00adперфект", future: "Будущее", fip: "Будущее в прош.", fp: "Буд. предварит.", fpp: "Буд. предв. в прош.", cond: "Условное", impv: "Повели\u00adтельное" },
    bg: { present: "Сегашно", aorist: "Аорист", imperfect: "Имперфект", perfect: "Перфект", pluperfect: "Мин. предва\u00adрително", future: "Бъдеще", fip: "Бъдеще в миналото", fp: "Бъд. предва\u00adрително", fpp: "Бъд. предв. в миналото", cond: "Условно", impv: "Пове\u00adлително" }
  };

  /* ---------- State ---------- */
  var store = {
    get: function (k) { try { return localStorage.getItem("glagoli3:" + k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem("glagoli3:" + k, v); } catch (e) { /* ignore */ } }
  };
  var DEFAULT_VERB = VERBS.filter(function (v) { return v.pf && v.pf.inf === "взема"; })[0].id;
  var savedB = null;
  try { savedB = JSON.parse(store.get("builder") || "null"); } catch (e) { savedB = null; }
  var S = {
    lang: store.get("lang") === "bg" ? "bg" : "ru",
    tab: "form", verb: null, query: "", tr: store.get("tr") !== "0", legend: false,
    stress: store.get("stress") !== "0",
    open: {}, showRare: false, vperson: 0, vrare: false,
    B: { verb: DEFAULT_VERB, tense: "present", person: 0, pf: false, gender: "m", neg: false, ask: false, pr: "", sel: -1, picking: false, q: "" },
    vfilter: store.get("vfilter") === "fav" ? "fav" : "all",
    anim: null, prev: null
  };
  if (savedB && VERBS[savedB.verb] && TBY[savedB.tense]) {
    ["verb", "tense", "person", "pf", "gender", "neg", "ask", "pr"].forEach(function (k) { if (savedB[k] !== undefined) S.B[k] = savedB[k]; });
  }
  function saveB() { store.set("builder", JSON.stringify({ verb: S.B.verb, tense: S.B.tense, person: S.B.person, pf: S.B.pf, gender: S.B.gender, neg: S.B.neg, ask: S.B.ask, pr: S.B.pr })); }
  function t(k) { return U[S.lang][k]; }
  function L(o) { return o ? (o[S.lang] || o.ru) : ""; }
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function shortName(tn) { return CHIP[S.lang][tn.id]; }

  /* ---------- Verb helpers ---------- */
  function dict(f) { return S.stress ? G.markStr(f.inf, f.st.inf) : f.inf; }
  function impfTitle(v) { return dict(v.impf) + (v.seI ? " " + v.seI : v.opt ? " (" + v.opt + ")" : "") + (v.tail ? " " + v.tail : ""); }
  function pfTitle(v) { return "да " + (v.seP ? v.seP + " " : v.opt ? "(" + v.opt + ") " : "") + dict(v.pf) + (v.tail ? " " + v.tail : ""); }
  function pairHTML(v) {
    if (v.single) return '<span class="i-txt">' + impfTitle(v) + "</span>";
    return '<span class="i-txt">' + impfTitle(v) + '</span><span class="dash"> – </span><span class="p-txt">' + pfTitle(v) + "</span>";
  }
  function grp(f) { return f.group === "irr" ? t("irr") : f.group; }
  var TR = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sht", ъ: "a", ь: "y", ю: "yu", я: "ya" };
  VERBS.forEach(function (v) {
    var bg = (v.impf.inf + " " + (v.pf ? v.pf.inf + " " + v.pf.pres[1] : "")).toLowerCase();
    v.key = v.impf.inf + "|" + v.seI + "|" + (v.pf ? v.pf.inf : "") + "|" + v.tail;
    v.hayBg = bg; v.hayLat = bg.replace(/[а-я]/g, function (c) { return TR[c] || c; }); v.hayRu = v.ru.toLowerCase();
    v.setI = G.wordSet(v.impf); v.setP = G.wordSet(v.pf);
  });
  var LIST_PAIRS = VERBS.filter(function (v) { return !v.extra; }).length;
  var BY_INF = {}; VERBS.forEach(function (v) { if (!BY_INF[v.impf.inf]) BY_INF[v.impf.inf] = v; });

  /* ---------- Favourites ("мои глаголы") ---------- */
  var FAV = {};
  try { (JSON.parse(store.get("fav") || "[]") || []).forEach(function (k) { FAV[k] = 1; }); } catch (e) { FAV = {}; }
  function isFav(v) { return !!(v && FAV[v.key]); }
  function favCount() { return VERBS.filter(isFav).length; }
  function toggleFav(v) { if (FAV[v.key]) delete FAV[v.key]; else FAV[v.key] = 1; store.set("fav", JSON.stringify(Object.keys(FAV))); }
  function starBtn(v) {
    var on = isFav(v), lbl = on ? t("favDel") : t("favAdd");
    return '<button class="star" data-fav="' + v.id + '" aria-pressed="' + on + '" aria-label="' + esc(lbl) + '" title="' + esc(lbl) + '">' + (on ? "★" : "☆") + "</button>";
  }
  var SORTED = VERBS.slice().sort(function (a, b) { return a.impf.inf.localeCompare(b.impf.inf, "bg") || a.id - b.id; });
  function search(q) {
    q = q.trim().toLowerCase();
    if (!q) return SORTED;
    var lat = /[a-z]/.test(q);
    var hit = SORTED.filter(function (v) { return lat ? v.hayLat.indexOf(q) >= 0 : (v.hayBg.indexOf(q) >= 0 || v.hayRu.indexOf(q) >= 0); });
    // verbs that start with the query come first: "чета" before "предпочета"
    var starts = function (v) { var h = lat ? v.hayLat : v.hayBg; return (" " + h).indexOf(" " + q) >= 0 ? 0 : 1; };
    return hit.map(function (v, k) { return [starts(v), k, v]; }).sort(function (a, c) { return a[0] - c[0] || a[1] - c[1]; }).map(function (x) { return x[2]; });
  }
  function highlight(text, v) {
    var w = text.split(/([А-Яа-яЍѝ]+)/);
    return w.map(function (x, i) {
      if (i % 2 === 0) return esc(x);
      var lw = x.toLowerCase(), a = v.setI[lw], b = v.setP[lw];
      if (!a && !b) return x;
      var cls = b && !a ? "p" : a && !b ? "i" : (/(^|\s)(да|ще|ако|когато|като)(\s+(се|си|ми|ти|му|ѝ|ни|ви|им|го|я|ги|те|ме))*\s*$/.test(w.slice(Math.max(0, i - 6), i).join(" ").toLowerCase()) ? "p" : "i");
      return '<b class="' + cls + '">' + x + "</b>";
    }).join("");
  }

  /* ---------- Speech (built-in browser voice, bg-BG) ---------- */
  var TTS = { ok: null, voice: null, online: store.get("ttsOnline") || "", audio: null, cache: {}, fail: 0 };
  if (["google", "eleven"].indexOf(TTS.online) < 0) TTS.online = "";
  var EL_VOICE = "21m00Tcm4TlvDq8ikWAM"; // a default ElevenLabs voice; any voice id can be pasted in the settings
  function onlineReady() { return TTS.online === "google" || (TTS.online === "eleven" && !!store.get("elKey")); }
  function ttsUpdate() { TTS.ok = !!TTS.voice || onlineReady(); }
  ttsUpdate();
  function plainText(html) { return G.stripStress(String(html).replace(/<[^>]*>/g, "")).replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">"); }
  function sayBtn(text) {
    if (!TTS.ok) return "";
    return '<button class="tts" data-say="' + esc(plainText(text)) + '" aria-label="' + esc(t("say")) + '" title="' + esc(t("say")) + '">🔊</button>';
  }
  function speakBrowser(text) {
    try {
      var u = new SpeechSynthesisUtterance(text);
      u.lang = "bg-BG"; if (TTS.voice) u.voice = TTS.voice; u.rate = 0.9;
      window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
    } catch (e) { /* ignore */ }
  }
  function stopAudio() { if (TTS.audio) { try { TTS.audio.pause(); } catch (e) { /* ignore */ } TTS.audio = null; } }
  function playUrls(urls) {
    stopAudio();
    var i = 0;
    (function next() {
      if (i >= urls.length) return;
      var a = new Audio(urls[i++]); TTS.audio = a;
      a.onended = next; a.onerror = ttsFailed;
      var pr = a.play(); if (pr && pr.catch) pr.catch(ttsFailed);
    })();
  }
  function ttsFailed() { showNotice(t("ttsFail")); }
  /* Google: the unofficial translate endpoint takes ~200 characters at a time */
  function chunks(text) {
    var out = [], cur = "";
    text.split(/(?<=[.!?…])\s+/).forEach(function (sent) {
      while (sent.length > 180) { var cut = sent.lastIndexOf(" ", 180); if (cut < 40) cut = 180; if (cur) { out.push(cur); cur = ""; } out.push(sent.slice(0, cut)); sent = sent.slice(cut).trim(); }
      if ((cur + " " + sent).trim().length > 180) { out.push(cur); cur = sent; } else cur = (cur + " " + sent).trim();
    });
    if (cur) out.push(cur);
    return out;
  }
  function speakGoogle(text) {
    playUrls(chunks(text).map(function (c) { return "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=bg&q=" + encodeURIComponent(c); }));
  }
  function speakEleven(text) {
    var key = store.get("elKey"), voice = store.get("elVoice") || EL_VOICE, ck = voice + "|" + text;
    if (TTS.cache[ck]) { playUrls([TTS.cache[ck]]); return; }
    fetch("https://api.elevenlabs.io/v1/text-to-speech/" + encodeURIComponent(voice) + "?output_format=mp3_44100_128", {
      method: "POST", headers: { "xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg" },
      body: JSON.stringify({ text: text, model_id: "eleven_multilingual_v2", language_code: "bg" })
    }).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.blob(); })
      .then(function (blob) { TTS.cache[ck] = URL.createObjectURL(blob); playUrls([TTS.cache[ck]]); })
      .catch(ttsFailed);
  }
  function speak(text) {
    if (TTS.voice) speakBrowser(text);
    else if (TTS.online === "google") speakGoogle(text);
    else if (TTS.online === "eleven") speakEleven(text);
  }
  /* settings: the "?" panel */
  function ttsPanel() {
    var m = TTS.online, rows = '<div class="seg ttsseg" role="group" aria-label="' + esc(t("ttsH")) + '">' +
      [["", "ttsOff"], ["google", "ttsGoogle"], ["eleven", "ttsEleven"]].map(function (x) { return '<button data-ttsmode="' + x[0] + '" aria-pressed="' + (m === x[0]) + '">' + t(x[1]) + "</button>"; }).join("") + "</div>";
    if (m === "eleven") rows += '<input id="elKey" class="search" type="password" autocomplete="off" spellcheck="false" placeholder="' + esc(t("ttsKey")) + '" value="' + esc(store.get("elKey") || "") + '">' +
      '<input id="elVoice" class="search" type="text" autocomplete="off" spellcheck="false" placeholder="' + esc(t("ttsVoice")) + '" value="' + esc(store.get("elVoice") || "") + '">';
    var status = TTS.voice ? "" : m === "eleven" && !store.get("elKey") ? t("ttsNeedKey") : m ? t("ttsOn") : "";
    return '<div class="tts-set"><h4 class="label">' + t("ttsH") + "</h4>" + rows + (status ? '<p class="small">' + esc(status) + "</p>" : "") + (m ? '<p class="muted small">' + t("ttsPrivacy") + "</p>" : "") + "</div>";
  }
  function ttsOsKey() {
    var ua = navigator.userAgent || "";
    return /Android/i.test(ua) ? "ttsAnd" : /iPhone|iPad|Macintosh|Mac OS/i.test(ua) ? "ttsMac" : /Windows/i.test(ua) ? "ttsWin" : "ttsAny";
  }
  function initTTS() {
    var decided = false;
    function check(final) {
      if (decided) return;
      var vs = [];
      try { vs = window.speechSynthesis ? window.speechSynthesis.getVoices() : []; } catch (e) { vs = []; }
      var bg = vs.filter(function (x) { return /^bg([-_]|$)/i.test(x.lang); })[0];
      if (bg) { decided = true; TTS.voice = bg; ttsUpdate(); render(); return; }
      if (final) {
        decided = true; ttsUpdate();
        if (TTS.ok) render();
        else if (store.get("ttsHint") !== "1") { store.set("ttsHint", "1"); showNotice(t("ttsNo") + " " + t(ttsOsKey()), true); }
      }
    }
    // a voice installed while the page is open: look again when the tab gets focus back
    function recheck() { if (!TTS.voice && window.speechSynthesis) { decided = false; check(false); if (!TTS.voice) decided = true; } }
    window.addEventListener("focus", recheck);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) recheck(); });
    if (window.speechSynthesis) {
      try { window.speechSynthesis.addEventListener("voiceschanged", function () { check(false); }); } catch (e) { /* ignore */ }
      check(false);
    }
    setTimeout(function () { check(true); }, 2500);
  }
  function showNotice(text, withSettings) {
    var n = $("notice");
    n.innerHTML = "<span>" + esc(text) + "</span>" + (withSettings ? '<button class="link" data-ttsset>' + t("ttsSet") + "</button>" : "") + '<button class="link" data-closenotice aria-label="' + esc(t("close")) + '">✕</button>';
    n.hidden = false;
  }


  function quote(bg, ru) { return '<div class="quote"><span class="bgt">' + bg + sayBtn(bg) + '</span><span class="tr">' + esc(ru) + "</span></div>"; }
  function trToggle() { return '<label class="trt"><input type="checkbox" class="trbox"' + (S.tr ? " checked" : "") + "> " + t("tr") + "</label>"; }
  function examplesPanel(v) {
    if (!v.ex || !v.ex.length) return "";
    return '<div class="panel ex b-ex"><div class="ex-head"><h3 class="label">' + t("examples") + "</h3>" + trToggle() + "</div>" +
      v.ex.map(function (e) { return quote(highlight(e[0], v), e[1]); }).join("") + "</div>";
  }

  function cellText(tid, v, pf, i, gender, neg, o) {
    var r = G.build(tid, v, pf, i, gender || "m", !!neg, S.lang, o);
    if (r.na) return null;
    var html = "", prev = null;
    r.pieces.forEach(function (p) {
      var glue = prev && ((prev.k === "stem" && p.k === "end") || p.k === "q"), txt = esc(G.pieceText(p, S.stress));
      html += (prev && !glue ? " " : "") + (p.k === "pt" || p.k === "se" || p.k === "q" ? '<span class="aux">' + txt + "</span>" : p.k === "cl" ? '<span class="cl">' + txt + "</span>" : p.k === "end" ? '<span class="endc">' + txt + "</span>" : txt);
      prev = p;
    });
    return html;
  }

  /* ---------- Chrome ---------- */
  function renderChrome() {
    document.documentElement.lang = S.lang;
    $("sub").textContent = t("sub");
    $("lang").innerHTML = ["ru", "bg"].map(function (l) { return '<button data-lang="' + l + '" aria-pressed="' + (S.lang === l) + '">' + l.toUpperCase() + "</button>"; }).join("");
    var sb = $("stressBtn");
    sb.setAttribute("aria-pressed", String(S.stress)); sb.setAttribute("aria-label", t("stressTitle")); sb.title = t("stressTitle");
    sb.querySelector(".lbl").textContent = t("stress");
    $("help").setAttribute("aria-expanded", String(S.legend));
    $("legend").hidden = !S.legend;
    $("legend").innerHTML = '<div class="row"><i class="dot i"></i><span><b class="i">' + t("impfS") + "</b> " + t("legI") + '</span></div><div class="row"><i class="dot p"></i><span><b class="p">' + t("pfS") + "</b> " + t("legP") + '</span></div><div class="row"><i class="dot h"></i><span>' + t("legH") + '</span></div><p class="muted">' + t("legTap") + "</p>" + ttsPanel();
    ["form", "tenses", "verbs", "practice"].forEach(function (k) {
      $("tab-btn-" + k).querySelector("span").textContent = t({ form: "tForm", tenses: "tTenses", verbs: "tVerbs", practice: "tPractice" }[k]);
      $("pane-" + k).hidden = S.tab !== k;
      $("tab-btn-" + k).setAttribute("aria-selected", String(S.tab === k));
    });
    $("foot").textContent = t("foot")(LIST_PAIRS);
    document.body.classList.toggle("no-tr", !S.tr);
  }

  /* ---------- Форма (builder) ---------- */
  var PR_TXT = { a: "го", d: "му", ad: "му го" };
  function prChoices(v) { return v.pron === "ad" ? ["a", "d", "ad"] : v.pron ? [v.pron] : []; }
  /* question / pronoun options for the builder, limited to what the verb allows */
  function bOpts(v) {
    var B = S.B, pr = prChoices(v).indexOf(B.pr) >= 0 ? B.pr : "";
    return B.ask || pr ? { q: B.ask, pr: pr } : null;
  }
  function plainCell(tid, v, pf, i, o) {
    var r = G.build(tid, v, pf, i, S.B.gender, S.B.neg, S.lang, o);
    return r.na ? "" : G.joinPieces(r);
  }
  function renderForm() {
    var B = S.B, v = VERBS[B.verb], tn = TBY[B.tense], grp0 = groupOf(B.tense);
    var partT = !!G.PART_TENSES[B.tense], o = bOpts(v), cols = v.single ? [0] : [0, 1];
    if (v.single) B.pf = false;
    if (v.only3) B.person = 2;
    if (B.tense === "impv" && B.person !== 1 && B.person !== 4) B.person = 1;

    // change detection: tense/verb change → fade; не / м-ж / ? / го → flash the cells that changed
    var key = B.verb + "|" + B.tense, now = {}, changed = {}, fade = false;
    for (var i = 0; i < 6; i++) for (var a = 0; a < 2; a++) now[i + "|" + a] = plainCell(B.tense, v, !!a, i, o);
    if (S.anim && S.prev) {
      if (S.prev.key !== key || S.anim === "fade") fade = true;
      else if (S.anim === "chg") Object.keys(now).forEach(function (k) { if (now[k] !== S.prev.cells[k]) changed[k] = 1; });
    }
    S.prev = { key: key, cells: now };
    var selAnim = S.anim === "sel" || S.anim === "chg";
    S.anim = null;

    // verb picker: the whole (filtered) list scrolls
    var found = B.picking ? search(B.q) : [];
    var verb = '<div class="vwrap"><div class="vpick-row">' +
      '<button class="vpick" data-pick aria-expanded="' + B.picking + '"><span class="txt"><span class="pair">' + pairHTML(v) + '</span><span class="vmean">' + esc(v.ru) + '</span></span><span class="chev">▾</span></button>' + starBtn(v) + "</div>" +
      (v.note && !B.picking ? '<p class="note">' + esc(L(v.note)) + "</p>" : "") +
      (B.picking ? '<div class="picker"><input id="bq" class="search" type="search" autocomplete="off" spellcheck="false" placeholder="' + esc(t("search")) + '" value="' + esc(B.q) + '">' +
        '<p class="pcount">' + t("count")(found.length) + '</p><div class="plist">' +
        found.map(function (x) { return '<button class="prow" data-bverb="' + x.id + '"><span class="pair">' + pairHTML(x) + '</span><span class="vmean">' + esc(x.ru) + "</span></button>"; }).join("") + "</div></div>" : "") +
      "</div>";

    // tense picker
    var groups = '<div class="seg" role="group">' + GROUPS.map(function (g) {
      return '<button data-bgroup="' + g.id + '" aria-pressed="' + (g === grp0) + '">' + L(g.name) + "</button>";
    }).join("") + "</div>";
    var tlist = grp0.t.length > 1 ? '<div class="tlist">' + grp0.t.map(function (id) {
      var x = TBY[id];
      return '<button class="tbtn' + (x.core ? "" : " rare") + '" data-btense="' + id + '" aria-pressed="' + (id === B.tense) + '">' + G.icon(id) + "<span>" + shortName(x) + "</span></button>";
    }).join("") + "</div>" : "";
    var ctl = '<div class="ctl">' + groups + tlist + "</div>";

    // the selected form, large, split into explained pieces
    var r = G.build(B.tense, v, B.pf, B.person, B.gender, B.neg, S.lang, o);
    var pron = (v.only3 ? t("impers") : B.person === 2 && partT ? (B.gender === "f" ? "тя" : "той") : G.PERSONS[B.person]) + " · " + (B.pf ? t("pfS") : t("impfS"));
    var hero;
    if (r.na) {
      hero = '<div class="b-hero"><span class="b-pron">' + pron + '</span><p class="b-na">' + esc(r.na) + "</p></div>";
    } else {
      var sp = B.sel >= 0 && B.sel < r.pieces.length && r.pieces[B.sel].k !== "q" ? B.sel : -1;
      if (sp < 0 && o) r.pieces.forEach(function (pc, k) { if (sp < 0 && (pc.k === "cl" || pc.t === "ли")) sp = k; });
      if (sp < 0) { r.pieces.forEach(function (pc, k) { if (pc.k === "end") sp = k; }); if (sp < 0) sp = r.pieces[r.pieces.length - 1].k === "q" ? r.pieces.length - 2 : r.pieces.length - 1; }
      // pieces written together (stem + ending, the word + "?") stay on one line
      var groups = [];
      r.pieces.forEach(function (pc, k) {
        var prev = r.pieces[k - 1], glue = prev && ((prev.k === "stem" && pc.k === "end") || pc.k === "q");
        if (glue) groups[groups.length - 1].push(k); else groups.push([k]);
      });
      var word = groups.map(function (g) {
        var html = g.map(function (k) {
          var pc = r.pieces[k];
          if (pc.k === "q") return '<span class="pc k-q">?</span>';
          return '<button class="pc k-' + pc.k + (B.pf ? " pf" : " impf") + '" data-piece="' + k + '" aria-pressed="' + (k === sp) + '">' + esc(G.pieceText(pc, S.stress)) + "</button>";
        }).join("");
        return g.length > 1 ? '<span class="w">' + html + "</span>" : html;
      }).join("");
      hero = '<div class="b-hero"><span class="b-pron">' + pron + '</span><div class="b-wordrow"><div class="b-word' + (selAnim || fade ? " fade" : "") + '">' + word + "</div>" + sayBtn(G.joinPieces(r)) + "</div>" +
        '<p class="b-info">' + esc(r.pieces[sp].info) + "</p></div>";
    }

    // tools: м / ж, не, вопрос, + го / му
    var prs = prChoices(v), qOk = !v.noQ;
    var tools = '<div class="t-tools"><span class="t-name">' + G.icon(tn.id) + "<b>" + shortName(tn) + "</b></span>" +
      (partT && !v.only3 ? '<div class="seg"><button data-bgen="m" aria-pressed="' + (B.gender === "m") + '">' + t("m") + '</button><button data-bgen="f" aria-pressed="' + (B.gender === "f") + '">' + t("f") + "</button></div>" : "") +
      '<button class="negbtn" data-bneg aria-pressed="' + B.neg + '">' + t("neg") + "</button>" +
      (qOk ? '<button class="negbtn qbtn" data-bask aria-pressed="' + B.ask + '" title="' + esc(t("qTitle")) + '" aria-label="' + esc(t("qTitle")) + '">ли?</button>' : "") + "</div>" +
      (prs.length ? '<div class="t-tools t-pr"><span class="t-k">' + t("prL") + ':</span><div class="seg prseg" role="group" aria-label="' + esc(t("prL")) + '"><button data-bpr="" aria-pressed="' + !(o && o.pr) + '">' + t("prNone") + "</button>" +
        prs.map(function (x) { return '<button class="bg" data-bpr="' + x + '" aria-pressed="' + (!!o && o.pr === x) + '">+ ' + PR_TXT[x] + "</button>"; }).join("") + "</div></div>" : "");

    // all persons × НСВ | СВ
    var rows = G.PERSONS.map(function (p, i) {
      if (!now[i + "|0"] && !now[i + "|1"]) return "";
      var who = v.only3 ? t("impers") : i === 2 ? (partT && B.gender === "f" ? "тя" : "той") : p;
      var tds = cols.map(function (a) {
        var c = cellText(B.tense, v, !!a, i, B.gender, B.neg, o), sel = i === B.person && !!a === B.pf;
        return '<td><button class="fcell ' + (a ? "p" : "i") + (changed[i + "|" + a] ? " chg" : "") + (c ? "" : " empty") + '" data-fcell="' + i + "|" + a + '" aria-pressed="' + sel + '">' + (c || "—") + "</button></td>";
      }).join("");
      return '<tr><th class="who">' + who + "</th>" + tds + "</tr>";
    }).join("");
    var head = '<th class="i">' + t("impfS") + ' <span class="bg">' + dict(v.impf) + "</span></th>" + (v.single ? "" : '<th class="p">' + t("pfS") + ' <span class="bg">' + dict(v.pf) + "</span></th>");
    var table = '<div class="panel tpanel">' + tools + hero +
      '<table class="ftable' + (fade ? " fade" : "") + (v.single ? " one" : "") + '"><colgroup><col class="cw"><col>' + (v.single ? "" : "<col>") + "</colgroup><thead><tr><th></th>" + head + "</tr></thead><tbody>" + rows + "</tbody></table>" +
      (o ? '<p class="t-note">' + t("sentNote") + "</p>" : "") +
      '<div class="b-meta"><span><b>' + L(tn.name) + "</b> · " + (S.lang === "ru" ? "≈ " + G.RUEQ[tn.id] : L(tn.short)) + '</span><button class="link" data-totense="' + tn.id + '">' + t("aboutTense") + "</button></div></div>";

    $("pane-form").innerHTML = '<div class="builder"><div class="b-col left">' + verb + ctl + examplesPanel(v) + '</div><div class="b-col right">' + table + "</div></div>";
    if (B.picking) { var q = $("bq"); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
  }

  /* ---------- Времена ---------- */
  var CHOOSE = [
    ["present", { ru: "делаю, делаю всегда", bg: "правя, правя винаги" }],
    ["aorist", { ru: "сделал / делал — в известный момент", bg: "направих / правих – в определен момент" }],
    ["imperfect", { ru: "делал, когда… · раньше делал", bg: "правех, когато… · навик в миналото" }],
    ["perfect", { ru: "уже делал, бывал · результат сейчас", bg: "опит · резултат сега" }],
    ["future", { ru: "сделаю / буду делать", bg: "ще направя / ще правя" }],
    ["fip", { ru: "собирался… · сделал бы (о прошлом)", bg: "щях да…, но… · нереално минало" }],
    ["cond", { ru: "сделал бы · хотел бы", bg: "бих направил · бих искал" }],
    ["impv", { ru: "сделай! · не делай!", bg: "направи! · не прави!" }]
  ];
  function strip(tn) {
    var s = G.STRIP[tn.id];
    var head = "<tr><th></th>" + G.PERSONS.map(function (p) { return "<th>" + p + "</th>"; }).join("") + "</tr>";
    var rows = s.rows.map(function (r) {
      return '<tr><td class="g">' + (r[0] || "") + "</td>" + r[1].map(function (c) { return "<td>" + (c || '<span class="muted">·</span>') + "</td>"; }).join("") + "</tr>";
    }).join("");
    return '<div class="strip-wrap"><table class="strip">' + head + rows + "</table></div>" + (s.after ? '<p class="after">' + L(s.after) + "</p>" : "");
  }
  function tenseCard(tn) {
    var open = !!S.open[tn.id], e = tn.examples[0];
    var h = '<article class="tcard" id="t-' + tn.id + '">' +
      '<header class="tc-h">' + G.icon(tn.id) + '<h3 class="tn">' + L(tn.name) + "</h3>" +
      '<span class="tc-sub">' + (S.lang === "ru" ? '<span class="bg">' + tn.name.bg + "</span> · ≈ " + G.RUEQ[tn.id] : L(tn.short)) + "</span></header>" +
      '<p class="formula">' + t("formula") + ": <b>" + L(tn.formula) + "</b></p>" + strip(tn) + quote(e[0], e[1]) +
      '<div class="tc-links"><button class="link" data-tobuilder="' + tn.id + '">' + t("openBuilder") + '</button><button class="link" data-toggle="' + tn.id + '" aria-expanded="' + open + '">' + (open ? t("less") + " ▴" : t("more") + " ▾") + "</button></div>";
    if (open) {
      h += '<div class="tc-more">' +
        '<div><h4 class="label">' + t("when") + '</h4><ul class="clean">' + L(tn.uses).map(function (u) { return "<li>" + u + "</li>"; }).join("") + "</ul></div>" +
        '<div class="asp"><div class="aspc i"><b>' + t("impfS") + "</b><span>" + L(tn.aspect.i) + '</span></div><div class="aspc p"><b>' + t("pfS") + "</b><span>" + L(tn.aspect.p) + "</span></div></div>" +
        '<div><h4 class="label">' + t("signals") + '</h4><div class="signals">' + tn.signals.map(function (s) { return '<span class="sig">' + s + "</span>"; }).join("") + "</div></div>" +
        '<div><h4 class="label">' + t("tips") + '</h4><ul class="tips">' + L(tn.tips).map(function (s) { return "<li>" + s + "</li>"; }).join("") + "</ul></div>" +
        (S.lang === "ru" && tn.ruCompare ? '<div class="compare"><h4 class="label">' + t("compare") + "</h4><p>" + tn.ruCompare + "</p></div>" : "") +
        '<div class="ex">' + tn.examples.slice(1).map(function (x) { return quote(x[0], x[1]); }).join("") +
        '<h4 class="label">' + t("negL") + "</h4>" + quote(tn.neg[0], tn.neg[1]) +
        (tn.q ? '<h4 class="label">' + t("qL") + "</h4>" + quote(tn.q[0], tn.q[1]) : "") + "</div></div>";
    }
    return h + "</article>";
  }
  function renderTenses() {
    var ru = S.lang === "ru";
    var choose = '<div class="panel"><h3 class="label">' + t("choose") + '</h3><div class="choose">' + CHOOSE.map(function (c) {
      var tn = TBY[c[0]];
      return '<button class="crow" data-jump="' + tn.id + '"><span class="say">' + L(c[1]) + '</span><span class="ctn">' + G.icon(tn.id) + shortName(tn) + "</span></button>";
    }).join("") + "</div></div>";
    var aspect = '<div class="panel"><h3 class="label">' + t("aspectT") + '</h3><div class="asp">' +
      '<div class="aspc i"><b>' + t("impfS") + "</b><span>" + (ru ? "процесс, привычка, длительность, запрет" : "процес, навик, продължителност, забрана") + '</span><span class="sigs">винаги · обикновено · често · всеки ден · докато</span></div>' +
      '<div class="aspc p"><b>' + t("pfS") + "</b><span>" + (ru ? "одно действие с результатом" : "едно действие с резултат") + '</span><span class="sigs">веднъж · този път · изведнъж · до утре · за час</span></div></div>' +
      '<p class="muted small">' + (ru ? "Отличие от русского: СВ без «ще» / «да» не значит будущее. «Возьму» = «ще взема»." : "Свършеният вид в сегашно време стои само след „да“, „ще“, „ако“, „когато“.") + "</p></div>";
    var stems = '<details class="panel stems"><summary><h3 class="label">' + t("stemsT") + "</h3></summary>" +
      '<table class="plain"><tbody>' +
      "<tr><td>Аорист</td><td>" + (ru ? "III: -м → -х (питам → питах). I и II — гласная перед -х разная:" : "III: -м → -х (питам → питах). При I и II гласната пред -х е различна:") + ' <span class="bg">-ох: чета → четох · -ах / -ях: кажа → казах, видя → видях · -их: правя → правих · -х: взема → взех</span></td></tr>' +
      "<tr><td>Имперфект</td><td>" + (ru ? "I и II: под ударением -ях, без ударения -ех; после ж, ч, ш — -ах. III: -м → -х." : "I и II: под ударение -ях, без ударение -ех; след ж, ч, ш – -ах. III: -м → -х.") + ' <span class="bg">четях · правех · питах</span></td></tr>' +
      "<tr><td>" + (ru ? "Причастие" : "Причастие") + "</td><td>" + (ru ? "аорист без -х + -л; -ох → -ъл. Мн. ч.: я → е." : "аорист без -х + -л; -ох → -ъл. Мн.ч.: я → е.") + ' <span class="bg">правих → правил · донесох → донесъл · видял → видели</span></td></tr>' +
      "<tr><td>" + (ru ? "Спряжение" : "Спрежение") + "</td><td>" + (ru ? "по форме «ти»:" : "по формата за „ти“:") + ' <span class="bg">-еш → I · -иш → II · -аш / -яш → III</span></td></tr>' +
      "</tbody></table></details>";
    $("pane-tenses").innerHTML = '<div class="ttop">' + choose + aspect + "</div>" +
      '<div class="tcards">' + CORE.map(tenseCard).join("") + "</div>" +
      '<details class="rare-wrap"' + (S.showRare ? " open" : "") + "><summary>" + t("rareT") + " (" + RARE.length + ')</summary><div class="tcards">' + RARE.map(tenseCard).join("") + "</div></details>" +
      stems;
  }

  /* ---------- Глаголы ---------- */
  function renderVerbs() {
    var el = $("pane-verbs");
    if (S.verb !== null) { el.innerHTML = verbPage(VERBS[S.verb]); return; }
    var fav = S.vfilter === "fav", nf = favCount();
    var list = search(S.query).filter(function (v) { return !fav || isFav(v); }), keep = document.activeElement && document.activeElement.id === "q";
    var filt = '<div class="seg vfilt" role="group"><button data-vfilt="all" aria-pressed="' + !fav + '">' + t("allV") + '</button><button data-vfilt="fav" aria-pressed="' + fav + '">★ ' + t("fav") + " (" + nf + ")</button></div>";
    el.innerHTML = '<div class="search-row"><input id="q" class="search" type="search" autocomplete="off" spellcheck="false" placeholder="' + esc(t("search")) + '" value="' + esc(S.query) + '"><span class="count">' + t("count")(list.length) + "</span></div>" + filt +
      (list.length ? '<div class="vlist">' + list.map(function (v) {
        return '<div class="vrow"><button class="vmain" data-verb="' + v.id + '"><span class="pair">' + pairHTML(v) + '</span><span class="vmean">' + esc(v.ru) + '</span><span class="grp">' + grp(v.impf) + (v.pf ? " · " + grp(v.pf) : "") +
          (v.single ? ' <em class="badge">' + t("noPair") + "</em>" : v.extra ? ' <em class="badge">' + t("model") + "</em>" : "") + "</span></button>" + starBtn(v) + "</div>";
      }).join("") + "</div>" : '<p class="muted">' + (fav && !nf ? t("favEmpty") : t("none")) + "</p>");
    if (keep) { var q = $("q"); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
  }
  function verbPage(v) {
    var i = S.vperson, tenses = CORE.concat(S.vrare ? RARE : []), cols = v.single ? [0] : [0, 1];
    var persons = '<div class="pseg">' + G.PERSONS.map(function (p, k) { return '<button data-vperson="' + k + '" aria-pressed="' + (k === i) + '">' + p.replace(" / тя", "") + "</button>"; }).join("") + "</div>";
    var rows = tenses.map(function (tn) {
      var pi = v.only3 ? 2 : tn.id === "impv" ? (i >= 3 ? 4 : 1) : i;
      return '<tr><th class="stick"><button class="tlink" data-cell="' + tn.id + "|0|" + pi + '">' + G.icon(tn.id) + "<span>" + shortName(tn) + "</span></button></th>" +
        cols.map(function (a) {
          var c = cellText(tn.id, v, !!a, pi);
          return '<td><button class="cell ' + (a ? "p" : "i") + '" data-cell="' + tn.id + "|" + a + "|" + pi + '">' + (c || '<span class="na">—</span>') + "</button></td>";
        }).join("") + "</tr>";
    }).join("");
    var fav = isFav(v);
    return '<button class="back" data-back>' + t("back") + "</button>" +
      '<div class="vhead"><h2 class="pairbig">' + pairHTML(v) + '</h2><p class="muted">' + esc(v.ru) + '</p><div class="badges"><span class="badge i">' + t("impfS") + " · " + grp(v.impf) + (v.impf.group === "irr" ? "" : " " + t("group")) + "</span>" +
      (v.pf ? '<span class="badge p">' + t("pfS") + " · " + grp(v.pf) + " " + t("group") + "</span>" : '<span class="badge">' + t("noPair") + "</span>") +
      '<button class="favbtn" data-fav="' + v.id + '" aria-pressed="' + fav + '">' + (fav ? "★ " + t("favIn") : "☆ " + t("favAdd")) + "</button></div>" +
      (v.note ? '<p class="note">' + esc(L(v.note)) + "</p>" : "") + "</div>" +
      '<div class="panel"><div class="vgrid-head"><h3 class="label">' + t("grid") + "</h3>" + (v.only3 ? "" : persons) + "</div>" +
      '<div class="gwrap"><table class="vgrid' + (v.single ? " one" : "") + '"><colgroup><col class="c0"><col>' + (v.single ? "" : "<col>") + '</colgroup><thead><tr><th class="stick"></th><th class="i">' + t("impfS") + " · " + dict(v.impf) + "</th>" +
      (v.single ? "" : '<th class="p">' + t("pfS") + " · " + dict(v.pf) + "</th>") + "</tr></thead><tbody>" + rows + "</tbody></table></div>" +
      '<button class="link" data-vrare>' + (S.vrare ? t("less") + " ▴" : t("rareT") + " (" + RARE.length + ") ▾") + "</button></div>" +
      examplesPanel(v);
  }

  /* ---------- Практика ---------- */
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function cap(w, like) { return like && like.charAt(0) !== like.charAt(0).toLowerCase() ? w.charAt(0).toUpperCase() + w.slice(1) : w; }

  var ALL_T = TENSES.map(function (x) { return x.id; });
  var savedT = null;
  try { savedT = JSON.parse(store.get("ptenses") || "null"); } catch (e) { savedT = null; }
  var P = {
    mode: store.get("pmode") || "forms", q: null, ans: -1, right: 0, total: 0, streak: 0, best: +(store.get("best") || 0), deck: [],
    tenses: Array.isArray(savedT) ? savedT.filter(function (x) { return TBY[x]; }) : ALL_T.slice(),
    asp: ["i", "p", "both"].indexOf(store.get("paspect")) >= 0 ? store.get("paspect") : "both",
    input: store.get("pinput") === "type" ? "type" : "choice",
    favOnly: store.get("pfav") === "1",
    ddOpen: false, typed: "", okTyped: false, altHit: false, last: null
  };
  if (["forms", "aspect", "tense"].indexOf(P.mode) < 0) P.mode = "forms";
  function tOn(id) { return P.tenses.indexOf(id) >= 0; }
  function saveFilter() {
    store.set("ptenses", JSON.stringify(P.tenses)); store.set("paspect", P.asp);
    store.set("pinput", P.input); store.set("pfav", P.favOnly ? "1" : "0");
  }
  /* every option is { p: plain text (used to check the answer), s: text with stress marks } */
  function opt(p, s) { return { p: p, s: s || p }; }
  /* "only my verbs": a question counts when its verb is starred; questions about verbs outside the list don't */
  function verbOk(v) { return !P.favOnly || isFav(v); }

  /* 1. Формы: the engine builds the answer and plausible wrong answers */
  var CONF = { present: ["future"], aorist: ["imperfect", "perfect"], imperfect: ["aorist"], perfect: ["aorist", "pluperfect"], pluperfect: ["perfect", "aorist"],
    future: ["present", "fip"], fip: ["future", "cond"], fp: ["future", "perfect"], fpp: ["fip", "fp"], cond: ["fip", "perfect"], impv: ["present"] };
  function formOpt(tid, v, pf, i, gender) { var r = G.build(tid, v, pf, i, gender || "m", false, S.lang); return r.na ? null : opt(G.joinPieces(r), G.joinPieces(r, true)); }
  function genForms() {
    var verbs = VERBS.filter(function (v) { return verbOk(v) && !(v.single && P.asp === "p"); });
    var tensesOk = P.tenses.filter(function (id) { return !(id === "imperfect" && P.asp === "p"); });
    if (!tensesOk.length || !verbs.length) return null;
    for (var n = 0; n < 150; n++) {
      var v = pick(verbs), tid = pick(tensesOk), i = v.only3 ? 2 : rnd(6);
      var pf = v.single ? false : P.asp === "both" ? Math.random() < 0.5 : P.asp === "p";
      if (tid === "impv") i = pick([1, 4]);
      if (tid === "imperfect") pf = false;
      var c = formOpt(tid, v, pf, i);
      if (!c) continue;
      var others = shuffle([0, 1, 2, 3, 4, 5].filter(function (k) { return k !== i && !(tid === "impv" && k !== 1 && k !== 4); }));
      var pool = [formOpt(tid, v, !pf, i)]
        .concat(shuffle(CONF[tid] || []).map(function (t2) { return formOpt(t2, v, pf, i); }))
        .concat(others.map(function (k) { return formOpt(tid, v, pf, k); }));
      var seen = {}, wrong = [];
      seen[c.p] = 1;
      pool.forEach(function (o) { if (o && !seen[o.p] && wrong.length < 3) { seen[o.p] = 1; wrong.push(o); } });
      if (wrong.length < 2) continue;
      // typed answers: for аз / ти the feminine participle is right too
      var acc = [c.p], cf = G.PART_TENSES[tid] && i < 2 ? formOpt(tid, v, pf, i, "f") : null;
      if (cf) acc.push(cf.p);
      return { mode: "forms", v: v.id, tid: tid, pf: pf, i: i, opts: shuffle([c].concat(wrong)), ok: c.p, acc: acc };
    }
    return null;
  }

  /* 2. Вид: a sentence from the PDF with one verb blanked — only where one aspect is clearly required */
  var ASPECT_ITEMS = null;
  var SKIP = { "се": 1, "си": 1, "ми": 1, "ти": 1, "му": 1, "ѝ": 1, "й": 1, "ни": 1, "ви": 1, "им": 1, "го": 1, "я": 1, "ги": 1, "те": 1, "ме": 1, "ли": 1 };
  var TRIG = { "да": 1, "ще": 1, "ако": 1, "когато": 1, "като": 1, "щом": 1, "докато": 1, "преди": 1, "нека": 1, "няма": 1, "нямаше": 1 };
  var AUXW = { perfect: ["съм", "си", "е", "сме", "сте", "са"], pluperfect: ["бях", "беше", "бе", "бяхме", "бяхте", "бяха"], cond: ["бих", "би", "бихме", "бихте", "биха"] };
  var SIG = { i: ["обикновено", "винаги", "никога", "рядко", "често", "всеки", "всяка", "всяко", "понякога", "постоянно", "най-често", "сто пъти", "дневно", "от време на време"],
    p: ["този път", "веднага", "веднъж", "изведнъж", "най-накрая", "до края"] };
  function keysOf(f, w) {
    var ks = [];
    ["pres", "aor", "imp", "impv"].forEach(function (a) { (f[a] || []).forEach(function (x, j) { if (x === w) ks.push(a + "|" + j); }); });
    ["m", "f", "n", "pl"].forEach(function (g) { if (f.part[g] === w) ks.push("part|" + g); });
    return ks;
  }
  function kindsOf(ks) { return ks.map(function (x) { return x.split("|")[0]; }).filter(function (x, n, a) { return a.indexOf(x) === n; }); }
  function formAt(f, k) { var p = k.split("|"); if (p[0] === "part") return f.part[p[1]]; return f[p[0]] ? f[p[0]][+p[1]] : null; }
  function clsOf(words, i, v) {
    var lw = words[i].toLowerCase(), a = v.setI[lw], b = v.setP[lw];
    if (!a && !b) return null;
    if (b && !a) return "p";
    if (a && !b) return "i";
    return /(^|\s)(да|ще|ако|когато|като)(\s+(се|си|ми|ти|му|ѝ|ни|ви|им|го|я|ги|те|ме))*\s*$/.test(words.slice(Math.max(0, i - 6), i).join(" ").toLowerCase()) ? "p" : "i";
  }
  /* previous words in the same clause (stops at punctuation), lower case, without clitics / "не" if asked */
  function before(w, k, skipNe) {
    var out = [];
    for (var j = k - 1; j >= 0; j--) {
      if (j % 2 === 0) { if (/[.,!?;:–—]/.test(w[j])) break; continue; }
      var x = w[j].toLowerCase();
      if (SKIP[x] || (skipNe && x === "не")) continue;
      out.push(x);
    }
    return out;
  }
  function clauseOf(w, k) {
    var a = k, b = k;
    while (a > 0 && !/[.,!?;:–—]/.test(w[a - 1])) a--;
    while (b < w.length - 1 && !/[.,!?;:–—]/.test(w[b + 1])) b++;
    return " " + w.slice(a, b + 1).join("").toLowerCase().replace(/[^а-яѝ\s-]/g, " ").replace(/\s+/g, " ") + " ";
  }
  function tenseOfBlank(key, prev) {
    var kind = key.split("|")[0];
    if (kind === "aor") return "aorist";
    if (kind === "imp") return "imperfect";
    if (kind === "impv") return "impv";
    if (kind === "pres") {
      if (prev[0] === "ще" || (prev[0] === "да" && prev[1] === "няма")) return "future";
      if (prev[0] === "да" && /^(щях|щеше|щяхме|щяхте|щяха|нямаше)$/.test(prev[1] || "")) return "fip";
      return "present";
    }
    if (kind === "part") {
      var found = null;
      Object.keys(AUXW).forEach(function (tn) { if (!found && prev.length && AUXW[tn].indexOf(prev[0]) >= 0) found = tn; });
      if (found === "perfect" && prev[1] === "ще") return "fp";
      return found;
    }
    return null;
  }
  function aspectItems() {
    if (ASPECT_ITEMS) return ASPECT_ITEMS;
    ASPECT_ITEMS = [];
    VERBS.forEach(function (v) {
      if (v.extra) return;
      v.ex.forEach(function (ex, e) {
        var w = ex[0].split(/([А-Яа-яЍѝ]+)/);
        for (var k = 1; k < w.length; k += 2) {
          var cls = clsOf(w, k, v);
          if (!cls) continue;
          var mine = cls === "i" ? v.impf : v.pf, opp = cls === "i" ? v.pf : v.impf, lw = w[k].toLowerCase();
          var keys = keysOf(mine, lw);
          var others = keys.map(function (key) { return formAt(opp, key); }).filter(function (x, n, a) { return x && a.indexOf(x) === n; });
          if (others.length !== 1 || others[0] === lw) continue;
          // the wrong option must not be a valid form of the right aspect too (вземам / взема)
          if ((cls === "i" ? v.setI : v.setP)[others[0]]) continue;
          // either form must belong to one tense only: "излезе" is both present and aorist, so "Георги излезе навън" would be right too
          if (kindsOf(keys).length !== 1 || kindsOf(keysOf(opp, others[0])).length !== 1) continue;
          var prev = before(w, k, false), prevNoNe = before(w, k, true), key = keys[0];
          var tense = tenseOfBlank(key, prev);
          if (!tense) continue;
          var kind = key.split("|")[0], reason = null, clause = clauseOf(w, k), sigs = [];
          if (kind === "pres" && cls === "i" && tense === "present" && !TRIG[prevNoNe[0]]) reason = "A";
          else if (kind === "impv" && cls === "i" && prev[0] === "не") reason = "B";
          else {
            var mineSig = SIG[cls].filter(function (s) { return clause.indexOf(" " + s + " ") >= 0; });
            var oppSig = SIG[cls === "i" ? "p" : "i"].filter(function (s) { return clause.indexOf(" " + s + " ") >= 0; });
            // a habit word does not rule out СВ after "да" / "ще" ("Всеки месец успявам да спестя…"), so only СВ signals count there
            if (mineSig.length && !oppSig.length && !(cls === "i" && TRIG[prevNoNe[0]])) { reason = "C"; sigs = mineSig; }
          }
          if (!reason) continue;
          var oppKey = keysOf(opp, others[0])[0] || key;
          ASPECT_ITEMS.push({ v: v.id, e: e, k: k, cls: cls, t: tense, reason: reason, sigs: sigs,
            origS: G.stressedForm(mine, key), other: others[0], otherS: G.stressedForm(opp, oppKey) || others[0] });
        }
      });
    });
    return ASPECT_ITEMS;
  }
  /* hand-written aspect questions (questions.js) cover the past and other tenses */
  var AQ = window.ASPECT_Q || [];
  function genAspect() {
    var pool = [];
    aspectItems().forEach(function (it, k) { if (tOn(it.t) && verbOk(VERBS[it.v])) pool.push("p" + k); });
    AQ.forEach(function (it, k) { if (tOn(it.t) && verbOk(BY_INF[it.v])) pool.push("a" + k); });
    if (!pool.length) return null;
    var key = pick(pool);
    if (pool.length > 1) while (key === P.last) key = pick(pool);
    P.last = key;
    if (key.charAt(0) === "a") {
      var a = AQ[+key.slice(1)];
      return { mode: "aspect", aq: a, opts: shuffle(a.o.map(function (o, j) { return opt(o, a.os[j]); })), ok: a.o[0], acc: [a.o[0]].concat(a.alt || []) };
    }
    var it = aspectItems()[+key.slice(1)], v = VERBS[it.v], w = v.ex[it.e][0].split(/([А-Яа-яЍѝ]+)/), orig = w[it.k];
    return { mode: "aspect", it: it, opts: shuffle([opt(orig, cap(it.origS || orig, orig)), opt(cap(it.other, orig), cap(it.otherS, orig))]), ok: orig, acc: [orig] };
  }

  /* 3. Время: hand-written sentences (questions.js) */
  var TQ = window.TENSE_Q || [];
  function genTense() {
    var pool = TQ.map(function (_, i) { return i; }).filter(function (i) { return tOn(TQ[i].t) && verbOk(BY_INF[TQ[i].v]); });
    if (!pool.length) return null;
    P.deck = P.deck.filter(function (i) { return pool.indexOf(i) >= 0; });
    if (!P.deck.length) P.deck = shuffle(pool);
    var idx = P.deck.pop(), item = TQ[idx];
    return { mode: "tense", idx: idx, opts: shuffle(item.o.map(function (o, j) { return opt(o, item.os[j]); })), ok: item.o[0], acc: [item.o[0]].concat(item.alt || []) };
  }
  function genQ() { var q = P.mode === "aspect" ? genAspect() : P.mode === "tense" ? genTense() : genForms(); return q || { mode: P.mode, empty: true }; }

  /* tenses that have questions in the aspect / tense modes, in the order of the list */
  function modeTenses() {
    var have = {};
    (P.mode === "aspect" ? aspectItems().concat(AQ) : TQ).forEach(function (x) { have[x.t] = 1; });
    return TENSES.filter(function (x) { return have[x.id]; });
  }
  function filterUI() {
    var all = P.tenses.length === ALL_T.length;
    var summary = all ? t("allT") : P.tenses.length ? TENSES.filter(function (x) { return tOn(x.id); }).map(shortName).join(", ") : "—";
    var dd = '<details class="dd"' + (P.ddOpen ? " open" : "") + '><summary><span class="dd-k">' + t("train") + ':</span> <span class="dd-v">' + esc(summary) + "</span></summary>" +
      '<div class="dd-panel"><label class="dd-all"><input type="checkbox" data-ptall' + (all ? " checked" : "") + "> " + t("allT") + "</label>" +
      '<div class="dd-list">' + TENSES.map(function (x) {
        return '<label><input type="checkbox" data-pt="' + x.id + '"' + (tOn(x.id) ? " checked" : "") + "> " + shortName(x) + "</label>";
      }).join("") + "</div></div></details>";
    var asp = P.mode === "forms"
      ? '<div class="seg pasp" role="group" aria-label="' + esc(t("aspL")) + '"><span class="seg-k">' + t("aspL") + ":</span>" + ["i", "p", "both"].map(function (a) {
          return '<button data-pasp="' + a + '" aria-pressed="' + (P.asp === a) + '">' + (a === "i" ? t("impfS") : a === "p" ? t("pfS") : t("both")) + "</button>";
        }).join("") + "</div>"
      : '<p class="muted small">' + t("noAspInMode") + (modeTenses().length < TENSES.length ? " " + t("hasT") + " " + modeTenses().map(shortName).join(", ") + "." : "") + "</p>";
    var how = '<div class="pr-row"><div class="seg pinput" role="group" aria-label="' + esc(t("ansL")) + '"><span class="seg-k">' + t("ansL") + ":</span>" +
      ["choice", "type"].map(function (m) { return '<button data-pinput="' + m + '" aria-pressed="' + (P.input === m) + '">' + t(m === "choice" ? "choiceL" : "typeL") + "</button>"; }).join("") + "</div>" +
      '<label class="favchk"><input type="checkbox" data-pfav' + (P.favOnly ? " checked" : "") + "> ★ " + t("favOnly") + " (" + favCount() + ")</label></div>";
    return '<div class="pr-filter">' + dd + asp + how + "</div>";
  }
  function letters() {
    return '<div class="letters" aria-label="ъ ѝ щ ю я ж ч ш ц">' + "ъ ѝ щ ю я ж ч ш ц".split(" ").map(function (c) { return '<button class="letter bg" data-letter="' + c + '" tabindex="-1">' + c + "</button>"; }).join("") + "</div>";
  }

  function renderPractice() {
    if (!P.q) P.q = genQ();
    var q = P.q, done = P.ans >= 0, title = "", body = "", why = "", hint = "", typing = P.input === "type";
    var head = '<div class="seg" role="group">' + ["forms", "aspect", "tense"].map(function (m) {
        return '<button data-pmode="' + m + '" aria-pressed="' + (P.mode === m) + '">' + t({ forms: "mForms", aspect: "mAspect", tense: "mTense" }[m]) + "</button>";
      }).join("") + "</div>" + filterUI() +
      '<div class="pr-score"><span>✓ <b>' + P.right + " / " + P.total + "</b> " + t("right") + "</span><span>" + t("streak") + " <b>" + P.streak + "</b></span><span>" + t("best") + " <b>" + P.best + "</b></span></div>";
    if (q.empty) {
      var noFav = P.favOnly && !favCount();
      $("pane-practice").innerHTML = '<div class="pr">' + head + '<div class="panel pr-card pr-empty"><p>' + (noFav ? t("favNone") : t("noQ")) + '</p><div class="pr-next">' +
        (noFav ? "" : '<button class="btn" data-pallt>' + t("pickAll") + "</button>") +
        (P.favOnly ? '<button class="link" data-pfavoff>' + t("favOnly") + " ✕</button>" : "") + "</div></div></div>";
      markAllBox();
      return;
    }
    var okOpt = q.opts.filter(function (o) { return o.p === q.ok; })[0], okText = S.stress ? okOpt.s : okOpt.p;
    function blankIn(text) { return esc(text).replace("___", done ? '<span class="blank filled">' + esc(okText) + "</span>" : '<span class="blank">?</span>'); }
    if (q.mode === "forms") {
      var v = VERBS[q.v], tn = TBY[q.tid];
      var who = v.only3 ? t("impers") : q.i === 2 ? "той" : G.PERSONS[q.i];
      title = t("qForms");
      body = '<div class="pr-prompt"><span class="pair">' + pairHTML(v) + '</span><span class="muted">' + esc(v.ru) + '</span>' +
        '<div class="pr-tags"><span class="pr-tag bg">' + who + '</span><span class="pr-tag">' + shortName(tn) + '</span><span class="pr-tag ' + (q.pf ? "p" : "i") + '">' + (q.pf ? t("pfS") : t("impfS")) + "</span></div></div>";
      if (done) {
        var r = G.build(q.tid, v, q.pf, q.i, "m", false, S.lang), endP = r.pieces.filter(function (pc) { return pc.k === "end"; }).pop();
        why = '<p class="full">' + (v.only3 ? "" : who + " ") + cellText(q.tid, v, q.pf, q.i, "m", false) + sayBtn(G.joinPieces(r)) + "</p>" +
          (endP ? "<p>" + esc(endP.info) + "</p>" : "") +
          "<p><b>" + L(tn.name) + "</b> · " + (S.lang === "ru" ? "≈ " + G.RUEQ[tn.id] : L(tn.short)) + "</p>" +
          '<button class="link" data-popen="1">' + t("inBuilder") + " →</button>";
      }
    } else if (q.mode === "aspect" && q.aq) {
      var a = q.aq, av = BY_INF[a.v];
      title = t("qAspect");
      body = '<div class="pr-prompt"><p class="pr-sent">' + blankIn(a.s) + '</p><p class="pr-tr">' + esc(a.ru) + "</p></div>";
      hint = av ? pairHTML(av) : esc(a.o.slice().sort().join(" / "));
      if (done) why = "<p>" + esc(L(a.why)) + "</p>" + sayBtn(a.s.replace("___", q.ok));
    } else if (q.mode === "aspect") {
      var va = VERBS[q.it.v], ex = va.ex[q.it.e], w = ex[0].split(/([А-Яа-яЍѝ]+)/);
      title = t("qAspect");
      var sent = w.map(function (x, k) {
        if (k !== q.it.k) return esc(x);
        return done ? '<span class="blank filled">' + esc(okText) + "</span>" : '<span class="blank">?</span>';
      }).join("");
      body = '<div class="pr-prompt"><p class="pr-sent">' + sent + '</p><p class="pr-tr">' + esc(ex[1]) + "</p></div>";
      hint = pairHTML(va);
      if (done) {
        var reason = q.it.reason === "A" ? t("whyA") : q.it.reason === "B" ? t("whyB") : (q.it.cls === "i" ? t("whyI") : t("whyP"));
        why = "<p>" + reason + "</p>" +
          (q.it.sigs.length ? '<p class="pr-tags"><span class="muted">' + t("sigs") + ":</span> " + q.it.sigs.map(function (s) { return '<span class="pr-tag bg ' + q.it.cls + '">' + s + "</span>"; }).join(" ") + "</p>" : "") +
          '<p class="muted">' + t("orig") + '</p><p class="full">' + highlight(ex[0], va) + sayBtn(ex[0]) + "</p>";
      }
    } else {
      var item = TQ[q.idx], hv = BY_INF[item.v];
      title = t("qTense");
      body = '<div class="pr-prompt"><p class="pr-sent">' + blankIn(item.s) + '</p><p class="pr-tr">' + esc(item.ru) + "</p></div>";
      hint = typeof item.h === "object" ? esc(L(item.h)) : esc(item.h || "");
      if (done) why = "<p>" + esc(L(item.why)) + "</p>" + sayBtn(item.s.replace("___", q.ok));
    }

    var answerArea, good;
    if (typing) {
      good = done && P.okTyped;
      answerArea = '<div class="ptype">' + (hint && q.mode !== "forms" ? '<p class="pr-hint2"><span class="muted">' + t("hintV") + '</span> <span class="bg">' + hint + "</span></p>" : "") +
        '<div class="ptype-row"><input id="pans" class="search pans' + (done ? (good ? " ok" : " bad") : "") + '" type="text" lang="bg" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="go" placeholder="' + esc(t("typePh")) + '" value="' + esc(P.typed) + '"' + (done ? " readonly" : "") + ">" +
        (done ? "" : '<button class="btn" data-pcheck>' + t("check") + "</button>") + "</div>" + (done ? "" : letters()) + "</div>";
    } else {
      good = done && q.opts[P.ans].p === q.ok;
      answerArea = '<div class="pr-opts' + (q.opts.length > 2 ? " four" : "") + '">' + q.opts.map(function (o, j) {
        var cls = "", mark = "";
        if (done) {
          if (o.p === q.ok) { cls = " ok"; mark = "✓"; }
          else if (j === P.ans) { cls = " bad"; mark = "✗"; }
          else cls = " dim";
        }
        return '<button class="opt' + cls + '" data-ans="' + j + '"' + (done ? ' aria-disabled="true"' : "") + '><span class="key">' + (j + 1) + "</span><span>" + esc(S.stress ? o.s : o.p) + '</span><span class="mark">' + mark + "</span></button>";
      }).join("") + "</div>";
    }
    var verdict = "";
    if (done) {
      verdict = '<span class="verdict ' + (good ? "ok" : "bad") + '">' + (good ? t("yes") : t("no")) + "</span>";
      if (typing && P.altHit) verdict += "<p>" + t("alsoOk") + ' <b class="bg">' + esc(okText) + "</b></p>";
      if (typing && !good) verdict += "<p>" + t("rightAns") + ' <b class="bg">' + esc(okText) + "</b></p><p>" + t("yourAns") + ' <span class="bg">' + esc(P.typed) + "</span></p>";
    }
    $("pane-practice").innerHTML = '<div class="pr">' + head +
      '<div class="panel pr-card"><h3 class="label">' + title + "</h3>" + body + answerArea +
      (done ? '<div class="pr-why">' + verdict + why + "</div>" +
        '<div class="pr-next"><button class="btn" data-pnext>' + t("next") + '</button><span class="pr-hint">' + (typing ? t("keysT") : t("keys")) + "</span></div>" : "") +
      "</div></div>";
    markAllBox();
  }
  function markAllBox() {
    var box = document.querySelector("[data-ptall]");
    if (box) box.indeterminate = P.tenses.length > 0 && P.tenses.length < ALL_T.length;
  }
  function score(ok) {
    P.total++;
    if (ok) { P.right++; P.streak++; if (P.streak > P.best) { P.best = P.streak; store.set("best", P.best); } }
    else P.streak = 0;
  }
  function answer(j) {
    if (P.input !== "choice" || P.ans >= 0 || !P.q || P.q.empty || j >= P.q.opts.length) return;
    P.ans = j; score(P.q.opts[j].p === P.q.ok);
    renderPractice();
  }
  /* typed answers: stress, case, ѝ / и, extra spaces and punctuation don't matter */
  function norm(x) {
    return String(x || "").normalize("NFD").replace(/[̀́]/g, "").normalize("NFC").toLowerCase()
      .replace(/[.,!?;:…"„“«»–—-]/g, " ").replace(/\s+/g, " ").trim();
  }
  function checkTyped() {
    if (P.input !== "type" || P.ans >= 0 || !P.q || P.q.empty) return;
    var el = $("pans"), val = el ? el.value : "";
    if (!norm(val)) { if (el) el.focus(); return; }
    var n = norm(val), acc = (P.q.acc || [P.q.ok]).map(norm);
    P.typed = val; P.ans = 0;
    P.okTyped = acc.indexOf(n) >= 0; P.altHit = P.okTyped && n !== norm(P.q.ok);
    score(P.okTyped);
    renderPractice();
    focusAnswer();
  }
  function focusAnswer() { var el = $("pans"); if (el) try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } }
  function nextQ() {
    P.q = genQ(); P.ans = -1; P.typed = ""; P.okTyped = false; P.altHit = false;
    renderPractice();
    var c = document.querySelector(".pr-card"); if (c && c.getBoundingClientRect().top < 0) c.scrollIntoView({ block: "start" });
    if (P.input === "type") focusAnswer();
  }
  function filterChanged() { saveFilter(); P.deck = []; P.q = genQ(); P.ans = -1; P.typed = ""; renderPractice(); }

  /* ---------- Routing ---------- */
  function setHash() {
    var h = S.tab === "verbs" ? (S.verb !== null ? "verb-" + S.verb : "verbs") : S.tab;
    try { history.replaceState(null, "", "#" + h); } catch (e) { /* ignore */ }
  }
  function readHash() {
    var h = (location.hash || "").slice(1), m;
    if ((m = /^verb-(\d+)$/.exec(h)) && VERBS[+m[1]]) { S.tab = "verbs"; S.verb = +m[1]; }
    else if (h === "verbs") { S.tab = "verbs"; S.verb = null; }
    else if (h === "tenses") S.tab = "tenses";
    else if ((m = /^t-(\w+)$/.exec(h)) && TBY[m[1]]) { S.tab = "tenses"; S.open[m[1]] = true; S.jump = m[1]; }
    else if (h === "form") S.tab = "form";
    else if (h === "practice") S.tab = "practice";
  }
  function render() {
    renderChrome();
    if (S.tab === "form") renderForm();
    if (S.tab === "tenses") renderTenses();
    if (S.tab === "verbs") renderVerbs();
    if (S.tab === "practice") renderPractice();
    setHash();
    if (S.jump) { var el = $("t-" + S.jump); S.jump = null; if (el) el.scrollIntoView({ block: "start" }); }
  }
  function go(fn) { fn(); render(); window.scrollTo(0, 0); }
  function setB(fn, anim) { fn(S.B); S.B.sel = -1; S.anim = anim || "chg"; saveB(); renderForm(); }

  /* ---------- Events ---------- */
  document.addEventListener("click", function (e) {
    var el = e.target.closest("button");
    if (!el) return;
    var d = el.dataset;
    if (d.say !== undefined) { speak(d.say); return; }
    if (d.ttsmode !== undefined) {
      TTS.online = d.ttsmode; store.set("ttsOnline", TTS.online); stopAudio(); ttsUpdate(); render(); return;
    }
    if ("ttsset" in d) { S.legend = true; $("notice").hidden = true; renderChrome(); var ts = document.querySelector(".tts-set"); if (ts) ts.scrollIntoView({ block: "center" }); return; }
    if (d.fav !== undefined) { toggleFav(VERBS[+d.fav]); render(); return; }
    if (d.vfilt) { S.vfilter = d.vfilt; store.set("vfilter", S.vfilter); renderVerbs(); return; }
    if (d.letter) {
      var inp = $("pans");
      if (inp && !inp.readOnly) {
        var a0 = inp.selectionStart == null ? inp.value.length : inp.selectionStart, a1 = inp.selectionEnd == null ? a0 : inp.selectionEnd;
        inp.value = inp.value.slice(0, a0) + d.letter + inp.value.slice(a1);
        inp.focus(); inp.setSelectionRange(a0 + d.letter.length, a0 + d.letter.length);
      }
      return;
    }
    if (el.id === "help") { S.legend = !S.legend; renderChrome(); return; }
    if (el.id === "stressBtn") { S.stress = !S.stress; store.set("stress", S.stress ? "1" : "0"); render(); return; }
    if ("closenotice" in d) { $("notice").hidden = true; return; }
    if (d.lang) { S.lang = d.lang; store.set("lang", S.lang); render(); return; }
    if (d.tab) { go(function () { if (d.tab === "verbs" && S.tab === "verbs") S.verb = null; S.tab = d.tab; }); return; }
    // builder
    if ("pick" in d) { S.B.picking = !S.B.picking; renderForm(); return; }
    if (d.bverb) { setB(function (B) { B.verb = +d.bverb; B.picking = false; B.q = ""; }, "fade"); return; }
    if (d.bgroup) { setB(function (B) { var g = GROUPS.filter(function (x) { return x.id === d.bgroup; })[0]; if (g.t.indexOf(B.tense) < 0) B.tense = g.t[0]; }, "fade"); return; }
    if (d.btense) { setB(function (B) { B.tense = d.btense; }, "fade"); return; }
    if (d.bgen) { setB(function (B) { B.gender = d.bgen; }); return; }
    if ("bneg" in d) { setB(function (B) { B.neg = !B.neg; }); return; }
    if ("bask" in d) { setB(function (B) { B.ask = !B.ask; }); return; }
    if (d.bpr !== undefined) { setB(function (B) { B.pr = d.bpr; }); return; }
    if (d.fcell) {
      var fc = d.fcell.split("|");
      S.B.person = +fc[0]; S.B.pf = fc[1] === "1"; S.B.sel = -1; S.anim = "sel"; saveB(); renderForm(); return;
    }
    if (d.piece) { S.B.sel = +d.piece; renderForm(); return; }
    if (d.totense) { go(function () { S.tab = "tenses"; S.open[d.totense] = true; S.jump = d.totense; if (!TBY[d.totense].core) S.showRare = true; }); return; }
    // tenses
    if (d.tobuilder) { S.B.tense = d.tobuilder; S.B.sel = -1; saveB(); go(function () { S.tab = "form"; }); return; }
    if (d.toggle) { S.open[d.toggle] = !S.open[d.toggle]; renderTenses(); return; }
    if (d.jump) { S.open[d.jump] = true; if (!TBY[d.jump].core) S.showRare = true; renderTenses(); var j = $("t-" + d.jump); if (j) j.scrollIntoView({ block: "start", behavior: "smooth" }); return; }
    // practice
    if (d.pmode) { P.mode = d.pmode; store.set("pmode", P.mode); P.deck = []; P.q = genQ(); P.ans = -1; renderPractice(); return; }
    if (d.pasp) { P.asp = d.pasp; filterChanged(); return; }
    if ("pallt" in d) { P.tenses = ALL_T.slice(); filterChanged(); return; }
    if ("pfavoff" in d) { P.favOnly = false; filterChanged(); return; }
    if (d.pinput) { P.input = d.pinput; saveFilter(); P.ans = -1; P.typed = ""; renderPractice(); if (P.input === "type") focusAnswer(); return; }
    if ("pcheck" in d) { checkTyped(); return; }
    if (d.ans !== undefined) { answer(+d.ans); return; }
    if ("pnext" in d) { nextQ(); return; }
    if ("popen" in d && P.q && P.q.mode === "forms") {
      S.B.verb = P.q.v; S.B.tense = P.q.tid; S.B.pf = P.q.pf; S.B.person = P.q.i; S.B.neg = false; S.B.ask = false; S.B.pr = ""; S.B.sel = -1; saveB();
      go(function () { S.tab = "form"; }); return;
    }
    // verbs
    if (d.verb) { go(function () { S.tab = "verbs"; S.verb = +d.verb; }); return; }
    if ("back" in d) { go(function () { S.verb = null; }); return; }
    if (d.vperson) { S.vperson = +d.vperson; renderVerbs(); return; }
    if ("vrare" in d) { S.vrare = !S.vrare; renderVerbs(); return; }
    if (d.cell) {
      var c = d.cell.split("|");
      S.B.verb = S.verb; S.B.tense = c[0]; S.B.pf = c[1] === "1"; S.B.person = +c[2]; S.B.neg = false; S.B.ask = false; S.B.pr = ""; S.B.sel = -1; saveB();
      go(function () { S.tab = "form"; }); return;
    }
  });
  document.addEventListener("input", function (e) {
    if (e.target.id === "q") { S.query = e.target.value; renderVerbs(); }
    if (e.target.id === "bq") { S.B.q = e.target.value; renderForm(); }
  });
  document.addEventListener("change", function (e) {
    var el = e.target, d = el.dataset || {};
    if (el.id === "elKey" || el.id === "elVoice") {
      store.set(el.id, el.value.trim()); ttsUpdate(); var was = TTS.ok; render(); if (was) { /* buttons may have appeared */ }
      return;
    }
    if (el.classList.contains("trbox")) {
      S.tr = el.checked; store.set("tr", S.tr ? "1" : "0"); document.body.classList.toggle("no-tr", !S.tr);
      Array.prototype.forEach.call(document.querySelectorAll(".trbox"), function (b) { b.checked = S.tr; });
    }
    if ("ptall" in d) { P.tenses = el.checked ? ALL_T.slice() : []; filterChanged(); }
    if ("pfav" in d) { P.favOnly = el.checked; filterChanged(); }
    if (d.pt) {
      P.tenses = el.checked ? P.tenses.concat([d.pt]) : P.tenses.filter(function (x) { return x !== d.pt; });
      P.tenses = ALL_T.filter(function (x) { return P.tenses.indexOf(x) >= 0; });
      filterChanged();
    }
  });
  document.addEventListener("toggle", function (e) {
    var el = e.target;
    if (!el.classList) return;
    if (el.classList.contains("rare-wrap")) S.showRare = el.open;
    if (el.classList.contains("dd")) P.ddOpen = el.open;
  }, true);
  document.addEventListener("keydown", function (e) {
    if (S.tab !== "practice" || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target.id === "pans") {
      if (e.key === "Enter") { e.preventDefault(); if (P.ans < 0) checkTyped(); else nextQ(); }
      return;
    }
    if (/input|textarea|select/i.test(e.target.tagName)) return;
    if (P.ans < 0 && P.input === "choice" && /^[1-4]$/.test(e.key)) { answer(+e.key - 1); e.preventDefault(); }
    else if (P.ans >= 0 && (e.key === "Enter" || e.key === "ArrowRight")) { nextQ(); e.preventDefault(); }
  });
  window.addEventListener("hashchange", function () { readHash(); render(); });

  readHash();
  render();
  initTTS();
})();
