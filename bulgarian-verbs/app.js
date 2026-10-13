(function () {
  "use strict";
  var B = window.BG, VERBS = B.VERBS, TENSES = B.TENSES;
  var TBY = {}; TENSES.forEach(function (t) { TBY[t.id] = t; });

  /* ---------- UI strings ---------- */
  var U = {
    ru: {
      sub: "Болгарские глаголы: пары, времена и окончания",
      tVerbs: "Глаголы", tForm: "Какую форму?", tGrammar: "Грамматика", tPractice: "Практика · скоро",
      impf: "несов. вид", pf: "сов. вид", impfS: "НСВ", pfS: "СВ",
      legI: "процесс, повторение", legP: "одно завершённое действие",
      search: "Поиск: вземам, vzemam или «брать»", count: function (n) { return n + " " + plural(n, "глагол", "глагола", "глаголов"); },
      none: "Ничего не нашлось. Попробуйте форму «аз» (вземам) или русский перевод.",
      model: "модельный", group: "спр.", back: "← Все глаголы", examples: "Примеры из вашего списка", examplesX: "Пример",
      forms: "Все формы", person: "Лицо", showAdv: "Показать редкие времена", hideAdv: "Скрыть редкие времена",
      rare: "редко", useImpf: "используйте НСВ", tr: "Перевод", findForm: "Подобрать форму →",
      core: "основное", adv: "редкое",
      gTenses: "Времена", gAspect: "Вид", gEndings: "Окончания",
      past: "Прошлое", now: "Сейчас", future: "Будущее", moods: "Наклонения",
      formula: "Как образуется", when: "Когда использовать", which: "Какой вид?", signals: "Слова-сигналы",
      tips: "Обратите внимание", compare: "Сравнение с русским", neg: "Отрицание", q: "Вопрос", ex: "Примеры",
      tableVerb: "Глагол в таблице", other: "другой глагол…", openVerb: "Открыть глагол",
      fTitle: "Какую форму выбрать?", fLead: "Выберите глагол и ответьте на два-три вопроса. В конце — готовая форма и объяснение.",
      fVerb: "Глагол", change: "Сменить", restart: "Начать заново", stepBack: "Назад",
      result: "Ваша форма", why: "Почему", seeTense: "Подробнее о времени", openVerbPage: "Все формы глагола",
      soon: "скоро"
    },
    bg: {
      sub: "Българските глаголи: двойки, времена и окончания",
      tVerbs: "Глаголи", tForm: "Коя форма?", tGrammar: "Граматика", tPractice: "Упражнения · скоро",
      impf: "несв. вид", pf: "св. вид", impfS: "НСВ", pfS: "СВ",
      legI: "процес, повторение", legP: "едно завършено действие",
      search: "Търсене: вземам, vzemam или „брать“", count: function (n) { return n + " " + (n === 1 ? "глагол" : "глагола"); },
      none: "Няма резултати. Опитайте с формата за „аз“ (вземам) или с превода.",
      model: "модел", group: "спр.", back: "← Всички глаголи", examples: "Примери от вашия списък", examplesX: "Пример",
      forms: "Всички форми", person: "Лице", showAdv: "Покажи редките времена", hideAdv: "Скрий редките времена",
      rare: "рядко", useImpf: "използвайте НСВ", tr: "Превод", findForm: "Избери форма →",
      core: "основно", adv: "рядко",
      gTenses: "Времена", gAspect: "Вид", gEndings: "Окончания",
      past: "Минало", now: "Сега", future: "Бъдеще", moods: "Наклонения",
      formula: "Образуване", when: "Кога се използва", which: "Кой вид?", signals: "Сигнални думи",
      tips: "Внимание", compare: "Сравнение с руския", neg: "Отрицание", q: "Въпрос", ex: "Примери",
      tableVerb: "Глагол в таблицата", other: "друг глагол…", openVerb: "Отвори глагола",
      fTitle: "Коя форма да избера?", fLead: "Изберете глагол и отговорете на два-три въпроса. Накрая ще видите готовата форма и обяснение.",
      fVerb: "Глагол", change: "Смени", restart: "Започни отначало", stepBack: "Назад",
      result: "Вашата форма", why: "Защо", seeTense: "Повече за времето", openVerbPage: "Всички форми на глагола",
      soon: "скоро"
    }
  };
  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }

  /* ---------- State ---------- */
  var store = {
    get: function (k) { try { return localStorage.getItem("glagoli2:" + k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem("glagoli2:" + k, v); } catch (e) { /* ignore */ } }
  };
  var DEFAULT_VERB = VERBS.filter(function (v) { return v.pf.inf === "взема"; })[0].id;
  var MODEL_IDS = ["взема", "прочета", "направя", "попитам"].map(function (p) { return VERBS.filter(function (v) { return v.pf.inf === p; })[0].id; });
  var S = {
    lang: store.get("lang") === "bg" ? "bg" : "ru",
    tab: "verbs", verb: null, query: "",
    gsub: "tenses", tense: TBY[store.get("tense")] ? store.get("tense") : "present",
    model: +store.get("model") >= 0 && VERBS[+store.get("model")] ? +store.get("model") : DEFAULT_VERB,
    adv: store.get("adv") === "1", tr: store.get("tr") !== "0",
    form: { verb: DEFAULT_VERB, path: [], aspect: null, picking: false, q: "" }
  };
  function t(k) { return U[S.lang][k]; }
  function L(o) { return o ? (o[S.lang] || o.ru) : ""; }
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---------- Helpers ---------- */
  function impfTitle(v) { return v.impf.inf + (v.se ? " " + v.se : "") + (v.opt ? " (" + v.opt + ")" : "") + (v.tail ? " " + v.tail : ""); }
  function pfTitle(v) { return "да " + (v.se ? v.se + " " : "") + (v.opt ? "(" + v.opt + ") " : "") + v.pf.inf + (v.tail ? " " + v.tail : ""); }
  function pairHTML(v) { return '<span class="i-txt">' + impfTitle(v) + '</span><span class="dash"> – </span><span class="p-txt">' + pfTitle(v) + "</span>"; }

  var TR = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sht", ъ: "a", ь: "y", ю: "yu", я: "ya" };
  function translit(s) { return s.replace(/[а-я]/g, function (c) { return TR[c] || c; }); }
  VERBS.forEach(function (v) {
    var bg = (v.impf.inf + " " + v.pf.inf + " " + v.pf.pres[1]).toLowerCase();
    v.hayBg = bg; v.hayLat = translit(bg); v.hayRu = v.ru.toLowerCase();
    v.setI = B.wordSet(v.impf); v.setP = B.wordSet(v.pf);
  });
  var SORTED = VERBS.slice().sort(function (a, b) { return a.impf.inf.localeCompare(b.impf.inf, "bg") || a.id - b.id; });

  function search(q) {
    q = q.trim().toLowerCase();
    if (!q) return SORTED;
    var lat = /[a-z]/.test(q);
    return SORTED.filter(function (v) { return lat ? v.hayLat.indexOf(q) >= 0 : (v.hayBg.indexOf(q) >= 0 || v.hayRu.indexOf(q) >= 0); });
  }

  /* Highlight the verb's own forms inside an example sentence. */
  function highlight(text, v) {
    var words = text.split(/([А-Яа-яЁёЍѝ]+)/);
    return words.map(function (w, i) {
      if (i % 2 === 0) return esc(w);
      var lw = w.toLowerCase(), inI = v.setI[lw], inP = v.setP[lw];
      if (!inI && !inP) return w;
      var cls = inP && !inI ? "p" : inI && !inP ? "i" : null;
      if (!cls) {
        var prev = words.slice(Math.max(0, i - 6), i).join(" ").toLowerCase();
        cls = /(^|\s)(да|ще|ако|когато|като)(\s+(се|си|ми|ти|му|ѝ|ни|ви|им|го|я|ги|те|ме))*\s*$/.test(prev) ? "p" : "i";
      }
      return '<b class="' + cls + '">' + w + "</b>";
    }).join("");
  }

  function exHTML(bg, ru, raw) {
    return '<div class="ex-item"><span class="bgt">' + (raw ? bg : bg) + '</span><span class="tr">' + esc(ru) + "</span></div>";
  }

  /* One tense table for a verb. */
  function tenseTable(tense, v, opts) {
    opts = opts || {};
    var persons = tense.persons || B.PERSONS;
    var ci = B.cells(tense.id, v, false), cp = B.cells(tense.id, v, true);
    var rows = persons.map(function (p, i) {
      var a = ci ? ci[i] : null, c = cp ? cp[i] : null;
      var hiA = opts.hl === "i" && opts.person === i, hiC = opts.hl === "p" && opts.person === i;
      return '<tr><td class="who">' + p + '</td>' +
        '<td class="f' + (tense.impfRare ? " rare" : "") + (hiA ? " hl" : "") + '">' + (a || '<span class="na">—</span>') + "</td>" +
        '<td class="f' + (hiC ? " hl" : "") + '">' + (c || '<span class="na">' + (tense.id === "imperfect" ? t("rare") : t("useImpf")) + "</span>") + "</td></tr>";
    }).join("");
    return '<div class="table-wrap"><table class="conj"><thead><tr><th class="who">' + t("person") + '</th>' +
      '<th class="i">' + t("impfS") + " · " + v.impf.inf + (tense.impfRare ? ' <span class="rare-note">' + t("rare") + "</span>" : "") + "</th>" +
      '<th class="p">' + t("pfS") + " · " + v.pf.inf + (tense.id === "present" ? ' <span class="rare-note">да…</span>' : "") + "</th></tr></thead><tbody>" + rows + "</tbody></table></div>";
  }

  function tenseName(tn) { return '<span class="tn">' + L(tn.name) + "</span>" + (S.lang === "ru" ? '<span class="tn-bg">' + tn.name.bg + "</span>" : ""); }
  function visibleTenses() { return TENSES.filter(function (x) { return x.core || S.adv; }); }

  /* ---------- Header ---------- */
  function renderChrome() {
    document.documentElement.lang = S.lang;
    $("sub").textContent = t("sub");
    $("leg").innerHTML = '<span><i class="dot i"></i><b>' + t("impfS") + "</b> " + t("legI") + '</span><span><i class="dot p"></i><b>' + t("pfS") + "</b> " + t("legP") + "</span>";
    $("lang").innerHTML = ["ru", "bg"].map(function (l) { return '<button data-lang="' + l + '" aria-pressed="' + (S.lang === l) + '">' + l.toUpperCase() + "</button>"; }).join("");
    $("tab-btn-verbs").textContent = t("tVerbs");
    $("tab-btn-form").textContent = t("tForm");
    $("tab-btn-grammar").textContent = t("tGrammar");
    $("tab-btn-practice").textContent = t("tPractice");
    ["verbs", "form", "grammar"].forEach(function (k) {
      $(k).hidden = S.tab !== k;
      $("tab-btn-" + k).setAttribute("aria-selected", String(S.tab === k));
    });
    document.body.classList.toggle("no-tr", !S.tr);
  }

  /* ---------- Verbs ---------- */
  function renderVerbs() {
    var el = $("verbs");
    if (S.verb !== null) { el.innerHTML = verbPage(VERBS[S.verb]); return; }
    var list = search(S.query);
    var keepFocus = document.activeElement && document.activeElement.id === "q";
    el.innerHTML =
      '<div class="search-row"><input id="q" type="search" autocomplete="off" spellcheck="false" placeholder="' + esc(t("search")) + '" value="' + esc(S.query) + '"><span class="count">' + t("count")(list.length) + "</span></div>" +
      (list.length ? '<div class="vlist">' + list.map(function (v) {
        return '<button class="vrow" data-verb="' + v.id + '"><span class="pair">' + pairHTML(v) + '</span><span class="vmean">' + esc(v.ru) + "</span>" +
          '<span class="grp">' + v.impf.group + " · " + v.pf.group + (v.extra ? ' <em class="badge">' + t("model") + "</em>" : "") + "</span></button>";
      }).join("") + "</div>" : '<p class="empty">' + t("none") + "</p>");
    if (keepFocus) { var q = $("q"); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
  }

  function verbPage(v) {
    var tenses = visibleTenses();
    var sections = tenses.map(function (tn) {
      var ci = B.cells(tn.id, v, false), cp = B.cells(tn.id, v, true);
      var prev = '<span class="i-txt">' + (ci ? ci[0] : "—") + '</span> <span class="sl">|</span> <span class="p-txt">' + (cp && cp[0] ? cp[0] : "—") + "</span>";
      return '<details class="tsec"' + (tn.id === "present" ? " open" : "") + '><summary><span class="tsum">' + tenseName(tn) + '<span class="tshort">' + L(tn.short) + '</span></span><span class="tprev">' + prev + "</span></summary>" +
        '<div class="tbody">' + tenseTable(tn, v) +
        '<div class="aspect-notes"><div class="an i"><span class="tag">' + t("impfS") + "</span><span>" + L(tn.aspect.i) + '</span></div><div class="an p"><span class="tag">' + t("pfS") + "</span><span>" + L(tn.aspect.p) + "</span></div></div>" +
        '<button class="link" data-gotense="' + tn.id + '">' + t("seeTense") + " →</button></div></details>";
    }).join("");
    return '<button class="back" data-back>' + t("back") + "</button>" +
      '<div class="vhead"><h2 class="pairbig">' + pairHTML(v) + '</h2><p class="vru">' + esc(v.ru) + "</p>" +
      '<div class="badges"><span class="badge i">' + t("impfS") + " · " + v.impf.group + " " + t("group") + '</span><span class="badge p">' + t("pfS") + " · " + v.pf.group + " " + t("group") + "</span>" +
      (v.extra ? '<span class="badge">' + t("model") + "</span>" : "") + "</div>" +
      (v.note ? '<p class="note">' + esc(L(v.note)) + "</p>" : "") + "</div>" +
      '<div class="card ex"><div class="card-h"><h3>' + (v.extra ? t("examplesX") : t("examples")) + "</h3>" + trToggle() + "</div>" +
      v.ex.map(function (e) { return exHTML(highlight(e[0], v), e[1]); }).join("") + "</div>" +
      '<div class="card-h"><h3>' + t("forms") + '</h3><button class="link" data-findform="' + v.id + '">' + t("findForm") + "</button></div>" +
      '<div class="tsecs">' + sections + "</div>" +
      '<button class="btn ghost" data-adv>' + (S.adv ? t("hideAdv") : t("showAdv")) + "</button>";
  }

  function trToggle() {
    return '<label class="tr-toggle"><input type="checkbox" id="trbox"' + (S.tr ? " checked" : "") + "> " + t("tr") + "</label>";
  }

  /* ---------- Which form? ---------- */
  var FLOW = {
    start: { q: { ru: "Когда происходит действие?", bg: "Кога се случва действието?" }, opts: [
      { t: { ru: "Сейчас, регулярно или это факт", bg: "Сега, редовно или е факт" }, s: { ru: "читаю, читаю каждый день", bg: "чета, чета всеки ден" }, to: "=present" },
      { t: { ru: "В прошлом", bg: "В миналото" }, s: { ru: "прочитал, читал, читал когда-то, уже прочитал до…", bg: "прочетох, четях, чел съм, бях прочел" }, to: "past" },
      { t: { ru: "В будущем", bg: "В бъдещето" }, s: { ru: "прочитаю, буду читать, прочитаю к…", bg: "ще прочета, ще чета, ще съм прочел" }, to: "future" },
      { t: { ru: "Гипотетически или вежливо", bg: "Хипотетично или учтиво" }, s: { ru: "я бы…, не могли бы вы…?", bg: "бих…, бихте ли…?" }, to: "hypo" },
      { t: { ru: "Просьба или приказ", bg: "Молба или заповед" }, s: { ru: "прочитай! не спрашивай!", bg: "прочети! не питай!" }, to: "=impv" }
    ] },
    past: { q: { ru: "Что вы говорите о прошлом действии?", bg: "Какво казвате за миналото действие?" }, opts: [
      { t: { ru: "Оно произошло и закончилось в известный момент", bg: "Случило се е в определен момент" }, s: { ru: "Вчера прочитал книгу. Потом вышел.", bg: "Вчера прочетох книгата. После излязох." }, to: "=aorist" },
      { t: { ru: "Оно длилось (фон) или было привычкой", bg: "Траело е (фон) или е било навик" }, s: { ru: "Читал, когда ты позвонил. Раньше читал каждый вечер.", bg: "Четях, когато ти се обади." }, to: "=imperfect" },
      { t: { ru: "Важен опыт или результат сейчас, время не важно", bg: "Важен е опитът или резултатът сега" }, s: { ru: "Ты был в Пловдиве? Я читал эту книгу.", bg: "Била ли си в Пловдив? Чел съм тази книга." }, to: "=perfect" },
      { t: { ru: "Оно случилось раньше другого прошлого события", bg: "Случило се е преди друго минало събитие" }, s: { ru: "Когда мы пришли, фильм уже начался.", bg: "Когато пристигнахме, филмът беше започнал." }, to: "=pluperfect" }
    ] },
    future: { q: { ru: "Какое будущее?", bg: "Какво бъдеще?" }, opts: [
      { t: { ru: "Просто «сделаю / буду делать»", bg: "Просто „ще направя / ще правя“" }, s: { ru: "Завтра прочитаю главу.", bg: "Утре ще прочета главата." }, to: "=future" },
      { t: { ru: "Будет закончено к моменту в будущем", bg: "Ще е завършено до момент в бъдещето" }, s: { ru: "К пятнице уже прочитаю.", bg: "До петък ще съм прочел." }, to: "=fp" },
      { t: { ru: "План, увиденный из прошлого", bg: "План, гледан от миналото" }, s: { ru: "Я собирался позвонить, но…", bg: "Щях да ти се обадя, но…" }, to: "=fip" }
    ] },
    hypo: { q: { ru: "Что именно?", bg: "Какво точно?" }, opts: [
      { t: { ru: "Вежливая просьба, желание или совет", bg: "Учтива молба, желание или съвет" }, s: { ru: "Я бы хотел… / Не могли бы вы…?", bg: "Бих искал… / Бихте ли…?" }, to: "=cond" },
      { t: { ru: "Нереальное прошлое", bg: "Нереално минало" }, s: { ru: "Если бы я знал, я бы пришёл.", bg: "Ако знаех, щях да дойда." }, to: "=fip" },
      { t: { ru: "Нереальное и уже завершённое к моменту", bg: "Нереално и вече завършено" }, s: { ru: "Мы бы уже приехали.", bg: "Досега щяхме да сме пристигнали." }, to: "=fpp" }
    ] }
  };
  var ASPECT_Q = {
    present: { q: { ru: "Как стоит глагол?", bg: "Как стои глаголът?" }, opts: [
      { t: { ru: "Сам по себе", bg: "Самостоятелно" }, s: { ru: "«вземам» — беру", bg: "вземам" }, a: "i" },
      { t: { ru: "После да / ако / когато / щом", bg: "След да / ако / когато / щом" }, s: { ru: "«искам да взема» — хочу взять", bg: "искам да взема" }, a: "p" }
    ] },
    impv: { q: { ru: "О чём вы просите?", bg: "За какво молите?" }, opts: [
      { t: { ru: "Сделать одно конкретное действие", bg: "Едно конкретно действие" }, s: { ru: "возьми! прочитай!", bg: "вземи! прочети!" }, a: "p" },
      { t: { ru: "Делать регулярно — или НЕ делать", bg: "Да се прави редовно – или да НЕ се прави" }, s: { ru: "читай каждый день! не бери!", bg: "чети всеки ден! не вземай!" }, a: "i" }
    ] },
    other: { q: { ru: "Какое это действие?", bg: "Какво е действието?" }, opts: [
      { t: { ru: "Одно завершённое, с результатом", bg: "Едно завършено, с резултат" }, s: { ru: "прочитал, прочитаю, прочитал бы", bg: "прочетох, ще прочета" }, a: "p" },
      { t: { ru: "Процесс, повторение, длительность", bg: "Процес, повторение, продължителност" }, s: { ru: "читал, буду читать, читал бы", bg: "четох, ще чета" }, a: "i" }
    ] }
  };

  function renderForm() {
    var F = S.form, v = VERBS[F.verb];
    var last = F.path[F.path.length - 1];
    var tenseId = last && last.to.charAt(0) === "=" ? last.to.slice(1) : null;
    var verbBox;
    if (F.picking) {
      var res = search(F.q).slice(0, 8);
      verbBox = '<div class="card picker"><input id="fq" type="search" autocomplete="off" spellcheck="false" placeholder="' + esc(t("search")) + '" value="' + esc(F.q) + '">' +
        '<div class="vlist compact">' + res.map(function (x) { return '<button class="vrow" data-fverb="' + x.id + '"><span class="pair">' + pairHTML(x) + '</span><span class="vmean">' + esc(x.ru) + "</span></button>"; }).join("") + "</div></div>";
    } else {
      verbBox = '<div class="fverb"><span class="ctl-label">' + t("fVerb") + '</span><span class="pair">' + pairHTML(v) + '</span><span class="vmean">' + esc(v.ru) + '</span><button class="btn ghost sm" data-pick>' + t("change") + "</button></div>";
    }
    var crumbs = F.path.map(function (p) { return '<span class="crumb">' + L(p.label) + "</span>"; });
    if (F.aspect) crumbs.push('<span class="crumb">' + L(F.aspectLabel) + "</span>");
    var body;
    if (!tenseId) {
      var node = FLOW[last ? last.to : "start"];
      body = '<div class="card"><p class="q">' + L(node.q) + '</p><div class="opts">' +
        node.opts.map(function (o, i) { return '<button class="opt" data-opt="' + i + '"><strong>' + L(o.t) + "</strong><span>" + L(o.s) + "</span></button>"; }).join("") + "</div>" + backRow() + "</div>";
    } else if (!F.aspect && tenseId !== "imperfect") {
      var aq = ASPECT_Q[tenseId] || ASPECT_Q.other;
      body = '<div class="card"><p class="q">' + L(aq.q) + '</p><div class="opts">' +
        aq.opts.map(function (o, i) { return '<button class="opt" data-asp="' + i + '"><strong>' + L(o.t) + "</strong><span>" + L(o.s) + "</span></button>"; }).join("") + "</div>" + backRow() + "</div>";
    } else {
      var a = F.aspect || "i", tn = TBY[tenseId];
      body = '<div class="card result"><h3>' + t("result") + '</h3><div class="res-name">' + tenseName(tn) + '</div><span class="formula">' + L(tn.formula) + "</span>" +
        tenseTable(tn, v, { hl: a, person: 0 }) +
        '<div class="why"><h3>' + t("why") + '</h3><p><b>' + L(tn.name) + ":</b> " + L(tn.short) + '.</p><div class="an ' + a + '"><span class="tag">' + (a === "i" ? t("impfS") : t("pfS")) + "</span><span>" + L(tn.aspect[a]) + "</span></div></div>" +
        '<div class="row-btns"><button class="btn" data-gotense="' + tn.id + '">' + t("seeTense") + '</button><button class="btn ghost" data-verb="' + v.id + '">' + t("openVerbPage") + '</button><button class="btn ghost" data-restart>' + t("restart") + "</button></div></div>";
    }
    $("form").innerHTML = '<div><h2>' + t("fTitle") + '</h2><p class="lead">' + t("fLead") + "</p></div>" + verbBox +
      '<div class="flow">' + (crumbs.length ? '<div class="crumbs">' + crumbs.join("") + "</div>" : "") + body + "</div>";
    if (F.picking) { var fq = $("fq"); fq.focus(); fq.setSelectionRange(fq.value.length, fq.value.length); }
  }
  function backRow() { return S.form.path.length || S.form.aspect ? '<div class="row-btns"><button class="btn ghost sm" data-stepback>' + t("stepBack") + "</button></div>" : ""; }

  /* ---------- Grammar ---------- */
  function renderGrammar() {
    var sub = ["tenses", "aspect", "endings"].map(function (k) {
      return '<button class="seg" data-gsub="' + k + '" aria-pressed="' + (S.gsub === k) + '">' + t({ tenses: "gTenses", aspect: "gAspect", endings: "gEndings" }[k]) + "</button>";
    }).join("");
    var body = S.gsub === "aspect" ? aspectPage() : S.gsub === "endings" ? endingsPage() : tensesPage();
    $("grammar").innerHTML = '<div class="segs">' + sub + "</div>" + body;
  }

  function chip(tn) {
    return '<button class="chip' + (tn.core ? "" : " adv") + '" data-tense="' + tn.id + '" aria-pressed="' + (tn.id === S.tense) + '">' + L(tn.name).replace(/ \(.*\)/, "") + "</button>";
  }

  function tensesPage() {
    var tn = TBY[S.tense], v = VERBS[S.model];
    if (!tn.core && !S.adv) S.adv = true;
    var cols = [["past", "past"], ["now", "now"], ["future", "future"]].map(function (c) {
      var items = visibleTenses().filter(function (x) { return x.when === c[0]; });
      return '<div class="tl-col tl-' + c[0] + '"><span class="tl-label">' + t(c[1]) + '</span><div class="tl-chips">' + items.map(chip).join("") + "</div></div>";
    }).join("");
    var moods = visibleTenses().filter(function (x) { return x.when === "mood"; }).map(chip).join("");
    var modelBtns = MODEL_IDS.map(function (id) {
      return '<button class="verb-btn" data-model="' + id + '" aria-pressed="' + (id === S.model) + '">' + VERBS[id].impf.inf + " / " + VERBS[id].pf.inf + "</button>";
    }).join("");
    var otherSel = '<select id="modelsel" aria-label="' + esc(t("other")) + '"><option value="">' + t("other") + "</option>" +
      SORTED.map(function (x) { return '<option value="' + x.id + '"' + (x.id === S.model && MODEL_IDS.indexOf(x.id) < 0 ? " selected" : "") + ">" + esc(impfTitle(x) + " – " + pfTitle(x)) + "</option>"; }).join("") + "</select>";

    return '<div class="timeline">' + cols + '</div><div class="moods"><span class="tl-label">' + t("moods") + "</span>" + moods + "</div>" +
      '<button class="link" data-adv>' + (S.adv ? t("hideAdv") : t("showAdv")) + "</button>" +
      '<article class="detail">' +
        '<div class="stack">' +
          '<div class="card"><div class="t-head">' + tenseName(tn) + '<span class="badge ' + (tn.core ? "" : "muted") + '">' + (tn.core ? t("core") : t("adv")) + '</span></div>' +
            '<p class="ctl-label">' + t("formula") + '</p><span class="formula">' + L(tn.formula) + "</span>" +
            '<p class="ctl-label">' + t("tableVerb") + '</p><div class="verbs">' + modelBtns + otherSel + "</div>" +
            tenseTable(tn, v) + "</div>" +
          '<div class="card ex"><div class="card-h"><h3>' + t("ex") + "</h3>" + trToggle() + "</div>" +
            tn.examples.map(function (e) { return exHTML(e[0], e[1]); }).join("") +
            '<span class="ex-label">' + t("neg") + "</span>" + exHTML(tn.neg[0], tn.neg[1]) +
            (tn.q ? '<span class="ex-label">' + t("q") + "</span>" + exHTML(tn.q[0], tn.q[1]) : "") + "</div>" +
        "</div>" +
        '<div class="card notes">' +
          "<div><h3>" + t("when") + '</h3><ul class="clean">' + L(tn.uses).map(function (u) { return "<li>" + u + "</li>"; }).join("") + "</ul></div>" +
          "<div><h3>" + t("which") + '</h3><div class="aspect-notes"><div class="an i"><span class="tag">' + t("impfS") + "</span><span>" + L(tn.aspect.i) + '</span></div><div class="an p"><span class="tag">' + t("pfS") + "</span><span>" + L(tn.aspect.p) + "</span></div></div></div>" +
          "<div><h3>" + t("signals") + '</h3><div class="signals">' + tn.signals.map(function (s) { return '<span class="sig">' + s + "</span>"; }).join("") + "</div></div>" +
          "<div><h3>" + t("tips") + '</h3><ul class="tips">' + L(tn.tips).map(function (s) { return "<li>" + s + "</li>"; }).join("") + "</ul></div>" +
          (S.lang === "ru" && tn.ruCompare ? '<div class="compare"><h3>' + t("compare") + "</h3><p>" + tn.ruCompare + "</p></div>" : "") +
        "</div>" +
      "</article>";
  }

  function hlEx(bg, ru, verbPf) {
    var v = VERBS.filter(function (x) { return x.pf.inf === verbPf; })[0];
    return exHTML(highlight(bg, v), ru);
  }

  function aspectPage() {
    var ru = S.lang === "ru";
    function r(a, b2) { return ru ? a : b2; }
    return '<div><h2>' + r("Какой вид выбрать?", "Кой вид да изберем?") + '</h2><p class="lead">' +
      r("Почти все болгарские глаголы идут парами, как в русском. В вашем списке первый глагол — несовершенного вида, а глагол с «да» — совершенного: «вземам – да взема». Значение видов почти такое же, как в русском.",
        "Повечето български глаголи са в двойки. В списъка първият глагол е от несвършен вид, а глаголът с „да“ – от свършен: вземам – да взема. Изберете вида с един въпрос: процес или едно завършено действие?") + "</p></div>" +
      '<div class="two">' +
        '<div class="card aspect-i"><h3>' + r("Несовершенный вид", "Несвършен вид") + '</h3><p class="big-idea">' + r("Действие как процесс: идёт, повторяется, длится.", "Действието като процес: тече, повтаря се, трае.") + '</p><ul class="clean">' +
          r("<li>Сейчас: <i>Чета.</i></li><li>Привычка: <i>Всеки ден вземам автобус.</i></li><li>Длительность: <i>Четох два часа.</i></li><li>Запрет: <i>Не вземай!</i></li>",
            "<li>Сега: <i>Чета.</i></li><li>Навик: <i>Всеки ден вземам автобус.</i></li><li>Продължителност: <i>Четох два часа.</i></li><li>Забрана: <i>Не вземай!</i></li>") + "</ul></div>" +
        '<div class="card aspect-p"><h3>' + r("Совершенный вид", "Свършен вид") + '</h3><p class="big-idea">' + r("Одно целое действие с результатом.", "Едно цяло действие с резултат.") + '</p><ul class="clean">' +
          r("<li>Один раз в прошлом: <i>Прочетох книгата.</i></li><li>Один раз в будущем: <i>Днес ще взема такси.</i></li><li>За какое-то время: <i>Прочетох я за час.</i></li><li>После <i>да / ако / когато</i> в настоящем.</li>",
            "<li>Еднократно в миналото: <i>Прочетох книгата.</i></li><li>Еднократно в бъдещето: <i>Днес ще взема такси.</i></li><li>За определено време: <i>Прочетох я за час.</i></li><li>След <i>да / ако / когато</i> в сегашно време.</li>") + "</ul></div>" +
      "</div>" +
      (ru ? '<div class="card compare"><h3>' + t("compare") + "</h3><p>Главное отличие: в болгарском СВ в настоящем времени не означает будущее. «Взема» — это не «возьму», а «(чтобы) взять» после «да». «Возьму» = «ще взема».</p></div>" : "") +
      '<div class="card"><h3>' + r("Вид в каждом времени", "Видът във всяко време") + '</h3><div class="table-wrap"><table class="plain"><thead><tr><th></th><th class="i">' + t("impfS") + '</th><th class="p">' + t("pfS") + "</th></tr></thead><tbody>" +
        [["present", r("обычное настоящее", "нормалното сегашно"), r("только после да, ще, ако, когато, щом", "само след да, ще, ако, когато, щом")],
         ["aorist", r("действие было, длилось", "действието е траело"), r("обычный выбор: завершено", "обичайният избор: завършено")],
         ["imperfect", r("обычный выбор: фон, привычка", "обичайният избор: фон, навик"), r("редко: «всякий раз, когда»", "рядко: при повторение")],
         ["future", r("процесс, регулярность", "процес, повторение"), r("одно действие", "едно действие")],
         ["perfect", r("опыт", "опит"), r("результат", "резултат")],
         ["impv", r("повторение и все запреты", "повторение и всички забрани"), r("одна конкретная просьба", "една конкретна молба")]
        ].map(function (row) { return "<tr><td>" + L(TBY[row[0]].name).replace(/ \(.*\)/, "") + "</td><td>" + row[1] + "</td><td>" + row[2] + "</td></tr>"; }).join("") +
      "</tbody></table></div></div>" +
      '<div class="two">' +
        '<div class="card"><h3>' + t("signals") + '</h3><div class="p-gap">' +
          '<p><b class="i-txt">' + t("impfS") + ":</b> винаги, обикновено, често, рядко, никога, всеки ден, всяка седмица, по цял ден, докато, понякога</p>" +
          '<p><b class="p-txt">' + t("pfS") + ":</b> веднъж, този път, изведнъж, най-накрая, до утре, за пет минути</p>" +
          '<p class="src">' + r("Срок: «Четох час» (НСВ — читал час) и «Прочетох я за час» (СВ — прочитал за час).", "Срок: „Четох час“ (НСВ) и „Прочетох я за час“ (СВ).") + "</p></div></div>" +
        '<div class="card"><h3>' + r("Как образуются пары", "Как се образуват двойките") + '</h3><div class="p-gap">' +
          "<p><b>" + r("Суффикс", "Наставка") + ".</b> " + r("НСВ длиннее", "Несвършеният е по-дълъг") + ": вдигна → вдигам, върна → връщам, заключа → заключвам, целуна → целувам</p>" +
          "<p><b>" + r("Приставка", "Представка") + ".</b> " + r("СВ получает приставку", "Свършеният получава представка") + ": чета → прочета, правя → направя, питам → попитам, моля → помоля</p>" +
          "<p><b>" + r("Разные основы", "Различни основи") + ".</b> влизам → вляза, давам → дам, идвам → дойда, виждам → видя</p>" +
          '<p class="src">' + r("Подсказка: НСВ из пары почти всегда III спряжения (на -м), а СВ чаще I или II (-еш / -иш).", "Подсказка: несвършеният глагол почти винаги е от III спрежение (на -м), а свършеният – най-често от I или II (-еш / -иш).") + "</p></div></div>" +
      "</div>" +
      '<div class="card ex"><div class="card-h"><h3>' + r("Из вашего списка", "От вашия списък") + "</h3>" + trToggle() + "</div>" +
        hlEx("Обикновено вземам автобус, но днес бързам и ще взема такси.", "Обычно я езжу на автобусе, но сегодня тороплюсь и возьму такси.", "взема") +
        hlEx("– Ще добавиш ли нещо към кафето? – Не, никога не добавям нищо.", "– Добавишь что-нибудь в кофе? – Нет, я никогда ничего не добавляю.", "добавя") +
        hlEx("Рядко закусвам вкъщи, защото винаги бързам. Този път ще закуся яйца на очи.", "Я редко завтракаю дома, потому что всегда тороплюсь. В этот раз съем на завтрак яичницу.", "закуся") +
        hlEx("Обикновено започвам работа в 9:00 ч., но утре ще започна по-късно.", "Обычно я начинаю работу в 9:00, но завтра начну позже.", "започна") +
        '<p class="src">' + r("Решают слова-сигналы: обикновено, никога, рядко → НСВ; днес, този път, утре → СВ.", "Сигналните думи решават: обикновено, никога, рядко → НСВ; днес, този път, утре → СВ.") + "</p></div>";
  }

  function endingsPage() {
    var ru = S.lang === "ru";
    function r(a, b2) { return ru ? a : b2; }
    var grp = r("спр.", "спр.");
    return '<div><h2>' + t("gEndings") + '</h2><p class="lead">' +
      r("В болгарском три спряжения. Группу видно по форме «ти» — поэтому ваш список пишет «да взема, -еш» и «да видя, -иш».",
        "Българските глаголи имат три спрежения. Групата личи по формата за „ти“ – затова в списъка пише „да взема, -еш“ и „да видя, -иш“.") + "</p></div>" +
      '<div class="card"><h3>' + r("Настоящее время по спряжениям", "Сегашно време по спрежения") + '</h3><div class="table-wrap"><table class="plain end"><thead><tr><th>' + t("person") + "</th><th>I " + grp + " · -еш</th><th>II " + grp + " · -иш</th><th>III " + grp + " · -аш / -яш</th></tr></thead><tbody>" +
        "<tr><td>аз</td><td>чет<b>а</b></td><td>прав<b>я</b></td><td>пита<b>м</b></td></tr>" +
        "<tr><td>ти</td><td>чет<b>еш</b></td><td>прав<b>иш</b></td><td>пита<b>ш</b></td></tr>" +
        "<tr><td>той / тя</td><td>чет<b>е</b></td><td>прав<b>и</b></td><td>пита</td></tr>" +
        "<tr><td>ние</td><td>чет<b>ем</b></td><td>прав<b>им</b></td><td>пита<b>ме</b></td></tr>" +
        "<tr><td>вие</td><td>чет<b>ете</b></td><td>прав<b>ите</b></td><td>пита<b>те</b></td></tr>" +
        "<tr><td>те</td><td>чет<b>ат</b></td><td>прав<b>ят</b></td><td>пита<b>т</b></td></tr>" +
      '</tbody></table></div><p class="table-note">' +
        r("III спряжение всегда оканчивается на -м в форме «аз» (питам, вземам, добавям). Исключения из I спряжения: дам (дадеш), ям (ядеш), а также съм.",
          "III спрежение винаги завършва на -м във формата за „аз“ (питам, вземам, добавям). Изключения от I спрежение: дам (дадеш), ям (ядеш) и съм.") + "</p></div>" +
      '<div class="two">' +
        '<div class="card"><h3>' + r("Окончания прошедших времён (для всех)", "Окончания за миналите времена (за всички)") + '</h3><div class="table-wrap"><table class="plain end"><thead><tr><th>' + t("person") + "</th><th>" + r("Аорист", "Аорист") + "</th><th>" + r("Имперфект", "Имперфект") + "</th></tr></thead><tbody>" +
          "<tr><td>аз</td><td>прочето<b>х</b></td><td>четя<b>х</b></td></tr>" +
          "<tr><td>ти</td><td>прочете</td><td>чете<b>ше</b></td></tr>" +
          "<tr><td>той / тя</td><td>прочете</td><td>чете<b>ше</b></td></tr>" +
          "<tr><td>ние</td><td>прочето<b>хме</b></td><td>четя<b>хме</b></td></tr>" +
          "<tr><td>вие</td><td>прочето<b>хте</b></td><td>четя<b>хте</b></td></tr>" +
          "<tr><td>те</td><td>прочето<b>ха</b></td><td>четя<b>ха</b></td></tr>" +
        '</tbody></table></div><p class="table-note">' + r("Окончание -ше в формах «ти / той» — главный признак имперфекта.", "Окончанието -ше за „ти / той“ е най-ясният белег на имперфекта.") + "</p></div>" +
        '<div class="card"><h3>' + r("Аорист: гласная перед -х", "Аорист: гласната пред -х") + '</h3><div class="table-wrap"><table class="plain"><tbody>' +
          "<tr><td>-ох</td><td>чета → четох, донеса → донесох, дойда → дойдох, дам → дадох</td></tr>" +
          "<tr><td>-ах / -ях</td><td>кажа → казах, питам → питах, видя → видях, успея → успях</td></tr>" +
          "<tr><td>-их</td><td>правя → правих, купя → купих, забравя → забравих</td></tr>" +
          "<tr><td>-х</td><td>взема → взех, чуя → чух, обуя → обух</td></tr>" +
        '</tbody></table></div><p class="table-note">' + r("III спряжение — просто: -м → -х. Для I и II запоминайте форму; в разделе «Глаголы» все формы уже готовы.", "III спрежение е лесно: -м → -х. При I и II запомнете формата; в раздел „Глаголи“ всички форми са готови.") + "</p></div>" +
      "</div>" +
      '<div class="two">' +
        '<div class="card"><h3>' + r("Имперфект: -ях, -ех или -ах?", "Имперфект: -ях, -ех или -ах?") + '</h3><div class="p-gap">' +
          "<p>" + r("<b>I и II:</b> уберите -еш / -иш. Под ударением обычно -ях, без ударения -ех. Это правило с исключениями.", "<b>I и II:</b> махнете -еш / -иш. Под ударение обикновено -ях, без ударение -ех. Правилото има изключения.") + "</p>" +
          "<p>чета → четях · вървя → вървях · пиша → пишех · правя → правех</p>" +
          "<p>" + r("<b>После ж, ч, ш</b> ударное -ях становится -ах: мълча → мълчах, лежа → лежах.", "<b>След ж, ч, ш</b> удареното -ях става -ах: мълча → мълчах, лежа → лежах.") + "</p>" +
          "<p>" + r("<b>III:</b> -м → -х, а «ти / той» получают -ше: питам → питах, питаше.", "<b>III:</b> -м → -х, а „ти / той“ получават -ше: питам → питах, питаше.") + "</p></div></div>" +
        '<div class="card"><h3>' + r("Причастие на -л", "Причастие на -л") + '</h3><div class="p-gap">' +
          "<p>" + r("Нужно для перфекта, плюсквамперфекта, будущего предварительного и «бих». Возьмите аорист, уберите -х, добавьте -л.", "Използва се в перфекта, минало предварително, бъдеще предварително и с „бих“. Вземете аориста, махнете -х и добавете -л.") + "</p>" +
          "<p>правих → правил · питах → питал · казах → казал · взех → взел</p>" +
          "<p>" + r("Аорист на -ох обычно даёт -ъл: донесох → донесъл, дойдох → дошъл. Короткие: четох → чел, дадох → дал.", "Аористите на -ох обикновено дават -ъл: донесох → донесъл, дойдох → дошъл. Кратки: четох → чел, дадох → дал.") + "</p>" +
          "<p>" + r("Окончания: -л (м), -ла (ж), -ло (ср), -ли (мн). Во множественном я → е: видял → видели, влязъл → влезли.", "Окончания: -л (м.р.), -ла (ж.р.), -ло (ср.р.), -ли (мн.ч.). В мн.ч. я → е: видял → видели, влязъл → влезли.") + "</p></div></div>" +
      "</div>" +
      '<div class="card"><h3>' + L(TBY.impv.name) + '</h3><div class="table-wrap"><table class="plain"><thead><tr><th></th><th>ти</th><th>вие</th><th>' + t("ex") + "</th></tr></thead><tbody>" +
        "<tr><td>" + r("I и II, основа на согласный", "I и II, основа на съгласна") + "</td><td>-и</td><td>-ете</td><td>чети / четете, прави / правете, кажи / кажете</td></tr>" +
        "<tr><td>" + r("III и основы на гласный", "III и основи на гласна") + "</td><td>-й</td><td>-йте</td><td>питай / питайте, чуй / чуйте, обещай / обещайте</td></tr>" +
        "<tr><td>" + r("Неправильные", "Неправилни") + '</td><td colspan="3">ела / елате, виж / вижте, дай / дайте, яж / яжте, влез / влезте, излез / излезте, слез / слезте</td></tr>' +
      "</tbody></table></div></div>";
  }

  /* ---------- Routing ---------- */
  function setHash() {
    var h = S.tab === "verbs" ? (S.verb !== null ? "verb-" + S.verb : "verbs") : S.tab === "form" ? "form" :
      S.gsub === "tenses" ? "grammar-" + S.tense : S.gsub;
    try { history.replaceState(null, "", "#" + h); } catch (e) { /* ignore */ }
  }
  function readHash() {
    var h = (location.hash || "").slice(1), m;
    if ((m = /^verb-(\d+)$/.exec(h)) && VERBS[+m[1]]) { S.tab = "verbs"; S.verb = +m[1]; }
    else if (h === "form") S.tab = "form";
    else if ((m = /^grammar-(\w+)$/.exec(h)) && TBY[m[1]]) { S.tab = "grammar"; S.gsub = "tenses"; S.tense = m[1]; }
    else if (h === "grammar") { S.tab = "grammar"; }
    else if (h === "aspect" || h === "endings") { S.tab = "grammar"; S.gsub = h; }
    else if (h === "verbs") { S.tab = "verbs"; S.verb = null; }
  }

  function render() {
    renderChrome();
    if (S.tab === "verbs") renderVerbs();
    if (S.tab === "form") renderForm();
    if (S.tab === "grammar") renderGrammar();
    setHash();
  }
  function go(fn) { fn(); render(); window.scrollTo(0, 0); }

  /* ---------- Events ---------- */
  document.addEventListener("click", function (e) {
    var el;
    if ((el = e.target.closest("[data-lang]"))) { S.lang = el.getAttribute("data-lang"); store.set("lang", S.lang); render(); return; }
    if ((el = e.target.closest("[data-tab]"))) { var tb = el.getAttribute("data-tab"); go(function () { if (tb === "verbs" && S.tab === "verbs") S.verb = null; S.tab = tb; }); return; }
    if ((el = e.target.closest("[data-fverb]"))) { var fv = +el.getAttribute("data-fverb"); S.form.verb = fv; S.form.picking = false; S.form.q = ""; render(); return; }
    if ((el = e.target.closest("[data-verb]"))) { var vid = +el.getAttribute("data-verb"); go(function () { S.tab = "verbs"; S.verb = vid; }); return; }
    if (e.target.closest("[data-back]")) { go(function () { S.verb = null; }); return; }
    if (e.target.closest("[data-adv]")) { S.adv = !S.adv; store.set("adv", S.adv ? "1" : "0"); render(); return; }
    if ((el = e.target.closest("[data-gotense]"))) { var gt = el.getAttribute("data-gotense"); go(function () { S.tab = "grammar"; S.gsub = "tenses"; S.tense = gt; store.set("tense", gt); }); return; }
    if ((el = e.target.closest("[data-findform]"))) { var ff = +el.getAttribute("data-findform"); go(function () { S.tab = "form"; S.form = { verb: ff, path: [], aspect: null, picking: false, q: "" }; }); return; }
    if ((el = e.target.closest("[data-gsub]"))) { S.gsub = el.getAttribute("data-gsub"); render(); return; }
    if ((el = e.target.closest("[data-tense]"))) { S.tense = el.getAttribute("data-tense"); store.set("tense", S.tense); render(); return; }
    if ((el = e.target.closest("[data-model]"))) { S.model = +el.getAttribute("data-model"); store.set("model", S.model); render(); return; }
    if (e.target.closest("[data-pick]")) { S.form.picking = true; render(); return; }
    if ((el = e.target.closest("[data-opt]"))) {
      var last = S.form.path[S.form.path.length - 1];
      var o = FLOW[last ? last.to : "start"].opts[+el.getAttribute("data-opt")];
      S.form.path.push({ label: o.t, to: o.to }); render(); return;
    }
    if ((el = e.target.closest("[data-asp]"))) {
      var tid = S.form.path[S.form.path.length - 1].to.slice(1);
      var ao = (ASPECT_Q[tid] || ASPECT_Q.other).opts[+el.getAttribute("data-asp")];
      S.form.aspect = ao.a; S.form.aspectLabel = ao.t; render(); return;
    }
    if (e.target.closest("[data-stepback]")) { if (S.form.aspect) S.form.aspect = null; else S.form.path.pop(); render(); return; }
    if (e.target.closest("[data-restart]")) { S.form.path = []; S.form.aspect = null; render(); return; }
  });
  document.addEventListener("input", function (e) {
    if (e.target.id === "q") { S.query = e.target.value; renderVerbs(); }
    if (e.target.id === "fq") { S.form.q = e.target.value; renderForm(); }
  });
  document.addEventListener("change", function (e) {
    if (e.target.id === "trbox") { S.tr = e.target.checked; store.set("tr", S.tr ? "1" : "0"); document.body.classList.toggle("no-tr", !S.tr); }
    if (e.target.id === "modelsel" && e.target.value !== "") { S.model = +e.target.value; store.set("model", S.model); render(); }
  });
  window.addEventListener("hashchange", function () { readHash(); render(); });

  readHash();
  render();
})();
