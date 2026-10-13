// En-tête et pied de page communs à toutes les pages, puis langue : choix mémorisé, sinon langue de l'appareil, sinon anglais.
// L'anglais est écrit dans les pages ; les autres langues viennent de i18n.js (éléments data-i="clé").
(function () {
  var SUP = ['en', 'fr'], de = document.documentElement, l;
  try { l = localStorage.getItem('l'); } catch (e) {}
  if (SUP.indexOf(l) < 0) {
    l = 'en';
    var ls = navigator.languages || [navigator.language || 'en'];
    for (var i = 0; i < ls.length; i++) { var c = (ls[i] || '').slice(0, 2).toLowerCase(); if (SUP.indexOf(c) >= 0) { l = c; break; } }
  }
  de.lang = l;

  var HEADER =
    '<div class="wrap"><a class="brand" href="/"><img src="/img/hearthold.svg" alt="" width="32" height="32">Hearthold</a>' +
    '<nav><div class="links">' +
    '<a href="/studios.html" data-i="n1">Studios</a><a href="/catalogue.html" data-i="n2">Games &amp; apps</a>' +
    '<a href="/news.html" data-i="n3">News</a><a href="/press.html" data-i="n4">Press</a><a href="/contact.html" data-i="n5">Contact</a></div>' +
    '<label class="lang"><span class="sr">Language</span><select aria-label="Language"><option value="en">EN</option><option value="fr">FR</option></select></label>' +
    '<button class="menu" aria-label="Menu" aria-expanded="false">☰</button></nav></div>';
  var FOOTER =
    '<div class="wrap"><div class="cols">' +
    '<div><a class="brand" href="/"><img src="/img/hearthold.svg" alt="" width="32" height="32">Hearthold</a>' +
    '<p style="margin-top:12px" data-i="f1">An independent house of studios, based in France. Games and apps crafted with care, built to last.</p></div>' +
    '<div><h4 data-i="f2">Our studios</h4><a href="https://moonbeamstudio.github.io/">Moon Beam Studio</a><a href="/studios.html#first-light">First Light</a></div>' +
    '<div><h4 data-i="f3">The house</h4><a href="/news.html" data-i="n3">News</a><a href="/press.html" data-i="n4">Press</a><a href="/contact.html" data-i="n5">Contact</a><a href="/legal.html" data-i="f4">Legal &amp; privacy</a></div>' +
    '</div><div class="base">© <span class="yr"></span> Hearthold · <span data-i="f5">Made in France</span></div></div>';

  function apply() {
    var t = (window.I18N || {})[l];
    document.querySelectorAll('[data-i]').forEach(function (e) {
      if (e.dataset.en == null) e.dataset.en = e.innerHTML;
      var v = l !== 'en' && t ? t[e.dataset.i] : null;
      e.innerHTML = v != null ? v : e.dataset.en;
    });
    document.querySelectorAll('.lang select').forEach(function (s) { s.value = l; });
    de.lang = l;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var h = document.querySelector('header.nav'), f = document.querySelector('footer');
    if (h) h.innerHTML = HEADER;
    if (f) f.innerHTML = FOOTER;
    document.querySelectorAll('.yr').forEach(function (y) { y.textContent = new Date().getFullYear(); });
    var page = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav .links a').forEach(function (a) { if (a.getAttribute('href') === '/' + page) a.setAttribute('aria-current', 'page'); });
    var btn = document.querySelector('.menu');
    if (btn) btn.addEventListener('click', function () { var o = h.classList.toggle('open'); btn.setAttribute('aria-expanded', o); });
    apply();
  });
  document.addEventListener('change', function (e) {
    if (e.target.closest && e.target.closest('.lang')) { l = e.target.value; try { localStorage.setItem('l', l); } catch (x) {} apply(); }
  });
})();
