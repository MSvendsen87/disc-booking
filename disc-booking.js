(function () {
  console.log("[DISC BOOKING v8 REDUSERT PRIS + LOCKS] LOADED");

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
  var CLOSED_TIMES_API = "https://gk-booking-admin.post-cd6.workers.dev/booking/closed-times";
  var DISC_PRODUCT_ID = "1320";
  var DISC_API = "https://cold-shadow-36dc.post-cd6.workers.dev/products/1320";
  var DISC_STANDARD_PRICE = 150;

  var path = String(location.pathname || "");
  while (path.length && path.charAt(path.length - 1) === "/" && path !== "/") {
    path = path.slice(0, -1);
  }

  if (path !== PAGE_PATH) return;

  var venueSlotsByDate = {};
  var closedTimesByDate = {};
  var discPricesByDateTime = {};
  var venueLoaded = false;
  var discPricesLoaded = false;
  var closedTimesLoaded = false;
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



  function parsePriceValue(raw) {
    if (raw === null || typeof raw === "undefined" || raw === "") return null;
    if (typeof raw === "number") return raw;
    var s = String(raw).replace(/\s/g, "").replace(",", ".");
    var m = s.match(/-?\d+(\.\d+)?/);
    if (!m) return null;
    var n = Number(m[0]);
    return isNaN(n) ? null : n;
  }

  function formatPriceNok(n) {
    n = Number(n);
    if (isNaN(n)) return "";
    if (Math.abs(n - Math.round(n)) < 0.001) return Math.round(n) + " kr";
    return n.toFixed(2).replace(".", ",") + " kr";
  }

  function parseDiscVariantDateTime(v) {
    var date = "";
    var time = "";

    var vals = Array.isArray(v && v.values) ? v.values : [];
    for (var i = 0; i < vals.length; i++) {
      var val = String((vals[i] && (vals[i].val || vals[i].value || vals[i].name)) || "");
      if (!date) {
        var dm = val.match(/(\d{4}-\d{2}-\d{2})|(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?/);
        if (dm) {
          if (dm[1]) {
            date = dm[1];
          } else {
            var y = dm[4] || String((new Date()).getFullYear());
            date = y + "-" + ("0" + dm[3]).slice(-2) + "-" + ("0" + dm[2]).slice(-2);
          }
        }
      }

      if (!time) {
        var tm = val.match(/(\d{1,2})[:.]?(\d{2})\s*[-–]\s*(\d{1,2})[:.]?(\d{2})/);
        if (tm) {
          time = ("0" + tm[1]).slice(-2) + ":" + tm[2] + "-" + ("0" + tm[3]).slice(-2) + ":" + tm[4];
        }
      }
    }

    var sku = String(v && v.sku || "");
    var sm = sku.match(/(\d{4}-\d{2}-\d{2})[-_]?(\d{2})(\d{2})[-_]?(\d{2})(\d{2})/);
    if (sm) {
      if (!date) date = sm[1];
      if (!time) time = sm[2] + ":" + sm[3] + "-" + sm[4] + ":" + sm[5];
    }

    return { date: date, time: time };
  }

  function buildDiscPriceIndex(product) {
    var out = {};
    var variants = product && Array.isArray(product.variants) ? product.variants : [];

    for (var i = 0; i < variants.length; i++) {
      var v = variants[i] || {};
      var dt = parseDiscVariantDateTime(v);
      if (!dt.date || !dt.time) continue;

      var price = parsePriceValue(v.price);
      if (price === null) price = parsePriceValue(product && product.price);
      if (price === null) continue;

      out[dt.date + "|" + dt.time] = price;
    }

    return out;
  }

  function getDiscPrice(date, time) {
    return discPricesByDateTime[String(date || "") + "|" + String(time || "")];
  }

  function addReducedPriceChip(metaEl, priceValue) {
    if (!metaEl) return;

    var old = metaEl.querySelector("[data-gk-reduced-price-chip='1']");
    if (old) return;

    var chip = document.createElement("div");
    chip.className = "gk-mini";
    chip.setAttribute("data-gk-reduced-price-chip", "1");
    chip.textContent = "Redusert pris " + formatPriceNok(priceValue);
    chip.title = "Lavere pris enn standardpris";
    metaEl.appendChild(chip);
  }


  function ruleAppliesToDisc(rule) {
    var products = rule && rule.products;

    if (products === "all") return true;
    if (products === DISC_PRODUCT_ID || products === Number(DISC_PRODUCT_ID)) return true;

    if (Array.isArray(products)) {
      return products.map(String).indexOf(DISC_PRODUCT_ID) !== -1 || products.indexOf("all") !== -1;
    }

    return false;
  }

  function getClosedTimeLock(date, discTime) {
    if (!date || !discTime) return null;

    var list = closedTimesByDate[date] || [];
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      if (!r || !ruleAppliesToDisc(r)) continue;

      var closedTime = String(r.from || "") + "-" + String(r.to || "");
      if (timesOverlap(closedTime, discTime)) {
        return {
          date: date,
          time: closedTime,
          reason: r.reason || r.label || "Stengt"
        };
      }
    }

    return null;
  }


  function addLockChip(metaEl, key, text) {
    if (!metaEl) return;

    var attr = "data-gk-" + key + "-chip";
    var old = metaEl.querySelector("[" + attr + "='1']");
    if (old) return;

    var chip = document.createElement("div");
    chip.className = "gk-mini warn";
    chip.setAttribute(attr, "1");
    chip.textContent = text;
    metaEl.appendChild(chip);
  }

  function applyAllLocks() {
    if (!venueLoaded || !closedTimesLoaded || !discPricesLoaded) return;

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

      var discPrice = getDiscPrice(date, discTime);
      if (typeof discPrice !== "undefined" && Number(discPrice) < DISC_STANDARD_PRICE) {
        addReducedPriceChip(metaEl, discPrice);
      }

      var closedLock = getClosedTimeLock(date, discTime);
      if (closedLock) {
        row.setAttribute("data-gk-closed-time-locked", "1");
        addLockChip(metaEl, "closed-time-lock", "Stengt");

        btn.disabled = true;
        btn.className = "gk-bookbtn gk-booked";
        btn.textContent = closedLock.reason || "Stengt";
        btn.setAttribute("data-gk-closed-time-lock", "1");
        continue;
      }

      var venueLock = getVenueLock(date, discTime);
      if (venueLock) {
        row.setAttribute("data-gk-venue-locked", "1");
        addLockChip(metaEl, "venue-lock", "Hele lokalet booket");

        btn.disabled = true;
        btn.className = "gk-bookbtn gk-booked";
        btn.textContent = "Hele lokalet booket";
        btn.setAttribute("data-gk-venue-lock", "1");
      }
    }
  }

  function applyVenueLocks() {
    applyAllLocks();
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
        applyAllLocks();
      })
      .catch(function (e) {
        venueLoaded = true;
        console.log("[DISC VENUE LOCK] Kunne ikke laste venue-data:", e);
        applyAllLocks();
      });
  }



  function loadDiscPricesData() {
    return fetch(DISC_API, { credentials: "omit" })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        var product = res && res.product ? res.product : null;
        discPricesByDateTime = buildDiscPriceIndex(product);
        discPricesLoaded = true;
        console.log("[DISC PRICES] Priser lastet", discPricesByDateTime);
        applyAllLocks();
      })
      .catch(function (e) {
        discPricesByDateTime = {};
        discPricesLoaded = true;
        console.log("[DISC PRICES] Kunne ikke laste priser:", e);
        applyAllLocks();
      });
  }


  function loadClosedTimesData() {
    return fetch(CLOSED_TIMES_API, { credentials: "omit" })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        var list = res && Array.isArray(res.closedTimes) ? res.closedTimes : [];
        closedTimesByDate = {};

        for (var i = 0; i < list.length; i++) {
          var rule = list[i] || {};
          if (!rule.date || !rule.from || !rule.to) continue;

          if (!closedTimesByDate[rule.date]) closedTimesByDate[rule.date] = [];
          closedTimesByDate[rule.date].push(rule);
        }

        closedTimesLoaded = true;
        console.log("[DISC CLOSED TIMES] Stengte tider lastet", closedTimesByDate);
        applyAllLocks();
      })
      .catch(function (e) {
        closedTimesLoaded = true;
        console.log("[DISC CLOSED TIMES] Kunne ikke laste stengte tider:", e);
        applyAllLocks();
      });
  }


  function startOverlay() {
    if (overlayStarted) return;
    overlayStarted = true;

    loadVenueData();
    loadClosedTimesData();
    loadDiscPricesData();

    var app = document.getElementById(ROOT_ID);
    if (!app) return;

    var timer = null;
    var observer = new MutationObserver(function () {
      if (timer) clearTimeout(timer);
      timer = setTimeout(applyAllLocks, 80);
    });

    observer.observe(app, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-active"]
    });

    setInterval(applyAllLocks, 1000);
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
      console.log("[DISC BOOKING v8] Original disc-booking a743fd1 lastet");
      setTimeout(startOverlay, 150);
    };

    s.onerror = function () {
      console.error("[DISC BOOKING v6] Kunne ikke laste original disc-booking");
    };

    document.head.appendChild(s);
  }

  loadOriginalDiscBooking();
})();
