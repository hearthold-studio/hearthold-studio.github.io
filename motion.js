// Motion design : titres mot à mot, apparitions au défilement, inclinaison 3D + reflet, boutons aimantés,
// compteurs, braises du foyer (canvas), parallaxe, barre de progression. Uniquement transform/opacity,
// tout s'arrête hors écran ou onglet caché, et rien ne bouge si l'appareil demande moins d'animations.
(function () {
  var de = document.documentElement;
  if (!de.classList.contains('anim')) return;
  var fine = matchMedia('(pointer: fine)').matches;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var raf = function (f) { var on = false; return function (a) { if (on) return; on = true; requestAnimationFrame(function () { on = false; f(a); }); }; };

  // ---- titres découpés en mots (refait à chaque changement de langue) ----
  function split() {
    $$('main h1, main h2').forEach(function (h) {
      var tw = document.createTreeWalker(h, NodeFilter.SHOW_TEXT), nodes = [], k = 0;
      while (tw.nextNode()) if (tw.currentNode.textContent.trim() && !tw.currentNode.parentNode.closest('.w')) nodes.push(tw.currentNode);
      nodes.forEach(function (n) {
        var f = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function (w) {
          if (!w) return;
          if (/^\s+$/.test(w)) { f.appendChild(document.createTextNode(w)); return; }
          var o = document.createElement('span'), i = document.createElement('span');
          o.className = 'w'; i.textContent = w; o.appendChild(i); f.appendChild(o);
        });
        n.replaceWith(f);
      });
      $$('.w > span', h).forEach(function (s) { s.style.setProperty('--i', k++); });
      h.classList.add('words');
    });
  }

  // ---- apparitions au défilement, en cascade dans chaque groupe ----
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px' });
  function reveal() {
    $$('main h1, main h2').forEach(function (h) { io.observe(h); });
    $$('.eyebrow, .lead, .btns, .title p, .card, .studio, .app, .post, .banner, .stats > div, .swatch, .prose > *').forEach(function (el) {
      if (el.classList.contains('rv')) return;
      el.classList.add('rv');
      var sib = Array.prototype.indexOf.call(el.parentNode.children, el);
      el.style.setProperty('--d', Math.min(sib, 6) * 90 + 'ms');
      io.observe(el);
    });
  }

  // ---- compteurs ----
  var cio = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      cio.unobserve(e.target);
      var el = e.target, to = +el.dataset.count, t0 = performance.now(), dur = 1400;
      if (!to) { el.classList.add('pop'); return; }
      (function step(t) {
        var p = Math.min(1, (t - t0) / dur), v = Math.round(to * (1 - Math.pow(1 - p, 3)));
        el.textContent = v;
        if (p < 1) requestAnimationFrame(step); else el.classList.add('pop');
      })(t0);
    });
  }, { threshold: .6 });

  // ---- inclinaison 3D + reflet qui suit le curseur ----
  function tilt(el, max) {
    var r, mv = raf(function (e) {
      var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.style.transform = 'perspective(900px) rotateX(' + ((.5 - y) * max) + 'deg) rotateY(' + ((x - .5) * max) + 'deg) translateZ(0)';
      el.style.setProperty('--mx', x * 100 + '%'); el.style.setProperty('--my', y * 100 + '%');
    });
    el.addEventListener('pointerenter', function () { r = el.getBoundingClientRect(); el.classList.add('hot'); });
    el.addEventListener('pointermove', mv);
    el.addEventListener('pointerleave', function () { el.classList.remove('hot'); el.style.transform = ''; });
  }

  // ---- boutons aimantés ----
  function magnet(el) {
    var mv = raf(function (e) {
      var r = el.getBoundingClientRect();
      el.style.transform = 'translate(' + (e.clientX - r.left - r.width / 2) * .25 + 'px,' + (e.clientY - r.top - r.height / 2) * .35 + 'px)';
    });
    el.addEventListener('pointermove', mv);
    el.addEventListener('pointerleave', function () { el.style.transform = ''; });
  }

  // ---- braises qui montent du foyer ----
  function embers(cv) {
    var ctx = cv.getContext('2d'), P = [], W, H, dpr = Math.min(devicePixelRatio || 1, 2), run = false, last = 0;
    function size() { var r = cv.getBoundingClientRect(); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    function spawn() {
      return { x: W * (.5 + (Math.random() - .5) * .16), y: H * .6, vx: (Math.random() - .5) * .25, vy: -(.5 + Math.random() * 1.1),
        r: .8 + Math.random() * 2.2, life: 0, max: 90 + Math.random() * 110, ph: Math.random() * 6.28 };
    }
    function frame(t) {
      if (!run) return;
      var dt = Math.min(2.5, (t - (last || t)) / 16.7); last = t;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      if (P.length < 70 && Math.random() < .6 * dt) P.push(spawn());
      for (var i = P.length - 1; i >= 0; i--) {
        var p = P[i], k;
        p.life += dt; p.ph += .05 * dt;
        p.x += (p.vx + Math.sin(p.ph) * .35) * dt; p.y += p.vy * dt;
        k = 1 - p.life / p.max;
        if (k <= 0) { P.splice(i, 1); continue; }
        ctx.fillStyle = 'rgba(255,' + (140 + 80 * k | 0) + ',60,' + (k * .9).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (.4 + k * .6), 0, 6.283); ctx.fill();
      }
      requestAnimationFrame(frame);
    }
    function set(on) { if (on === run) return; run = on; last = 0; if (on) requestAnimationFrame(frame); }
    size(); addEventListener('resize', raf(size));
    var vis = false;
    new IntersectionObserver(function (es) { vis = es[0].isIntersecting; set(vis && !document.hidden); }).observe(cv);
    document.addEventListener('visibilitychange', function () { set(vis && !document.hidden); });
  }

  // ---- défilement : barre de progression, en-tête compact, parallaxe du héros ----
  function scroll() {
    var bar = document.createElement('div'); bar.className = 'progress'; document.body.appendChild(bar);
    var par = $$('[data-par]'), nav = document.querySelector('.nav');
    var on = raf(function () {
      var y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
      if (nav) nav.classList.toggle('small', y > 30);
      if (y < innerHeight * 1.2) par.forEach(function (el) { el.style.transform = 'translate3d(0,' + y * +el.dataset.par + 'px,0)'; });
    });
    addEventListener('scroll', on, { passive: true }); on();
  }

  document.addEventListener('langchange', function () { split(); reveal(); });
  document.addEventListener('DOMContentLoaded', function () {
    split(); reveal();
    $$('[data-count]').forEach(function (el) { el.textContent = '0'; cio.observe(el); });
    $$('.emblem canvas').forEach(embers);
    var em = document.querySelector('.emblem'); if (em) em.dataset.par = '-0.12';
    var au = document.querySelector('.aura'); if (au) au.dataset.par = '0.25';
    scroll();
    if (fine) {
      $$('.studio').forEach(function (el) { tilt(el, 10); });
      $$('.card, .app').forEach(function (el) { tilt(el, 6); });
      $$('.btn').forEach(magnet);
    }
    requestAnimationFrame(function () { de.classList.add('ready'); });
  });
})();
