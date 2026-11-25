/* microsite.js — behaviour layer for client microsites, safe inside the RELAYTO embed (<iframe srcdoc>).
   No dependencies. Copy into the project as scripts/microsite.js and keep project-specific code in scripts/main.js.

   Why these rules (learned on the Westinghouse and Veriff projects):
   - In <iframe srcdoc> a plain <a href="#id"> resolves against the HOST url and reloads the frame with the
     host page → every in-page link is handled here: preventDefault + scrollIntoView.
   - The page may be scrolled by the window OR by a container → scroll position is measured from the layout
     (getBoundingClientRect), scroll events are listened to in the capture phase on document.
   - Animated numbers always end on the exact source string; their width is reserved so nothing shifts.
   - Nothing third-party loads before the user asks (YouTube facade, lightbox iframes).

   Markup API (all optional):
     <header data-header>                     → .is-scrolled once the page is scrolled; --header-h on <html>
     <div data-progress></div>                → transform: scaleX(0…1) reading progress
     <a href="#id">                           → smooth scroll below the header, focus moves to the target
     <nav data-spy> <a href="#id">            → .is-active + aria-current on the link of the section being read
     <button data-menu-toggle aria-controls="nav-id" data-menu-breakpoint="992">
                                              → toggles .is-open on [data-header] + aria-expanded; Esc / outside / link closes
     .reveal                                  → .is-in when it enters the screen (html.js .reveal is hidden until then)
     <span data-count>12.5K+</span>           → counts up once, ends exactly on the original text
     <div data-yt="VIDEO_ID" data-title="…"><button>…</button></div>
                                              → YouTube (nocookie) iframe only after click; file:// opens youtube.com
     <a href="https://…" data-lightbox data-title="…">  → opens the URL in a <dialog> over the page
     <video data-bg-video data-src="x.mp4" poster="…" muted playsinline loop>
                                              → loads only with motion allowed and no Save-Data; plays while visible
*/
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  root.classList.add('js');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  var header = $('[data-header]');

  /* ---------- scroll position, measured from the layout ---------- */
  var scroller = null;                 // element that actually scrolls; null = the window / document
  function scrollTopNow() {
    if (scroller) return scroller.scrollTop;
    var se = doc.scrollingElement || root;
    return Math.max(window.pageYOffset || 0, se.scrollTop, doc.body.scrollTop);
  }
  function scrollMax() {
    if (scroller) return scroller.scrollHeight - scroller.clientHeight;
    var se = doc.scrollingElement || root;
    return Math.max(se.scrollHeight, doc.body.scrollHeight) - (window.innerHeight || se.clientHeight);
  }

  /* ---------- header state + progress ---------- */
  var progress = $('[data-progress]');
  var ticking = false;
  function update() {
    ticking = false;
    var y = scrollTopNow();
    if (header) header.classList.toggle('is-scrolled', y > 4);
    if (progress) { var m = scrollMax(); progress.style.transform = 'scaleX(' + (m > 0 ? Math.min(1, Math.max(0, y / m)) : 0) + ')'; }
  }
  function onScroll(e) {
    if (e && e.type === 'scroll') {
      var t = e.target;
      if (t === doc || t === root || t === doc.body) scroller = null;
      else if (t instanceof Element && header && t.contains(header)) scroller = t;
      else if (t instanceof Element && !header && t.scrollHeight > t.clientHeight * 1.5 && t.clientHeight > window.innerHeight * 0.6) scroller = t;
      else return;                       // a menu panel, a table, a slider… scrolled — not the page
    }
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }
  doc.addEventListener('scroll', onScroll, { passive: true, capture: true });   // capture: container scrolls don't bubble
  window.addEventListener('resize', onScroll);
  update();

  // anchor offset = real header height (CSS: [id] { scroll-margin-top: calc(var(--header-h, 0px) + 16px) })
  if (header) {
    var syncH = function () { root.style.setProperty('--header-h', header.offsetHeight + 'px'); };
    syncH();
    if (window.ResizeObserver) new ResizeObserver(syncH).observe(header); else window.addEventListener('resize', syncH);
  }

  /* ---------- in-page links (srcdoc-safe) ---------- */
  doc.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    var link = e.target.closest && e.target.closest('a[href^="#"]');
    if (!link) return;
    var id = decodeURIComponent(link.getAttribute('href').slice(1));
    var target = id ? doc.getElementById(id) : null;
    e.preventDefault();                                   // even "#" alone would reload the frame
    // "#offcanvas"-style links open/close something (their own handler already ran) — don't scroll to it
    if (link.hasAttribute('aria-controls') || link.hasAttribute('uk-toggle') || link.matches('[data-toggle],[data-bs-toggle],[role="button"]')) return;
    if (target && (getComputedStyle(target).position === 'fixed' || target.closest('dialog'))) return;
    if (!target && (id === '' || id === 'top')) target = doc.body;
    if (!target) return;
    // far targets are reached at once: a smooth glide across ~10 screens takes seconds and lazy images /
    // reveals shift the target on the way (seen on "To This Land, We Belong"); near ones still glide
    var far = Math.abs(target.getBoundingClientRect().top) > (window.innerHeight || root.clientHeight) * 1.5;
    target.scrollIntoView({ behavior: reduceMotion.matches || far ? 'instant' : 'smooth', block: 'start' });
    if (!target.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });

  /* ---------- mobile menu ---------- */
  var toggle = $('[data-menu-toggle]');
  if (toggle && header) {
    var setMenu = function (open) { header.classList.toggle('is-open', open); toggle.setAttribute('aria-expanded', String(open)); };
    toggle.addEventListener('click', function () { setMenu(toggle.getAttribute('aria-expanded') !== 'true'); });
    doc.addEventListener('click', function (e) {
      if (!header.classList.contains('is-open')) return;
      if (!header.contains(e.target) || (e.target.closest && e.target.closest('a[href^="#"]'))) setMenu(false);
    });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && header.classList.contains('is-open')) { setMenu(false); toggle.focus(); } });
    var bp = toggle.getAttribute('data-menu-breakpoint');
    if (bp) window.matchMedia('(min-width: ' + bp + 'px)').addEventListener('change', function () { setMenu(false); });
  }

  /* ---------- scroll-spy: the section crossing the reading line (IO works with any scroll container) ---------- */
  var spyLinks = $$('[data-spy] a[href^="#"]');
  if (spyLinks.length && window.IntersectionObserver) {
    var byId = {};
    spyLinks.forEach(function (a) { var id = decodeURIComponent(a.getAttribute('href').slice(1)); (byId[id] = byId[id] || []).push(a); });
    var targets = Object.keys(byId).map(function (id) { return doc.getElementById(id); }).filter(Boolean);
    var inLine = new Set();
    var setActive = function () {
      var current = targets.filter(function (t) { return inLine.has(t); })[0];
      spyLinks.forEach(function (a) { a.classList.remove('is-active'); a.removeAttribute('aria-current'); });
      if (current) byId[current.id].forEach(function (a) { a.classList.add('is-active'); a.setAttribute('aria-current', 'true'); });
    };
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) inLine.add(en.target); else inLine.delete(en.target); });
      setActive();
    }, { rootMargin: '-35% 0px -60% 0px' });
    targets.forEach(function (t) { spy.observe(t); });
  }

  /* ---------- reveal on scroll ---------- */
  var reveals = $$('.reveal');
  if (reduceMotion.matches || !window.IntersectionObserver) reveals.forEach(function (el) { el.classList.add('is-in'); });
  else {
    var rio = new IntersectionObserver(function (entries) {
      var batch = entries.filter(function (en) { return en.isIntersecting; });
      batch.forEach(function (en, i) {
        en.target.style.transitionDelay = Math.min(i * 70, 280) + 'ms';     // small stagger for siblings
        en.target.classList.add('is-in');
        rio.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { rio.observe(el); });
  }

  /* ---------- counters: end exactly on the source text ---------- */
  var counters = $$('[data-count]');
  if (counters.length && !reduceMotion.matches && window.IntersectionObserver) {
    var parse = function (s) {
      var m = /^(\D*?)(\d[\d,]*)(\.\d+)?(.*)$/.exec(s.trim());
      if (!m) return null;
      return { pre: m[1], int: m[2], dec: m[3] ? m[3].length - 1 : 0, post: m[4], val: parseFloat(m[2].replace(/,/g, '') + (m[3] || '')), comma: m[2].indexOf(',') > -1 };
    };
    var fmt = function (p, v) {
      var s = v.toFixed(p.dec);
      if (p.comma) { var parts = s.split('.'); parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ','); s = parts.join('.'); }
      return p.pre + s + p.post;
    };
    var run = function (el) {
      var final = el.textContent, p = parse(final);
      if (!p) return;
      var t0 = null, dur = 1400;
      var step = function (t) {
        if (!t0) t0 = t;
        var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        el.textContent = k < 1 ? fmt(p, p.val * e) : final;
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    var reserve = function () {
      counters.forEach(function (el) {
        if (getComputedStyle(el).display === 'inline') el.style.display = 'inline-block';
        el.style.minWidth = Math.ceil(el.getBoundingClientRect().width) + 'px';
      });
    };
    (doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve()).then(function () {
      reserve();                                         // measured after the web font is in
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { run(en.target); cio.unobserve(en.target); } });
      }, { threshold: 0.6 });
      counters.forEach(function (el) { cio.observe(el); });
    });
  }

  /* ---------- YouTube facade ---------- */
  $$('[data-yt]').forEach(function (box) {
    var id = box.getAttribute('data-yt');
    var btn = $('button', box) || box;
    btn.addEventListener('click', function () {
      if (location.protocol === 'file:') {             // YouTube refuses to play without a referrer (Error 153)
        window.open('https://www.youtube.com/watch?v=' + id, '_blank', 'noopener'); return;
      }
      if ($('iframe', box)) return;
      var f = doc.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&playsinline=1';
      f.title = box.getAttribute('data-title') || 'YouTube video';
      f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
      f.allowFullscreen = true;
      f.referrerPolicy = 'strict-origin-when-cross-origin';
      box.appendChild(f);
      box.classList.add('is-live');
      f.focus();
    });
  });

  /* ---------- lightbox (documents, RELAYTO pages, video) ---------- */
  var links = $$('a[data-lightbox]');
  if (links.length && typeof HTMLDialogElement === 'function') {
    var dlg = doc.createElement('dialog');
    dlg.className = 'lightbox';
    dlg.innerHTML = '<div class="lightbox__bar"><span class="lightbox__title"></span><a class="lightbox__newtab" target="_blank" rel="noopener">Open in new tab</a><button class="lightbox__close" type="button" aria-label="Close">×</button></div><div class="lightbox__frame"></div>';
    doc.body.appendChild(dlg);
    var frameBox = $('.lightbox__frame', dlg);
    var close = function () { dlg.close(); };
    dlg.addEventListener('close', function () { frameBox.innerHTML = ''; });          // stops audio/video
    $('.lightbox__close', dlg).addEventListener('click', close);
    dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });   // click on the dimmed area
    links.forEach(function (a) {
      a.addEventListener('click', function (e) {
        if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;             // let users open a real tab
        e.preventDefault();
        var t = a.getAttribute('data-title') || a.textContent.trim();
        $('.lightbox__title', dlg).textContent = t;
        $('.lightbox__newtab', dlg).href = a.href;
        var f = doc.createElement('iframe');
        f.src = a.href; f.title = t; f.allow = 'fullscreen; autoplay'; f.allowFullscreen = true;
        frameBox.appendChild(f);
        dlg.showModal();
      });
    });
  }

  /* ---------- background video ---------- */
  var saveData = navigator.connection && navigator.connection.saveData;
  $$('video[data-bg-video]').forEach(function (v) {
    if (reduceMotion.matches || saveData || !window.IntersectionObserver) return;   // poster only
    var src = v.getAttribute('data-src');
    if (src && !v.src) v.src = src;
    v.muted = true; v.playsInline = true;
    v.addEventListener('playing', function () { v.classList.add('is-playing'); });
    new IntersectionObserver(function (en) {
      if (en[0].isIntersecting && !doc.hidden) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause();
    }).observe(v);
    doc.addEventListener('visibilitychange', function () { if (doc.hidden) v.pause(); });
  });
})();
