/* Модель перерізу куба січною площиною.
   Спільний рушій для сторінки учня (index.html) і пульта вчителя (vchytel.html).

   Кількість сторін перерізу рахується перетином площини з кожним із 12 ребер
   куба: якщо значення рівняння площини в кінцях ребра має різні знаки, площина
   перетинає це ребро й дає одну вершину перерізу. Площину, що проходить через
   вершину куба, модель відкидає — за умовою задачі такі не розглядаються.

   Той самий алгоритм використано в скрипті, яким намальовано рисунки друкованої
   картки завдання (МЕТОДИКА/_службове/завдання_Д7_дошка_перерізи.py).
*/
(function (global) {
  "use strict";

  var VERT = [[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
  var LBL  = ["A","B","C","D","A₁","B₁","C₁","D₁"];
  var EDGES = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];

  /* дві грані, суміжні з ребром */
  var EDGE_FACES = EDGES.map(function (e) {
    var f = [];
    for (var k = 0; k < 3; k++) if (VERT[e[0]][k] === VERT[e[1]][k]) {
      var n = [0,0,0]; n[k] = VERT[e[0]][k] === 1 ? 1 : -1; f.push(n);
    }
    return f;
  });

  var WORDS = {3:"трикутник", 4:"чотирикутник", 5:"п’ятикутник", 6:"шестикутник"};

  function section(n, d, tol) {
    tol = tol || 1e-7;
    var f = VERT.map(function (v) { return n[0]*v[0] + n[1]*v[1] + n[2]*v[2] - d; });
    for (var i = 0; i < 8; i++) if (Math.abs(f[i]) < tol) return {vertexHit:true, pts:[]};
    var pts = [];
    for (var e = 0; e < EDGES.length; e++) {
      var a = EDGES[e][0], b = EDGES[e][1];
      if (f[a] * f[b] < 0) {
        var t = f[a] / (f[a] - f[b]);
        pts.push([0,1,2].map(function (k) { return VERT[a][k] + t*(VERT[b][k]-VERT[a][k]); }));
      }
    }
    if (pts.length < 3) return {vertexHit:false, pts:[]};
    var ref = Math.abs(n[0]) < 0.9 ? [1,0,0] : [0,1,0];
    var u = [n[1]*ref[2]-n[2]*ref[1], n[2]*ref[0]-n[0]*ref[2], n[0]*ref[1]-n[1]*ref[0]];
    var ul = Math.sqrt(u[0]*u[0]+u[1]*u[1]+u[2]*u[2]);
    u = u.map(function (c) { return c/ul; });
    var v = [n[1]*u[2]-n[2]*u[1], n[2]*u[0]-n[0]*u[2], n[0]*u[1]-n[1]*u[0]];
    var c0 = [0,1,2].map(function (k) {
      return pts.reduce(function (s,p) { return s+p[k]; }, 0) / pts.length; });
    pts.sort(function (p, q) { return ang(p) - ang(q); });
    function ang(p) {
      var r = [p[0]-c0[0], p[1]-c0[1], p[2]-c0[2]];
      return Math.atan2(r[0]*v[0]+r[1]*v[1]+r[2]*v[2], r[0]*u[0]+r[1]*u[1]+r[2]*u[2]);
    }
    return {vertexHit:false, pts:pts};
  }

  function dRange(n) {
    var lo = Infinity, hi = -Infinity;
    for (var i = 0; i < 8; i++) {
      var s = n[0]*VERT[i][0] + n[1]*VERT[i][1] + n[2]*VERT[i][2];
      if (s < lo) lo = s; if (s > hi) hi = s;
    }
    return [lo, hi];
  }

  function create(canvas) {
    var st = { alpha: 54.7356, beta: 45, t: 0.5, yaw: -0.31, pitch: -0.63, labels: false };
    var api = {};

    function normal() {
      var a = st.alpha*Math.PI/180, b = st.beta*Math.PI/180;
      return [Math.sin(a)*Math.cos(b), Math.sin(a)*Math.sin(b), Math.cos(a)];
    }
    function plane() {
      var n = normal(), r = dRange(n);
      return { n:n, d: r[0] + (r[1]-r[0])*st.t };
    }
    function proj(p) {
      var x = p[0]-0.5, y = p[1]-0.5, z = p[2]-0.5;
      var sx = x*Math.cos(st.yaw) - y*Math.sin(st.yaw);
      var q  = x*Math.sin(st.yaw) + y*Math.cos(st.yaw);
      var sy = z*Math.cos(st.pitch) - q*Math.sin(st.pitch);
      return [sx, sy];
    }
    /* напрям на камеру = векторний добуток екранних осей (право × вгору) */
    function viewDir() {
      return [-Math.sin(st.yaw)*Math.cos(st.pitch),
              -Math.cos(st.yaw)*Math.cos(st.pitch),
              -Math.sin(st.pitch)];
    }
    function hiddenEdges() {
      var w = viewDir();
      return EDGES.map(function (_, i) {
        return EDGE_FACES[i].every(function (n) {
          return n[0]*w[0] + n[1]*w[1] + n[2]*w[2] <= 0;
        });
      });
    }
    /* ракурс, з якого переріз видно розкрито, а куб лишається у звичному
       вигляді: yaw ∈ (−90°,0°) і pitch < 0 дають погляд згори-спереду
       з прихованою вершиною D */
    function bestView(n) {
      var best = null;
      for (var yd = -84; yd <= -8; yd++) for (var pd = -40; pd <= -18; pd++) {
        var y = yd*Math.PI/180, p = pd*Math.PI/180;
        var w = [-Math.sin(y)*Math.cos(p), -Math.cos(y)*Math.cos(p), -Math.sin(p)];
        var open = Math.abs(n[0]*w[0] + n[1]*w[1] + n[2]*w[2]);
        var s = Math.min(open, 0.8) + 0.3*Math.min(Math.abs(w[0]), Math.abs(w[1]), Math.abs(w[2]));
        if (!best || s > best.s) best = {s:s, y:y, p:p};
      }
      return best;
    }

    function cssVar(k) {
      return getComputedStyle(document.documentElement).getPropertyValue(k).trim();
    }
    var COLOR = {3:"--c1", 4:"--c2", 5:"--c3", 6:"--c4"};

    function draw() {
      var rect = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width*dpr);
      canvas.height = Math.round(rect.height*dpr);
      var ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var w = rect.width, h = rect.height;
      ctx.clearRect(0, 0, w, h);

      var P = VERT.map(proj);
      var xs = P.map(function (p) { return p[0]; }), ys = P.map(function (p) { return p[1]; });
      var S = Math.min(w/(Math.max.apply(null,xs)-Math.min.apply(null,xs)),
                       h/(Math.max.apply(null,ys)-Math.min.apply(null,ys))) * 0.72;
      var ox = w/2 - S*(Math.min.apply(null,xs)+Math.max.apply(null,xs))/2;
      var oy = h/2 + S*(Math.min.apply(null,ys)+Math.max.apply(null,ys))/2;
      function sc(p) { var q = proj(p); return [ox + S*q[0], oy - S*q[1]]; }

      var ink = cssVar("--ink"), muted = cssVar("--muted");
      var pl = plane(), res = section(pl.n, pl.d);
      var k = res.pts.length, col = cssVar(COLOR[k] || "--muted");
      var hid = hiddenEdges();

      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.strokeStyle = muted; ctx.lineWidth = 1.4; ctx.setLineDash([5,5]);
      EDGES.forEach(function (e, i) {
        if (!hid[i]) return;
        var p = sc(VERT[e[0]]), q = sc(VERT[e[1]]);
        ctx.beginPath(); ctx.moveTo(p[0],p[1]); ctx.lineTo(q[0],q[1]); ctx.stroke();
      });
      ctx.setLineDash([]); ctx.strokeStyle = ink; ctx.lineWidth = 2;
      EDGES.forEach(function (e, i) {
        if (hid[i]) return;
        var p = sc(VERT[e[0]]), q = sc(VERT[e[1]]);
        ctx.beginPath(); ctx.moveTo(p[0],p[1]); ctx.lineTo(q[0],q[1]); ctx.stroke();
      });

      if (res.pts.length >= 3) {
        var pp = res.pts.map(sc);
        ctx.beginPath();
        pp.forEach(function (p, i) { i ? ctx.lineTo(p[0],p[1]) : ctx.moveTo(p[0],p[1]); });
        ctx.closePath();
        ctx.globalAlpha = 0.22; ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = 1;
        ctx.strokeStyle = col; ctx.lineWidth = 3.4; ctx.stroke();
        ctx.fillStyle = col;
        pp.forEach(function (p) { ctx.beginPath(); ctx.arc(p[0],p[1],4.6,0,7); ctx.fill(); });
      }

      ctx.fillStyle = ink;
      VERT.forEach(function (v) { var p = sc(v); ctx.beginPath(); ctx.arc(p[0],p[1],2.6,0,7); ctx.fill(); });
      if (st.labels) {
        ctx.font = '600 13px ui-monospace, "JetBrains Mono", monospace';
        ctx.lineWidth = 3.5;
        var cx = w/2, cy = h/2;
        VERT.forEach(function (v, i) {
          var p = sc(v), dx = p[0]-cx, dy = p[1]-cy, L = Math.hypot(dx,dy) || 1;
          ctx.textAlign = dx < 0 ? "right" : "left";
          ctx.textBaseline = dy < 0 ? "bottom" : "top";
          var tx = p[0] + dx/L*9, ty = p[1] + dy/L*9;
          ctx.strokeStyle = cssVar("--surface-2"); ctx.strokeText(LBL[i], tx, ty);
          ctx.fillStyle = muted; ctx.fillText(LBL[i], tx, ty);
        });
      }

      if (api.onChange) api.onChange({
        sides: k,
        vertexHit: res.vertexHit,
        name: WORDS[k] || null,
        alpha: st.alpha, beta: st.beta, t: st.t
      });
    }

    /* --- керування --- */
    var drag = null;
    canvas.addEventListener("pointerdown", function (e) {
      drag = {x:e.clientX, y:e.clientY}; canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", function (e) {
      if (!drag) return;
      st.yaw += (e.clientX-drag.x)*0.008;
      st.pitch += (e.clientY-drag.y)*0.008;
      st.pitch = Math.max(-1.35, Math.min(1.35, st.pitch));
      drag = {x:e.clientX, y:e.clientY};
      draw();
    });
    ["pointerup","pointercancel"].forEach(function (t) {
      canvas.addEventListener(t, function () { drag = null; });
    });
    window.addEventListener("resize", draw);

    api.state = st;
    api.draw = draw;
    api.setAngles = function (a, b, t) {
      if (a != null) st.alpha = a;
      if (b != null) st.beta = b;
      if (t != null) st.t = t;
      draw();
    };
    api.setLabels = function (on) { st.labels = !!on; draw(); };
    api.setFromND = function (nRaw, dRaw) {
      var len = Math.sqrt(nRaw[0]*nRaw[0]+nRaw[1]*nRaw[1]+nRaw[2]*nRaw[2]);
      var n = nRaw.map(function (c) { return c/len; }), d = dRaw/len;
      st.alpha = Math.acos(Math.max(-1, Math.min(1, n[2])))*180/Math.PI;
      st.beta = ((Math.atan2(n[1], n[0])*180/Math.PI) + 360) % 360;
      var r = dRange(n);
      st.t = (d - r[0]) / (r[1] - r[0]);
      draw();
    };
    api.alignView = function () {
      var v = bestView(normal()); st.yaw = v.y; st.pitch = v.p; draw();
    };
    api.random = function () {
      var tries = 0, res;
      do {
        st.alpha = Math.acos(2*Math.random()-1)*180/Math.PI;
        st.beta = Math.random()*360;
        st.t = 0.08 + Math.random()*0.84;
        var pl = plane(); res = section(pl.n, pl.d);
        tries++;
      } while (res.pts.length < 3 && tries < 40);
      draw();
    };
    /* перебір випадкових площин: емпірична перевірка, не доведення */
    api.search = function (count) {
      var best = 0, checked = 0, hist = {};
      for (var i = 0; i < count; i++) {
        var a = Math.acos(2*Math.random()-1), b = Math.random()*2*Math.PI;
        var n = [Math.sin(a)*Math.cos(b), Math.sin(a)*Math.sin(b), Math.cos(a)];
        var r = dRange(n), d = r[0] + (r[1]-r[0])*Math.random();
        var s = section(n, d);
        if (s.vertexHit || s.pts.length < 3) continue;
        checked++;
        hist[s.pts.length] = (hist[s.pts.length] || 0) + 1;
        if (s.pts.length > best) best = s.pts.length;
      }
      return {checked:checked, max:best, hist:hist};
    };
    return api;
  }

  global.CubeSection = { create: create, WORDS: WORDS };
})(window);
