/* Двогранний кут: ребро-гребінь і дві грані, що сходяться на ньому.

   Сцена: "дах" — дві прямокутні грані (A,B,B1,A1) і (A,B,B2,A2), що
   сходяться на горизонтальному ребрі AB. Двогранний кут між гранями
   задається повзунком і не залежить від ракурсу.

   Кут "на кресленні" — це кут між проєкціями лінійного кута: двох
   променів OP і OQ, перпендикулярних до ребра, по одному в кожній грані,
   з точки O на середині ребра. Це та сама побудова лінійного кута
   двогранного кута, яку доводять у стереометрії — тут вона намальована
   явно (пунктир), а не лишається уявною.

   Проєкція ортогональна, та сама, що в «Перерізах куба» і «Прямому куті»:
     sx = x·cos(yaw) − y·sin(yaw)
     q  = x·sin(yaw) + y·cos(yaw)
     sy = z·cos(pitch) − q·sin(pitch)
   Ребро лежить уздовж осі X. При yaw=90°, pitch=0° обидва доданки з x
   зникають (sx=−y, sy=z): ребро проєктується в точку, а кут на кресленні
   математично збігається зі справжнім — не наближено, а точно.
*/
(function (global) {
  "use strict";

  var HALF = 0.85;   // половина довжини ребра
  var SLANT = 0.95;  // довжина грані від ребра до карниза
  var RAYLEN = 0.5;  // довжина променів лінійного кута (коротші за грань)

  function create(canvas) {
    var st = { theta: 90, yaw: -0.65, pitch: -0.42, labels: true };
    var api = {};

    /* напрямні вектори лінійного кута в перерізі, перпендикулярному ребру */
    function dir1() {
      var b = st.theta * Math.PI / 360; // половина кута, в радіанах
      return [0, Math.sin(b), -Math.cos(b)];
    }
    function dir2() {
      var b = st.theta * Math.PI / 360;
      return [0, -Math.sin(b), -Math.cos(b)];
    }

    function projWith(p, yaw, pitch) {
      var sx = p[0] * Math.cos(yaw) - p[1] * Math.sin(yaw);
      var q = p[0] * Math.sin(yaw) + p[1] * Math.cos(yaw);
      var sy = p[2] * Math.cos(pitch) - q * Math.sin(pitch);
      return [sx, sy];
    }
    function proj(p) { return projWith(p, st.yaw, st.pitch); }

    /* кут між проєкціями лінійного кута; null, якщо один із променів
       дивиться точно в камеру і його проєкція вироджується в точку */
    function drawnAngle(yaw, pitch) {
      var a = projWith(dir1(), yaw, pitch), b = projWith(dir2(), yaw, pitch);
      var la = Math.hypot(a[0], a[1]), lb = Math.hypot(b[0], b[1]);
      if (la < 1e-6 || lb < 1e-6) return null;
      var cos = (a[0] * b[0] + a[1] * b[1]) / (la * lb);
      return Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
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

    function verts() {
      var d1 = dir1(), d2 = dir2();
      var P1 = [d1[0] * SLANT, d1[1] * SLANT, d1[2] * SLANT];
      var P2 = [d2[0] * SLANT, d2[1] * SLANT, d2[2] * SLANT];
      return {
        A: [-HALF, 0, 0], B: [HALF, 0, 0],
        A1: [-HALF, P1[1], P1[2]], B1: [HALF, P1[1], P1[2]],
        A2: [-HALF, P2[1], P2[2]], B2: [HALF, P2[1], P2[2]]
      };
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

      var V = verts();
      var probe = [V.A, V.B, V.A1, V.B1, V.A2, V.B2];
      var pts = probe.map(proj);
      var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
      var S = Math.min(w / (Math.max.apply(null, xs) - Math.min.apply(null, xs)),
                       h / (Math.max.apply(null, ys) - Math.min.apply(null, ys))) * 0.72;
      var ox = w / 2 - S * (Math.min.apply(null, xs) + Math.max.apply(null, xs)) / 2;
      var oy = h / 2 + S * (Math.min.apply(null, ys) + Math.max.apply(null, ys)) / 2;
      function sc(p) { var q = proj(p); return [ox + S * q[0], oy - S * q[1]]; }

      var ink = cssVar("--ink"), muted = cssVar("--muted"),
          soft = cssVar("--line"), c1 = cssVar("--c1"), c4 = cssVar("--c4"),
          acc = cssVar("--accent");

      function poly(pts3, fill, alpha, stroke, lw) {
        var p = pts3.map(sc);
        ctx.beginPath();
        p.forEach(function (q, i) { i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); });
        ctx.closePath();
        if (fill) { ctx.globalAlpha = alpha; ctx.fillStyle = fill; ctx.fill(); ctx.globalAlpha = 1; }
        if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1.5; ctx.stroke(); }
      }

      /* торці призми — лише натяк на тіло, не головний зміст */
      poly([V.A, V.A1, V.A2], ink, 0.07, soft, 1);
      poly([V.B, V.B1, V.B2], ink, 0.07, soft, 1);

      /* дві підсвічені грані */
      poly([V.A, V.B, V.B1, V.A1], c4, 0.30, c4, 2);
      poly([V.A, V.B, V.B2, V.A2], c1, 0.30, c1, 2);

      /* ребро */
      var Ap = sc(V.A), Bp = sc(V.B);
      ctx.lineCap = "round";
      ctx.strokeStyle = acc; ctx.lineWidth = 3.2;
      ctx.beginPath(); ctx.moveTo(Ap[0], Ap[1]); ctx.lineTo(Bp[0], Bp[1]); ctx.stroke();

      /* лінійний кут: промені OP, OQ з середини ребра, перпендикулярні до нього */
      var d1 = dir1(), d2 = dir2();
      var O3 = [0, 0, 0];
      var P3 = [0, d1[1] * RAYLEN, d1[2] * RAYLEN];
      var Q3 = [0, d2[1] * RAYLEN, d2[2] * RAYLEN];
      var Op = sc(O3), Pp = sc(P3), Qp = sc(Q3);

      ctx.setLineDash([5, 5]); ctx.strokeStyle = ink; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(Op[0], Op[1]); ctx.lineTo(Pp[0], Pp[1]); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(Op[0], Op[1]); ctx.lineTo(Qp[0], Qp[1]); ctx.stroke();
      ctx.setLineDash([]);

      /* дуга кута на кресленні */
      var vP = [Pp[0] - Op[0], Pp[1] - Op[1]], vQ = [Qp[0] - Op[0], Qp[1] - Op[1]];
      var lP = Math.hypot(vP[0], vP[1]), lQ = Math.hypot(vQ[0], vQ[1]);
      if (lP > 2 && lQ > 2) {
        var aP = Math.atan2(vP[1], vP[0]), aQ = Math.atan2(vQ[1], vQ[0]);
        var diff = aQ - aP;
        while (diff > Math.PI) diff -= 2 * Math.PI;
        while (diff < -Math.PI) diff += 2 * Math.PI;
        var r = Math.min(34, 0.35 * Math.min(lP, lQ));
        ctx.strokeStyle = acc; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.arc(Op[0], Op[1], r, aP, aP + diff, diff < 0); ctx.stroke();
      }

      [[Op, acc], [Pp, muted], [Qp, muted]].forEach(function (pair) {
        ctx.fillStyle = pair[1];
        ctx.beginPath(); ctx.arc(pair[0][0], pair[0][1], 4, 0, 7); ctx.fill();
      });

      if (st.labels) {
        ctx.font = '600 14px ui-monospace, "JetBrains Mono", monospace';
        ctx.lineWidth = 3.5; ctx.lineJoin = "round";
        var cx = w / 2, cy = h / 2;
        [[Op, "O", acc], [Pp, "P", muted], [Qp, "Q", muted]].forEach(function (it) {
          var p = it[0], dx = p[0] - cx, dy = p[1] - cy, L = Math.hypot(dx, dy) || 1;
          ctx.textAlign = dx < 0 ? "right" : "left";
          ctx.textBaseline = dy < 0 ? "bottom" : "top";
          var tx = p[0] + dx / L * 11, ty = p[1] + dy / L * 11;
          ctx.strokeStyle = cssVar("--surface-2"); ctx.strokeText(it[1], tx, ty);
          ctx.fillStyle = it[2]; ctx.fillText(it[1], tx, ty);
        });
      }

      if (api.onChange) api.onChange({
        real: st.theta,
        drawn: drawnAngle(st.yaw, st.pitch)
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
      st.pitch = Math.max(-1.5, Math.min(-0.05, st.pitch));
      drag = { x: e.clientX, y: e.clientY };
      draw();
    });
    ["pointerup", "pointercancel"].forEach(function (t) {
      canvas.addEventListener(t, function () { drag = null; });
    });
    window.addEventListener("resize", draw);

    api.state = st;
    api.draw = draw;
    api.setTheta = function (v) { st.theta = v; draw(); };
    api.setLabels = function (on) { st.labels = !!on; draw(); };
    api.range = range;
    api.lookAlongEdge = function () {
      st.yaw = Math.PI / 2; st.pitch = 0; draw();
    };
    api.fromAbove = function () {
      st.pitch = -1.48; draw();
    };
    api.randomView = function () {
      st.yaw = (Math.random() * 2 - 1) * Math.PI;
      st.pitch = -(0.15 + Math.random() * 1.1);
      draw();
    };
    return api;
  }

  global.DihedralAngle = { create: create };
})(window);
