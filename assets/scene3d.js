/* Спільний рушій канв-сцен набору: та сама ортогональна проєкція yaw/pitch,
   підготовка HiDPI-канви, автомасштаб під задані точки-проби, обертання
   перетягуванням і приховані ребра через нормалі граней. Кожен model.js
   інструмента раніше рахував усе це наново; тут — той самий код в одному
   місці. Формули не змінені, лише винесені: якщо колись знайдеться
   помилка в проєкції чи обертанні, її треба буде виправити тут раз,
   а не в п'яти файлах окремо.

   Підключати до model.js, тобто до assets/style.css/tool.css —
   у head сторінки: <script src="../../assets/scene3d.js"></script>
   перед <script src="model.js">. */
(function (global) {
  "use strict";

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  /* sx = x·cos(yaw) − y·sin(yaw)
     q  = x·sin(yaw) + y·cos(yaw)
     sy = z·cos(pitch) − q·sin(pitch) */
  function project(p, yaw, pitch) {
    var sx = p[0] * Math.cos(yaw) - p[1] * Math.sin(yaw);
    var q = p[0] * Math.sin(yaw) + p[1] * Math.cos(yaw);
    var sy = p[2] * Math.cos(pitch) - q * Math.sin(pitch);
    return [sx, sy];
  }

  /* напрям на камеру = векторний добуток екранних осей (право × вгору);
     потрібен для визначення прихованих ребер багатогранника */
  function viewDir(yaw, pitch) {
    return [-Math.sin(yaw) * Math.cos(pitch),
            -Math.cos(yaw) * Math.cos(pitch),
            -Math.sin(pitch)];
  }

  /* ребро сховане, якщо всі сусідні грані відвернені від камери;
     edgeFaces[i] — масив зовнішніх нормалей граней, сусідніх з ребром i */
  function hiddenEdges(edgeFaces, yaw, pitch) {
    var w = viewDir(yaw, pitch);
    return edgeFaces.map(function (faces) {
      return faces.every(function (n) { return n[0] * w[0] + n[1] * w[1] + n[2] * w[2] <= 0; });
    });
  }

  /* готує HiDPI-канву під поточний розмір елемента, очищає її */
  function prepareCanvas(canvas) {
    var rect = canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var w = rect.width, h = rect.height;
    ctx.clearRect(0, 0, w, h);
    return { ctx: ctx, w: w, h: h };
  }

  /* масштабує так, щоб усі точки-проби вмістилися в канву з полем margin
     (частка від повного розміру); повертає sc(p) → екранні пікселі */
  function fitScale(w, h, projFn, probe, margin) {
    var pts = probe.map(projFn);
    var xs = pts.map(function (p) { return p[0]; });
    var ys = pts.map(function (p) { return p[1]; });
    var S = Math.min(w / (Math.max.apply(null, xs) - Math.min.apply(null, xs)),
                     h / (Math.max.apply(null, ys) - Math.min.apply(null, ys))) * margin;
    var ox = w / 2 - S * (Math.min.apply(null, xs) + Math.max.apply(null, xs)) / 2;
    var oy = h / 2 + S * (Math.min.apply(null, ys) + Math.max.apply(null, ys)) / 2;
    return function (p) {
      var q = projFn(p);
      return [ox + S * q[0], oy - S * q[1]];
    };
  }

  /* обертання перетягуванням: мутує state.yaw/state.pitch, викликає
     opts.onMove після кожного зсуву (звичайно — draw) */
  function attachDrag(canvas, state, opts) {
    opts = opts || {};
    var sens = opts.sensitivity || 0.008;
    var pMin = opts.pitchMin != null ? opts.pitchMin : -1.5;
    var pMax = opts.pitchMax != null ? opts.pitchMax : -0.03;
    var onMove = opts.onMove || function () {};
    var drag = null;
    canvas.addEventListener("pointerdown", function (e) {
      drag = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", function (e) {
      if (!drag) return;
      state.yaw += (e.clientX - drag.x) * sens;
      state.pitch += (e.clientY - drag.y) * sens;
      state.pitch = Math.max(pMin, Math.min(pMax, state.pitch));
      drag = { x: e.clientX, y: e.clientY };
      onMove();
    });
    ["pointerup", "pointercancel"].forEach(function (t) {
      canvas.addEventListener(t, function () { drag = null; });
    });
  }

  global.Scene3D = {
    cssVar: cssVar,
    project: project,
    viewDir: viewDir,
    hiddenEdges: hiddenEdges,
    prepareCanvas: prepareCanvas,
    fitScale: fitScale,
    attachDrag: attachDrag
  };
})(window);
