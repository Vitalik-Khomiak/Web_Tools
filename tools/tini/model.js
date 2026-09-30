/* Тіні: тіло, джерело світла, тінь на землі — і обернена задача.

   Два тіла з ОДНАКОВОЮ квадратною основою: куб і піраміда. При світлі
   точно згори (висота 90°) вони відкидають однакову тінь — саму основу,
   бо кожна точка тіла зсувається на землю на v.z·ctg(висота)·(cosφ,sinφ),
   а при висоті 90° ctg=0 і зсуву немає взагалі. Під будь-яким іншим кутом
   тіні різні: у куба — шестикутник (чотири верхні вершини зсуваються,
   чотири нижні лишаються на місці), у піраміди — п'ятикутник (зсувається
   лише вершина). Це та сама неоднозначність, яку обернена задача дає
   виявити самостійно: одного ракурсу світла для відповіді не досить.

   Тінь опуклого тіла під паралельним світлом — опукла оболонка тіней його
   вершин (стандартний факт для опуклих багатогранників), тому геометрія
   тіні зведена до проєкції вершин і алгоритму опуклої оболонки (Andrew's
   monotone chain, без бібліотек — як і скрізь на сайті).

   Приховані ребра тіла рахуються тим самим способом, що в «Перерізах
   куба»: ребро сховане, якщо обидві сусідні грані відвернені від камери.
*/
(function (global) {
  "use strict";

  var B = 0.62;      // половина сторони спільної квадратної основи
  var CUBE_H = 1.05;
  var PYR_H = 1.35;
  var GROUND = 1.05; // половина сторони "землі"

  /* --- геометрія тіл --- */

  function boxEdgeFaces(VERT, EDGES, mins, maxs) {
    return EDGES.map(function (e) {
      var a = VERT[e[0]], b = VERT[e[1]], f = [];
      for (var k = 0; k < 3; k++) {
        if (Math.abs(a[k] - b[k]) < 1e-9) {
          var n = [0, 0, 0];
          n[k] = Math.abs(a[k] - maxs[k]) < 1e-9 ? 1 : -1;
          f.push(n);
        }
      }
      return f;
    });
  }

  var CUBE_VERT = [
    [-B, -B, 0], [B, -B, 0], [B, B, 0], [-B, B, 0],
    [-B, -B, CUBE_H], [B, -B, CUBE_H], [B, B, CUBE_H], [-B, B, CUBE_H]
  ];
  var CUBE_EDGES = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
  var CUBE_EF = boxEdgeFaces(CUBE_VERT, CUBE_EDGES, [-B,-B,0], [B,B,CUBE_H]);

  var PYR_VERT = [[-B,-B,0], [B,-B,0], [B,B,0], [-B,B,0], [0,0,PYR_H]];
  var PYR_EDGES = [[0,1],[1,2],[2,3],[3,0],[0,4],[1,4],[2,4],[3,4]];

  function pyrLateralNormals(VERT) {
    var A = VERT[4], lat = [];
    for (var i = 0; i < 4; i++) {
      var Vi = VERT[i], Vj = VERT[(i + 1) % 4];
      var e1 = [Vj[0]-Vi[0], Vj[1]-Vi[1], Vj[2]-Vi[2]];
      var e2 = [A[0]-Vi[0], A[1]-Vi[1], A[2]-Vi[2]];
      var n = [e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0]];
      var L = Math.hypot(n[0], n[1], n[2]);
      lat.push([n[0]/L, n[1]/L, n[2]/L]);
    }
    return lat;
  }
  var PYR_LAT = pyrLateralNormals(PYR_VERT), PYR_BASE = [0, 0, -1];
  var PYR_EF = [
    [PYR_BASE, PYR_LAT[0]], [PYR_BASE, PYR_LAT[1]], [PYR_BASE, PYR_LAT[2]], [PYR_BASE, PYR_LAT[3]],
    [PYR_LAT[3], PYR_LAT[0]], [PYR_LAT[0], PYR_LAT[1]], [PYR_LAT[1], PYR_LAT[2]], [PYR_LAT[2], PYR_LAT[3]]
  ];

  var SHAPES = {
    cube: { VERT: CUBE_VERT, EDGES: CUBE_EDGES, EF: CUBE_EF },
    pyr:  { VERT: PYR_VERT,  EDGES: PYR_EDGES,  EF: PYR_EF }
  };

  /* --- опукла оболонка (Andrew's monotone chain) --- */
  function convexHull(pts) {
    var p = pts.slice().sort(function (a, b) { return a[0]-b[0] || a[1]-b[1]; });
    function cross(o, a, b) { return (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0]); }
    var lower = [];
    for (var i = 0; i < p.length; i++) {
      while (lower.length >= 2 && cross(lower[lower.length-2], lower[lower.length-1], p[i]) <= 0) lower.pop();
      lower.push(p[i]);
    }
    var upper = [];
    for (i = p.length - 1; i >= 0; i--) {
      while (upper.length >= 2 && cross(upper[upper.length-2], upper[upper.length-1], p[i]) <= 0) upper.pop();
      upper.push(p[i]);
    }
    lower.pop(); upper.pop();
    return lower.concat(upper);
  }

  function create(canvas) {
    var st = {
      mode: "forward", shape: "cube", hiddenShape: "cube",
      sunAz: 210, sunAlt: 32,
      shadowRevealed: false, solidRevealed: false,
      yaw: -0.55, pitch: -0.5
    };
    var api = {};

    function shadowXY(v) {
      var a = st.sunAlt * Math.PI / 180, f = st.sunAz * Math.PI / 180;
      var k = v[2] / Math.tan(a);
      return [v[0] + k * Math.cos(f), v[1] + k * Math.sin(f)];
    }

    function activeShape() { return st.mode === "reverse" ? st.hiddenShape : st.shape; }
    function solidShown() { return st.mode === "forward" || st.solidRevealed; }
    function shadowShown() { return st.mode === "reverse" || st.shadowRevealed; }

    function proj(p) { return Scene3D.project(p, st.yaw, st.pitch); }

    function draw() {
      var C = Scene3D.prepareCanvas(canvas);
      var ctx = C.ctx, w = C.w, h = C.h;

      var shape = SHAPES[activeShape()];
      var hull2 = convexHull(shape.VERT.map(shadowXY)); // тінь завжди рахується — для стабільного масштабу
      var groundCorners = [[-GROUND,-GROUND,0],[GROUND,-GROUND,0],[GROUND,GROUND,0],[-GROUND,GROUND,0]];

      var probe = shape.VERT.concat(hull2.map(function (p) { return [p[0],p[1],0]; })).concat(groundCorners);
      var sc = Scene3D.fitScale(w, h, proj, probe, 0.74);

      var ink = Scene3D.cssVar("--ink"), muted = Scene3D.cssVar("--muted"), soft = Scene3D.cssVar("--line");

      /* земля */
      var gp = groundCorners.map(sc);
      ctx.beginPath();
      gp.forEach(function (p,i) { i ? ctx.lineTo(p[0],p[1]) : ctx.moveTo(p[0],p[1]); });
      ctx.closePath();
      ctx.globalAlpha = 0.08; ctx.fillStyle = ink; ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = soft; ctx.lineWidth = 1.2; ctx.stroke();

      /* тінь */
      if (shadowShown()) {
        var hp = hull2.map(function (p) { return sc([p[0],p[1],0]); });
        ctx.beginPath();
        hp.forEach(function (p,i) { i ? ctx.lineTo(p[0],p[1]) : ctx.moveTo(p[0],p[1]); });
        ctx.closePath();
        ctx.globalAlpha = 0.55; ctx.fillStyle = ink; ctx.fill(); ctx.globalAlpha = 1;

        if (st.mode === "forward") {
          ctx.setLineDash([4,4]); ctx.strokeStyle = muted; ctx.lineWidth = 1.3;
          shape.VERT.forEach(function (v) {
            if (v[2] < 1e-6) return;
            var a = sc(v), b = sc([shadowXY(v)[0], shadowXY(v)[1], 0]);
            ctx.beginPath(); ctx.moveTo(a[0],a[1]); ctx.lineTo(b[0],b[1]); ctx.stroke();
          });
          ctx.setLineDash([]);
        }
      }

      /* тіло */
      if (solidShown()) {
        var hid = Scene3D.hiddenEdges(shape.EF, st.yaw, st.pitch);
        ctx.lineCap = "round"; ctx.lineJoin = "round";
        ctx.setLineDash([5,5]); ctx.strokeStyle = muted; ctx.lineWidth = 1.4;
        shape.EDGES.forEach(function (e,i) {
          if (!hid[i]) return;
          var p = sc(shape.VERT[e[0]]), q = sc(shape.VERT[e[1]]);
          ctx.beginPath(); ctx.moveTo(p[0],p[1]); ctx.lineTo(q[0],q[1]); ctx.stroke();
        });
        ctx.setLineDash([]); ctx.strokeStyle = ink; ctx.lineWidth = 2;
        shape.EDGES.forEach(function (e,i) {
          if (hid[i]) return;
          var p = sc(shape.VERT[e[0]]), q = sc(shape.VERT[e[1]]);
          ctx.beginPath(); ctx.moveTo(p[0],p[1]); ctx.lineTo(q[0],q[1]); ctx.stroke();
        });
      }

      if (api.onChange) api.onChange({
        mode: st.mode, shape: st.shape, hiddenShape: st.hiddenShape,
        sunAz: st.sunAz, sunAlt: st.sunAlt,
        shadowShown: shadowShown(), solidShown: solidShown()
      });
    }

    /* обертання перетягуванням — камера сцени, не світло */
    Scene3D.attachDrag(canvas, st, { pitchMin: -1.4, pitchMax: -0.08, onMove: draw });
    window.addEventListener("resize", draw);

    api.state = st;
    api.draw = draw;
    api.setMode = function (m) {
      st.mode = m;
      if (m === "reverse") {
        st.hiddenShape = Math.random() < 0.5 ? "cube" : "pyr";
        st.sunAlt = 90; st.sunAz = Math.random()*360;
        st.solidRevealed = false;
      } else {
        st.shadowRevealed = false;
      }
      draw();
    };
    api.setShape = function (s) { st.shape = s; st.shadowRevealed = false; draw(); };
    api.setSun = function (az, alt) {
      if (az != null) st.sunAz = az;
      if (alt != null) st.sunAlt = alt;
      st.shadowRevealed = true;
      draw();
    };
    api.newSunForward = function () {
      st.sunAz = Math.random()*360; st.sunAlt = 12 + Math.random()*78;
      st.shadowRevealed = false; draw();
    };
    api.revealShadow = function () { st.shadowRevealed = true; draw(); };
    api.newExample = function () {
      st.hiddenShape = Math.random() < 0.5 ? "cube" : "pyr";
      st.sunAlt = 90; st.sunAz = Math.random()*360;
      st.solidRevealed = false; draw();
    };
    api.anotherAngle = function () {
      st.sunAz = Math.random()*360; st.sunAlt = 15 + Math.random()*65;
      st.solidRevealed = false; draw();
    };
    api.revealSolid = function () { st.solidRevealed = true; draw(); };
    return api;
  }

  global.Shadows = { create: create };
})(window);
