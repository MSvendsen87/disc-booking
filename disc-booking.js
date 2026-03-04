/* disc-booking.js - GolfKongen
   Disc Simulator Booking (1 time slots) - Quickbutik
   Uses Cloudflare Worker product endpoint and /cart/add (no cart/index fetch)
*/
(function () {
  "use strict";

  // ==== CONFIG ====
  var VERSION = "v1";
  var PATH = "/sider/disc-booking";
  var PRODUCT_ID = 1320;
  var WORKER_URL = "https://cold-shadow-36dc.post-cd6.workers.dev/products/" + PRODUCT_ID;

  var APP_ID = "disc-booking-app";
  var LS_KEY = "gk_disc_booking_state_v1";

  // ==== GUARD ====
  if (location.pathname !== PATH) return;

  console.log("[DISC BOOKING " + VERSION + "] LOADED");

  // ==== HELPERS ====
  function $(sel, root) { return (root || document).querySelector(sel); }
  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }
  function pad2(n){ n = String(n); return n.length === 1 ? "0"+n : n; }
  function ymd(d){ return d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate()); }
  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

  function loadState() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return { weekOffset: 0, selectedDate: null, bookedSkus: {} };
      var s = JSON.parse(raw);
      if (!s || typeof s !== "object") throw new Error("bad state");
      if (!s.bookedSkus || typeof s.bookedSkus !== "object") s.bookedSkus = {};
      if (typeof s.weekOffset !== "number") s.weekOffset = 0;
      if (typeof s.selectedDate !== "string") s.selectedDate = null;
      return s;
    } catch (e) {
      return { weekOffset: 0, selectedDate: null, bookedSkus: {} };
    }
  }
  function saveState() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch(e){}
  }

  function isoToDateTimeLocal(dateStr, hhmm) {
    // dateStr = YYYY-MM-DD, hhmm = "HHMM"
    var hh = parseInt(hhmm.slice(0,2), 10);
    var mm = parseInt(hhmm.slice(2,4), 10);
    return new Date(dateStr + "T" + pad2(hh) + ":" + pad2(mm) + ":00");
  }

  function parseSku(sku) {
    // Expected: YYYY-MM-DD-HHMM-HHMM
    if (!sku || typeof sku !== "string") return null;
    var m = sku.match(/^(\d{4}-\d{2}-\d{2})-(\d{4})-(\d{4})$/);
    if (!m) return null;
    return { date: m[1], start: m[2], end: m[3] };
  }

  function formatTime(hhmm) {
    return hhmm.slice(0,2) + ":" + hhmm.slice(2,4);
  }

  function startOfWeekMonday(d) {
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var day = x.getDay(); // 0=Sun .. 6=Sat
    var diff = (day === 0 ? -6 : 1 - day); // Monday as first day
    x.setDate(x.getDate() + diff);
    x.setHours(0,0,0,0);
    return x;
  }

  function addDays(d, n) {
    var x = new Date(d.getTime());
    x.setDate(x.getDate() + n);
    return x;
  }

  function dayLabel(d) {
    var names = ["Søn","Man","Tir","Ons","Tor","Fre","Lør"];
    return names[d.getDay()] + " " + pad2(d.getDate()) + "." + pad2(d.getMonth()+1);
  }

  function injectCss() {
    if ($("#gk-disc-booking-css")) return;
    var css = `
#${APP_ID} { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; }
.gkdb-wrap{ max-width: 980px; margin: 0 auto; padding: 10px 12px 40px; color: #eaeaea; }
.gkdb-card{ background: #0e0f10; border: 1px solid rgba(255,255,255,.08); border-radius: 14px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,.25); }
.gkdb-topbar{ position: sticky; top: 0; z-index: 20; background: rgba(14,15,16,.92); backdrop-filter: blur(8px); border-bottom: 1px solid rgba(255,255,255,.08); padding: 10px; display:flex; gap:10px; align-items:center; justify-content: space-between; }
.gkdb-topbar .left{ display:flex; gap:10px; align-items:center; }
.gkdb-pill{ font-size: 13px; padding: 7px 10px; border-radius: 999px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.08); color:#eaeaea; }
.gkdb-btn{ appearance:none; border: 0; border-radius: 12px; padding: 10px 12px; font-weight: 700; cursor:pointer; }
.gkdb-btn.primary{ background: #19c37d; color:#04130c; }
.gkdb-btn.secondary{ background: rgba(255,255,255,.08); color:#eaeaea; border: 1px solid rgba(255,255,255,.10); }
.gkdb-btn:disabled{ opacity:.5; cursor:not-allowed; }
.gkdb-week{ padding: 12px 10px; display:flex; align-items:center; justify-content: space-between; gap: 10px; }
.gkdb-week h2{ margin:0; font-size: 16px; font-weight: 800; color:#fff; }
.gkdb-days{ display:flex; gap: 8px; overflow-x: auto; padding: 0 10px 12px; -webkit-overflow-scrolling: touch; }
.gkdb-day{ flex: 0 0 auto; padding: 10px 12px; border-radius: 14px; border: 1px solid rgba(255,255,255,.10); background: rgba(255,255,255,.05); color:#eaeaea; font-weight: 800; font-size: 13px; cursor:pointer; white-space: nowrap; }
.gkdb-day.active{ background: rgba(25,195,125,.16); border-color: rgba(25,195,125,.35); }
.gkdb-body{ padding: 12px 10px 14px; }
.gkdb-slots{ display:grid; grid-template-columns: 1fr; gap: 10px; }
@media(min-width: 760px){ .gkdb-slots{ grid-template-columns: 1fr 1fr; } }
.gkdb-slot{ display:flex; justify-content: space-between; align-items:center; gap: 10px; padding: 12px; border-radius: 14px; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.03); }
.gkdb-slot .t{ font-weight: 900; color:#fff; }
.gkdb-slot .sub{ font-size: 12px; opacity:.85; }
.gkdb-note{ margin-top: 10px; font-size: 12px; opacity:.8; }
.gkdb-error{ padding: 12px; border-radius: 12px; background: rgba(255,60,60,.10); border: 1px solid rgba(255,60,60,.25); color:#ffdede; }
`;
    var st = document.createElement("style");
    st.id = "gk-disc-booking-css";
    st.textContent = css;
    document.head.appendChild(st);
  }

  // ==== API ====
  async function fetchProduct() {
    var res = await fetch(WORKER_URL, { method: "GET" });
    if (!res.ok) throw new Error("Worker fetch failed: " + res.status);
    var data = await res.json();

    // Be robust: variants might be at data.variants or data.product.variants
    var variants = (data && data.variants) || (data && data.product && data.product.variants) || [];
    if (!Array.isArray(variants)) variants = [];

    return { raw: data, variants: variants };
  }

  async function cartAddVariant(variantId, qty) {
    // Quickbutik wants x-www-form-urlencoded with XHR header
    var body = new URLSearchParams();
    body.set("product_id", String(PRODUCT_ID));
    body.set("variant", String(variantId));
    body.set("qty", String(qty || 1));
    body.set("page", "product");
    body.set("eventId", String(Date.now()));

    var res = await fetch("/cart/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest"
      },
      credentials: "same-origin",
      body: body.toString()
    });

    if (!res.ok) throw new Error("/cart/add failed: " + res.status);
    return true;
  }

  // ==== BUILD INDEX date -> slots[] ====
  function buildIndex(variants) {
    var idx = {}; // { "YYYY-MM-DD": [ {sku,date,start,end,variantId,qty} ] }

    for (var i=0; i<variants.length; i++) {
      var v = variants[i];
      var sku = v && (v.sku || v.SKU || v.code);
      var parsed = parseSku(sku);
      if (!parsed) continue;

      var qty = (typeof v.qty === "number") ? v.qty
              : (typeof v.quantity === "number") ? v.quantity
              : (typeof v.stock === "number") ? v.stock
              : null;

      // Only keep in-stock (qty > 0). If qty missing, assume available (worker usually gives qty)
      if (qty != null && qty <= 0) continue;

      // Filter past times
      var startDt = isoToDateTimeLocal(parsed.date, parsed.start);
      if (startDt.getTime() < Date.now()) continue;

      if (!idx[parsed.date]) idx[parsed.date] = [];
      idx[parsed.date].push({
        sku: sku,
        date: parsed.date,
        start: parsed.start,
        end: parsed.end,
        startDt: startDt,
        variantId: v.id || v.variant_id || v.variantId,
        qty: qty
      });
    }

    // Sort slots per date by start time
    Object.keys(idx).forEach(function(d){
      idx[d].sort(function(a,b){ return a.start.localeCompare(b.start); });
    });

    return idx;
  }

  // ==== UI ====
  function ensureAppRoot() {
    var root = $("#" + APP_ID);
    if (!root) {
      // fallback: create at end of main content
      root = el("div");
      root.id = APP_ID;
      document.body.appendChild(root);
    }
    return root;
  }

  function renderLoading(msg) {
    appRoot.innerHTML = "";
    var wrap = el("div", "gkdb-wrap");
    var card = el("div", "gkdb-card");
    var body = el("div", "gkdb-body");
    body.appendChild(el("div", "gkdb-pill", msg || "Laster ledige tider..."));
    card.appendChild(body);
    wrap.appendChild(card);
    appRoot.appendChild(wrap);
  }

  function renderError(err) {
    appRoot.innerHTML = "";
    var wrap = el("div", "gkdb-wrap");
    var card = el("div", "gkdb-card");
    var body = el("div", "gkdb-body");
    var box = el("div", "gkdb-error");
    box.textContent = "Kunne ikke laste tider. " + (err && err.message ? err.message : "");
    body.appendChild(box);
    card.appendChild(body);
    wrap.appendChild(card);
    appRoot.appendChild(wrap);
  }

  function getWeekDates(weekOffset) {
    var now = new Date();
    var monday = startOfWeekMonday(now);
    monday = addDays(monday, weekOffset * 7);
    var days = [];
    for (var i=0; i<7; i++) days.push(addDays(monday, i));
    return { monday: monday, days: days };
  }

  function pickInitialDate() {
    // Prefer saved date if it is in future; else pick first available date in current week; else next available overall
    var today = new Date();
    var saved = state.selectedDate;
    if (saved && index[saved]) {
      // Ensure it still has future slots
      if (index[saved] && index[saved].length) return saved;
    }

    // Scan current week
    var w = getWeekDates(state.weekOffset);
    for (var i=0; i<w.days.length; i++) {
      var d = ymd(w.days[i]);
      if (index[d] && index[d].length) return d;
    }

    // Scan all dates in index sorted
    var all = Object.keys(index).sort();
    if (all.length) return all[0];

    // fallback: today
    return ymd(today);
  }

  function render() {
    appRoot.innerHTML = "";
    var wrap = el("div", "gkdb-wrap");
    var card = el("div", "gkdb-card");

    // Topbar
    var top = el("div", "gkdb-topbar");
    var left = el("div", "left");
    var count = Object.keys(state.bookedSkus).length;
    left.appendChild(el("div", "gkdb-pill", "Valgt: " + count + " time(r)"));
    var clearBtn = el("button", "gkdb-btn secondary", "Nullstill");
    clearBtn.disabled = count === 0;
    clearBtn.addEventListener("click", function(){
      state.bookedSkus = {};
      saveState();
      render();
    });
    left.appendChild(clearBtn);
    top.appendChild(left);

    var goCart = el("a", "gkdb-btn primary", "Gå til handlekurv");
    goCart.href = "/cart";
    top.appendChild(goCart);

    card.appendChild(top);

    // Week bar
    var week = el("div", "gkdb-week");
    var prev = el("button", "gkdb-btn secondary", "Forrige uke");
    prev.addEventListener("click", function(){
      state.weekOffset = clamp(state.weekOffset - 1, -12, 52);
      saveState();
      // if chosen date not in week, keep it but UI shows week
      render();
    });
    var next = el("button", "gkdb-btn secondary", "Neste uke");
    next.addEventListener("click", function(){
      state.weekOffset = clamp(state.weekOffset + 1, -12, 52);
      saveState();
      render();
    });

    var w = getWeekDates(state.weekOffset);
    var title = el("h2", null, "Uke fra " + pad2(w.monday.getDate()) + "." + pad2(w.monday.getMonth()+1));
    week.appendChild(prev);
    week.appendChild(title);
    week.appendChild(next);
    card.appendChild(week);

    // Day chips
    var daysRow = el("div", "gkdb-days");
    var hasAnyInWeek = false;
    for (var i=0; i<w.days.length; i++) {
      var dObj = w.days[i];
      var d = ymd(dObj);
      var available = !!(index[d] && index[d].length);
      if (available) hasAnyInWeek = true;

      var chip = el("button", "gkdb-day" + (d === state.selectedDate ? " active" : ""), dayLabel(dObj));
      chip.disabled = !available;
      chip.addEventListener("click", (function(dateStr){
        return function(){
          state.selectedDate = dateStr;
          saveState();
          render();
        };
      })(d));
      daysRow.appendChild(chip);
    }
    card.appendChild(daysRow);

    // Body / slots
    var body = el("div", "gkdb-body");
    var slotsWrap = el("div", "gkdb-slots");

    var sel = state.selectedDate || pickInitialDate();
    state.selectedDate = sel;
    saveState();

    var slots = index[sel] || [];
    if (!slots.length) {
      body.appendChild(el("div", "gkdb-pill", hasAnyInWeek ? "Ingen ledige tider denne dagen." : "Ingen ledige tider i denne uken."));
    } else {
      for (var j=0; j<slots.length; j++) {
        var s = slots[j];
        var isPicked = !!state.bookedSkus[s.sku];

        var row = el("div", "gkdb-slot");
        var leftCol = el("div");
        leftCol.appendChild(el("div", "t", formatTime(s.start) + "–" + formatTime(s.end)));
        leftCol.appendChild(el("div", "sub", "Disc Simulator • 1 time"));
        row.appendChild(leftCol);

        var btn = el("button", "gkdb-btn " + (isPicked ? "secondary" : "primary"), isPicked ? "Lagt til" : "Legg til");
        btn.disabled = isPicked;
        btn.addEventListener("click", (function(slot){
          return async function(){
            try{
              this.disabled = true;
              this.textContent = "Legger til...";
              await cartAddVariant(slot.variantId, 1);

              state.bookedSkus[slot.sku] = { addedAt: Date.now(), variantId: slot.variantId, date: slot.date, start: slot.start, end: slot.end };
              saveState();

              render();
            } catch(e){
              console.warn("[DISC BOOKING] add failed", e);
              this.disabled = false;
              this.textContent = "Prøv igjen";
              alert("Kunne ikke legge til. Prøv igjen.");
            }
          };
        })(s));
        row.appendChild(btn);

        slotsWrap.appendChild(row);
      }

      body.appendChild(slotsWrap);
      body.appendChild(el("div", "gkdb-note", "Tips: Du kan trykke flere tider (flere timer) før du går til kassa."));
    }

    card.appendChild(body);
    wrap.appendChild(card);
    appRoot.appendChild(wrap);
  }

  // ==== BOOT ====
  injectCss();
  var state = loadState();
  var appRoot = ensureAppRoot();
  renderLoading("Laster ledige tider…");

  var index = {};

  fetchProduct()
    .then(function(p){
      index = buildIndex(p.variants || []);

      // Velg en fornuftig dag ved første load
      if (!state.selectedDate || !index[state.selectedDate] || !index[state.selectedDate].length) {
        state.selectedDate = pickInitialDate();
        saveState();
      }

      render();
    })
    .catch(function(err){
      console.warn("[DISC BOOKING] load error", err);
      renderError(err);
    });

})();
