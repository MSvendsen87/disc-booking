(function () {
  console.log("[DISC BOOKING v6 VENUE LOCK WRAPPER] LOADED");

  /*
    Trygg wrapper:
    - Laster eksisterende Disc-booking fra trygg baseline a743fd1
    - Legger etterpå på sperre mot "Leie hele lokalet" produkt 1349
    - Endrer ikke layouten ellers
  */

  var PAGE_PATH = "/sider/disc-booking";
  var ROOT_ID = "disc-booking-app";
  var ORIGINAL_DISC_SRC = "https://cdn.jsdelivr.net/gh/MSvendsen87/disc-booking@a743fd1/disc-booking.js";
  var VENUE_API = "https://cold-shadow-36dc.post-cd6.workers.dev/products/1349";

  var path = String(location.pathname || "");
  while (path.length && path.charAt(path.length - 1) === "/" && path !== "/") {
    path = path.slice(0, -1);
  }

  if (path !== PAGE_PATH) return;

  var venueSlotsByDate = {};
  var venueLoaded = false;
  var overlayStarted = false;

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function normalizeTime(t) {
    var s = String(t || "").trim();
    var m = s.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
    if (!m) return s;
    return pad2(Number(m[1])) + ":" + m[2] + "-" + pad2(Number(m[3])) + ":" + m[4];
  }

  function timeToMinutes(t) {
    var m = String(t || "").trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return 0;
    return Number(m[1]) * 60 + Number(m[2]);
  }

  function timesOverlap(a, b) {
    var aa = String(a || "").split("-");
    var bb = String(b || "").split("-");
    if (aa.length !== 2 || bb.length !== 2) return false;

    var a1 = timeToMinutes(aa[0]);
    var a2 = timeToMinutes(aa[1]);
    var b1 = timeToMinutes(bb[0]);
    var b2 = timeToMinutes(bb[1]);

    return a1 < b2 && a2 > b1;
  }

  function parseVariantDateTime(v) {
    var date = "";
    var time = "";

    if (v && v.values && v.values.length) {
      for (var i = 0; i < v.values.length; i++) {
        var item = v.values[i] || {};
        var name = String(item.name || "").toLowerCase();
        var val = String(item.val || "").trim();

        if (!date && name.indexOf("dag") !== -1 && val) date = val;
        if (!time && name.indexOf("tid") !== -1 && val) time = normalizeTime(val);
      }
    }

    var sku = String((v && v.sku) || "").trim();
    var m = sku.match(/^(\d{4}-\d{2}-\d{2})-(\d{2})(\d{2})-(\d{2})(\d{2})$/);
    if (m) {
      if (!date) date = m[1];
      if (!time) time = m[2] + ":" + m[3] + "-" + m[4] + ":" + m[5];
    }

    return {
      date: date,
      time: normalizeTime(time)
    };
  }

  function getActiveDate() {
    var active = document.querySelector("#" + ROOT_ID + " .gk-chip[data-active='1']");
    if (active && active.getAttribute("data-date")) return active.getAttribute("data-date");

    var any = document.querySelector("#" + ROOT_ID + " .gk-chip[data-date]");
    if (any && any.getAttribute("data-date")) return any.getAttribute("data-date");

    return "";
  }

  function getVenueLock(date, discTime) {
    if (!date || !discTime) return null;

    var list = venueSlotsByDate[date] || [];
    for (var i = 0; i < list.length; i++) {
      var v = list[i];
      if (v && v.soldOut && timesOverlap(v.time, discTime)) {
        return v;
      }
    }

    return null;
  }

  function addLockChip(metaEl) {
    if (!metaEl) return;

    var old = metaEl.querySelector("[data-gk-venue-lock-chip='1']");
    if (old) return;

    var chip = document.createElement("div");
    chip.className = "gk-mini warn";
    chip.setAttribute("data-gk-venue-lock-chip", "1");
    chip.textContent = "Hele lokalet booket";
    metaEl.appendChild(chip);
  }

  function applyVenueLocks() {
    if (!venueLoaded) return;

    var app = document.getElementById(ROOT_ID);
    if (!app) return;

    var date = getActiveDate();
    if (!date) return;

    var rows = app.querySelectorAll(".gk-slot");

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var timeEl = row.querySelector(".gk-slot-time");
      var btn = row.querySelector(".gk-bookbtn");
      var metaEl = row.querySelector(".gk-slot-meta");

      if (!timeEl || !btn) continue;

      var discTime = normalizeTime(timeEl.textContent || "");
      var lock = getVenueLock(date, discTime);

      if (!lock) continue;

      row.setAttribute("data-gk-venue-locked", "1");
      addLockChip(metaEl);

      btn.disabled = true;
      btn.className = "gk-bookbtn gk-booked";
      btn.textContent = "Hele lokalet booket";
      btn.setAttribute("data-gk-venue-lock", "1");
    }
  }

  function loadVenueData() {
    return fetch(VENUE_API, { credentials: "omit" })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        var product = res && res.product ? res.product : null;
        var variants = product && product.variants ? product.variants : [];

        venueSlotsByDate = {};

        for (var i = 0; i < variants.length; i++) {
          var v = variants[i];
          var dt = parseVariantDateTime(v);
          if (!dt.date || !dt.time) continue;

          var qty = parseInt(v.qty || "0", 10);
          if (isNaN(qty)) qty = 0;

          if (!venueSlotsByDate[dt.date]) venueSlotsByDate[dt.date] = [];

          venueSlotsByDate[dt.date].push({
            date: dt.date,
            time: dt.time,
            sku: String(v.sku || ""),
            qty: qty,
            soldOut: qty <= 0
          });
        }

        venueLoaded = true;
        console.log("[DISC VENUE LOCK] Venue-data lastet", venueSlotsByDate);
        applyVenueLocks();
      })
      .catch(function (e) {
        venueLoaded = true;
        console.log("[DISC VENUE LOCK] Kunne ikke laste venue-data:", e);
      });
  }

  function startOverlay() {
    if (overlayStarted) return;
    overlayStarted = true;

    loadVenueData();

    var app = document.getElementById(ROOT_ID);
    if (!app) return;

    var timer = null;
    var observer = new MutationObserver(function () {
      if (timer) clearTimeout(timer);
      timer = setTimeout(applyVenueLocks, 80);
    });

    observer.observe(app, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-active"]
    });

    setInterval(applyVenueLocks, 1000);
  }

  function loadOriginalDiscBooking() {
    var existing = document.querySelector("script[data-gk-original-disc-booking='1']");
    if (existing) {
      startOverlay();
      return;
    }

    var s = document.createElement("script");
    s.src = ORIGINAL_DISC_SRC + "?v=venue-lock-wrapper";
    s.async = true;
    s.setAttribute("data-gk-original-disc-booking", "1");

    s.onload = function () {
      console.log("[DISC BOOKING v6] Original disc-booking a743fd1 lastet");
      setTimeout(startOverlay, 150);
    };

    s.onerror = function () {
      console.error("[DISC BOOKING v6] Kunne ikke laste original disc-booking");
    };

    document.head.appendChild(s);
  }

  loadOriginalDiscBooking();
})();
