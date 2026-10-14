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
      negL: "Отрицание", qL: "Вопрос", group: "спр.", grid: "Все времена", formula: "Формула"
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
      negL: "Отрицание", qL: "Въпрос", group: "спр.", grid: "Всички времена", formula: "Образуване"
    }
  };
  function plural(n, one, few, many) {
    var a = n % 10, b = n % 100;
    return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many;
  }
  var CHIP = {
    ru: { present: "Настоящее", aorist: "Аорист", imperfect: "Имперфект", perfect: "Перфект", pluperfect: "Плюсквамперфект", future: "Будущее", fip: "Будущее в прош.", fp: "Буд. предварит.", fpp: "Буд. предв. в прош.", cond: "Условное", impv: "Повелительное" },
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
    open: {}, showRare: false, vperson: 0, vrare: false,
    B: { verb: DEFAULT_VERB, tense: "present", person: 0, pf: false, gender: "m", neg: false, sel: -1, picking: false, q: "", open: false },
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
  function impfTitle(v) { return v.impf.inf + (v.se ? " " + v.se : "") + (v.opt ? " (" + v.opt + ")" : "") + (v.tail ? " " + v.tail : ""); }
  function pfTitle(v) { return "да " + (v.se ? v.se + " " : "") + (v.opt ? "(" + v.opt + ") " : "") + v.pf.inf + (v.tail ? " " + v.tail : ""); }
  function pairHTML(v) { return '<span class="i-txt">' + impfTitle(v) + '</span><span class="dash"> – </span><span class="p-txt">' + pfTitle(v) + "</span>"; }
  var TR = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sht", ъ: "a", ь: "y", ю: "yu", я: "ya" };
  VERBS.forEach(function (v) {
    var bg = (v.impf.inf + " " + v.pf.inf + " " + v.pf.pres[1]).toLowerCase();
    v.hayBg = bg; v.hayLat = bg.replace(/[а-я]/g, function (c) { return TR[c] || c; }); v.hayRu = v.ru.toLowerCase();
    v.setI = G.wordSet(v.impf); v.setP = G.wordSet(v.pf);
  });
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
  function quote(bg, ru) { return '<div class="quote"><span class="bgt">' + bg + '</span><span class="tr">' + esc(ru) + "</span></div>"; }
  function trToggle() { return '<label class="trt"><input type="checkbox" class="trbox"' + (S.tr ? " checked" : "") + "> " + t("tr") + "</label>"; }
  function examplesPanel(v) {
    if (!v.ex || !v.ex.length) return "";
    return '<div class="panel ex b-ex"><div class="ex-head"><span class="label">' + t("examples") + "</span>" + trToggle() + "</div>" +
      v.ex.map(function (e) { return quote(highlight(e[0], v), e[1]); }).join("") + "</div>";
  }

  function cellText(tid, v, pf, i, gender, neg) {
    var r = G.build(tid, v, pf, i, gender || "m", !!neg, S.lang);
    if (r.na) return null;
    var html = "", prev = null;
    r.pieces.forEach(function (p) {
      var glue = prev && prev.k === "stem" && p.k === "end";
      html += (prev && !glue ? " " : "") + (p.k === "pt" || p.k === "se" ? '<span class="aux">' + p.t + "</span>" : p.k === "end" ? '<span class="endc">' + p.t + "</span>" : p.t);
      prev = p;
    });
    return html;
  }

  /* ---------- Chrome ---------- */
  function renderChrome() {
    document.documentElement.lang = S.lang;
    $("sub").textContent = t("sub");
    $("lang").innerHTML = ["ru", "bg"].map(function (l) { return '<button data-lang="' + l + '" aria-pressed="' + (S.lang === l) + '">' + l.toUpperCase() + "</button>"; }).join("");
    $("help").setAttribute("aria-expanded", String(S.legend));
    $("legend").hidden = !S.legend;
    $("legend").innerHTML = '<div class="row"><i class="dot i"></i><span><b class="i">' + t("impfS") + "</b> " + t("legI") + '</span></div><div class="row"><i class="dot p"></i><span><b class="p">' + t("pfS") + "</b> " + t("legP") + '</span></div><div class="row"><i class="dot h"></i><span>' + t("legH") + '</span></div><p class="muted">' + t("legTap") + "</p>";
    ["form", "tenses", "verbs"].forEach(function (k) {
      $("tab-btn-" + k).querySelector("span").textContent = t({ form: "tForm", tenses: "tTenses", verbs: "tVerbs" }[k]);
      $(k).hidden = S.tab !== k;
      $("tab-btn-" + k).setAttribute("aria-selected", String(S.tab === k));
    });
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

    // change detection: tense/verb change → fade the table; не / м-ж → flash changed cells
    var key = B.verb + "|" + B.tense, now = {}, changed = {}, fade = false;
    for (var i = 0; i < 6; i++) for (var a = 0; a < 2; a++) now[i + "|" + a] = plainCell(B.tense, v, !!a, i);
    if (S.anim && S.prev) {
      if (S.prev.key !== key || S.anim === "fade") fade = true;
      else if (S.anim === "chg") Object.keys(now).forEach(function (k) { if (now[k] !== S.prev.cells[k]) changed[k] = 1; });
    }
    S.prev = { key: key, cells: now };
    var selAnim = S.anim === "sel";
    S.anim = null;

    // verb picker
    var verb = '<div class="vwrap">' +
      '<button class="vpick" data-pick aria-expanded="' + B.picking + '"><span class="txt"><span class="pair">' + pairHTML(v) + '</span><span class="vmean">' + esc(v.ru) + '</span></span><span class="chev">▾</span></button>' +
      (B.picking ? '<div class="picker"><input id="bq" class="search" type="search" autocomplete="off" spellcheck="false" placeholder="' + esc(t("search")) + '" value="' + esc(B.q) + '"><div class="plist">' +
        search(B.q).slice(0, 15).map(function (x) { return '<button class="prow" data-bverb="' + x.id + '"><span class="pair">' + pairHTML(x) + '</span><span class="vmean">' + esc(x.ru) + "</span></button>"; }).join("") + "</div></div>" : "") +
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

    // detail of the selected cell
    var r = G.build(B.tense, v, B.pf, B.person, B.gender, B.neg, S.lang);
    var pron = (B.person === 2 && partT ? (B.gender === "f" ? "тя" : "той") : G.PERSONS[B.person]) + " · " + (B.pf ? t("pfS") : t("impfS"));
    var detail;
    if (r.na) {
      detail = '<div class="b-detail"><span class="b-pron">' + pron + '</span><p class="b-na">' + esc(r.na) + "</p></div>";
    } else {
      var sp = B.sel >= 0 && B.sel < r.pieces.length ? B.sel : -1;
      if (sp < 0) { r.pieces.forEach(function (pc, k) { if (pc.k === "end") sp = k; }); if (sp < 0) sp = r.pieces.length - 1; }
      var word = "", open = false;
      r.pieces.forEach(function (pc, k) {
        var next = r.pieces[k + 1];
        if (pc.k === "stem" && next && next.k === "end") { word += '<span class="w">'; open = true; }
        word += '<button class="pc k-' + pc.k + (B.pf ? " pf" : " impf") + '" data-piece="' + k + '" aria-pressed="' + (k === sp) + '">' + pc.t + "</button>";
        if (open && pc.k === "end") { word += "</span>"; open = false; }
      });
      detail = '<div class="b-detail"><span class="b-pron">' + pron + '</span><div class="b-word' + (selAnim || fade ? " fade" : "") + '">' + word + '</div><p class="b-info">' + esc(r.pieces[sp].info) + "</p></div>";
    }

    // the table: all persons × НСВ | СВ
    var tools = '<div class="t-tools"><span class="t-name">' + G.icon(tn.id) + "<b>" + shortName(tn) + "</b></span>" +
      (partT ? '<div class="seg"><button data-bgen="m" aria-pressed="' + (B.gender === "m") + '">' + t("m") + '</button><button data-bgen="f" aria-pressed="' + (B.gender === "f") + '">' + t("f") + "</button></div>" : "") +
      '<button class="negbtn" data-bneg aria-pressed="' + B.neg + '">' + t("neg") + "</button></div>";
    var rows = G.PERSONS.map(function (p, i) {
      var who = i === 2 ? (partT && B.gender === "f" ? "тя" : "той") : p;
      var tds = [0, 1].map(function (a) {
        var c = cellText(B.tense, v, !!a, i, B.gender, B.neg), sel = B.open && i === B.person && !!a === B.pf;
        return '<td><button class="fcell ' + (a ? "p" : "i") + (changed[i + "|" + a] ? " chg" : "") + (c ? "" : " empty") + '" data-fcell="' + i + "|" + a + '" aria-pressed="' + sel + '">' + (c || "—") + "</button></td>";
      }).join("");
      if (!now[i + "|0"] && !now[i + "|1"] && !(B.open && i === B.person)) return "";
      return '<tr><th class="who">' + who + "</th>" + tds + "</tr>" + (B.open && i === B.person ? '<tr class="drow"><td colspan="3">' + detail + "</td></tr>" : "");
    }).join("");
    var table = '<div class="panel tpanel">' + tools +
      '<table class="ftable' + (fade ? " fade" : "") + '"><colgroup><col class="cw"><col><col></colgroup><thead><tr><th></th>' +
      '<th class="i">' + t("impfS") + ' <span class="bg">' + v.impf.inf + '</span></th><th class="p">' + t("pfS") + ' <span class="bg">' + v.pf.inf + "</span></th></tr></thead><tbody>" + rows + "</tbody></table>" +
      '<div class="b-meta"><span><b>' + L(tn.name) + "</b> · " + (S.lang === "ru" ? "≈ " + G.RUEQ[tn.id] : L(tn.short)) + '</span><button class="link" data-totense="' + tn.id + '">' + t("aboutTense") + "</button></div></div>";

    $("form").innerHTML = '<div class="builder"><div class="b-col left">' + verb + ctl + examplesPanel(v) + '</div><div class="b-col right">' + table + "</div></div>";
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
      '<header class="tc-h">' + G.icon(tn.id) + '<span class="tn">' + L(tn.name) + "</span>" +
      '<span class="tc-sub">' + (S.lang === "ru" ? '<span class="bg">' + tn.name.bg + "</span> · ≈ " + G.RUEQ[tn.id] : L(tn.short)) + "</span></header>" +
      '<p class="formula">' + t("formula") + ": <b>" + L(tn.formula) + "</b></p>" + strip(tn) + quote(e[0], e[1]) +
      '<div class="tc-links"><button class="link" data-tobuilder="' + tn.id + '">' + t("openBuilder") + '</button><button class="link" data-toggle="' + tn.id + '" aria-expanded="' + open + '">' + (open ? t("less") + " ▴" : t("more") + " ▾") + "</button></div>";
    if (open) {
      h += '<div class="tc-more">' +
        '<div><p class="label">' + t("when") + '</p><ul class="clean">' + L(tn.uses).map(function (u) { return "<li>" + u + "</li>"; }).join("") + "</ul></div>" +
        '<div class="asp"><div class="aspc i"><b>' + t("impfS") + "</b><span>" + L(tn.aspect.i) + '</span></div><div class="aspc p"><b>' + t("pfS") + "</b><span>" + L(tn.aspect.p) + "</span></div></div>" +
        '<div><p class="label">' + t("signals") + '</p><div class="signals">' + tn.signals.map(function (s) { return '<span class="sig">' + s + "</span>"; }).join("") + "</div></div>" +
        '<div><p class="label">' + t("tips") + '</p><ul class="tips">' + L(tn.tips).map(function (s) { return "<li>" + s + "</li>"; }).join("") + "</ul></div>" +
        (S.lang === "ru" && tn.ruCompare ? '<div class="compare"><span class="label">' + t("compare") + "</span><p>" + tn.ruCompare + "</p></div>" : "") +
        '<div class="ex">' + tn.examples.slice(1).map(function (x) { return quote(x[0], x[1]); }).join("") +
        '<span class="label">' + t("negL") + "</span>" + quote(tn.neg[0], tn.neg[1]) +
        (tn.q ? '<span class="label">' + t("qL") + "</span>" + quote(tn.q[0], tn.q[1]) : "") + "</div></div>";
    }
    return h + "</article>";
  }
  function renderTenses() {
    var ru = S.lang === "ru";
    var choose = '<div class="panel"><span class="label">' + t("choose") + '</span><div class="choose">' + CHOOSE.map(function (c) {
      var tn = TBY[c[0]];
      return '<button class="crow" data-jump="' + tn.id + '"><span class="say">' + L(c[1]) + '</span><span class="ctn">' + G.icon(tn.id) + shortName(tn) + "</span></button>";
    }).join("") + "</div></div>";
    var aspect = '<div class="panel"><span class="label">' + t("aspectT") + '</span><div class="asp">' +
      '<div class="aspc i"><b>' + t("impfS") + "</b><span>" + (ru ? "процесс, привычка, длительность, запрет" : "процес, навик, продължителност, забрана") + '</span><span class="sigs">винаги · обикновено · често · всеки ден · докато</span></div>' +
      '<div class="aspc p"><b>' + t("pfS") + "</b><span>" + (ru ? "одно действие с результатом" : "едно действие с резултат") + '</span><span class="sigs">веднъж · този път · изведнъж · до утре · за час</span></div></div>' +
      '<p class="muted" style="font-size:var(--t-s)">' + (ru ? "Отличие от русского: СВ без «ще» / «да» не значит будущее. «Возьму» = «ще взема»." : "Свършеният вид в сегашно време стои само след „да“, „ще“, „ако“, „когато“.") + "</p></div>";
    var stems = '<details class="panel stems"><summary><span class="label">' + t("stemsT") + "</span></summary>" +
      '<table class="plain"><tbody>' +
      "<tr><td>Аорист</td><td>" + (ru ? "III: -м → -х (питам → питах). I и II — гласная перед -х разная:" : "III: -м → -х (питам → питах). При I и II гласната пред -х е различна:") + ' <span class="bg">-ох: чета → четох · -ах / -ях: кажа → казах, видя → видях · -их: правя → правих · -х: взема → взех</span></td></tr>' +
      "<tr><td>Имперфект</td><td>" + (ru ? "I и II: под ударением -ях, без ударения -ех; после ж, ч, ш — -ах. III: -м → -х." : "I и II: под ударение -ях, без ударение -ех; след ж, ч, ш – -ах. III: -м → -х.") + ' <span class="bg">четях · правех · питах</span></td></tr>' +
      "<tr><td>" + (ru ? "Причастие" : "Причастие") + "</td><td>" + (ru ? "аорист без -х + -л; -ох → -ъл. Мн. ч.: я → е." : "аорист без -х + -л; -ох → -ъл. Мн.ч.: я → е.") + ' <span class="bg">правих → правил · донесох → донесъл · видял → видели</span></td></tr>' +
      "<tr><td>" + (ru ? "Спряжение" : "Спрежение") + "</td><td>" + (ru ? "по форме «ти»:" : "по формата за „ти“:") + ' <span class="bg">-еш → I · -иш → II · -аш / -яш → III</span></td></tr>' +
      "</tbody></table></details>";
    $("tenses").innerHTML = '<div class="ttop">' + choose + aspect + "</div>" +
      '<div class="tcards">' + CORE.map(tenseCard).join("") + "</div>" +
      '<details class="rare-wrap"' + (S.showRare ? " open" : "") + "><summary>" + t("rareT") + " (" + RARE.length + ')</summary><div class="tcards">' + RARE.map(tenseCard).join("") + "</div></details>" +
      stems;
  }

  /* ---------- Глаголы ---------- */
  function renderVerbs() {
    var el = $("verbs");
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
      '<div class="panel"><div class="vgrid-head"><span class="label">' + t("grid") + "</span>" + persons + "</div>" +
      '<div class="gwrap"><table class="vgrid"><colgroup><col class="c0"><col><col></colgroup><thead><tr><th class="stick"></th><th class="i">' + t("impfS") + " · " + v.impf.inf + '</th><th class="p">' + t("pfS") + " · " + v.pf.inf + "</th></tr></thead><tbody>" + rows + "</tbody></table></div>" +
      '<button class="link" data-vrare>' + (S.vrare ? t("less") + " ▴" : t("rareT") + " (" + RARE.length + ") ▾") + "</button></div>" +
      examplesPanel(v);
  }

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
  }
  function render() {
    renderChrome();
    if (S.tab === "form") renderForm();
    if (S.tab === "tenses") renderTenses();
    if (S.tab === "verbs") renderVerbs();
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
    if (el.id === "help") { S.legend = !S.legend; renderChrome(); return; }
    if (d.lang) { S.lang = d.lang; store.set("lang", S.lang); render(); return; }
    if (d.tab) { go(function () { if (d.tab === "verbs" && S.tab === "verbs") S.verb = null; S.tab = d.tab; }); return; }
    // builder
    if ("pick" in d) { S.B.picking = !S.B.picking; renderForm(); return; }
    if (d.bverb) { setB(function (B) { B.verb = +d.bverb; B.picking = false; B.q = ""; }, "fade"); return; }
    if (d.bgroup) { setB(function (B) { var g = GROUPS.filter(function (x) { return x.id === d.bgroup; })[0]; if (g.t.indexOf(B.tense) < 0) B.tense = g.t[0]; }, "fade"); return; }
    if (d.btense) { setB(function (B) { B.tense = d.btense; }, "fade"); return; }
    if (d.bperson) { setB(function (B) { B.person = +d.bperson; }); return; }
    if (d.bpf) { setB(function (B) { B.pf = d.bpf === "1"; }, "fade"); return; }
    if (d.bgen) { setB(function (B) { B.gender = d.bgen; }); return; }
    if ("bneg" in d) { setB(function (B) { B.neg = !B.neg; }); return; }
    if (d.fcell) {
      var fc = d.fcell.split("|"), same = S.B.open && S.B.person === +fc[0] && S.B.pf === (fc[1] === "1");
      S.B.person = +fc[0]; S.B.pf = fc[1] === "1"; S.B.open = !same; S.B.sel = -1; S.anim = "sel"; saveB(); renderForm(); return;
    }
    if (d.piece) { S.B.sel = +d.piece; renderForm(); return; }
    if (d.totense) { go(function () { S.tab = "tenses"; S.open[d.totense] = true; S.jump = d.totense; if (!TBY[d.totense].core) S.showRare = true; }); return; }
    // tenses
    if (d.tobuilder) { S.B.tense = d.tobuilder; S.B.sel = -1; saveB(); go(function () { S.tab = "form"; }); return; }
    if (d.toggle) { S.open[d.toggle] = !S.open[d.toggle]; renderTenses(); return; }
    if (d.jump) { S.open[d.jump] = true; if (!TBY[d.jump].core) S.showRare = true; renderTenses(); var j = $("t-" + d.jump); if (j) j.scrollIntoView({ block: "start", behavior: "smooth" }); return; }
    // verbs
    if (d.verb) { go(function () { S.tab = "verbs"; S.verb = +d.verb; }); return; }
    if ("back" in d) { go(function () { S.verb = null; }); return; }
    if (d.vperson) { S.vperson = +d.vperson; renderVerbs(); return; }
    if ("vrare" in d) { S.vrare = !S.vrare; renderVerbs(); return; }
    if (d.cell) {
      var c = d.cell.split("|");
      S.B.verb = S.verb; S.B.tense = c[0]; S.B.pf = c[1] === "1"; S.B.person = +c[2]; S.B.neg = false; S.B.open = true; S.B.sel = -1; saveB();
      go(function () { S.tab = "form"; }); return;
    }
  });
  document.addEventListener("input", function (e) {
    if (e.target.id === "q") { S.query = e.target.value; renderVerbs(); }
    if (e.target.id === "bq") { S.B.q = e.target.value; renderForm(); }
  });
  document.addEventListener("change", function (e) {
    if (e.target.classList.contains("trbox")) {
      S.tr = e.target.checked; store.set("tr", S.tr ? "1" : "0"); document.body.classList.toggle("no-tr", !S.tr);
      Array.prototype.forEach.call(document.querySelectorAll(".trbox"), function (b) { b.checked = S.tr; });
    }
  });
  document.addEventListener("toggle", function (e) { if (e.target.classList && e.target.classList.contains("rare-wrap")) S.showRare = e.target.open; }, true);
  window.addEventListener("hashchange", function () { readHash(); render(); });

  readHash();
  render();
})();
