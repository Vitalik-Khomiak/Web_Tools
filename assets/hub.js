/* Майстер-панель: рендер списку інструментів, пошук, вікно з QR-кодом.
   Дані бере з tools.js (window.TOOLS і window.EXTERNAL). */
(function () {
  "use strict";

  var listEl = document.getElementById("tools");
  var extEl = document.getElementById("external");
  var input = document.getElementById("q");
  var countEl = document.getElementById("count");
  var dlg = document.getElementById("qrdlg");

  function card(t, external) {
    var el = document.createElement("article");
    el.className = "tool" + (external ? " external" : "");

    var h = document.createElement("h3");
    h.textContent = t.name;
    el.appendChild(h);

    var p = document.createElement("p");
    p.textContent = t.short;
    el.appendChild(p);

    var row = document.createElement("div");
    row.className = "row";

    var open = document.createElement("a");
    open.className = "btn primary";
    open.href = t.url;
    open.textContent = external ? "Відкрити ↗" : "Відкрити";
    if (external) { open.target = "_blank"; open.rel = "noopener"; }
    row.appendChild(open);

    if (t.teacher) {
      var teach = document.createElement("a");
      teach.className = "btn";
      teach.href = t.teacher;
      teach.textContent = "Для вчителя";
      row.appendChild(teach);
    }
    if (t.qr) {
      var qr = document.createElement("button");
      qr.type = "button";
      qr.textContent = "QR";
      qr.addEventListener("click", function () { showQR(t); });
      row.appendChild(qr);
    }
    el.appendChild(row);

    var tags = document.createElement("div");
    tags.className = "tags";
    var k = document.createElement("span");
    k.className = "tag klas";
    k.textContent = t.klas + " клас";
    tags.appendChild(k);
    (t.tags || []).forEach(function (s) {
      var sp = document.createElement("span");
      sp.className = "tag";
      sp.textContent = s;
      tags.appendChild(sp);
    });
    el.appendChild(tags);

    el.dataset.search = (t.name + " " + t.short + " " + t.klas + " " +
                         (t.tags || []).join(" ")).toLowerCase();
    return el;
  }

  function absolute(url) {
    return new URL(url, location.href).href;
  }

  function showQR(t) {
    document.getElementById("qrtitle").textContent = t.name;
    var img = document.getElementById("qrimg");
    img.src = t.qr;
    img.alt = "QR-код на сторінку «" + t.name + "»";
    document.getElementById("qrurl").textContent = absolute(t.url);
    if (typeof dlg.showModal === "function") dlg.showModal();
    else dlg.setAttribute("open", "");
  }

  function render() {
    (window.TOOLS || []).forEach(function (t) { listEl.appendChild(card(t, false)); });
    (window.EXTERNAL || []).forEach(function (t) { extEl.appendChild(card(t, true)); });
    filter();
  }

  function filter() {
    var q = (input.value || "").trim().toLowerCase();
    var shown = 0, total = 0;
    [listEl, extEl].forEach(function (box) {
      var any = false;
      Array.prototype.forEach.call(box.children, function (el) {
        total++;
        var hit = !q || el.dataset.search.indexOf(q) !== -1;
        el.hidden = !hit;
        if (hit) { shown++; any = true; }
      });
      var head = box.previousElementSibling;
      if (head && head.classList.contains("secthead")) head.hidden = !any;
    });
    countEl.textContent = q ? shown + " з " + total : total + " інструментів";
    document.getElementById("nothing").hidden = shown !== 0;
  }

  document.getElementById("hubqr").addEventListener("click", function () {
    showQR({ name: "Web_Tools — уся панель", url: "./", qr: "assets/qr/hub.png" });
  });

  input.addEventListener("input", filter);
  dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
  document.getElementById("qrclose").addEventListener("click", function () { dlg.close(); });
  render();
})();
