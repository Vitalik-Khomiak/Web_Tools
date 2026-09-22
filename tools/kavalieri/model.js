/* Принцип Кавальєрі: прямий і похилий циліндр, спільна січна площина.

   Похилий циліндр змодельовано буквально як "стос монет, зсунутий набік":
   кожен горизонтальний переріз лишається колом того самого радіуса R_OBLIQUE,
   просто центр кола зсувається на lean·z відносно висоти z. Тому переріз
   похилого циліндра ніколи не еліпс — тільки коло, конгруентне перерізу
   прямого циліндра (R_RIGHT = R_OBLIQUE навмисно). Рівність площ — наслідок
   побудови, а не показу: обидва радіуси існують незалежно один від одного
   й просто рівні.

   Малювання циліндра — умовний прийом, як і скрізь на сайті (дротяні
   ребра, без заливки поверхонь): верхнє коло повністю, нижнє — з прихованою
   дугою пунктиром, дві дотичні лінії силуету. Межа видимої/прихованої дуги
   рахується аналітично: для горизонтального кола під цією проєкцією
   екранна x-координата точки кола має екстремум точно при θ = −yaw і
   θ = π−yaw, незалежно від pitch і центру, — це і є дві дотичні точки.

   Перевірено обчисленням (не на око): при яку завгодно висоту z обидва
   центри мають однакове z і однаковий радіус — переріз завжди конгруентні
   кола, площа π·R² для обох, за побудовою.
*/
(function (global) {
  "use strict";

  var R_RIGHT = 0.45, R_OBLIQUE = 0.45; // навмисно однакові — "той самий стос монет"
  var H = 1.3;
  var X_R = -0.9, X_O = 0.9;
  var N_TOP = 48, N_ARC = 22, N_CUT = 40;

  function centerR(z) { return [X_R, 0, z]; }
  function centerO(z, lean) { return [X_O + lean*z, 0, z]; }

  function circleLoop(c, r, n) {
    var pts = [];
    for (var i = 0; i <= n; i++) {
      var th = i/n*2*Math.PI;
      pts.push([c[0]+r*Math.cos(th), c[1]+r*Math.sin(th), c[2]]);
    }
    return pts;
  }
  function arcPts(c, r, a0, a1, n) {
    var pts = [];
    for (var i = 0; i <= n; i++) {
      var th = a0 + (a1-a0)*i/n;
      pts.push([c[0]+r*Math.cos(th), c[1]+r*Math.sin(th), c[2]]);
    }
    return pts;
  }

  function create(canvas) {
    var st = { t: 0.5, lean: 0.6, yaw: -0.5, pitch: -0.45, playing: false, checked: 0 };
    var api = {};
    var timer = null;

    function proj(p) {
      var sx = p[0]*Math.cos(st.yaw) - p[1]*Math.sin(st.yaw);
      var q  = p[0]*Math.sin(st.yaw) + p[1]*Math.cos(st.yaw);
      var sy = p[2]*Math.cos(st.pitch) - q*Math.sin(st.pitch);
      return [sx, sy];
    }

    function cssVar(k) { return getComputedStyle(document.documentElement).getPropertyValue(k).trim(); }

    function drawTube(ctx, sc, centerFn, r, ink, muted) {
      var bottom = centerFn(0), top = centerFn(H);
      var a0 = Math.PI - st.yaw, a1 = 2*Math.PI - st.yaw; // видима (передня) дуга
      var b0 = -st.yaw, b1 = Math.PI - st.yaw;             // прихована (задня) дуга

      function stroke(pts3, dashed, color, lw) {
        var p = pts3.map(sc);
        ctx.setLineDash(dashed ? [4,4] : []);
        ctx.strokeStyle = color; ctx.lineWidth = lw;
        ctx.beginPath();
        p.forEach(function (q,i) { i ? ctx.lineTo(q[0],q[1]) : ctx.moveTo(q[0],q[1]); });
        ctx.stroke();
        ctx.setLineDash([]);
      }

      stroke(arcPts(bottom, r, b0, b1, N_ARC), true, muted, 1.4);   // низ, прихована дуга
      stroke(arcPts(bottom, r, a0, a1, N_ARC), false, ink, 2);      // низ, видима дуга
      stroke(circleLoop(top, r, N_TOP), false, ink, 2);             // верх, повністю видно

      [a0, b0].forEach(function (th) { // дві дотичні лінії силуету, θ = π−yaw і θ = −yaw
        var bp = [bottom[0]+r*Math.cos(th), bottom[1]+r*Math.sin(th), bottom[2]];
        var tp = [top[0]+r*Math.cos(th), top[1]+r*Math.sin(th), top[2]];
        stroke([bp, tp], false, ink, 2);
      });
    }

    function draw() {
      var rect = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width*dpr);
      canvas.height = Math.round(rect.height*dpr);
      var ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var w = rect.width, h = rect.height;
      ctx.clearRect(0, 0, w, h);

      var topO = centerO(H, st.lean);
      var probe = circleLoop(centerR(0), R_RIGHT, 16).concat(circleLoop(centerR(H), R_RIGHT, 16))
        .concat(circleLoop(centerO(0, st.lean), R_OBLIQUE, 16)).concat(circleLoop(topO, R_OBLIQUE, 16));
      var pts = probe.map(proj);
      var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
      var S = Math.min(w/(Math.max.apply(null,xs)-Math.min.apply(null,xs)),
                       h/(Math.max.apply(null,ys)-Math.min.apply(null,ys))) * 0.78;
      var ox = w/2 - S*(Math.min.apply(null,xs)+Math.max.apply(null,xs))/2;
      var oy = h/2 + S*(Math.min.apply(null,ys)+Math.max.apply(null,ys))/2;
      function sc(p) { var q = proj(p); return [ox + S*q[0], oy - S*q[1]]; }

      var ink = cssVar("--ink"), muted = cssVar("--muted"), acc = cssVar("--accent"), onAcc = cssVar("--on-accent");

      drawTube(ctx, sc, centerR, R_RIGHT, ink, muted);
      drawTube(ctx, sc, function (z) { return centerO(z, st.lean); }, R_OBLIQUE, ink, muted);

      var zc = st.t * H;
      [ [centerR(zc), R_RIGHT], [centerO(zc, st.lean), R_OBLIQUE] ].forEach(function (cr) {
        var loop = circleLoop(cr[0], cr[1], N_CUT).map(sc);
        ctx.beginPath();
        loop.forEach(function (p,i) { i ? ctx.lineTo(p[0],p[1]) : ctx.moveTo(p[0],p[1]); });
        ctx.closePath();
        ctx.globalAlpha = 0.55; ctx.fillStyle = acc; ctx.fill(); ctx.globalAlpha = 1;
        ctx.strokeStyle = acc; ctx.lineWidth = 2.2; ctx.stroke();
      });

      if (api.onChange) api.onChange({
        t: st.t, lean: st.lean, checked: st.checked,
        areaRight: Math.PI*R_RIGHT*R_RIGHT, areaOblique: Math.PI*R_OBLIQUE*R_OBLIQUE
      });
    }

    var drag = null;
    canvas.addEventListener("pointerdown", function (e) {
      drag = {x:e.clientX, y:e.clientY}; canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", function (e) {
      if (!drag) return;
      st.yaw += (e.clientX-drag.x)*0.008;
      st.pitch += (e.clientY-drag.y)*0.008;
      st.pitch = Math.max(-1.3, Math.min(-0.08, st.pitch));
      drag = {x:e.clientX, y:e.clientY};
      draw();
    });
    ["pointerup","pointercancel"].forEach(function (t) {
      canvas.addEventListener(t, function () { drag = null; });
    });
    window.addEventListener("resize", draw);

    api.state = st;
    api.draw = draw;
    api.setT = function (v) { st.t = v; st.checked++; draw(); };
    api.setLean = function (v) { st.lean = v; draw(); };
    api.stopPlay = function () { st.playing = false; if (timer) { clearInterval(timer); timer = null; } };
    api.togglePlay = function () {
      if (st.playing) { api.stopPlay(); return false; }
      st.playing = true;
      timer = setInterval(function () {
        st.t += 0.006; if (st.t > 1) st.t = 0;
        st.checked++; draw();
      }, 35);
      return true;
    };
    return api;
  }

  global.Kavalieri = { create: create };
})(window);
