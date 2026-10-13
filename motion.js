// Animations des pages de contenu : titres mot à mot, apparitions en cascade au défilement, barre de progression.
// Uniquement transform/opacity. Rien ne bouge si l'appareil demande moins d'animations (classe .anim absente).
(function () {
  var de = document.documentElement;
  if (!de.classList.contains('anim')) return;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var outside = function (el) { return !el.closest('.layer'); };

  function split() {
    $$('main h1, main h2').filter(outside).forEach(function (h) {
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
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px' });
  function reveal() {
    $$('main h1, main h2').filter(outside).forEach(function (h) { io.observe(h); });
    $$('main .eyebrow, main .lead, main .btns, .title p, .card, .studio, .app, .post, .banner, .swatch, .prose > *').filter(outside).forEach(function (el) {
      if (el.classList.contains('rv')) return;
      el.classList.add('rv');
      el.style.setProperty('--d', Math.min(Array.prototype.indexOf.call(el.parentNode.children, el), 6) * 90 + 'ms');
      io.observe(el);
    });
  }
  document.addEventListener('langchange', function () { split(); reveal(); });
  document.addEventListener('DOMContentLoaded', function () {
    split(); reveal();
    var bar = document.createElement('div'); bar.className = 'progress'; document.body.appendChild(bar);
    var on = false;
    addEventListener('scroll', function () {
      if (on) return; on = true;
      requestAnimationFrame(function () {
        on = false;
        var max = de.scrollHeight - innerHeight;
        bar.style.transform = 'scaleX(' + (max > 0 ? scrollY / max : 0) + ')';
      });
    }, { passive: true });
  });
})();
