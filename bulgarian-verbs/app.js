(function () {
  "use strict";
  var G = window.BG, VERBS = G.VERBS, TENSES = G.TENSES;
  var TBY = {}; TENSES.forEach(function (t) { TBY[t.id] = t; });
  var CORE = TENSES.filter(function (t) { return t.core; }), RARE = TENSES.filter(function (t) { return !t.core; });

  /* ---------- UI strings ---------- */
  var U = {
    ru: {
      sub: "Шпаргалка по болгарским глаголам",
      tForm: "Форма", tTenses: "Времена", tVerbs: "Глаголы",
      impfS: "НСВ", pfS: "СВ", legI: "процесс, повторение", legP: "одно завершённое действие",
      m: "м", f: "ж", neg: "не", rare: "редкие",
      tapHint: "Нажмите на часть слова, чтобы узнать, откуда она.",
      allPersons: "Все лица", aboutTense: "О времени →", change: "сменить",
      search: "Поиск: вземам, vzemam или «брать»",
      count: function (n) { return n + " " + plural(n, "глагол", "глагола", "глаголов"); },
      none: "Ничего не нашлось. Попробуйте форму «аз» (вземам) или русский перевод.",
      model: "модельный", back: "← Все глаголы", examples: "Примеры", tr: "Перевод",
      openBuilder: "В конструктор", more: "Подробнее", less: "Свернуть",
      choose: "Какое время выбрать?", say: "Хотите сказать…", use: "Берите",
      aspectT: "НСВ или СВ?", rareT: "Редкие времена", stemsT: "Как получить основу",
      when: "Когда", signals: "Слова-сигналы", tips: "Ловушки", compare: "По-русски",
      negL: "Отрицание", qL: "Вопрос", forms: "Формы", group: "спр.", grid: "Все времена"
    },
    bg: {
      sub: "Пищов за българските глаголи",
      tForm: "Форма", tTenses: "Времена", tVerbs: "Глаголи",
      impfS: "НСВ", pfS: "СВ", legI: "процес, повторение", legP: "едно завършено действие",
      m: "м", f: "ж", neg: "не", rare: "редки",
      tapHint: "Докоснете част от думата, за да видите откъде идва.",
      allPersons: "Всички лица", aboutTense: "За времето →", change: "смени",
      search: "Търсене: вземам, vzemam или „брать“",
      count: function (n) { return n + " " + (n === 1 ? "глагол" : "глагола"); },
      none: "Няма резултати. Опитайте с формата за „аз“ (вземам) или с превода.",
      model: "модел", back: "← Всички глаголи", examples: "Примери", tr: "Превод",
      openBuilder: "В конструктора", more: "Още", less: "Скрий",
      choose: "Кое време да избера?", say: "Искате да кажете…", use: "Време",
      aspectT: "НСВ или СВ?", rareT: "Редки времена", stemsT: "Как се получава основата",
      when: "Кога", signals: "Сигнални думи", tips: "Капани", compare: "На руски",
      negL: "Отрицание", qL: "Въпрос", forms: "Форми", group: "спр.", grid: "Всички времена"
    }
  };
  function plural(n, one, few, many) {
    var a = n % 10, b = n % 100;
    return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many;
  }

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
    tab: "form", verb: null, query: "", tr: store.get("tr") !== "0",
    open: {}, showRare: false, vperson: 0, vrare: false,
    B: { verb: DEFAULT_VERB, tense: "present", person: 0, pf: false, gender: "m", neg: false, sel: -1, picking: false, q: "", rare: false }
  };
  if (savedB && VERBS[savedB.verb] && TBY[savedB.tense]) {
    ["verb", "tense", "person", "pf", "gender", "neg"].forEach(function (k) { S.B[k] = savedB[k]; });
  }
  function saveB() { store.set("builder", JSON.stringify(S.B)); }
  function t(k) { return U[S.lang][k]; }
  function L(o) { return o ? (o[S.lang] || o.ru) : ""; }
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var CHIP = {
    ru: { present: "Настоящее", aorist: "Аорист", imperfect: "Имперфект", perfect: "Перфект", pluperfect: "Плюсквамперфект", future: "Будущее", fip: "Будущее в прош.", fp: "Буд. предварит.", fpp: "Буд. предв. в прош.", cond: "Условное", impv: "Повелительное" },
    bg: { present: "Сегашно", aorist: "Аорист", imperfect: "Имперфект", perfect: "Перфект", pluperfect: "Мин. предварително", future: "Бъдеще", fip: "Бъдеще в миналото", fp: "Бъд. предварително", fpp: "Бъд. предв. в миналото", cond: "Условно", impv: "Повелително" }
  };
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
  function ex(bg, ru) { return '<div class="ex-item"><span class="bgt">' + bg + '</span><span class="tr">' + esc(ru) + "</span></div>"; }
  function trToggle() { return '<label class="tr-toggle"><input type="checkbox" class="trbox"' + (S.tr ? " checked" : "") + "> " + t("tr") + "</label>"; }

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
    $("leg").innerHTML = '<span><i class="dot i"></i><b>' + t("impfS") + "</b> " + t("legI") + '</span><span><i class="dot p"></i><b>' + t("pfS") + "</b> " + t("legP") + "</span>";
    $("lang").innerHTML = ["ru", "bg"].map(function (l) { return '<button data-lang="' + l + '" aria-pressed="' + (S.lang === l) + '">' + l.toUpperCase() + "</button>"; }).join("");
    ["form", "tenses", "verbs"].forEach(function (k) {
      $("tab-btn-" + k).textContent = t({ form: "tForm", tenses: "tTenses", verbs: "tVerbs" }[k]);
      $(k).hidden = S.tab !== k;
      $("tab-btn-" + k).setAttribute("aria-selected", String(S.tab === k));
    });
    document.body.classList.toggle("no-tr", !S.tr);
  }

  /* ---------- Форма (builder) ---------- */
  function renderForm() {
    var B = S.B, v = VERBS[B.verb], tn = TBY[B.tense];
    if (!tn.core) B.rare = true;
    if (B.tense === "impv" && B.person !== 1 && B.person !== 4) B.person = 1;
    var r = G.build(B.tense, v, B.pf, B.person, B.gender, B.neg, S.lang);
    var html = '<div class="card builder">';

    // verb
    html += '<div class="b-verb"><button class="vpick" data-pick><span class="pair">' + pairHTML(v) + '</span><span class="chev">▾</span></button><span class="vmean">' + esc(v.ru) + "</span></div>";
    if (B.picking) {
      html += '<div class="picker"><input id="bq" type="search" autocomplete="off" spellcheck="false" placeholder="' + esc(t("search")) + '" value="' + esc(B.q) + '"><div class="plist">' +
        search(B.q).slice(0, 12).map(function (x) { return '<button class="prow" data-bverb="' + x.id + '"><span class="pair">' + pairHTML(x) + '</span><span class="vmean">' + esc(x.ru) + "</span></button>"; }).join("") + "</div></div>";
    }

    // tense chips
    var list = CORE.concat(B.rare ? RARE : []);
    html += '<div class="b-tenses">' + list.map(function (x) {
      return '<button class="tchip' + (x.core ? "" : " rare") + '" data-btense="' + x.id + '" aria-pressed="' + (x.id === B.tense) + '">' + G.icon(x.id) + "<span>" + shortName(x) + "</span></button>";
    }).join("") + '<button class="tchip more" data-brare>' + (B.rare ? "−" : "+" + RARE.length + " " + t("rare")) + "</button></div>";

    // person + toggles
    var persons = G.PERSONS.map(function (p, i) {
      var dis = B.tense === "impv" && i !== 1 && i !== 4;
      return '<button class="pchip" data-bperson="' + i + '" aria-pressed="' + (i === B.person) + '"' + (dis ? " disabled" : "") + ">" + p + "</button>";
    }).join("");
    var needG = G.PART_TENSES[B.tense] && B.person < 3;
    html += '<div class="b-ctl"><div class="pchips">' + persons + "</div>" +
      '<div class="toggles"><div class="seg2 asp"><button data-bpf="0" aria-pressed="' + !B.pf + '" class="i">' + t("impfS") + '</button><button data-bpf="1" aria-pressed="' + B.pf + '" class="p">' + t("pfS") + "</button></div>" +
      (needG ? '<div class="seg2"><button data-bg="m" aria-pressed="' + (B.gender === "m") + '">' + t("m") + '</button><button data-bg="f" aria-pressed="' + (B.gender === "f") + '">' + t("f") + "</button></div>" : "") +
      '<button class="negbtn" data-bneg aria-pressed="' + B.neg + '">' + t("neg") + "</button></div></div>";

    // output
    var pron = B.person === 2 ? (needG && B.gender === "f" ? "тя" : "той") : G.PERSONS[B.person];
    if (r.na) {
      html += '<div class="b-out na"><span class="b-pron">' + pron + '</span><p class="b-na">' + esc(r.na) + "</p></div>";
    } else {
      var sel = B.sel >= 0 && B.sel < r.pieces.length ? B.sel : -1;
      if (sel < 0) { r.pieces.forEach(function (p, i) { if (p.k === "end") sel = i; }); if (sel < 0) sel = r.pieces.length - 1; }
      var word = "", prev = null;
      r.pieces.forEach(function (p, i) {
        var glue = prev && prev.k === "stem" && p.k === "end";
        word += (prev && !glue ? '<span class="sp"> </span>' : "") + '<button class="pc k-' + p.k + (B.pf ? " pf" : " impf") + '" data-piece="' + i + '" aria-pressed="' + (i === sel) + '">' + p.t + "</button>";
        prev = p;
      });
      html += '<div class="b-out"><span class="b-pron">' + pron + '</span><div class="b-word">' + word + '</div><p class="b-info">' + esc(r.pieces[sel].info) + "</p></div>";
    }

    // meta + all persons
    html += '<div class="b-meta">' + G.icon(tn.id) + "<span><b>" + L(tn.name) + "</b> · " + (S.lang === "ru" ? "≈ " + G.RUEQ[tn.id] : L(tn.short)) + '</span><button class="link" data-totense="' + tn.id + '">' + t("aboutTense") + "</button></div>";
    var rows = G.PERSONS.map(function (p, i) {
      var c = cellText(B.tense, v, B.pf, i, B.gender, B.neg);
      if (!c) return "";
      return '<button class="arow" data-bperson="' + i + '" aria-pressed="' + (i === B.person) + '"><span class="who">' + p + '</span><span class="fm">' + c + "</span></button>";
    }).join("");
    html += '<div class="b-all"><span class="ctl-label">' + t("allPersons") + "</span>" + rows + "</div>";
    html += "</div>";
    if (v.ex && v.ex[0]) html += '<div class="card ex"><div class="card-h"><h3>' + t("examples") + "</h3>" + trToggle() + "</div>" + v.ex.map(function (e) { return ex(highlight(e[0], v), e[1]); }).join("") + "</div>";
    $("form").innerHTML = html;
    if (B.picking) { var q = $("bq"); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
  }

  /* ---------- Времена (cards) ---------- */
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
    var head = '<tr><th></th>' + G.PERSONS.map(function (p) { return "<th>" + p + "</th>"; }).join("") + "</tr>";
    var rows = s.rows.map(function (r) {
      return "<tr><td class=\"g\">" + (r[0] ? r[0] : "") + "</td>" + r[1].map(function (c) { return "<td>" + (c || '<span class="na">·</span>') + "</td>"; }).join("") + "</tr>";
    }).join("");
    return '<div class="table-wrap"><table class="strip">' + head + rows + "</table></div>" + (s.after ? '<p class="after">' + L(s.after) + "</p>" : "");
  }

  function tenseCard(tn) {
    var open = !!S.open[tn.id], e = tn.examples[0];
    var h = '<article class="tcard" id="t-' + tn.id + '">' +
      '<header class="tc-h">' + G.icon(tn.id) + '<div class="tc-names"><span class="tn">' + L(tn.name) + "</span>" +
      '<span class="tc-sub">' + (S.lang === "ru" ? tn.name.bg + " · ≈ " + G.RUEQ[tn.id] : L(tn.short)) + "</span></div></header>" +
      '<span class="formula">' + L(tn.formula) + "</span>" + strip(tn) + ex(e[0], e[1]) +
      '<div class="row-btns"><button class="btn sm" data-tobuilder="' + tn.id + '">' + t("openBuilder") + ' →</button><button class="btn ghost sm" data-toggle="' + tn.id + '">' + (open ? t("less") : t("more")) + "</button></div>";
    if (open) {
      h += '<div class="tc-more">' +
        '<div><h3>' + t("when") + '</h3><ul class="clean">' + L(tn.uses).map(function (u) { return "<li>" + u + "</li>"; }).join("") + "</ul></div>" +
        '<div class="aspect-notes"><div class="an i"><span class="tag">' + t("impfS") + "</span><span>" + L(tn.aspect.i) + '</span></div><div class="an p"><span class="tag">' + t("pfS") + "</span><span>" + L(tn.aspect.p) + "</span></div></div>" +
        '<div><h3>' + t("signals") + '</h3><div class="signals">' + tn.signals.map(function (s) { return '<span class="sig">' + s + "</span>"; }).join("") + "</div></div>" +
        '<div><h3>' + t("tips") + '</h3><ul class="tips">' + L(tn.tips).map(function (s) { return "<li>" + s + "</li>"; }).join("") + "</ul></div>" +
        (S.lang === "ru" && tn.ruCompare ? '<div class="compare"><h3>' + t("compare") + "</h3><p>" + tn.ruCompare + "</p></div>" : "") +
        '<div class="ex">' + tn.examples.slice(1).map(function (x) { return ex(x[0], x[1]); }).join("") +
        '<span class="ex-label">' + t("negL") + "</span>" + ex(tn.neg[0], tn.neg[1]) +
        (tn.q ? '<span class="ex-label">' + t("qL") + "</span>" + ex(tn.q[0], tn.q[1]) : "") + "</div></div>";
    }
    return h + "</article>";
  }

  function renderTenses() {
    var ru = S.lang === "ru";
    var choose = '<div class="card"><h3>' + t("choose") + '</h3><div class="choose">' + CHOOSE.map(function (c) {
      var tn = TBY[c[0]];
      return '<button class="crow" data-jump="' + tn.id + '"><span class="say">' + L(c[1]) + '</span><span class="arrow">→</span><span class="ctn">' + G.icon(tn.id) + shortName(tn) + "</span></button>";
    }).join("") + "</div></div>";

    var aspect = '<div class="card"><h3>' + t("aspectT") + '</h3><div class="asp2">' +
      '<div class="an i col"><span class="tag">' + t("impfS") + "</span><span>" + (ru ? "процесс, привычка, длительность, запрет" : "процес, навик, продължителност, забрана") + '</span><span class="sigs">винаги · обикновено · често · всеки ден · докато</span></div>' +
      '<div class="an p col"><span class="tag">' + t("pfS") + "</span><span>" + (ru ? "одно действие с результатом" : "едно действие с резултат") + '</span><span class="sigs">веднъж · този път · изведнъж · до утре · за час</span></div></div>' +
      (ru ? '<p class="src">Отличие от русского: СВ без «ще» / «да» не значит будущее. «Возьму» = «ще взема».</p>' : '<p class="src">Свършеният вид в сегашно време стои само след „да“, „ще“, „ако“, „когато“.</p>') + "</div>";

    var stems = '<details class="card stems"><summary><h3>' + t("stemsT") + "</h3></summary>" +
      '<div class="table-wrap"><table class="plain"><tbody>' +
        "<tr><td>" + (ru ? "Аорист" : "Аорист") + "</td><td>" + (ru ? "III: -м → -х (питам → питах). I и II — гласная перед -х разная:" : "III: -м → -х (питам → питах). При I и II гласната пред -х е различна:") + "<br>-ох: чета → четох, дойда → дойдох · -ах / -ях: кажа → казах, видя → видях · -их: правя → правих · -х: взема → взех, чуя → чух</td></tr>" +
        "<tr><td>" + (ru ? "Имперфект" : "Имперфект") + "</td><td>" + (ru ? "I и II: под ударением -ях, без ударения -ех (четях, правех); после ж, ч, ш — -ах. III: -м → -х (питах)." : "I и II: под ударение -ях, без ударение -ех (четях, правех); след ж, ч, ш – -ах. III: -м → -х (питах).") + "</td></tr>" +
        "<tr><td>" + (ru ? "Причастие" : "Причастие") + "</td><td>" + (ru ? "аорист без -х + -л: правих → правил, взех → взел; -ох → -ъл: донесох → донесъл. Мн. ч.: я → е (видял → видели)." : "аорист без -х + -л: правих → правил, взех → взел; -ох → -ъл: донесох → донесъл. Мн.ч.: я → е (видял → видели).") + "</td></tr>" +
        "<tr><td>" + (ru ? "Спряжение" : "Спрежение") + "</td><td>" + (ru ? "по форме «ти»: -еш → I, -иш → II, -аш / -яш → III" : "по формата за „ти“: -еш → I, -иш → II, -аш / -яш → III") + "</td></tr>" +
      "</tbody></table></div></details>";

    $("tenses").innerHTML = '<div class="tgrid-top">' + choose + aspect + "</div>" +
      '<div class="tcards">' + CORE.map(tenseCard).join("") + "</div>" +
      '<details class="rare-wrap"' + (S.showRare ? " open" : "") + '><summary class="btn ghost sm">' + t("rareT") + " (" + RARE.length + ')</summary><div class="tcards">' + RARE.map(tenseCard).join("") + "</div></details>" +
      stems;
  }

  /* ---------- Глаголы ---------- */
  function renderVerbs() {
    var el = $("verbs");
    if (S.verb !== null) { el.innerHTML = verbPage(VERBS[S.verb]); return; }
    var list = search(S.query), keep = document.activeElement && document.activeElement.id === "q";
    el.innerHTML = '<div class="search-row"><input id="q" type="search" autocomplete="off" spellcheck="false" placeholder="' + esc(t("search")) + '" value="' + esc(S.query) + '"><span class="count">' + t("count")(list.length) + "</span></div>" +
      (list.length ? '<div class="vlist">' + list.map(function (v) {
        return '<button class="vrow" data-verb="' + v.id + '"><span class="pair">' + pairHTML(v) + '</span><span class="vmean">' + esc(v.ru) + '</span><span class="grp">' + v.impf.group + " · " + v.pf.group + (v.extra ? ' <em class="badge">' + t("model") + "</em>" : "") + "</span></button>";
      }).join("") + "</div>" : '<p class="empty">' + t("none") + "</p>");
    if (keep) { var q = $("q"); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
  }

  function verbPage(v) {
    var i = S.vperson, tenses = CORE.concat(S.vrare ? RARE : []);
    var persons = G.PERSONS.map(function (p, k) { return '<button class="pchip" data-vperson="' + k + '" aria-pressed="' + (k === i) + '">' + p + "</button>"; }).join("");
    var rows = tenses.map(function (tn) {
      var pi = tn.id === "impv" ? (i === 4 ? 4 : 1) : i;
      var a = cellText(tn.id, v, false, pi), b = cellText(tn.id, v, true, pi);
      return '<tr><th><button class="tlink" data-cell="' + tn.id + '|0|' + pi + '">' + G.icon(tn.id) + "<span>" + shortName(tn) + "</span></button></th>" +
        '<td><button class="cell i" data-cell="' + tn.id + "|0|" + pi + '">' + (a || '<span class="na">—</span>') + "</button></td>" +
        '<td><button class="cell p" data-cell="' + tn.id + "|1|" + pi + '">' + (b || '<span class="na">—</span>') + "</button></td></tr>";
    }).join("");
    return '<button class="back" data-back>' + t("back") + "</button>" +
      '<div class="vhead"><h2 class="pairbig">' + pairHTML(v) + '</h2><p class="vru">' + esc(v.ru) + '</p><div class="badges"><span class="badge i">' + t("impfS") + " · " + v.impf.group + " " + t("group") + '</span><span class="badge p">' + t("pfS") + " · " + v.pf.group + " " + t("group") + "</span></div>" +
      (v.note ? '<p class="note">' + esc(L(v.note)) + "</p>" : "") + "</div>" +
      '<div class="card"><div class="card-h"><h3>' + t("grid") + '</h3><div class="pchips">' + persons + "</div></div>" +
      '<div class="table-wrap"><table class="vgrid"><thead><tr><th></th><th class="i">' + t("impfS") + " · " + v.impf.inf + '</th><th class="p">' + t("pfS") + " · " + v.pf.inf + "</th></tr></thead><tbody>" + rows + "</tbody></table></div>" +
      '<button class="link" data-vrare>' + (S.vrare ? "−" : "+" + RARE.length + " " + t("rare")) + "</button></div>" +
      '<div class="card ex"><div class="card-h"><h3>' + t("examples") + "</h3>" + trToggle() + "</div>" + v.ex.map(function (e) { return ex(highlight(e[0], v), e[1]); }).join("") + "</div>";
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
  function setB(fn) { fn(S.B); S.B.sel = -1; saveB(); renderForm(); }

  /* ---------- Events ---------- */
  document.addEventListener("click", function (e) {
    var el = e.target.closest("button, summary");
    if (!el) return;
    var d = el.dataset;
    if (d.lang) { S.lang = d.lang; store.set("lang", S.lang); render(); return; }
    if (d.tab) { go(function () { if (d.tab === "verbs" && S.tab === "verbs") S.verb = null; S.tab = d.tab; }); return; }
    // builder
    if ("pick" in d) { S.B.picking = !S.B.picking; renderForm(); return; }
    if (d.bverb) { setB(function (B) { B.verb = +d.bverb; B.picking = false; B.q = ""; }); return; }
    if (d.btense) { setB(function (B) { B.tense = d.btense; }); return; }
    if ("brare" in d) { setB(function (B) { B.rare = !B.rare; if (!B.rare && !TBY[B.tense].core) B.tense = "present"; }); return; }
    if (d.bperson) { setB(function (B) { B.person = +d.bperson; }); return; }
    if (d.bpf) { setB(function (B) { B.pf = d.bpf === "1"; }); return; }
    if (d.bg) { setB(function (B) { B.gender = d.bg; }); return; }
    if ("bneg" in d) { setB(function (B) { B.neg = !B.neg; }); return; }
    if (d.piece) { S.B.sel = +d.piece; renderForm(); return; }
    if (d.totense) { go(function () { S.tab = "tenses"; S.open[d.totense] = true; S.jump = d.totense; }); return; }
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
      var c = d.cell.split("|"), vid = S.verb;
      S.B.verb = vid; S.B.tense = c[0]; S.B.pf = c[1] === "1"; S.B.person = +c[2]; S.B.neg = false; S.B.sel = -1; saveB();
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
