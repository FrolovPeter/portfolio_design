(function () {
  'use strict';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var body = document.body;
  var $ = function (id) { return document.getElementById(id); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  /* ——— цели Яндекс.Метрики ——— */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-goal]');
    if (!a) return;
    try { if (window.ym && window.YM_ID) window.ym(window.YM_ID, 'reachGoal', a.getAttribute('data-goal')); } catch (_) {}
  });

  /* ——— лайтбокс: картинка или видео ——— */
  var lb = $('lb');
  function lbClose() {
    if (!lb || lb.hidden) return;
    var m = lb.querySelector('img,video');
    if (m) { if (m.pause) m.pause(); m.remove(); }
    lb.hidden = true;
  }
  function lbOpen(o) {
    if (!lb) return;
    lbClose();
    var m;
    if (o.video) {
      m = document.createElement('video');
      m.controls = true; m.playsInline = true; m.muted = true; m.autoplay = true;
      if (o.poster) m.poster = o.poster;
      m.src = o.video;
      m.addEventListener('click', function (e) { e.stopPropagation(); });
    } else {
      m = document.createElement('img');
      m.src = o.src; m.alt = o.alt || '';
    }
    lb.appendChild(m);
    lb.hidden = false;
  }
  if (lb) {
    lb.addEventListener('click', lbClose);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') lbClose(); });
    [].forEach.call(document.querySelectorAll('.frame img'), function (el) {
      el.addEventListener('click', function () { lbOpen({ src: el.currentSrc || el.src, alt: el.alt }); });
    });
  }

  /* ——— меню на телефоне ——— */
  (function () {
    var nav = $('nav'), b = nav && nav.querySelector('.burger');
    if (!b) return;
    var set = function (on) { nav.classList.toggle('open', on); b.setAttribute('aria-expanded', on ? 'true' : 'false'); };
    b.addEventListener('click', function (e) { e.stopPropagation(); set(!nav.classList.contains('open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('nav a')) set(false); });
    document.addEventListener('click', function (e) { if (!nav.contains(e.target)) set(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
  })();

  /* ——— подсветка раздела в меню ——— */
  var navLinks = [].slice.call(document.querySelectorAll('#nav nav a[href^="#"]'));
  if (navLinks.length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        navLinks.forEach(function (a) { a.setAttribute('aria-current', a.getAttribute('href') === '#' + e.target.id ? 'true' : 'false'); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(function (a) { var s = document.querySelector(a.getAttribute('href')); if (s) spy.observe(s); });
    var heroEl = $('hero');
    if (heroEl) new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) navLinks.forEach(function (a) { a.setAttribute('aria-current', 'false'); });
    }, { rootMargin: '-45% 0px -50% 0px' }).observe(heroEl);
  }

  /* ——— первый экран: карточки за стеклом, их можно бросать ——— */
  (function () {
    var stage = $('stage'), hero = $('hero'), plate = $('plate');
    if (!stage || !hero) return;
    var AR = 440 / 587;
    var SET = { arasaka: { ar: AR }, fight: { ar: AR }, deadpool: { ar: AR }, adventure: { ar: AR }, minecraft: { ar: AR }, pets: { ar: AR }, tomjerry: { ar: AR }, duolingo: { ar: AR } };
    /* x, y — доли сцены; r — наклон; s — масштаб */
    var DESK = {
      arasaka: [.17, .37, -8, 1], adventure: [.262, .84, 6, .84], fight: [.25, .15, 5, .66], tomjerry: [.63, .885, -5, .8],
      duolingo: [.845, .57, 8, 1], minecraft: [.76, .14, -6, .72], deadpool: [.075, .85, -5, .74], pets: [.93, .2, 7, .62]
    };
    var MOB = {
      arasaka: [.17, .115, -8, 1], minecraft: [.56, .075, 4, .95], duolingo: [.93, .2, 8, .86],
      adventure: [.11, .9, 6, .92], tomjerry: [.5, .94, -4, .96], fight: [.89, .885, 7, .9]
    };
    var cards = [], W = 0, H = 0, raf = 0, last = 0, t0 = 0, visible = true, zTop = 10;
    var ptr = { x: -9999, y: -9999, on: false };
    var K = 3.2, C = 2.3;

    Object.keys(SET).forEach(function (id, i) {
      var el = document.createElement('figure');
      el.className = 'fc';
      var img = new Image();
      img.alt = ''; img.decoding = 'async'; img.draggable = false;
      img.src = 'img/hero/' + id + '.webp';
      el.appendChild(img);
      stage.appendChild(el);
      var c = { id: id, el: el, ar: SET[id].ar, x: 0, y: 0, vx: 0, vy: 0, r: 0, i: i, live: false, drag: false,
        f1: .35 + Math.random() * .25, f2: .3 + Math.random() * .25, p1: Math.random() * 6.28, p2: Math.random() * 6.28,
        ax: 10 + Math.random() * 10, ay: 9 + Math.random() * 9 };
      cards.push(c);
      bindDrag(c);
    });

    function layout(first) {
      W = stage.clientWidth; H = stage.clientHeight;
      var mob = W < 760, set = mob ? MOB : DESK, base = mob ? W * .3 : clamp(W * .155, 150, 240), n = 0;
      cards.forEach(function (c) {
        var d = set[c.id];
        c.off = !d; c.el.hidden = c.off;
        if (c.off) return;
        c.w = base * d[3]; c.h = c.w / c.ar; c.rad = Math.max(c.w, c.h) * .5;
        c.hx = d[0] * W; c.hy = d[1] * H; c.hr = d[2];
        c.el.style.setProperty('--w', c.w.toFixed(1) + 'px');
        if (first) {
          if (reduce) { c.x = c.hx; c.y = c.hy; c.r = c.hr; c.live = true; }
          else { c.x = c.hx - 40; c.y = H + c.h + 60; c.r = c.hr - 10; c.delay = .25 + n * .12; }
          n++;
        }
      });
      draw();
    }
    function draw() {
      for (var i = 0; i < cards.length; i++) {
        var c = cards[i]; if (c.off) continue;
        c.el.style.transform = 'translate3d(' + (c.x - c.w / 2).toFixed(1) + 'px,' + (c.y - c.h / 2).toFixed(1) + 'px,0) rotate(' + c.r.toFixed(2) + 'deg)';
      }
    }
    function step(now) {
      raf = requestAnimationFrame(step);
      var dt = Math.min(.034, (now - last) / 1000); last = now;
      var t = (now - t0) / 1000;
      for (var i = 0; i < cards.length; i++) {
        var c = cards[i]; if (c.off) continue;
        if (c.drag) { c.r += (c.hr + clamp(c.vx * .012, -16, 16) - c.r) * Math.min(1, dt * 8); continue; }
        if (!c.live && t < c.delay) continue;
        var tx = c.hx + Math.sin(t * c.f1 + c.p1) * c.ax, ty = c.hy + Math.cos(t * c.f2 + c.p2) * c.ay;
        var k = c.live ? K : 9, cc = c.live ? C : 5.2;
        var ax = (tx - c.x) * k - c.vx * cc, ay = (ty - c.y) * k - c.vy * cc, dx, dy, d, f;
        if (ptr.on && c.live) {
          dx = c.x - ptr.x; dy = c.y - ptr.y; d = Math.sqrt(dx * dx + dy * dy); var R = c.rad + 80;
          if (d < R && d > 1) { f = (1 - d / R) * 1500; ax += dx / d * f; ay += dy / d * f; }
        }
        if (c.live) for (var j = 0; j < cards.length; j++) {
          var o = cards[j]; if (o === c || o.off || !o.live) continue;
          dx = c.x - o.x; dy = c.y - o.y; d = Math.sqrt(dx * dx + dy * dy); var m = (c.rad + o.rad) * .74;
          if (d < m && d > 1) { f = (m - d) * (o.drag ? 30 : 13); ax += dx / d * f; ay += dy / d * f; }
        }
        c.vx += ax * dt; c.vy += ay * dt; c.x += c.vx * dt; c.y += c.vy * dt;
        if (c.live) {
          var mx = c.w * .15, my = c.h * .15;
          if (c.x < mx) { c.x = mx; c.vx = Math.abs(c.vx) * .62; } else if (c.x > W - mx) { c.x = W - mx; c.vx = -Math.abs(c.vx) * .62; }
          if (c.y < my) { c.y = my; c.vy = Math.abs(c.vy) * .62; } else if (c.y > H - my) { c.y = H - my; c.vy = -Math.abs(c.vy) * .62; }
        } else if (Math.abs(c.y - c.hy) < 30) c.live = true;
        c.r += (c.hr + clamp(c.vx * .02, -14, 14) - c.r) * Math.min(1, dt * 5);
      }
      draw();
    }
    function run() { if (raf || reduce || !visible || document.hidden) return; last = performance.now(); raf = requestAnimationFrame(step); }
    function halt() { if (raf) cancelAnimationFrame(raf); raf = 0; }

    function bindDrag(c) {
      var ox = 0, oy = 0, lx = 0, ly = 0, lt = 0, id = null;
      function pos(e) { var b = stage.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; }
      c.el.addEventListener('pointerdown', function (e) {
        if (reduce || (e.button && e.button !== 0)) return;
        var p = pos(e); id = e.pointerId;
        try { c.el.setPointerCapture(id); } catch (_) {}
        c.drag = true; c.live = true; ox = p.x - c.x; oy = p.y - c.y; lx = p.x; ly = p.y; lt = performance.now(); c.vx = c.vy = 0;
        c.el.classList.add('grab'); c.el.style.zIndex = ++zTop;
        ptr.x = p.x; ptr.y = p.y; ptr.on = true;
        e.preventDefault();
      });
      c.el.addEventListener('pointermove', function (e) {
        if (!c.drag || e.pointerId !== id) return;
        var p = pos(e), now = performance.now(), dt = Math.max(8, now - lt) / 1000;
        c.vx = c.vx * .55 + ((p.x - lx) / dt) * .45; c.vy = c.vy * .55 + ((p.y - ly) / dt) * .45;
        lx = p.x; ly = p.y; lt = now;
        c.x = p.x - ox; c.y = p.y - oy; ptr.x = p.x; ptr.y = p.y;
      });
      function end(e) {
        if (!c.drag || e.pointerId !== id) return;
        c.drag = false; id = null; c.el.classList.remove('grab');
        if (performance.now() - lt > 120) { c.vx = c.vy = 0; }
        c.vx = clamp(c.vx, -2800, 2800); c.vy = clamp(c.vy, -2800, 2800);
        if (e.pointerType !== 'mouse') ptr.on = false;
      }
      c.el.addEventListener('pointerup', end);
      c.el.addEventListener('pointercancel', end);
    }

    hero.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var b = stage.getBoundingClientRect();
      ptr.x = e.clientX - b.left; ptr.y = e.clientY - b.top; ptr.on = true;
      if (plate) { var p = plate.getBoundingClientRect(); plate.style.setProperty('--mx', (e.clientX - p.left) + 'px'); plate.style.setProperty('--my', (e.clientY - p.top) + 'px'); }
    });
    hero.addEventListener('pointerleave', function () { ptr.on = false; });

    layout(true);
    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { layout(false); }, 120); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; visible ? run() : halt(); }, { threshold: 0 }).observe(hero);
    document.addEventListener('visibilitychange', function () { document.hidden ? halt() : run(); });
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      body.classList.remove('intro'); body.classList.add('ready');
      t0 = performance.now(); run();
    }); });
  })();
  if (!$('stage')) { body.classList.remove('intro'); body.classList.add('ready'); }

  /* ——— карусель работ ——— */
  (function () {
    var cf = $('cf'), seg = $('seg');
    if (!cf || !seg) return;
    var V = function (file, poster, title, note) { return { video: 'video/' + file, poster: 'video/' + poster, src: 'video/' + poster, ar: 16 / 9, title: title, note: note }; };
    var I = function (id, ar, title, note, full) { return { src: 'img/w/' + id + '.webp', full: full || 'img/' + id + '.jpg', ar: ar, title: title, note: note }; };
    var M = function (id, title, note) { return I(id, .75, title, note, 'img/mp/' + id + '.jpg'); };
    var Y = function (id, title, note) { return I(id, 16 / 9, title, note, 'img/yt/' + id + '.jpg'); };
    var CATS = [
      { id: 'mp', name: 'Маркетплейсы', items: [
        M('adventure', 'Стикеры Adventure Time, 100 штук', 'Главное фото для WB и Ozon, 3:4'),
        M('arasaka', 'Наклейки на карту Arasaka', 'Главное фото для WB и Ozon, 3:4'),
        M('duolingo', 'Стикеры Duolingo', 'Главное фото для WB и Ozon, 3:4'),
        M('duolingo2', 'Стикеры Duolingo: размеры', 'Слайд инфографики, 3:4'),
        M('fight', 'Наклейки на карту «Бойцовский клуб»', 'Главное фото для WB и Ozon, 3:4'),
        M('tomjerry', 'Наклейки на карту Tom & Jerry', 'Главное фото для WB и Ozon, 3:4'),
        M('tomjerry2', 'Наклейки на карту: универсальный размер', 'Слайд инфографики, 3:4'),
        M('minecraft', 'Наклейки Minecraft', 'Главное фото для WB и Ozon, 3:4'),
        M('deadpool', 'Стикеры Deadpool и Wolverine', 'Главное фото для WB и Ozon, 3:4'),
        M('shrek', 'Стикеры «Шрек»', 'Главное фото для WB и Ozon, 3:4'),
        M('fionna', 'Стикеры Fionna and Cake', 'Главное фото для WB и Ozon, 3:4'),
        M('pets', 'Стикеры с питомцами, 40 штук', 'Главное фото для WB и Ozon, 3:4') ] },
      { id: 'yt', name: 'YouTube', items: [
        Y('03_kripto_B', '«Крипте конец?»', 'Превью, вариант B для A/B-теста'),
        Y('13_fitnes', '«90 дней: до и после»', 'Превью, 1920×1080'),
        V('yt_case.mp4', 'yt_poster.jpg', 'Видео-кейс: превью и A/B-тесты', 'Видео, 38 сек'),
        Y('04_startap', '«Из гаража в миллиардеры»', 'Превью, 1920×1080'),
        Y('06_kod_A', '«Код за 5 минут»', 'Превью, вариант A для A/B-теста'),
        Y('14_marafon', '«Марафон без подготовки»', 'Превью, 1920×1080'),
        Y('08_redizayn', '«Редизайн ужасного сайта»', 'Превью, 1920×1080'),
        Y('15_utro', '«Я вставал в 5:00»', 'Превью, 1920×1080'),
        Y('03_kripto_A', '«Этот рынок рухнет?»', 'Превью, вариант A для A/B-теста'),
        Y('06_kod_B', '«Код за 5 минут»', 'Превью, вариант B для A/B-теста') ] },
      { id: 'print', name: 'Печать и упаковка', items: [
        V('guide_case.mp4', 'guide_poster.jpg', 'Видео-кейс: PDF-путеводитель', 'Видео, 43 сек'),
        V('print_case.mp4', 'print_poster.jpg', 'Видео-кейс: афиши и евробуклет', 'Видео, 54 сек'),
        V('red_case.mp4', 'red_poster.jpg', 'Видео-кейс: упаковка конструктора R:ED', 'Видео, 54 сек') ] },
      { id: 'logo', name: 'Логотипы', items: [
        I('etude', 1.333, 'Étude Seppey Riand Lorenzetti', 'Знак'),
        V('logo_case.mp4', 'logo_poster.jpg', 'Видео-кейс: логотипы и логобук', 'Видео, 39 сек'),
        I('logo10', 1.407, 'Luna Style', 'От карандашного эскиза к вектору'),
        I('proclimat', 1.333, 'ПРО Климат', 'Логобук') ] },
      { id: 'web', name: 'Сайты', items: [
        V('sturm_ba.mp4', 'sturm_ba_poster.jpg', 'STURM: было и стало', 'Видео-кейс, 55 сек') ] }
    ];
    var items = [], pos = [], cur = 0, slot = 300, catI = -1;
    var tEl = $('cf-title'), nEl = $('cf-note'), cEl = $('cf-n');

    CATS.forEach(function (c, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'tab'); b.id = 'tab-' + c.id; b.textContent = c.name;
      b.setAttribute('aria-selected', 'false');
      b.addEventListener('click', function () { setCat(i); });
      seg.appendChild(b);
    });

    function setCat(i) {
      if (i === catI) return;
      catI = i;
      [].forEach.call(seg.children, function (b, k) { b.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
      cf.textContent = '';
      items = CATS[i].items.map(function (d, k) {
        var el = document.createElement('figure');
        el.className = 'cf-item';
        var img = new Image();
        img.alt = d.title; img.decoding = 'async'; img.draggable = false; img.src = d.src;
        el.appendChild(img);
        if (d.video) {
          var p = document.createElement('span');
          p.className = 'play glass';
          p.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 2.5v11l9-5.5z"/></svg>Смотреть';
          el.appendChild(p);
        }
        cf.appendChild(el);
        return { d: d, el: el, i: k };
      });
      cur = Math.min(1, items.length - 1);
      size(); render(true);
    }
    function size() {
      var vw = cf.clientWidth || window.innerWidth, mob = vw < 760;
      var H = Math.round(Math.min(window.innerHeight * .62, mob ? 420 : 580));
      items.forEach(function (it) {
        var w = H * it.d.ar, mw = mob ? vw * .82 : Math.min(vw * .6, 880); if (w > mw) w = mw;
        it.w = w; it.h = w / it.d.ar;
        var s = it.el.style;
        s.width = w.toFixed(1) + 'px'; s.height = it.h.toFixed(1) + 'px'; s.marginLeft = (-w / 2).toFixed(1) + 'px'; s.marginTop = (-it.h / 2).toFixed(1) + 'px';
      });
      cf.style.setProperty('--cfh', Math.round(Math.max.apply(null, items.map(function (it) { return it.h; })) + 64) + 'px');
      pos = [0];
      for (var i = 1; i < items.length; i++) pos[i] = pos[i - 1] + (items[i - 1].w + items[i].w) / 2 * (mob ? .7 : .64) + (mob ? 14 : 30);
      slot = items.length > 1 ? pos[items.length - 1] / (items.length - 1) : 300;
    }
    function px(c) {
      var n = items.length - 1, a = clamp(Math.floor(c), 0, n), b = clamp(a + 1, 0, n);
      return pos[a] + (pos[b] - pos[a]) * clamp(c - a, 0, 1) + (c < 0 ? c * slot : c > n ? (c - n) * slot : 0);
    }
    function render(label) {
      var xc = px(cur);
      items.forEach(function (it, i) {
        var d = i - cur, ad = Math.abs(d);
        it.el.style.transform = 'translate3d(' + (pos[i] - xc).toFixed(1) + 'px,0,' + (-Math.min(ad, 2.6) * 170).toFixed(1) + 'px) rotateY(' + (clamp(d, -1, 1) * 30).toFixed(2) + 'deg)';
        it.el.style.zIndex = 100 - Math.round(ad * 10);
        it.el.setAttribute('data-d', Math.min(3, Math.round(ad)));
      });
      if (label) {
        var it = items[Math.round(cur)];
        if (!it) return;
        tEl.textContent = it.d.title; nEl.textContent = it.d.note;
        cEl.textContent = (Math.round(cur) + 1) + ' / ' + items.length;
      }
    }
    function go(i) { cur = clamp(Math.round(i), 0, items.length - 1); render(true); }
    function open(it) {
      if (it.d.video) lbOpen({ video: it.d.video, poster: it.d.poster });
      else lbOpen({ src: it.d.full, alt: it.d.title });
    }

    var drag = null;
    cf.addEventListener('pointerdown', function (e) {
      if (e.button && e.button !== 0) return;
      drag = { id: e.pointerId, x: e.clientX, c: cur, moved: false, lx: e.clientX, lt: performance.now(), v: 0 };
    });
    cf.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x, now = performance.now();
      if (!drag.moved && Math.abs(dx) > 6) { drag.moved = true; cf.classList.add('drag'); try { cf.setPointerCapture(drag.id); } catch (_) {} }
      if (!drag.moved) return;
      drag.v = (e.clientX - drag.lx) / Math.max(8, now - drag.lt); drag.lx = e.clientX; drag.lt = now;
      cur = clamp(drag.c - dx / slot, -.35, items.length - .65);
      render(false);
    });
    function up(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var d = drag; drag = null; cf.classList.remove('drag');
      if (d.moved) { go(cur - clamp(d.v * .35, -1, 1)); return; }
      if (e.type === 'pointercancel') return;
      var el = e.target.closest && e.target.closest('.cf-item');
      if (!el) return;
      for (var i = 0; i < items.length; i++) if (items[i].el === el) { i === Math.round(cur) ? open(items[i]) : go(i); break; }
    }
    cf.addEventListener('pointerup', up);
    cf.addEventListener('pointercancel', up);
    cf.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { go(cur - 1); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { go(cur + 1); e.preventDefault(); }
      else if (e.key === 'Enter' || e.key === ' ') { var it = items[Math.round(cur)]; if (it) open(it); e.preventDefault(); }
    });
    var wl = 0;
    cf.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 12) return;
      e.preventDefault();
      var now = performance.now(); if (now - wl < 380) return; wl = now;
      go(cur + (e.deltaX > 0 ? 1 : -1));
    }, { passive: false });
    $('cf-prev').addEventListener('click', function () { go(cur - 1); });
    $('cf-next').addEventListener('click', function () { go(cur + 1); });
    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { size(); render(false); }, 120); });

    setCat(0);
    /* ссылка …/#youtube сразу открывает вкладку превью */
    function hash() { if (location.hash === '#youtube') { setCat(1); var w = $('work'); if (w) w.scrollIntoView(); } }
    window.addEventListener('hashchange', hash); hash();
  })();

  /* ——— было / стало: несколько примеров ——— */
  (function () {
    var ba = $('ba'); if (!ba) return;
    var inp = ba.querySelector('input'), seg = $('ba-seg'), cap = $('ba-cap');
    var neu = ba.querySelector('img.new'), old = ba.querySelector('img.old');
    var LIST = [
      { name: 'Набор «Любовь»', story: 0, old: 'img/hero_old.jpg', neu: 'img/hero_new.jpg', ar: '600 / 899', cap: 'Набор стикеров «Любовь»: после редизайна CTR обложки вырос с 3,16% до 4,7%.', alt: 'Обложка набора стикеров «Любовь»' },
      { name: 'Объёмные стикеры', story: 1, old: 'img/ba/3d_old.webp', neu: 'img/ba/3d_new.webp', ar: '3 / 4', cap: 'Объёмные стикеры: обложка в феврале и в сентябре 2024 года.', alt: 'Обложка набора объёмных стикеров' },
      { name: 'Превью «Крипта»', story: 2, wide: true, ab: true, old: 'img/yt/03_kripto_A.jpg', neu: 'img/yt/03_kripto_B.jpg', ar: '16 / 9', cap: 'Слева вариант A «Этот рынок рухнет?», справа вариант B «Крипте конец?».', alt: 'Превью для YouTube про крипту' },
      { name: 'Превью «Код»', story: 2, wide: true, ab: true, old: 'img/yt/06_kod_A.jpg', neu: 'img/yt/06_kod_B.jpg', ar: '16 / 9', cap: 'Два варианта превью «Код за 5 минут» для A/B-теста.', alt: 'Превью для YouTube «Код за 5 минут»' }
    ];
    var grid = $('case2'), cl = $('ba-l'), cr = $('ba-r');
    var set = function () { ba.style.setProperty('--p', inp.value + '%'); };
    inp.addEventListener('input', set);
    function pick(i) {
      var d = LIST[i];
      ba.style.aspectRatio = d.ar;
      old.src = d.old; old.alt = d.alt + (d.ab ? ', вариант A' : ' до редизайна');
      neu.src = d.neu; neu.alt = d.alt + (d.ab ? ', вариант B' : ' после редизайна');
      if (cl) cl.textContent = d.ab ? 'Вариант A' : 'Было';
      if (cr) cr.textContent = d.ab ? 'Вариант B' : 'Стало';
      if (grid) grid.classList.toggle('wide', !!d.wide);
      if (cap) cap.textContent = d.cap;
      [].forEach.call(document.querySelectorAll('.story[data-ba]'), function (s) { s.hidden = s.getAttribute('data-ba') !== String(d.story); });
      inp.value = 50; set();
      if (seg) [].forEach.call(seg.children, function (b, k) { b.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
    }
    if (seg) LIST.forEach(function (d, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'tab'); b.textContent = d.name;
      b.addEventListener('click', function () { pick(i); });
      seg.appendChild(b);
    });
    pick(0);
  })();
})();
