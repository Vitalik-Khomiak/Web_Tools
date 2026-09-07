/* Кут у просторі та його вигляд на кресленні.

   Сцена: горизонтальна площина α, промінь OB у ній і промінь OC, який
   виходить із площини під заданим кутом. Справжній кут ∠BOC задається
   повзунком і не залежить від ракурсу; кут, який видно на кресленні, —
   це кут між проєкціями обох променів на екран, і він змінюється, коли
   куб... коли сцена обертається.

   Проєкція ортогональна, та сама, що в інструменті «Перерізи куба»:
     sx = x·cos(yaw) − y·sin(yaw)
     q  = x·sin(yaw) + y·cos(yaw)
     sy = z·cos(pitch) − q·sin(pitch)
   Оскільки проєкція лінійна, кут на кресленні рахується просто між
   проєкціями напрямних векторів, без прив'язки до довжини променів.
*/
(function (global) {
  "use strict";

  var RAY = 0.95;          // довжина променів
  var HALF = 1.15;         // півсторона квадрата площини α

  function create(canvas) {
    var st = { theta: 90, phi: 55, yaw: -0.65, pitch: -0.42, labels: true };
    var api = {};

    /* напрямні вектори променів */
    function dirB() { return [1, 0, 0]; }
    function dirC() {
      var t = st.theta * Math.PI / 180, f = st.phi * Math.PI / 180;
      return [Math.cos(t), Math.sin(t) * Math.cos(f), Math.sin(t) * Math.sin(f)];
    }

    function projWith(p, yaw, pitch) {
      var sx = p[0] * Math.cos(yaw) - p[1] * Math.sin(yaw);
      var q = p[0] * Math.sin(yaw) + p[1] * Math.cos(yaw);
      var sy = p[2] * Math.cos(pitch) - q * Math.sin(pitch);
      return [sx, sy];
    }
    function proj(p) { return projWith(p, st.yaw, st.pitch); }

    /* кут між проєкціями двох напрямків; null, якщо промінь дивиться
       точно в камеру і його проєкція вироджується в точку */
    function drawnAngle(yaw, pitch) {
      var a = projWith(dirB(), yaw, pitch), b = projWith(dirC(), yaw, pitch);
      var la = Math.hypot(a[0], a[1]), lb = Math.hypot(b[0], b[1]);
      if (la < 1e-6 || lb < 1e-6) return null;
      var cos = (a[0] * b[0] + a[1] * b[1]) / (la * lb);
      return Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
    }

    /* Перебір ракурсів: шукається такий, де кут на кресленні дорівнює target.
       Самої лише точності мало: майже точний збіг трапляється і при погляді
       майже прямовисно згори, де сцена перестає читатися як просторова.
       Тому до похибки додано штраф за відхилення від зручного нахилу
       (близько −34°) — з однаково точних ракурсів обирається найзрозуміліший. */
    function findView(target) {
      var best = null, PREF = -0.60;
      for (var yd = -180; yd < 180; yd += 1) {
        for (var pd = -70; pd <= -12; pd += 1) {
          var y = yd * Math.PI / 180, p = pd * Math.PI / 180;
          var d = drawnAngle(y, p);
          if (d == null) continue;
          var err = Math.abs(d - target);
          var score = err + 0.45 * Math.abs(p - PREF) * 180 / Math.PI * 0.1;
          if (!best || score < best.score) best = { score: score, err: err, y: y, p: p };
        }
      }
      return best;
    }

    /* який діапазон значень узагалі можна побачити за цього кута у просторі */
    function range() {
      var lo = 181, hi = -1;
      for (var yd = -180; yd < 180; yd += 2) {
        for (var pd = -85; pd <= -3; pd += 2) {
          var d = drawnAngle(yd * Math.PI / 180, pd * Math.PI / 180);
          if (d == null) continue;
          if (d < lo) lo = d;
          if (d > hi) hi = d;
        }
      }
      return [lo, hi];
    }

    function cssVar(k) {
      return getComputedStyle(document.documentElement).getPropertyValue(k).trim();
    }

    function draw() {
      var rect = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      var ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var w = rect.width, h = rect.height;
      ctx.clearRect(0, 0, w, h);

      /* масштаб рахується за кутами площини й кінцями променів,
         щоб сцена не «дихала» під час обертання */
      var probe = [[HALF,HALF,0],[HALF,-HALF,0],[-HALF,HALF,0],[-HALF,-HALF,0],
                   [0,0,0],[RAY,0,0]];
      var c = dirC();
      probe.push([c[0]*RAY, c[1]*RAY, c[2]*RAY]);
      var pts = probe.map(proj);
      var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
      var S = Math.min(w / (Math.max.apply(null, xs) - Math.min.apply(null, xs)),
                       h / (Math.max.apply(null, ys) - Math.min.apply(null, ys))) * 0.78;
      var ox = w / 2 - S * (Math.min.apply(null, xs) + Math.max.apply(null, xs)) / 2;
      var oy = h / 2 + S * (Math.min.apply(null, ys) + Math.max.apply(null, ys)) / 2;
      function sc(p) { var q = proj(p); return [ox + S * q[0], oy - S * q[1]]; }

      var ink = cssVar("--ink"), muted = cssVar("--muted"),
          soft = cssVar("--line"), cB = cssVar("--c4"), cC = cssVar("--c1"),
          acc = cssVar("--accent");

      /* площина α */
      var quad = [[-HALF,-HALF,0],[HALF,-HALF,0],[HALF,HALF,0],[-HALF,HALF,0]].map(sc);
      ctx.beginPath();
      quad.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
      ctx.closePath();
      ctx.globalAlpha = 0.10; ctx.fillStyle = ink; ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = soft; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.lineWidth = 1;
      for (var g = -2; g <= 2; g++) {
        if (g === 0) continue;
        var t = g * HALF / 2.5;
        var a1 = sc([-HALF, t, 0]), a2 = sc([HALF, t, 0]);
        var b1 = sc([t, -HALF, 0]), b2 = sc([t, HALF, 0]);
        ctx.beginPath(); ctx.moveTo(a1[0],a1[1]); ctx.lineTo(a2[0],a2[1]); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(b1[0],b1[1]); ctx.lineTo(b2[0],b2[1]); ctx.stroke();
      }

      var O = sc([0,0,0]);
      var B3 = [RAY,0,0], C3 = [c[0]*RAY, c[1]*RAY, c[2]*RAY];
      var Bp = sc(B3), Cp = sc(C3);
      var foot3 = [C3[0], C3[1], 0], Fp = sc(foot3);

      /* проєкція похилої на площину: OF і перпендикуляр CF */
      ctx.setLineDash([5,5]); ctx.strokeStyle = muted; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(Cp[0],Cp[1]); ctx.lineTo(Fp[0],Fp[1]); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(O[0],O[1]); ctx.lineTo(Fp[0],Fp[1]); ctx.stroke();
      ctx.setLineDash([]);

      /* дуга кута на кресленні */
      var vB = [Bp[0]-O[0], Bp[1]-O[1]], vC = [Cp[0]-O[0], Cp[1]-O[1]];
      var lB = Math.hypot(vB[0],vB[1]), lC = Math.hypot(vC[0],vC[1]);
      if (lB > 2 && lC > 2) {
        var aB = Math.atan2(vB[1], vB[0]), aC = Math.atan2(vC[1], vC[0]);
        var diff = aC - aB;
        while (diff > Math.PI) diff -= 2*Math.PI;
        while (diff < -Math.PI) diff += 2*Math.PI;
        var r = Math.min(38, 0.32*Math.min(lB, lC));
        ctx.strokeStyle = acc; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.arc(O[0], O[1], r, aB, aB + diff, diff < 0); ctx.stroke();
      }

      /* промені */
      ctx.lineCap = "round";
      ctx.strokeStyle = cB; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(O[0],O[1]); ctx.lineTo(Bp[0],Bp[1]); ctx.stroke();
      ctx.strokeStyle = cC;
      ctx.beginPath(); ctx.moveTo(O[0],O[1]); ctx.lineTo(Cp[0],Cp[1]); ctx.stroke();

      [[O, ink],[Bp, cB],[Cp, cC],[Fp, muted]].forEach(function (pair) {
        ctx.fillStyle = pair[1];
        ctx.beginPath(); ctx.arc(pair[0][0], pair[0][1], 4, 0, 7); ctx.fill();
      });

      if (st.labels) {
        ctx.font = '600 14px ui-monospace, "JetBrains Mono", monospace';
        ctx.lineWidth = 3.5; ctx.lineJoin = "round";
        var cx = w/2, cy = h/2;
        [[O,"O",ink],[Bp,"B",cB],[Cp,"C",cC],[Fp,"C₁",muted]].forEach(function (it) {
          var p = it[0], dx = p[0]-cx, dy = p[1]-cy, L = Math.hypot(dx,dy) || 1;
          ctx.textAlign = dx < 0 ? "right" : "left";
          ctx.textBaseline = dy < 0 ? "bottom" : "top";
          var tx = p[0] + dx/L*11, ty = p[1] + dy/L*11;
          ctx.strokeStyle = cssVar("--surface-2"); ctx.strokeText(it[1], tx, ty);
          ctx.fillStyle = it[2]; ctx.fillText(it[1], tx, ty);
        });
      }

      if (api.onChange) api.onChange({
        real: st.theta,
        drawn: drawnAngle(st.yaw, st.pitch),
        phi: st.phi
      });
    }

    /* обертання перетягуванням */
    var drag = null;
    canvas.addEventListener("pointerdown", function (e) {
      drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", function (e) {
      if (!drag) return;
      st.yaw += (e.clientX - drag.x) * 0.008;
      st.pitch += (e.clientY - drag.y) * 0.008;
      st.pitch = Math.max(-1.5, Math.min(-0.03, st.pitch));
      drag = { x: e.clientX, y: e.clientY };
      draw();
    });
    ["pointerup","pointercancel"].forEach(function (t) {
      canvas.addEventListener(t, function () { drag = null; });
    });
    window.addEventListener("resize", draw);

    api.state = st;
    api.draw = draw;
    api.setTheta = function (v) { st.theta = v; draw(); };
    api.setPhi = function (v) { st.phi = v; draw(); };
    api.setLabels = function (on) { st.labels = !!on; draw(); };
    api.range = range;
    api.lookLike = function (target) {
      var v = findView(target);
      if (!v) return null;
      st.yaw = v.y; st.pitch = v.p; draw();
      return drawnAngle(st.yaw, st.pitch);
    };
    api.fromAbove = function () {
      st.pitch = -1.48; draw();
    };
    api.randomView = function () {
      st.yaw = (Math.random()*2 - 1) * Math.PI;
      st.pitch = -(0.15 + Math.random()*1.1);
      draw();
    };
    return api;
  }

  global.SpaceAngle = { create: create };
})(window);
