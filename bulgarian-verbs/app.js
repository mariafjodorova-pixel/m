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
      whyA: "СВ в настоящем времени не стоит сам по себе, без «да», «ще», «ако», «когато». Здесь возможен только НСВ.",
      whyB: "Запрет («не» + повелительное) — всегда НСВ.",
      orig: "Так в оригинале из вашего списка:",
      stress: "Ударения", stressTitle: "Показывать ударения",
      foot: function (n) { return n + " " + plural(n, "пара", "пары", "пар") + " глаголов из списка Study in BG"; },
      train: "Что тренировать", allT: "Все времена", aspL: "Вид", both: "оба",
      noQ: "Под этот выбор нет упражнений.", pickAll: "Выбрать все времена",
      noAspInMode: "Вид в этом режиме выбирает задание, поэтому переключателя вида здесь нет.",
      hasT: "Вопросы этого режима есть только для времён:",
      say: "Произнести", ttsNo: "Озвучка недоступна: в этом браузере нет болгарского голоса.", close: "Закрыть"
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
      whyA: "Свършеният вид в сегашно време не стои самостоятелно, без „да“, „ще“, „ако“, „когато“. Тук е възможен само НСВ.",
      whyB: "Забрана („не“ + повелително) – винаги НСВ.",
      orig: "Така е в оригинала от вашия списък:",
      stress: "Ударения", stressTitle: "Показвай ударенията",
      foot: function (n) { return n + " " + (n === 1 ? "двойка" : "двойки") + " глаголи от списъка на Study in BG"; },
      train: "Какво да упражнявам", allT: "Всички времена", aspL: "Вид", both: "двата",
      noQ: "Няма упражнения за този избор.", pickAll: "Избери всички времена",
      noAspInMode: "В този режим видът е част от задачата, затова тук няма превключвател за вид.",
      hasT: "В този режим има въпроси само за времената:",
      say: "Произнеси", ttsNo: "Озвучаването не е достъпно: в този браузър няма български глас.", close: "Затвори"
    }
  };
  function plural(n, one, few, many) {
    var a = n % 10, b = n % 100;
    return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many;
  }
  var CHIP = {
    ru: { present: "Настоящее", aorist: "Аорист", imperfect: "Имперфект", perfect: "Перфект", pluperfect: "Плюсквам\u00adперфект", future: "Будущее", fip: "Будущее в прош.", fp: "Буд. предварит.", fpp: "Буд. предв. в прош.", cond: "Условное", impv: "Повелительное" },
    bg: { present: "Сегашно", aorist: "Аорист", imperfect: "Имперфект", perfect: "Перфект", pluperfect: "Мин. предварително", future: "Бъдеще", fip: "Бъдеще в миналото", fp: "Бъд. предварително", fpp: "Бъд. предв. в миналото", cond: "Условно", impv: "Повелително" }
  };

  /* ---------- State ---------- */
  var store = {
    get: function (k) { try { return localStorage.getItem("glagoli3:" + k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem("glagoli3:" + k, v); } catch (e) { /* ignore */ } }
  };
  var DEFAULT_VERB = VERBS.filter(function (v) { return v.pf.inf === "взема"; })[0].id;
  var savedB = null;
  try { savedB = JSON.parse(store.get("builder") || "null"); } catch (e) { savedB = null; }
  var S = {
    lang: store.get("lang") === "bg" ? "bg" : "ru",
    tab: "form", verb: null, query: "", tr: store.get("tr") !== "0", legend: false,
    stress: store.get("stress") !== "0",
    open: {}, showRare: false, vperson: 0, vrare: false,
    B: { verb: DEFAULT_VERB, tense: "present", person: 0, pf: false, gender: "m", neg: false, sel: -1, picking: false, q: "" },
    anim: null, prev: null
  };
  if (savedB && VERBS[savedB.verb] && TBY[savedB.tense]) {
    ["verb", "tense", "person", "pf", "gender", "neg"].forEach(function (k) { S.B[k] = savedB[k]; });
  }
  function saveB() { store.set("builder", JSON.stringify({ verb: S.B.verb, tense: S.B.tense, person: S.B.person, pf: S.B.pf, gender: S.B.gender, neg: S.B.neg })); }
  function t(k) { return U[S.lang][k]; }
  function L(o) { return o ? (o[S.lang] || o.ru) : ""; }
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function shortName(tn) { return CHIP[S.lang][tn.id]; }

  /* ---------- Verb helpers ---------- */
  function dict(f) { return S.stress ? G.markStr(f.inf, f.st.inf) : f.inf; }
  function impfTitle(v) { return dict(v.impf) + (v.se ? " " + v.se : "") + (v.opt ? " (" + v.opt + ")" : "") + (v.tail ? " " + v.tail : ""); }
  function pfTitle(v) { return "да " + (v.se ? v.se + " " : "") + (v.opt ? "(" + v.opt + ") " : "") + dict(v.pf) + (v.tail ? " " + v.tail : ""); }
  function pairHTML(v) { return '<span class="i-txt">' + impfTitle(v) + '</span><span class="dash"> – </span><span class="p-txt">' + pfTitle(v) + "</span>"; }
  var TR = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sht", ъ: "a", ь: "y", ю: "yu", я: "ya" };
  VERBS.forEach(function (v) {
    var bg = (v.impf.inf + " " + v.pf.inf + " " + v.pf.pres[1]).toLowerCase();
    v.hayBg = bg; v.hayLat = bg.replace(/[а-я]/g, function (c) { return TR[c] || c; }); v.hayRu = v.ru.toLowerCase();
    v.setI = G.wordSet(v.impf); v.setP = G.wordSet(v.pf);
  });
  var LIST_PAIRS = VERBS.filter(function (v) { return !v.extra; }).length;
  var SORTED = VERBS.slice().sort(function (a, b) { return a.impf.inf.localeCompare(b.impf.inf, "bg") || a.id - b.id; });
  function search(q) {
    q = q.trim().toLowerCase();
    if (!q) return SORTED;
    var lat = /[a-z]/.test(q);
    return SORTED.filter(function (v) { return lat ? v.hayLat.indexOf(q) >= 0 : (v.hayBg.indexOf(q) >= 0 || v.hayRu.indexOf(q) >= 0); });
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
  var TTS = { ok: null, voice: null };
  function plainText(html) { return G.stripStress(String(html).replace(/<[^>]*>/g, "")).replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">"); }
  function sayBtn(text) {
    if (!TTS.ok) return "";
    return '<button class="tts" data-say="' + esc(plainText(text)) + '" aria-label="' + esc(t("say")) + '" title="' + esc(t("say")) + '">🔊</button>';
  }
  function speak(text) {
    try {
      var u = new SpeechSynthesisUtterance(text);
      u.lang = "bg-BG"; if (TTS.voice) u.voice = TTS.voice; u.rate = 0.9;
      window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
    } catch (e) { /* ignore */ }
  }
  function initTTS() {
    var decided = false;
    function check(final) {
      if (decided) return;
      var vs = [];
      try { vs = window.speechSynthesis ? window.speechSynthesis.getVoices() : []; } catch (e) { vs = []; }
      var bg = vs.filter(function (x) { return /^bg([-_]|$)/i.test(x.lang); })[0];
      if (bg) { decided = true; TTS.ok = true; TTS.voice = bg; render(); return; }
      if (final) {
        decided = true; TTS.ok = false;
        if (store.get("ttsHint") !== "1") { store.set("ttsHint", "1"); showNotice(t("ttsNo")); }
      }
    }
    if (window.speechSynthesis) {
      try { window.speechSynthesis.addEventListener("voiceschanged", function () { check(false); }); } catch (e) { /* ignore */ }
      check(false);
    }
    setTimeout(function () { check(true); }, 2500);
  }
  function showNotice(text) {
    var n = $("notice");
    n.innerHTML = "<span>" + esc(text) + '</span><button class="link" data-closenotice aria-label="' + esc(t("close")) + '">✕</button>';
    n.hidden = false;
  }

  function quote(bg, ru) { return '<div class="quote"><span class="bgt">' + bg + sayBtn(bg) + '</span><span class="tr">' + esc(ru) + "</span></div>"; }
  function trToggle() { return '<label class="trt"><input type="checkbox" class="trbox"' + (S.tr ? " checked" : "") + "> " + t("tr") + "</label>"; }
  function examplesPanel(v) {
    if (!v.ex || !v.ex.length) return "";
    return '<div class="panel ex b-ex"><div class="ex-head"><h3 class="label">' + t("examples") + "</h3>" + trToggle() + "</div>" +
      v.ex.map(function (e) { return quote(highlight(e[0], v), e[1]); }).join("") + "</div>";
  }

  function cellText(tid, v, pf, i, gender, neg) {
    var r = G.build(tid, v, pf, i, gender || "m", !!neg, S.lang);
    if (r.na) return null;
    var html = "", prev = null;
    r.pieces.forEach(function (p) {
      var glue = prev && prev.k === "stem" && p.k === "end", txt = G.pieceText(p, S.stress);
      html += (prev && !glue ? " " : "") + (p.k === "pt" || p.k === "se" ? '<span class="aux">' + txt + "</span>" : p.k === "end" ? '<span class="endc">' + txt + "</span>" : txt);
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
    $("legend").innerHTML = '<div class="row"><i class="dot i"></i><span><b class="i">' + t("impfS") + "</b> " + t("legI") + '</span></div><div class="row"><i class="dot p"></i><span><b class="p">' + t("pfS") + "</b> " + t("legP") + '</span></div><div class="row"><i class="dot h"></i><span>' + t("legH") + '</span></div><p class="muted">' + t("legTap") + "</p>";
    ["form", "tenses", "verbs", "practice"].forEach(function (k) {
      $("tab-btn-" + k).querySelector("span").textContent = t({ form: "tForm", tenses: "tTenses", verbs: "tVerbs", practice: "tPractice" }[k]);
      $("pane-" + k).hidden = S.tab !== k;
      $("tab-btn-" + k).setAttribute("aria-selected", String(S.tab === k));
    });
    $("foot").textContent = t("foot")(LIST_PAIRS);
    document.body.classList.toggle("no-tr", !S.tr);
  }

  /* ---------- Форма (builder) ---------- */
  function plainCell(tid, v, pf, i) {
    var r = G.build(tid, v, pf, i, S.B.gender, S.B.neg, S.lang);
    return r.na ? "" : G.joinPieces(r);
  }
  function renderForm() {
    var B = S.B, v = VERBS[B.verb], tn = TBY[B.tense], grp = groupOf(B.tense);
    var partT = !!G.PART_TENSES[B.tense];
    if (B.tense === "impv" && B.person !== 1 && B.person !== 4) B.person = 1;

    // change detection: tense/verb change → fade; не / м-ж → flash the cells that changed
    var key = B.verb + "|" + B.tense, now = {}, changed = {}, fade = false;
    for (var i = 0; i < 6; i++) for (var a = 0; a < 2; a++) now[i + "|" + a] = plainCell(B.tense, v, !!a, i);
    if (S.anim && S.prev) {
      if (S.prev.key !== key || S.anim === "fade") fade = true;
      else if (S.anim === "chg") Object.keys(now).forEach(function (k) { if (now[k] !== S.prev.cells[k]) changed[k] = 1; });
    }
    S.prev = { key: key, cells: now };
    var selAnim = S.anim === "sel" || S.anim === "chg";
    S.anim = null;

    // verb picker: the whole (filtered) list scrolls
    var found = B.picking ? search(B.q) : [];
    var verb = '<div class="vwrap">' +
      '<button class="vpick" data-pick aria-expanded="' + B.picking + '"><span class="txt"><span class="pair">' + pairHTML(v) + '</span><span class="vmean">' + esc(v.ru) + '</span></span><span class="chev">▾</span></button>' +
      (B.picking ? '<div class="picker"><input id="bq" class="search" type="search" autocomplete="off" spellcheck="false" placeholder="' + esc(t("search")) + '" value="' + esc(B.q) + '">' +
        '<p class="pcount">' + t("count")(found.length) + '</p><div class="plist">' +
        found.map(function (x) { return '<button class="prow" data-bverb="' + x.id + '"><span class="pair">' + pairHTML(x) + '</span><span class="vmean">' + esc(x.ru) + "</span></button>"; }).join("") + "</div></div>" : "") +
      "</div>";

    // tense picker
    var groups = '<div class="seg" role="group">' + GROUPS.map(function (g) {
      return '<button data-bgroup="' + g.id + '" aria-pressed="' + (g === grp) + '">' + L(g.name) + "</button>";
    }).join("") + "</div>";
    var tlist = grp.t.length > 1 ? '<div class="tlist">' + grp.t.map(function (id) {
      var x = TBY[id];
      return '<button class="tbtn' + (x.core ? "" : " rare") + '" data-btense="' + id + '" aria-pressed="' + (id === B.tense) + '">' + G.icon(id) + "<span>" + shortName(x) + "</span></button>";
    }).join("") + "</div>" : "";
    var ctl = '<div class="ctl">' + groups + tlist + "</div>";

    // the selected form, large, split into explained pieces
    var r = G.build(B.tense, v, B.pf, B.person, B.gender, B.neg, S.lang);
    var pron = (B.person === 2 && partT ? (B.gender === "f" ? "тя" : "той") : G.PERSONS[B.person]) + " · " + (B.pf ? t("pfS") : t("impfS"));
    var hero;
    if (r.na) {
      hero = '<div class="b-hero"><span class="b-pron">' + pron + '</span><p class="b-na">' + esc(r.na) + "</p></div>";
    } else {
      var sp = B.sel >= 0 && B.sel < r.pieces.length ? B.sel : -1;
      if (sp < 0) { r.pieces.forEach(function (pc, k) { if (pc.k === "end") sp = k; }); if (sp < 0) sp = r.pieces.length - 1; }
      var word = "", open = false;
      r.pieces.forEach(function (pc, k) {
        var next = r.pieces[k + 1];
        if (pc.k === "stem" && next && next.k === "end") { word += '<span class="w">'; open = true; }
        word += '<button class="pc k-' + pc.k + (B.pf ? " pf" : " impf") + '" data-piece="' + k + '" aria-pressed="' + (k === sp) + '">' + G.pieceText(pc, S.stress) + "</button>";
        if (open && pc.k === "end") { word += "</span>"; open = false; }
      });
      hero = '<div class="b-hero"><span class="b-pron">' + pron + '</span><div class="b-wordrow"><div class="b-word' + (selAnim || fade ? " fade" : "") + '">' + word + "</div>" + sayBtn(G.joinPieces(r)) + "</div>" +
        '<p class="b-info">' + esc(r.pieces[sp].info) + "</p></div>";
    }

    // all persons × НСВ | СВ
    var tools = '<div class="t-tools"><span class="t-name">' + G.icon(tn.id) + "<b>" + shortName(tn) + "</b></span>" +
      (partT ? '<div class="seg"><button data-bgen="m" aria-pressed="' + (B.gender === "m") + '">' + t("m") + '</button><button data-bgen="f" aria-pressed="' + (B.gender === "f") + '">' + t("f") + "</button></div>" : "") +
      '<button class="negbtn" data-bneg aria-pressed="' + B.neg + '">' + t("neg") + "</button></div>";
    var rows = G.PERSONS.map(function (p, i) {
      if (!now[i + "|0"] && !now[i + "|1"]) return "";
      var who = i === 2 ? (partT && B.gender === "f" ? "тя" : "той") : p;
      var tds = [0, 1].map(function (a) {
        var c = cellText(B.tense, v, !!a, i, B.gender, B.neg), sel = i === B.person && !!a === B.pf;
        return '<td><button class="fcell ' + (a ? "p" : "i") + (changed[i + "|" + a] ? " chg" : "") + (c ? "" : " empty") + '" data-fcell="' + i + "|" + a + '" aria-pressed="' + sel + '">' + (c || "—") + "</button></td>";
      }).join("");
      return '<tr><th class="who">' + who + "</th>" + tds + "</tr>";
    }).join("");
    var table = '<div class="panel tpanel">' + tools + hero +
      '<table class="ftable' + (fade ? " fade" : "") + '"><colgroup><col class="cw"><col><col></colgroup><thead><tr><th></th>' +
      '<th class="i">' + t("impfS") + ' <span class="bg">' + dict(v.impf) + '</span></th><th class="p">' + t("pfS") + ' <span class="bg">' + dict(v.pf) + "</span></th></tr></thead><tbody>" + rows + "</tbody></table>" +
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
    var list = search(S.query), keep = document.activeElement && document.activeElement.id === "q";
    el.innerHTML = '<div class="search-row"><input id="q" class="search" type="search" autocomplete="off" spellcheck="false" placeholder="' + esc(t("search")) + '" value="' + esc(S.query) + '"><span class="count">' + t("count")(list.length) + "</span></div>" +
      (list.length ? '<div class="vlist">' + list.map(function (v) {
        return '<button class="vrow" data-verb="' + v.id + '"><span class="pair">' + pairHTML(v) + '</span><span class="vmean">' + esc(v.ru) + '</span><span class="grp">' + v.impf.group + " · " + v.pf.group + (v.extra ? ' <em class="badge">' + t("model") + "</em>" : "") + "</span></button>";
      }).join("") + "</div>" : '<p class="muted">' + t("none") + "</p>");
    if (keep) { var q = $("q"); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
  }
  function verbPage(v) {
    var i = S.vperson, tenses = CORE.concat(S.vrare ? RARE : []);
    var persons = '<div class="pseg">' + G.PERSONS.map(function (p, k) { return '<button data-vperson="' + k + '" aria-pressed="' + (k === i) + '">' + p.replace(" / тя", "") + "</button>"; }).join("") + "</div>";
    var rows = tenses.map(function (tn) {
      var pi = tn.id === "impv" ? (i >= 3 ? 4 : 1) : i;
      var a = cellText(tn.id, v, false, pi), b = cellText(tn.id, v, true, pi);
      return '<tr><th class="stick"><button class="tlink" data-cell="' + tn.id + "|0|" + pi + '">' + G.icon(tn.id) + "<span>" + shortName(tn) + "</span></button></th>" +
        '<td><button class="cell i" data-cell="' + tn.id + "|0|" + pi + '">' + (a || '<span class="na">—</span>') + "</button></td>" +
        '<td><button class="cell p" data-cell="' + tn.id + "|1|" + pi + '">' + (b || '<span class="na">—</span>') + "</button></td></tr>";
    }).join("");
    return '<button class="back" data-back>' + t("back") + "</button>" +
      '<div class="vhead"><h2 class="pairbig">' + pairHTML(v) + '</h2><p class="muted">' + esc(v.ru) + '</p><div class="badges"><span class="badge i">' + t("impfS") + " · " + v.impf.group + " " + t("group") + '</span><span class="badge p">' + t("pfS") + " · " + v.pf.group + " " + t("group") + "</span></div>" +
      (v.note ? '<p class="note">' + esc(L(v.note)) + "</p>" : "") + "</div>" +
      '<div class="panel"><div class="vgrid-head"><h3 class="label">' + t("grid") + "</h3>" + persons + "</div>" +
      '<div class="gwrap"><table class="vgrid"><colgroup><col class="c0"><col><col></colgroup><thead><tr><th class="stick"></th><th class="i">' + t("impfS") + " · " + dict(v.impf) + '</th><th class="p">' + t("pfS") + " · " + dict(v.pf) + "</th></tr></thead><tbody>" + rows + "</tbody></table></div>" +
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
    ddOpen: false
  };
  if (["forms", "aspect", "tense"].indexOf(P.mode) < 0) P.mode = "forms";
  function tOn(id) { return P.tenses.indexOf(id) >= 0; }
  function saveFilter() { store.set("ptenses", JSON.stringify(P.tenses)); store.set("paspect", P.asp); }
  /* every option is { p: plain text (used to check the answer), s: text with stress marks } */
  function opt(p, s) { return { p: p, s: s || p }; }

  /* 1. Формы: the engine builds the answer and plausible wrong answers */
  var CONF = { present: ["future"], aorist: ["imperfect", "perfect"], imperfect: ["aorist"], perfect: ["aorist", "pluperfect"], pluperfect: ["perfect", "aorist"],
    future: ["present", "fip"], fip: ["future", "cond"], fp: ["future", "perfect"], fpp: ["fip", "fp"], cond: ["fip", "perfect"], impv: ["present"] };
  function formOpt(tid, v, pf, i) { var r = G.build(tid, v, pf, i, "m", false, S.lang); return r.na ? null : opt(G.joinPieces(r), G.joinPieces(r, true)); }
  function genForms() {
    var tensesOk = P.tenses.filter(function (id) { return !(id === "imperfect" && P.asp === "p"); });
    if (!tensesOk.length) return null;
    for (var n = 0; n < 80; n++) {
      var v = pick(VERBS), tid = pick(tensesOk), i = rnd(6);
      var pf = P.asp === "both" ? Math.random() < 0.5 : P.asp === "p";
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
      return { mode: "forms", v: v.id, tid: tid, pf: pf, i: i, opts: shuffle([c].concat(wrong)), ok: c.p };
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
  function genAspect() {
    var pool = aspectItems().filter(function (it) { return tOn(it.t); });
    if (!pool.length) return null;
    var it = pick(pool), v = VERBS[it.v], w = v.ex[it.e][0].split(/([А-Яа-яЍѝ]+)/), orig = w[it.k];
    return { mode: "aspect", it: it, opts: shuffle([opt(orig, cap(it.origS || orig, orig)), opt(cap(it.other, orig), cap(it.otherS, orig))]), ok: orig };
  }

  /* 3. Время: hand-written sentences; t = the tense of the right answer, os = options with stress */
  var TQ = [
    { s: "Вчера за два часа ___ цялата книга.", o: ["прочетох", "четях", "съм прочел"], os: ["проче́тох", "четя́х", "съм проче́л"], t: "aorist", ru: "Вчера я за два часа прочитал(а) всю книгу.", why: { ru: "Действие закончилось в известный момент («вчера», «за два часа») → аорист.", bg: "Действието е завършено в определен момент („вчера“, „за два часа“) → аорист." } },
    { s: "Когато ти се обади, точно ___ книга.", o: ["четях", "прочетох", "ще чета"], os: ["четя́х", "проче́тох", "ще чета́"], t: "imperfect", ru: "Когда ты позвонил(а), я как раз читал(а) книгу.", why: { ru: "Фон, который прервало другое событие → имперфект.", bg: "Фон, прекъснат от друго събитие → имперфект." } },
    { s: "Досега ___ тази книга три пъти.", o: ["съм чел", "четях", "ще прочета"], os: ["съм чел", "четя́х", "ще прочета́"], t: "perfect", ru: "Я уже трижды читал эту книгу.", why: { ru: "Опыт до настоящего момента, время не важно («досега») → перфект.", bg: "Опит до момента, времето не е важно („досега“) → перфект." } },
    { s: "Когато бях малка, всяко лято ___ на море.", o: ["ходех", "отидох", "ще ходя"], os: ["хо́дех", "оти́дох", "ще хо́дя"], t: "imperfect", ru: "Когда я была маленькой, каждое лето я ездила на море.", why: { ru: "Привычка в прошлом («всяко лято») → имперфект.", bg: "Навик в миналото („всяко лято“) → имперфект." } },
    { s: "Утре ___ на работа по-рано.", o: ["ще отида", "отидох", "отивах"], os: ["ще оти́да", "оти́дох", "оти́вах"], t: "future", ru: "Завтра я пойду на работу пораньше.", why: { ru: "Будущее, одно действие → ще + СВ.", bg: "Бъдеще, едно действие → ще + СВ." } },
    { s: "Ако имах време, ___ с теб.", o: ["щях да дойда", "ще дойда", "дойдох"], os: ["щях да до́йда", "ще до́йда", "до́йдох"], t: "fip", ru: "Если бы у меня было время, я бы пошёл с тобой.", why: { ru: "Нереальное условие → щях да + настоящее (или «бих дошъл»).", bg: "Нереално условие → щях да + сегашно (или „бих дошъл“)." } },
    { s: "___ едно кафе, моля.", o: ["Бих искал", "Щях да искам", "Бях искал"], os: ["Бих и́скал", "Щях да и́скам", "Бях и́скал"], t: "cond", ru: "Я бы хотел кофе, пожалуйста.", why: { ru: "Вежливая просьба → бих + причастие.", bg: "Учтива молба → бих + причастие." } },
    { s: "Когато пристигнахме, филмът вече ___.", o: ["беше започнал", "започва", "ще започне"], os: ["бе́ше запо́чнал", "запо́чва", "ще запо́чне"], t: "pluperfect", ru: "Когда мы пришли, фильм уже начался.", why: { ru: "Случилось раньше другого прошлого события → плюсквамперфект.", bg: "Случило се е преди друго минало събитие → минало предварително време." } },
    { s: "Докато ___ вечеря, децата гледаха телевизия.", o: ["готвех", "сготвих", "ще сготвя"], os: ["го́твех", "сго́твих", "ще сго́твя"], t: "imperfect", ru: "Пока я готовил(а) ужин, дети смотрели телевизор.", why: { ru: "Два одновременных процесса («докато») → имперфект НСВ.", bg: "Два едновременни процеса („докато“) → имперфект, НСВ." } },
    { s: "Всяка вечер баба ми ___ приказки.", o: ["разказваше", "разказа", "ще разкаже"], os: ["разка́зваше", "разка́за", "ще разка́же"], t: "imperfect", ru: "Каждый вечер бабушка рассказывала мне сказки.", why: { ru: "Повторяющееся действие в прошлом («всяка вечер») → имперфект.", bg: "Повтарящо се действие в миналото („всяка вечер“) → имперфект." } },
    { s: "___ да ти се обадя, но забравих.", o: ["Щях", "Ще", "Бих"], os: ["Щях", "Ще", "Бих"], t: "fip", ru: "Я собирался тебе позвонить, но забыл.", why: { ru: "Собирался, но не сделал → щях да.", bg: "Намерение, което не се е случило → щях да." } },
    { s: "Всеки ден ___ по един час български.", o: ["уча", "науча", "ще науча"], os: ["уча́", "науча́", "ще науча́"], t: "present", ru: "Каждый день я учу болгарский по часу.", why: { ru: "Привычка («всеки ден») → настоящее НСВ.", bg: "Навик („всеки ден“) → сегашно време, НСВ." } },
    { s: "Не се притеснявай – до петък ___ проекта.", o: ["ще съм завършил", "завърших", "завършвах"], os: ["ще съм завъ́ршил", "завъ́рших", "завъ́ршвах"], t: "fp", ru: "Не волнуйся — к пятнице я уже закончу проект.", why: { ru: "Будет закончено к моменту в будущем → ще съм + причастие.", bg: "Ще е завършено до момент в бъдещето → ще съм + причастие." } },
    { s: "Извинете, ___ ли ми помогнали с куфара?", o: ["бихте", "ще", "щяхте"], os: ["би́хте", "ще", "щя́хте"], t: "cond", ru: "Извините, не могли бы вы помочь мне с чемоданом?", why: { ru: "Вежливая просьба → бихте ли + причастие.", bg: "Учтива молба → бихте ли + причастие." } },
    { s: "Вчера в пет часа ___ от работа и се прибрах.", o: ["тръгнах", "тръгвах", "съм тръгнал"], os: ["тръ́гнах", "тръ́гвах", "съм тръ́гнал"], t: "aorist", ru: "Вчера в пять я ушёл с работы и вернулся домой.", why: { ru: "Цепочка законченных событий в прошлом → аорист.", bg: "Поредица от завършени събития → аорист." } },
    { s: "Още не ___ писмото – ще го прочета довечера.", o: ["съм прочел", "четях", "ще чета"], os: ["съм проче́л", "четя́х", "ще чета́"], t: "perfect", ru: "Я ещё не прочитал письмо — прочитаю вечером.", why: { ru: "Результат на сейчас («още не») → перфект.", bg: "Резултат към момента („още не“) → перфект." } }
  ];
  function genTense() {
    var pool = TQ.map(function (_, i) { return i; }).filter(function (i) { return tOn(TQ[i].t); });
    if (!pool.length) return null;
    P.deck = P.deck.filter(function (i) { return pool.indexOf(i) >= 0; });
    if (!P.deck.length) P.deck = shuffle(pool);
    var idx = P.deck.pop(), item = TQ[idx];
    return { mode: "tense", idx: idx, opts: shuffle(item.o.map(function (o, j) { return opt(o, item.os[j]); })), ok: item.o[0] };
  }
  function genQ() { var q = P.mode === "aspect" ? genAspect() : P.mode === "tense" ? genTense() : genForms(); return q || { mode: P.mode, empty: true }; }

  /* tenses that have questions in the aspect / tense modes, in the order of the list */
  function modeTenses() {
    var have = {};
    (P.mode === "aspect" ? aspectItems() : TQ).forEach(function (x) { have[x.t] = 1; });
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
      : '<p class="muted small">' + t("noAspInMode") + " " + t("hasT") + " " + modeTenses().map(shortName).join(", ") + ".</p>";
    return '<div class="pr-filter">' + dd + asp + "</div>";
  }

  function renderPractice() {
    if (!P.q) P.q = genQ();
    var q = P.q, done = P.ans >= 0, title = "", body = "", why = "";
    var head = '<div class="seg" role="group">' + ["forms", "aspect", "tense"].map(function (m) {
        return '<button data-pmode="' + m + '" aria-pressed="' + (P.mode === m) + '">' + t({ forms: "mForms", aspect: "mAspect", tense: "mTense" }[m]) + "</button>";
      }).join("") + "</div>" + filterUI() +
      '<div class="pr-score"><span>✓ <b>' + P.right + " / " + P.total + "</b> " + t("right") + "</span><span>" + t("streak") + " <b>" + P.streak + "</b></span><span>" + t("best") + " <b>" + P.best + "</b></span></div>";
    if (q.empty) {
      $("pane-practice").innerHTML = '<div class="pr">' + head + '<div class="panel pr-card pr-empty"><p>' + t("noQ") + '</p><button class="btn" data-pallt>' + t("pickAll") + "</button></div></div>";
      markAllBox();
      return;
    }
    if (q.mode === "forms") {
      var v = VERBS[q.v], tn = TBY[q.tid];
      var who = q.i === 2 ? "той" : G.PERSONS[q.i];
      title = t("qForms");
      body = '<div class="pr-prompt"><span class="pair">' + pairHTML(v) + '</span><span class="muted">' + esc(v.ru) + '</span>' +
        '<div class="pr-tags"><span class="pr-tag bg">' + who + '</span><span class="pr-tag">' + shortName(tn) + '</span><span class="pr-tag ' + (q.pf ? "p" : "i") + '">' + (q.pf ? t("pfS") : t("impfS")) + "</span></div></div>";
      if (done) {
        var r = G.build(q.tid, v, q.pf, q.i, "m", false, S.lang), endP = r.pieces.filter(function (pc) { return pc.k === "end"; }).pop();
        why = '<p class="full">' + who + " " + cellText(q.tid, v, q.pf, q.i, "m", false) + sayBtn(G.joinPieces(r)) + "</p>" +
          (endP ? "<p>" + esc(endP.info) + "</p>" : "") +
          "<p><b>" + L(tn.name) + "</b> · " + (S.lang === "ru" ? "≈ " + G.RUEQ[tn.id] : L(tn.short)) + "</p>" +
          '<button class="link" data-popen="1">' + t("inBuilder") + " →</button>";
      }
    } else if (q.mode === "aspect") {
      var va = VERBS[q.it.v], ex = va.ex[q.it.e], w = ex[0].split(/([А-Яа-яЍѝ]+)/);
      title = t("qAspect");
      var okOpt = q.opts.filter(function (o) { return o.p === q.ok; })[0];
      var sent = w.map(function (x, k) {
        if (k !== q.it.k) return esc(x);
        return done ? '<span class="blank filled">' + esc(S.stress ? okOpt.s : okOpt.p) + "</span>" : '<span class="blank">?</span>';
      }).join("");
      body = '<div class="pr-prompt"><p class="pr-sent">' + sent + '</p><p class="pr-tr">' + esc(ex[1]) + "</p></div>";
      if (done) {
        var reason = q.it.reason === "A" ? t("whyA") : q.it.reason === "B" ? t("whyB") : (q.it.cls === "i" ? t("whyI") : t("whyP"));
        why = "<p>" + reason + "</p>" +
          (q.it.sigs.length ? '<p class="pr-tags"><span class="muted">' + t("sigs") + ":</span> " + q.it.sigs.map(function (s) { return '<span class="pr-tag bg ' + q.it.cls + '">' + s + "</span>"; }).join(" ") + "</p>" : "") +
          '<p class="muted">' + t("orig") + '</p><p class="full">' + highlight(ex[0], va) + sayBtn(ex[0]) + "</p>";
      }
    } else {
      var item = TQ[q.idx];
      title = t("qTense");
      var fill = done ? (S.stress ? item.os[0] : item.o[0]) : null;
      body = '<div class="pr-prompt"><p class="pr-sent">' + esc(item.s).replace("___", fill ? '<span class="blank filled">' + esc(fill) + "</span>" : '<span class="blank">?</span>') + '</p><p class="pr-tr">' + esc(item.ru) + "</p></div>";
      if (done) why = "<p>" + esc(L(item.why)) + "</p>";
    }
    var opts = '<div class="pr-opts' + (q.opts.length > 2 ? " four" : "") + '">' + q.opts.map(function (o, j) {
      var cls = "", mark = "";
      if (done) {
        if (o.p === q.ok) { cls = " ok"; mark = "✓"; }
        else if (j === P.ans) { cls = " bad"; mark = "✗"; }
        else cls = " dim";
      }
      return '<button class="opt' + cls + '" data-ans="' + j + '"' + (done ? ' aria-disabled="true"' : "") + '><span class="key">' + (j + 1) + "</span><span>" + esc(S.stress ? o.s : o.p) + '</span><span class="mark">' + mark + "</span></button>";
    }).join("") + "</div>";
    var good = done && q.opts[P.ans].p === q.ok;
    $("pane-practice").innerHTML = '<div class="pr">' + head +
      '<div class="panel pr-card"><h3 class="label">' + title + "</h3>" + body + opts +
      (done ? '<div class="pr-why"><span class="verdict ' + (good ? "ok" : "bad") + '">' + (good ? t("yes") : t("no")) + "</span>" + why + "</div>" +
        '<div class="pr-next"><button class="btn" data-pnext>' + t("next") + '</button><span class="pr-hint">' + t("keys") + "</span></div>" : "") +
      "</div></div>";
    markAllBox();
  }
  function markAllBox() {
    var box = document.querySelector("[data-ptall]");
    if (box) box.indeterminate = P.tenses.length > 0 && P.tenses.length < ALL_T.length;
  }
  function answer(j) {
    if (P.ans >= 0 || !P.q || P.q.empty || j >= P.q.opts.length) return;
    P.ans = j; P.total++;
    if (P.q.opts[j].p === P.q.ok) { P.right++; P.streak++; if (P.streak > P.best) { P.best = P.streak; store.set("best", P.best); } }
    else P.streak = 0;
    renderPractice();
  }
  function nextQ() { P.q = genQ(); P.ans = -1; renderPractice(); var c = document.querySelector(".pr-card"); if (c && c.getBoundingClientRect().top < 0) c.scrollIntoView({ block: "start" }); }
  function filterChanged() { saveFilter(); P.deck = []; P.q = genQ(); P.ans = -1; renderPractice(); }

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
    if (d.ans !== undefined) { answer(+d.ans); return; }
    if ("pnext" in d) { nextQ(); return; }
    if ("popen" in d && P.q && P.q.mode === "forms") {
      S.B.verb = P.q.v; S.B.tense = P.q.tid; S.B.pf = P.q.pf; S.B.person = P.q.i; S.B.neg = false; S.B.sel = -1; saveB();
      go(function () { S.tab = "form"; }); return;
    }
    // verbs
    if (d.verb) { go(function () { S.tab = "verbs"; S.verb = +d.verb; }); return; }
    if ("back" in d) { go(function () { S.verb = null; }); return; }
    if (d.vperson) { S.vperson = +d.vperson; renderVerbs(); return; }
    if ("vrare" in d) { S.vrare = !S.vrare; renderVerbs(); return; }
    if (d.cell) {
      var c = d.cell.split("|");
      S.B.verb = S.verb; S.B.tense = c[0]; S.B.pf = c[1] === "1"; S.B.person = +c[2]; S.B.neg = false; S.B.sel = -1; saveB();
      go(function () { S.tab = "form"; }); return;
    }
  });
  document.addEventListener("input", function (e) {
    if (e.target.id === "q") { S.query = e.target.value; renderVerbs(); }
    if (e.target.id === "bq") { S.B.q = e.target.value; renderForm(); }
  });
  document.addEventListener("change", function (e) {
    var el = e.target, d = el.dataset || {};
    if (el.classList.contains("trbox")) {
      S.tr = el.checked; store.set("tr", S.tr ? "1" : "0"); document.body.classList.toggle("no-tr", !S.tr);
      Array.prototype.forEach.call(document.querySelectorAll(".trbox"), function (b) { b.checked = S.tr; });
    }
    if ("ptall" in d) { P.tenses = el.checked ? ALL_T.slice() : []; filterChanged(); }
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
    if (S.tab !== "practice" || e.altKey || e.ctrlKey || e.metaKey || /input|textarea|select/i.test(e.target.tagName)) return;
    if (P.ans < 0 && /^[1-4]$/.test(e.key)) { answer(+e.key - 1); e.preventDefault(); }
    else if (P.ans >= 0 && (e.key === "Enter" || e.key === "ArrowRight")) { nextQ(); e.preventDefault(); }
  });
  window.addEventListener("hashchange", function () { readHash(); render(); });

  readHash();
  render();
  initTTS();
})();
