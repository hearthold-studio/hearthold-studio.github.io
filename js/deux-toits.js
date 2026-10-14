// Page Deux Toits : la semaine d'un enfant entre deux toits, pilotée par le défilement (p de 0 à 1).
// Les deux toits de l'icône, le point = l'enfant, qui dort sous le toit éclairé ; le vendredi il traverse,
// puis les toits se rejoignent et la scène devient l'icône de l'app.
// Uniquement transform/opacity (et le tracé des traits). Sans animation (« réduire les animations ») : image fixe.
(function () {
  var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var seg = function (p, a, b) { return clamp((p - a) / (b - a)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var io = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var out = function (t) { return 1 - Math.pow(1 - t, 3); };

  // L'écran reproduit l'app, qui est en français.
  var DAYS = ['Lundi 12 octobre', 'Mardi 13 octobre', 'Mercredi 14 octobre', 'Jeudi 15 octobre', 'Vendredi 16 octobre', 'Samedi 17 octobre', 'Dimanche 18 octobre'];
  var T0 = .14, T1 = .8, TRAVEL = [.52, .62], HOME = .57, BAG = [.4, .62], TICKS = [.44, .47, .5], FIN = [.8, .93];

  document.addEventListener('DOMContentLoaded', function () {
    var sec = document.querySelector('.dts');
    if (!sec) return;
    var q = function (s) { return sec.querySelector(s); }, qa = function (s) { return sec.querySelectorAll(s); };
    var pin = q('.dts-pin'), phone = q('.dts-phone'), screen = q('.dts-screen');
    var roofB = q('.dts-roof.b'), roofO = q('.dts-roof.o'), dot = q('.dts-dot'), glowB = q('.dts-glow.b'), glowO = q('.dts-glow.o'), trail = q('.dts-trail');
    var caps = qa('.dts-caps p'), cells = qa('.dts-week i'), items = qa('.dts-bag li'), date = q('.dts-date');
    var still = !document.documentElement.classList.contains('anim');
    var L, trailLen = 1, last = {};

    function layout() {
      var w = pin.clientWidth, h = pin.clientHeight, mob = w < 760 || w / h < .9;
      var H = mob ? Math.min(h * .52, 520, w * 1.1) : Math.min(h * .68, 620), W = H * .5;
      var cx = w / 2, cy = mob ? h * .58 : h * .5;
      var R = mob ? Math.min(w * .25, 120) : Math.min(W * .66, (w - W) / 2 * .5, 230);
      var off = mob ? w * .25 : W / 2 + Math.max(R * .95, Math.min((w - W) / 4.4, 250));
      var ry = mob ? Math.max(76 + R * .3, (76 + cy - H / 2) / 2 - R * .12) : cy - H * .1;
      var RF = mob ? Math.min(w * .42, 220) : Math.min(h * .38, 380, w * .4), ly = h * (mob ? .53 : .47) - RF * .22;
      L = { w: w, h: h, H: H, W: W, cx: cx, cy: cy, R: R, ry: ry, dy: ry + R * .506, bx: cx - off, ox: cx + off,
            RF: RF, ly: ly, lbx: cx - RF * .3256, lox: cx + RF * .3256, ldy: ly + RF * .506 };
      // trajet du changement de maison : une courbe douce sous les toits, qui passe devant l'écran
      // (l'écran bascule sur « Chez Papa » quand l'enfant le traverse)
      var low = L.dy + (mob ? Math.min(R * .5, cy - H / 2 - L.dy - R * .2) : H * .1);
      L.cyq = 2 * low - L.dy;
      trail.setAttribute('d', 'M' + L.ox + ' ' + L.dy + ' Q' + cx + ' ' + L.cyq + ' ' + L.bx + ' ' + L.dy);
      trailLen = trail.getTotalLength() || 1;
      trail.style.strokeDasharray = trailLen + ' ' + (trailLen + 10);
      var gr = sec.querySelector('#dtsTrail');
      gr.setAttribute('x1', L.ox); gr.setAttribute('x2', L.bx); gr.setAttribute('y1', 0); gr.setAttribute('y2', 0);
      phone.style.setProperty('--pw', W + 'px');
      phone.style.setProperty('--ph', H + 'px');
      last = {};
    }

    function place(el, x, y, s, sy) { el.setAttribute('transform', 'translate(' + x.toFixed(2) + ' ' + y.toFixed(2) + ') scale(' + s.toFixed(3) + ' ' + (s * (sy == null ? 1 : sy)).toFixed(3) + ')'); }
    var back = function (t) { var c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
    function toggle(key, el, cls, on) { if (last[key] !== on) { last[key] = on; el.classList.toggle(cls, on); } }

    function render(p) {
      var f = io(seg(p, FIN[0], FIN[1])), t = io(seg(p, TRAVEL[0], TRAVEL[1]));

      // les deux toits : un trait plat qui se lève en toit, puis les deux se rejoignent en icône à la fin
      var uB = seg(p, .02, .13), uO = seg(p, .05, .16);
      roofB.style.opacity = seg(p, .02, .04); roofO.style.opacity = seg(p, .05, .07);
      var s = lerp(L.R, L.RF, f), y = lerp(L.ry, L.ly, f);
      place(roofB, lerp(L.bx, L.lbx, f), y + (1 - out(uB)) * L.R * .25, s, Math.max(.02, back(uB)));
      place(roofO, lerp(L.ox, L.lox, f), y + (1 - out(uO)) * L.R * .25, s, Math.max(.02, back(uO)));

      // l'enfant : sous le toit de Maman, traverse le vendredi, puis se pose sous l'icône
      var u = 1 - t, x = u * u * L.ox + 2 * u * t * L.cx + t * t * L.bx, yy = u * u * L.dy + 2 * u * t * L.cyq + t * t * L.dy;
      var hop = Math.sin(Math.PI * t) * .1;   // un peu plus gros en plein vol
      place(dot, lerp(x, L.cx, f), lerp(yy, L.ldy, f), lerp(L.R * (1 + hop), L.RF, f));
      dot.style.opacity = seg(p, .12, .17);
      var g = seg(p, .14, .22) * (1 - f) * .9;
      place(glowO, L.ox, L.dy - L.R * .2, L.R * 1.05); glowO.style.opacity = g * (1 - t);
      place(glowB, L.bx, L.dy - L.R * .2, L.R * 1.05); glowB.style.opacity = g * t;
      trail.style.strokeDashoffset = trailLen * (1 - t);
      trail.style.opacity = .7 * (1 - seg(p, .66, .76)) * (t > 0 ? 1 : 0);

      // le téléphone : entre en pivotant doucement, tourne pendant la semaine, s'efface pour l'icône
      var e = out(seg(p, 0, .12)), turn = io(seg(p, 0, FIN[0]));
      var ph = io(seg(p, FIN[0] - .03, FIN[0] + .04));
      phone.style.transform = 'translate3d(' + (L.cx - L.W / 2).toFixed(1) + 'px,' + (L.cy - L.H / 2 + (1 - e) * L.H * .14 + ph * L.H * .08).toFixed(1) + 'px,0)' +
        ' rotateX(' + lerp(16, 3, e).toFixed(2) + 'deg) rotateY(' + lerp(-16, 9, turn).toFixed(2) + 'deg) scale(' + (lerp(.9, 1, e) * lerp(1, .88, ph)).toFixed(4) + ')';
      phone.style.opacity = e * (1 - ph);
      phone.style.setProperty('--sh', lerp(-60, 60, turn).toFixed(1) + '%');

      // l'écran : un jour par étape, le sac la veille, « Chez Papa » à l'arrivée
      var d = Math.min(6, Math.max(0, Math.floor(seg(p, T0, T1) * 7)));
      if (last.d !== d) {
        last.d = d; date.textContent = DAYS[d];
        cells.forEach(function (c, i) { c.classList.toggle('now', i === d); });
      }
      toggle('papa', screen, 'papa', p >= HOME);
      toggle('bag', screen, 'bag', p >= BAG[0] && p < BAG[1]);
      items.forEach(function (it, i) { toggle('i' + i, it, 'ok', p >= TICKS[i]); });

      var c = p < .34 ? 0 : p < .575 ? 1 : p < FIN[0] - .02 ? 2 : p > FIN[0] + .06 ? 3 : -1;
      if (last.c !== c) { last.c = c; caps.forEach(function (el, i) { el.classList.toggle('on', i === c); }); }
    }

    function progress() {
      var r = sec.getBoundingClientRect(), span = sec.offsetHeight - pin.clientHeight;
      return span > 0 ? clamp(-r.top / span) : 0;
    }
    var queued = false;
    function frame() { queued = false; render(still ? .3 : progress()); }
    function request() { if (!queued) { queued = true; requestAnimationFrame(frame); } }

    if (still) sec.classList.add('static');
    layout(); frame();
    sec.classList.add('ready');
    addEventListener('resize', function () { layout(); request(); });
    if (!still) addEventListener('scroll', request, { passive: true });
  });
})();
