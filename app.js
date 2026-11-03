(function(){
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;

  /* цели Яндекс.Метрики: window.YM_ID задаётся перед кодом счётчика, пока его нет — ничего не происходит */
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('[data-goal]');
    if (!a) return;
    try { if (window.ym && window.YM_ID) window.ym(window.YM_ID, 'reachGoal', a.getAttribute('data-goal')); } catch(_){}
  });

  /* вкладки витрины */
  var tabs = [].slice.call(document.querySelectorAll('.tab'));
  tabs.forEach(function(t){
    t.addEventListener('click', function(){
      tabs.forEach(function(x){
        var on = x === t;
        x.setAttribute('aria-selected', on ? 'true' : 'false');
        document.getElementById(x.getAttribute('aria-controls')).hidden = !on;
      });
    });
  });

  /* появление и счётчики */
  var fmt = function(n){ return Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' '); };
  function count(el){
    var to = +el.getAttribute('data-to'), pre = el.getAttribute('data-pre') || '', suf = el.getAttribute('data-suf') || '', t0 = null;
    function f(ts){ if (!t0) t0 = ts; var p = Math.min(1, (ts - t0) / 1600), e = 1 - Math.pow(1 - p, 3); el.textContent = pre + fmt(to * e) + (p >= 1 ? suf : ''); if (p < 1) requestAnimationFrame(f); }
    requestAnimationFrame(f);
  }
  if ('IntersectionObserver' in window && !reduce) {
    root.classList.add('anim');
    var rvs = [].slice.call(document.querySelectorAll('.rv'));
    var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if (e.isIntersecting) {
      e.target.classList.add('in'); io.unobserve(e.target);
      [].forEach.call(e.target.querySelectorAll('[data-to]'), count);
      [].forEach.call(e.target.querySelectorAll('.bar i'), function(b){ var w = b.style.getPropertyValue('--w'); b.style.width = '0'; requestAnimationFrame(function(){ requestAnimationFrame(function(){ b.style.width = w; }); }); });
    } }); }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    rvs.forEach(function(el){ var r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) { el.classList.add('in'); [].forEach.call(el.querySelectorAll('[data-to]'), count); } else io.observe(el); });
  }

  /* лайтбокс */
  var lb = document.getElementById('lb'), im = document.getElementById('lbimg');
  if (lb && im) {
    var close = function(){ lb.hidden = true; im.removeAttribute('src'); };
    [].forEach.call(document.querySelectorAll('.frame img'), function(el){ el.addEventListener('click', function(){ im.src = el.currentSrc || el.src; im.alt = el.alt; lb.hidden = false; }); });
    lb.addEventListener('click', close);
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && !lb.hidden) close(); });
  }
})();
/* ссылка …/#youtube сразу открывает вкладку превью */
(function(){function go(){if(location.hash==='#youtube'){var t=document.getElementById('tab-yt');if(t){t.click();var w=document.getElementById('work');if(w)w.scrollIntoView();}}}
window.addEventListener('hashchange',go);go();})();
