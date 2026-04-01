(function () {
  console.log("[DISC BOOKING v5] LOADED");

  /* ------------------------------------------------ */
  /* KONFIG */
  /* ------------------------------------------------ */

  var PRODUCT_DISC = "1320";
  var EVENT_ID = "9847005";
  var CART_URL = "/cart/index";

  var API_BASE = "https://cold-shadow-36dc.post-cd6.workers.dev/products/";
  var API_DISC = API_BASE + PRODUCT_DISC;

  var PAGE_PATH = "/sider/disc-booking";
  var ROOT_ID = "disc-booking-app";

  var CUTOFF_MINUTES_BEFORE_START = 20;

  /* ------------------------------------------------ */
  /* BOOKING STORAGE */
  /* ------------------------------------------------ */

  function gkStoreBookingDetails(payload) {
    try {
      var KEY = "gk_last_booking_payload_v1";
      var TARGET_KEY = "gk_success_target";

      var current = null;
      try {
        current = JSON.parse(localStorage.getItem(KEY) || "null");
      } catch (e) {
        current = null;
      }

      if (!current || typeof current !== "object") {
        current = {
          createdAt: new Date().toISOString(),
          source: payload.source || "booking",
          title: payload.title || "Booking",
          items: [],
          extras: {}
        };
      }

      if (!current.items) current.items = [];
      if (payload.item) current.items.push(payload.item);

      if (payload.source) current.source = payload.source;
      if (payload.title) current.title = payload.title;
      if (payload.extras) current.extras = payload.extras;

      localStorage.setItem(KEY, JSON.stringify(current));
      localStorage.setItem(TARGET_KEY, "booking");
    } catch (e) {
      console.log("[GK BOOKING STORE] error", e);
    }
  }

  /* ------------------------------------------------ */
  /* PATH / ROOT */
  /* ------------------------------------------------ */

  var path = String(location.pathname || "");
  while (path.length && path.charAt(path.length - 1) === "/" && path !== "/") {
    path = path.slice(0, -1);
  }
  if (path !== PAGE_PATH) return;

  try {
    localStorage.removeItem("gk_last_booking_payload_v1");
  } catch (e) {}

  var app = document.getElementById(ROOT_ID);
  if (!app) return;
  app.innerHTML = "";

  /* ------------------------------------------------ */
  /* CSS */
  /* ------------------------------------------------ */

  function injectCSS() {
    if (document.getElementById("gk-disc-css-v5")) return;

    var css = ""
      + ":root{"
      + "--gk-bg:#0f0f0f;"
      + "--gk-card:#171717;"
      + "--gk-card2:#101010;"
      + "--gk-soft:#1e1e1e;"
      + "--gk-line:rgba(255,255,255,.10);"
      + "--gk-text:rgba(255,255,255,.94);"
      + "--gk-muted:rgba(255,255,255,.72);"
      + "--gk-ac:#2bd18b;"
      + "--gk-ac2:#7dffb8;"
      + "--gk-gold:#f0c14b;"
      + "--gk-red:#ff6b6b;"
      + "--gk-red-2:#ff9a9a;"
      + "--gk-stop:#ffb86b;"
      + "--gk-stop-2:#ffd3a1;"
      + "}"

      + "#disc-booking-app{max-width:1040px;margin:0 auto;padding:12px;color:var(--gk-text)}"

      + ".gk-status{padding:0 0 10px 0;color:var(--gk-muted);font-size:13px}"

      + ".gk-top{"
      + "position:relative;"
      + "overflow:hidden;"
      + "border:1px solid var(--gk-line);"
      + "border-radius:22px;"
      + "padding:16px;"
      + "background:radial-gradient(circle at top right, rgba(43,209,139,.12), transparent 42%), linear-gradient(180deg,var(--gk-card),var(--gk-card2));"
      + "box-shadow:0 18px 50px rgba(0,0,0,.35);"
      + "margin:0 0 14px 0;"
      + "}"

      + ".gk-top-grid{display:grid;grid-template-columns:1fr;gap:14px;align-items:center}"
      + ".gk-top-title{display:flex;flex-direction:column;gap:8px;min-width:0}"
      + ".gk-top-title b{font-size:25px;line-height:1.08;letter-spacing:.2px}"
      + ".gk-top-title span{font-size:14px;color:var(--gk-muted);line-height:1.45}"

      + ".gk-meta{display:flex;flex-wrap:wrap;gap:8px}"
      + ".gk-chip-meta{"
      + "display:inline-flex;align-items:center;justify-content:center;"
      + "min-height:36px;padding:8px 12px;border-radius:999px;"
      + "border:1px solid rgba(255,255,255,.10);"
      + "background:rgba(255,255,255,.05);"
      + "font-size:13px;font-weight:800;color:var(--gk-text)"
      + "}"
      + ".gk-chip-meta.price{"
      + "border-color:rgba(240,193,75,.35);"
      + "background:linear-gradient(135deg, rgba(240,193,75,.18), rgba(240,193,75,.06));"
      + "color:#ffe29b"
      + "}"
      + ".gk-chip-meta.warn{"
      + "border-color:rgba(255,107,107,.28);"
      + "background:linear-gradient(135deg, rgba(255,107,107,.14), rgba(255,107,107,.06));"
      + "color:#ffc1c1"
      + "}"

      + ".gk-top-actions{display:flex;flex-wrap:wrap;gap:10px}"
      + ".gk-cartbtn{"
      + "display:inline-flex;align-items:center;justify-content:center;gap:8px;"
      + "min-height:46px;padding:12px 16px;border-radius:14px;"
      + "border:1px solid rgba(43,209,139,.55);"
      + "background:linear-gradient(135deg, rgba(43,209,139,.18), rgba(125,255,184,.08));"
      + "color:var(--gk-text);text-decoration:none;font-weight:900;"
      + "width:100%;"
      + "}"
      + ".gk-cartbtn:active{transform:scale(.99)}"

      + ".gk-cal{"
      + "border:1px solid var(--gk-line);"
      + "border-radius:22px;"
      + "overflow:hidden;"
      + "background:linear-gradient(180deg,var(--gk-card),var(--gk-card2));"
      + "box-shadow:0 18px 50px rgba(0,0,0,.30)"
      + "}"

      + ".gk-cal-head{padding:14px;border-bottom:1px solid var(--gk-line);display:flex;flex-direction:column;gap:12px}"
      + ".gk-cal-title{font-size:18px;font-weight:900;line-height:1.1}"
      + ".gk-cal-sub{font-size:13px;color:var(--gk-muted);line-height:1.4}"

      + ".gk-cal-nav{display:grid;grid-template-columns:1fr 1fr;gap:10px}"
      + ".gk-navbtn{"
      + "min-height:42px;border-radius:14px;border:1px solid rgba(255,255,255,.14);"
      + "background:rgba(255,255,255,.05);color:var(--gk-text);font-weight:900;cursor:pointer;padding:10px 12px"
      + "}"
      + ".gk-navbtn:active{transform:scale(.99)}"

      + ".gk-chips-wrap{padding:12px 12px 0 12px}"
      + ".gk-chips{display:flex;gap:10px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}"
      + ".gk-chips::-webkit-scrollbar{display:none}"

      + ".gk-chip{"
      + "flex:0 0 auto;min-width:92px;"
      + "padding:12px 12px;border-radius:16px;border:1px solid rgba(255,255,255,.10);"
      + "background:rgba(255,255,255,.04);color:var(--gk-text);cursor:pointer;text-align:left"
      + "}"
      + ".gk-chip[data-active='1']{border-color:rgba(43,209,139,.70);background:linear-gradient(135deg, rgba(43,209,139,.18), rgba(125,255,184,.08))}"
      + ".gk-chip-top{font-weight:900;font-size:14px;line-height:1.05}"
      + ".gk-chip-sub{font-size:11px;color:var(--gk-muted);margin-top:5px}"

      + ".gk-grid{padding:12px;display:flex;flex-direction:column;gap:12px}"

      + ".gk-slot{"
      + "border:1px solid rgba(255,255,255,.08);"
      + "border-radius:18px;"
      + "padding:14px;"
      + "background:linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02));"
      + "display:flex;flex-direction:column;gap:12px"
      + "}"

      + ".gk-slot-left{display:flex;flex-direction:column;gap:8px}"
      + ".gk-slot-time{font-size:21px;font-weight:900;line-height:1.05}"
      + ".gk-slot-meta{display:flex;flex-wrap:wrap;gap:8px}"

      + ".gk-mini{"
      + "display:inline-flex;align-items:center;justify-content:center;"
      + "padding:8px 10px;border-radius:12px;"
      + "background:rgba(255,255,255,.05);"
      + "border:1px solid rgba(255,255,255,.08);"
      + "font-size:12px;font-weight:800;color:var(--gk-text)"
      + "}"
      + ".gk-mini.price{"
      + "border-color:rgba(240,193,75,.30);"
      + "background:linear-gradient(135deg, rgba(240,193,75,.16), rgba(240,193,75,.06));"
      + "color:#ffe29b"
      + "}"
      + ".gk-mini.ok{"
      + "border-color:rgba(43,209,139,.30);"
      + "background:linear-gradient(135deg, rgba(43,209,139,.16), rgba(125,255,184,.06));"
      + "color:#bff5d8"
      + "}"
      + ".gk-mini.warn{"
      + "border-color:rgba(255,107,107,.34);"
      + "background:linear-gradient(135deg, rgba(255,107,107,.18), rgba(255,107,107,.06));"
      + "color:#ffd1d1"
      + "}"
      + ".gk-mini.stop{"
      + "border-color:rgba(255,184,107,.32);"
      + "background:linear-gradient(135deg, rgba(255,184,107,.16), rgba(255,184,107,.05));"
      + "color:#ffe0bc"
      + "}"

      + ".gk-slot-right{display:flex;align-items:center;justify-content:stretch}"
      + ".gk-bookbtn{"
      + "width:100%;min-height:48px;padding:12px 14px;border-radius:16px;"
      + "border:1px solid rgba(43,209,139,.55);"
      + "background:linear-gradient(135deg, rgba(43,209,139,.18), rgba(125,255,184,.08));"
      + "color:var(--gk-text);font-weight:900;cursor:pointer"
      + "}"
      + ".gk-bookbtn:active{transform:scale(.99)}"
      + ".gk-bookbtn[disabled]{opacity:.88;cursor:not-allowed;transform:none}"
      + ".gk-bookbtn.gk-ok{border-color:rgba(43,209,139,.75)}"
      + ".gk-bookbtn.gk-locked{border-color:rgba(255,255,255,.14);background:rgba(255,255,255,.05)}"
      + ".gk-bookbtn.gk-stopped{border-color:rgba(255,184,107,.36);background:linear-gradient(135deg, rgba(255,184,107,.14), rgba(255,184,107,.05));color:#ffe0bc}"
      + ".gk-bookbtn.gk-booked{border-color:rgba(255,107,107,.45);background:linear-gradient(135deg, rgba(255,107,107,.20), rgba(255,107,107,.07));color:#ffd3d3}"

      + ".gk-note{padding:0 14px 14px 14px;color:var(--gk-muted);font-size:12px;line-height:1.45}"
      + ".gk-empty{padding:18px 14px;color:var(--gk-muted)}"

      + "@media (min-width:760px){"
      + "#disc-booking-app{padding:16px}"
      + ".gk-top{padding:20px}"
      + ".gk-top-grid{grid-template-columns:1fr auto;align-items:end}"
      + ".gk-cartbtn{width:auto;min-width:190px}"
      + ".gk-cal-head{flex-direction:row;align-items:end;justify-content:space-between}"
      + ".gk-cal-nav{display:flex;grid-template-columns:none}"
      + ".gk-slot{flex-direction:row;align-items:center;justify-content:space-between}"
      + ".gk-slot-right{flex:0 0 190px;justify-content:flex-end}"
      + ".gk-bookbtn{width:auto;min-width:170px}"
      + "}";

    var style = document.createElement("style");
    style.id = "gk-disc-css-v5";
    style.type = "text/css";
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
  }
  injectCSS();

  /* ------------------------------------------------ */
  /* UI */
  /* ------------------------------------------------ */

  var status = document.createElement("div");
  status.className = "gk-status";
  app.appendChild(status);

  var top = document.createElement("div");
  top.className = "gk-top";
  app.appendChild(top);

  var topGrid = document.createElement("div");
  topGrid.className = "gk-top-grid";
  top.appendChild(topGrid);

  var titleBox = document.createElement("div");
  titleBox.className = "gk-top-title";
  topGrid.appendChild(titleBox);

  var titleB = document.createElement("b");
  titleB.textContent = "Disc Simulator booking";
  titleBox.appendChild(titleB);

  var titleS = document.createElement("span");
  titleS.textContent = "Pris vises per tid. Booking stenger 20 minutter før start. Bookede tider vises i rødt.";
  titleBox.appendChild(titleS);

  var meta = document.createElement("div");
  meta.className = "gk-meta";
  titleBox.appendChild(meta);

  var chip1 = document.createElement("div");
  chip1.className = "gk-chip-meta price";
  chip1.textContent = "Pris per tid";
  meta.appendChild(chip1);

  var chip2 = document.createElement("div");
  chip2.className = "gk-chip-meta warn";
  chip2.textContent = "Booking stenger 20 min før start";
  meta.appendChild(chip2);

  var actions = document.createElement("div");
  actions.className = "gk-top-actions";
  topGrid.appendChild(actions);

  var cartBtn = document.createElement("a");
  cartBtn.className = "gk-cartbtn";
  cartBtn.href = CART_URL;
  cartBtn.textContent = "Gå til handlekurv";
  actions.appendChild(cartBtn);

  var cal = document.createElement("div");
  cal.className = "gk-cal";
  app.appendChild(cal);

  var calHead = document.createElement("div");
  calHead.className = "gk-cal-head";
  cal.appendChild(calHead);

  var headLeft = document.createElement("div");
  calHead.appendChild(headLeft);

  var calTitle = document.createElement("div");
  calTitle.className = "gk-cal-title";
  calTitle.textContent = "Velg dato";
  headLeft.appendChild(calTitle);

  var calSub = document.createElement("div");
  calSub.className = "gk-cal-sub";
  calSub.textContent = "Swipe på dagene for å se hele uka. Bruk knappene for å bytte uke.";
  headLeft.appendChild(calSub);

  var calNav = document.createElement("div");
  calNav.className = "gk-cal-nav";
  calHead.appendChild(calNav);

  var prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.className = "gk-navbtn";
  prevBtn.textContent = "Forrige uke";
  calNav.appendChild(prevBtn);

  var nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = "gk-navbtn";
  nextBtn.textContent = "Neste uke";
  calNav.appendChild(nextBtn);

  var chipsWrap = document.createElement("div");
  chipsWrap.className = "gk-chips-wrap";
  cal.appendChild(chipsWrap);

  var chips = document.createElement("div");
  chips.className = "gk-chips";
  chipsWrap.appendChild(chips);

  var grid = document.createElement("div");
  grid.className = "gk-grid";
  cal.appendChild(grid);

  var note = document.createElement("div");
  note.className = "gk-note";
  note.textContent = "Tider mindre enn 20 minutter før start vises som stengt. Fullbookede tider vises som booket i rødt.";
  cal.appendChild(note);

  /* ------------------------------------------------ */
  /* CART */
  /* ------------------------------------------------ */

  function postAddForm(bodyStr) {
    return fetch("/cart/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest"
      },
      body: bodyStr,
      credentials: "same-origin"
    }).then(function (r) { return r.text(); });
  }

  function addVariantToCart(productId, variantId, cb) {
    var body =
      "product_id=" + encodeURIComponent(String(productId)) +
      "&variant=" + encodeURIComponent(String(variantId)) +
      "&qty=1&quantity=1" +
      "&eventId=" + encodeURIComponent(String(EVENT_ID)) +
      "&page=product";

    postAddForm(body).then(function () { cb(true); })
      .catch(function () { cb(false); });
  }

  /* ------------------------------------------------ */
  /* HELPERS */
  /* ------------------------------------------------ */

  function parseDT(v) {
    var date = "", time = "";
    if (v && v.values) {
      for (var i = 0; i < v.values.length; i++) {
        var it = v.values[i];
        var n = String(it.name || "").toLowerCase();
        var val = String(it.val || "");
        if (!date && n.indexOf("dag") !== -1) date = val;
        if (!time && n.indexOf("tid") !== -1) time = val;
      }
    }
    return { date: date, time: time };
  }

  function parsePrice(v, productObj) {
    var candidates = [
      v && v.price,
      v && v.special_price,
      v && v.sale_price,
      v && v.final_price,
      v && v.customer_price,
      v && v.regular_price,
      productObj && productObj.price
    ];

    for (var i = 0; i < candidates.length; i++) {
      var raw = candidates[i];
      if (raw === null || typeof raw === "undefined" || raw === "") continue;

      if (typeof raw === "number") return raw;

      var s = String(raw).replace(/\s/g, "").replace(",", ".");
      var m = s.match(/-?\d+(\.\d+)?/);
      if (m) {
        var num = parseFloat(m[0]);
        if (!isNaN(num)) return num;
      }
    }
    return null;
  }

  function formatPriceNOK(num) {
    if (num === null || typeof num === "undefined" || isNaN(num)) return "Pris kommer";
    var rounded = Math.round(Number(num) * 100) / 100;
    if (Math.abs(rounded - Math.round(rounded)) < 0.001) return Math.round(rounded) + " kr";
    return rounded.toFixed(2).replace(".", ",") + " kr";
  }

  function parseStartDateTime(date, time) {
    if (!date || !time) return null;
    var start = String(time).split("-")[0] || "";
    if (!start) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return new Date(date + "T" + start + ":00");
    }

    var dm = String(date).match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (dm) {
      var dd = ("0" + parseInt(dm[1], 10)).slice(-2);
      var mm = ("0" + parseInt(dm[2], 10)).slice(-2);
      var yy = dm[3];
      return new Date(yy + "-" + mm + "-" + dd + "T" + start + ":00");
    }

    return null;
  }

  function buildCutoffDate(date, time) {
    var start = parseStartDateTime(date, time);
    if (!start || isNaN(start.getTime())) return null;
    var cutoff = new Date(start.getTime());
    cutoff.setMinutes(cutoff.getMinutes() - CUTOFF_MINUTES_BEFORE_START);
    return cutoff;
  }

  function slotState(date, time) {
    var now = new Date();
    var start = parseStartDateTime(date, time);
    if (!start || isNaN(start.getTime())) return { passed: false, closed: false };

    var cutoff = buildCutoffDate(date, time);
    if (!cutoff || isNaN(cutoff.getTime())) return { passed: false, closed: false };

    return {
      passed: start.getTime() < now.getTime(),
      closed: now.getTime() >= cutoff.getTime()
    };
  }

  function buildIndex(variants, productId, productObj) {
    var map = {};

    for (var i = 0; i < variants.length; i++) {
      var v = variants[i];
      var qty = parseInt(v.qty || "0", 10);
      if (isNaN(qty)) qty = 0;

      var dt = parseDT(v);
      if (!dt.date || !dt.time) continue;

      var st = slotState(dt.date, dt.time);
      if (st.passed) continue;

      if (!map[dt.date]) map[dt.date] = {};

      map[dt.date][dt.time] = {
        product: String(productId),
        variant: String(v.id || ""),
        date: dt.date,
        time: dt.time,
        qty: qty,
        soldOut: qty <= 0,
        closed: !!st.closed,
        price: parsePrice(v, productObj)
      };
    }

    return map;
  }

  function keys(o) {
    var arr = [];
    for (var k in o) if (o.hasOwnProperty(k)) arr.push(k);
    arr.sort();
    return arr;
  }

  function fmtChip(dateStr) {
    var d = new Date(dateStr + "T00:00:00");
    var wd = ["Søn", "Man", "Tir", "Ons", "Tor", "Fre", "Lør"][d.getDay()];
    var dd = ("0" + d.getDate()).slice(-2);
    var mm = ("0" + (d.getMonth() + 1)).slice(-2);
    return { top: wd + " " + dd + "." + mm, sub: dateStr };
  }

  function isToday(dateStr) {
    var now = new Date();
    var y = now.getFullYear();
    var m = ("0" + (now.getMonth() + 1)).slice(-2);
    var d = ("0" + now.getDate()).slice(-2);
    return dateStr === (y + "-" + m + "-" + d);
  }

  function idxOf(arr, v) {
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] === v) return i;
    }
    return -1;
  }

  function hasAnyVisible(slotsForDate) {
    if (!slotsForDate) return false;
    var ks = keys(slotsForDate);
    return ks.length > 0;
  }

  /* ------------------------------------------------ */
  /* DATA / STATE */
  /* ------------------------------------------------ */

  var ALL_SLOTS = null;
  var ALL_DATES = [];
  var ACTIVE_DATE = "";
  var WEEK_START = 0;
  var WEEK_SIZE = 7;

  function clampWeekStart(i) {
    if (i < 0) i = 0;
    if (i > Math.max(0, ALL_DATES.length - WEEK_SIZE)) i = Math.max(0, ALL_DATES.length - WEEK_SIZE);
    return i;
  }

  /* ------------------------------------------------ */
  /* RENDER */
  /* ------------------------------------------------ */

  function setActiveDate(d) {
    ACTIVE_DATE = d;

    var kids = chips.children;
    for (var i = 0; i < kids.length; i++) {
      var el = kids[i];
      if (!el || !el.getAttribute) continue;
      el.setAttribute("data-active", el.getAttribute("data-date") === d ? "1" : "0");
    }

    renderSlots(d);
  }

  function renderSlots(dateStr) {
    grid.innerHTML = "";

    if (!ALL_SLOTS || !ALL_SLOTS[dateStr]) {
      grid.innerHTML = "<div class='gk-empty'>Ingen tider denne dagen.</div>";
      return;
    }

    var slotsObj = ALL_SLOTS[dateStr];
    var times = keys(slotsObj);

    if (!times.length) {
      grid.innerHTML = "<div class='gk-empty'>Ingen tider denne dagen.</div>";
      return;
    }

    for (var i = 0; i < times.length; i++) {
      var slot = slotsObj[times[i]];
      if (!slot) continue;

      var row = document.createElement("div");
      row.className = "gk-slot";

      var left = document.createElement("div");
      left.className = "gk-slot-left";
      row.appendChild(left);

      var timeEl = document.createElement("div");
      timeEl.className = "gk-slot-time";
      timeEl.textContent = slot.time;
      left.appendChild(timeEl);

      var metaEl = document.createElement("div");
      metaEl.className = "gk-slot-meta";
      left.appendChild(metaEl);

      var priceChip = document.createElement("div");
      priceChip.className = "gk-mini price";
      priceChip.textContent = formatPriceNOK(slot.price);
      metaEl.appendChild(priceChip);

      if (slot.soldOut) {
        var soldChip = document.createElement("div");
        soldChip.className = "gk-mini warn";
        soldChip.textContent = "Booket";
        metaEl.appendChild(soldChip);
      } else if (slot.closed) {
        var stopChip = document.createElement("div");
        stopChip.className = "gk-mini stop";
        stopChip.textContent = "Stengt – mindre enn 20 min igjen";
        metaEl.appendChild(stopChip);
      } else {
        var qtyChip = document.createElement("div");
        qtyChip.className = "gk-mini ok";
        qtyChip.textContent = "Ledig nå";
        metaEl.appendChild(qtyChip);
      }

      var right = document.createElement("div");
      right.className = "gk-slot-right";
      row.appendChild(right);

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "gk-bookbtn";
      btn.textContent = "Book tid";
      right.appendChild(btn);

      if (slot.soldOut) {
        btn.disabled = true;
        btn.textContent = "Booket";
        btn.className = "gk-bookbtn gk-booked";
      } else if (slot.closed) {
        btn.disabled = true;
        btn.textContent = "Stengt";
        btn.className = "gk-bookbtn gk-stopped";
      }

      btn.onclick = (function (s, b) {
        return function () {
          if (s.closed || s.soldOut) return;

          if (String(b.getAttribute("data-gk-locked") || "0") === "1") {
            showGate();
            return;
          }

          b.disabled = true;
          b.textContent = "Legger til…";

          addVariantToCart(s.product, s.variant, function (ok) {
            if (ok) {
              gkStoreBookingDetails({
                source: "disc",
                title: "Disc simulator booking",
                item: {
                  type: "disc",
                  label: "Disc simulator",
                  date: s.date || "",
                  time: s.time || "",
                  productId: String(s.product || ""),
                  variantId: String(s.variant || ""),
                  price: (s.price !== null && typeof s.price !== "undefined") ? String(s.price) : ""
                },
                extras: {}
              });

              status.innerHTML = "";
              b.className = "gk-bookbtn gk-ok";
              b.textContent = "Lagt i handlekurv ✓";
            } else {
              b.disabled = false;
              b.textContent = "Feil – prøv igjen";
            }
          });
        };
      })(slot, btn);

      grid.appendChild(row);
    }

    syncRulesButtonState();
  }

  function renderWeek() {
    chips.innerHTML = "";

    WEEK_START = clampWeekStart(WEEK_START);
    var slice = ALL_DATES.slice(WEEK_START, WEEK_START + WEEK_SIZE);

    if (!slice.length) {
      grid.innerHTML = "<div class='gk-empty'>Ingen tider akkurat nå.</div>";
      return;
    }

    for (var i = 0; i < slice.length; i++) {
      (function () {
        var d = slice[i];

        var chip = document.createElement("button");
        chip.type = "button";
        chip.className = "gk-chip";
        chip.setAttribute("data-date", d);

        var f = fmtChip(d);

        var top = document.createElement("div");
        top.className = "gk-chip-top";
        top.textContent = f.top;
        chip.appendChild(top);

        var sub = document.createElement("div");
        sub.className = "gk-chip-sub";
        sub.textContent = isToday(d) ? "I dag" : f.sub;
        chip.appendChild(sub);

        chip.onclick = function () {
          setActiveDate(d);
        };

        chips.appendChild(chip);
      })();
    }

    if (idxOf(slice, ACTIVE_DATE) === -1) setActiveDate(slice[0]);
    else setActiveDate(ACTIVE_DATE);
  }

  prevBtn.onclick = function () {
    WEEK_START = clampWeekStart(WEEK_START - WEEK_SIZE);
    renderWeek();
  };

  nextBtn.onclick = function () {
    WEEK_START = clampWeekStart(WEEK_START + WEEK_SIZE);
    renderWeek();
  };

  /* ------------------------------------------------ */
  /* LOAD */
  /* ------------------------------------------------ */

  status.innerHTML = "Laster tider…";

  fetch(API_DISC)
    .then(function (r) { return r.json(); })
    .then(function (res) {
      var p = res && res.product ? res.product : null;
      var vars = p && p.variants ? p.variants : [];

      ALL_SLOTS = buildIndex(vars, PRODUCT_DISC, p);

      var rawDates = keys(ALL_SLOTS);
      var filteredDates = [];

      for (var i = 0; i < rawDates.length; i++) {
        var d = rawDates[i];
        if (hasAnyVisible(ALL_SLOTS[d])) {
          filteredDates.push(d);
        }
      }

      ALL_DATES = filteredDates;

      console.log("[DISC] dates from variants:", ALL_DATES);

      status.innerHTML = "";

      if (!ALL_DATES.length) {
        grid.innerHTML = "<div class='gk-empty'>Ingen tider akkurat nå.</div>";
        return;
      }

      var todayPick = "";
      for (var j = 0; j < ALL_DATES.length; j++) {
        if (isToday(ALL_DATES[j])) {
          todayPick = ALL_DATES[j];
          break;
        }
      }

      ACTIVE_DATE = todayPick || ALL_DATES[0];

      var ai = idxOf(ALL_DATES, ACTIVE_DATE);
      if (ai < 0) ai = 0;
      WEEK_START = clampWeekStart(ai - (ai % WEEK_SIZE));

      renderWeek();
    })
    .catch(function (e) {
      console.log("[DISC] load error:", e);
      status.innerHTML = "Kunne ikke laste tider.";
      grid.innerHTML = "<div class='gk-empty'>Kunne ikke laste tider.</div>";
    });

  /* ------------------------------------------------ */
  /* GK RULES GATE */
  /* ------------------------------------------------ */

  var RULES_KEY = "gk_booking_rules_ok_daily_v1";
  var TERMS_URL = "https://golfkongen.no/sider/terms-and-conditions";

  function todayKey() {
    var d = new Date();
    var y = d.getFullYear();
    var m = ("0" + (d.getMonth() + 1)).slice(-2);
    var day = ("0" + d.getDate()).slice(-2);
    return y + "-" + m + "-" + day;
  }

  function readOK() {
    try {
      return localStorage.getItem(RULES_KEY) === todayKey();
    } catch (e) {
      return false;
    }
  }

  function writeOK() {
    try {
      localStorage.setItem(RULES_KEY, todayKey());
    } catch (e) {}
  }

  function setButtonsEnabled(enabled) {
    try {
      var btns = document.querySelectorAll(".gk-bookbtn");
      for (var i = 0; i < btns.length; i++) {
        var b = btns[i];
        var txt = String(b.textContent || "");
        if (txt.indexOf("Lagt i handlekurv") !== -1) continue;
        if (txt === "Stengt") continue;
        if (txt === "Booket") continue;

        b.disabled = !enabled;
        b.setAttribute("data-gk-locked", enabled ? "0" : "1");

        if (!enabled) {
          b.classList.add("gk-locked");
        } else {
          b.classList.remove("gk-locked");
        }
      }
    } catch (e2) {}
  }

  function syncRulesButtonState() {
    setButtonsEnabled(readOK());
  }

  function injectRulesCSS() {
    if (document.getElementById("gk-rules-gate-css-gk2")) return;

    var css = ""
      + ".gk-rules-overlay{position:fixed;inset:0;background:radial-gradient(1200px 600px at 50% 20%, rgba(43,209,139,.12), rgba(0,0,0,0)), rgba(0,0,0,.66);z-index:99999;display:flex;align-items:flex-end;justify-content:center;padding:12px}"
      + "@media(min-width:900px){.gk-rules-overlay{align-items:center}}"
      + ".gk-rules-modal{width:100%;max-width:860px;border:1px solid rgba(255,255,255,.12);border-radius:20px;overflow:hidden;background:linear-gradient(180deg,#171717,#101010);box-shadow:0 28px 80px rgba(0,0,0,.60)}"
      + ".gk-rules-head{padding:14px 14px 10px;border-bottom:1px solid rgba(255,255,255,.10);display:flex;gap:12px;align-items:flex-start;justify-content:space-between}"
      + ".gk-rules-brand{display:flex;gap:10px;align-items:center}"
      + ".gk-rules-dot{width:12px;height:12px;border-radius:999px;background:linear-gradient(135deg, rgba(43,209,139,1), rgba(125,255,184,1));box-shadow:0 0 0 4px rgba(43,209,139,.12)}"
      + ".gk-rules-title b{display:block;font-size:15px;letter-spacing:.2px;color:rgba(255,255,255,.94)}"
      + ".gk-rules-title span{display:block;margin-top:5px;color:rgba(255,255,255,.70);font-size:12px;line-height:1.35}"
      + ".gk-rules-body{padding:12px 14px;color:rgba(255,255,255,.90);font-size:12.5px;line-height:1.48}"
      + ".gk-rules-grid{display:grid;grid-template-columns:1fr;gap:10px}"
      + "@media(min-width:860px){.gk-rules-grid{grid-template-columns:1fr 1fr}}"
      + ".gk-rules-card{border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.04);border-radius:16px;padding:12px}"
      + ".gk-rules-card h3{margin:0 0 8px;font-size:12.5px}"
      + ".gk-rules-card ul{margin:0;padding-left:18px}"
      + ".gk-rules-card li{margin:6px 0}"
      + ".gk-rules-footer{padding:12px 14px;border-top:1px solid rgba(255,255,255,.10);display:flex;gap:10px;flex-direction:column}"
      + "@media(min-width:700px){.gk-rules-footer{flex-direction:row;align-items:center;justify-content:space-between}}"
      + ".gk-rules-check{display:flex;gap:10px;align-items:flex-start}"
      + ".gk-rules-check input{margin-top:3px;transform:scale(1.15)}"
      + ".gk-rules-actions{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap}"
      + ".gk-rules-btn{padding:12px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:rgba(255,255,255,.92);font-weight:900;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:8px}"
      + ".gk-rules-btn:active{transform:scale(.99)}"
      + ".gk-rules-btn.ok{border-color:rgba(43,209,139,.55);background:linear-gradient(135deg, rgba(43,209,139,.18), rgba(125,255,184,.08))}"
      + ".gk-rules-btn.link{border-color:rgba(43,209,139,.22)}"
      + ".gk-rules-btn[disabled]{opacity:.55;cursor:not-allowed;transform:none}"
      + ".gk-x{border:none;background:transparent;color:rgba(255,255,255,.75);cursor:pointer;font-size:18px;line-height:1;padding:8px 10px;border-radius:12px}"
      + ".gk-x:hover{background:rgba(255,255,255,.06)}";

    var st = document.createElement("style");
    st.id = "gk-rules-gate-css-gk2";
    st.appendChild(document.createTextNode(css));
    document.head.appendChild(st);
  }

  function rulesHTML() {
    return ""
      + "<div class='gk-rules-grid'>"
      + "  <div class='gk-rules-card'>"
      + "    <h3>Booking, betaling og avbestilling</h3>"
      + "    <ul>"
      + "      <li>Booking skjer via GolfKongen.no og er personlig.</li>"
      + "      <li>Avbestilling senest <b>20 min</b> før start. Senere avbestilling/no-show gir normalt ingen refusjon.</li>"
      + "      <li>Booket tid skal overholdes. Overtid kan faktureres (avrundet til påbegynte timer).</li>"
      + "    </ul>"
      + "  </div>"
      + "  <div class='gk-rules-card'>"
      + "    <h3>Alder, oppførsel og sikkerhet</h3>"
      + "    <ul>"
      + "      <li><b>16 års</b> aldersgrense for å booke og bruke fasilitetene alene.</li>"
      + "      <li>Kun den som kaster skal være i kasteområdet. Følg instrukser og skilting.</li>"
      + "      <li>Alkohol er ikke tillatt i lokalet.</li>"
      + "    </ul>"
      + "  </div>"
      + "  <div class='gk-rules-card'>"
      + "    <h3>Ansvar, skade og områder</h3>"
      + "    <ul>"
      + "      <li>Bruk skjer på eget ansvar. Booker er ansvarlig for skade/tyveri/hærverk – også for gjester.</li>"
      + "      <li>Tyveri og hærverk politianmeldes. Skade meldes umiddelbart.</li>"
      + "      <li>Forbudte områder for kunder: kjeller, kjøkken og musikkverksted.</li>"
      + "    </ul>"
      + "  </div>"
      + "  <div class='gk-rules-card'>"
      + "    <h3>Kamera og tekniske feil</h3>"
      + "    <ul>"
      + "      <li>Lokalet er kameraovervåket etter norsk lov (ikke toalett).</li>"
      + "      <li>Ved feil som hindrer bruk: ombooking eller refusjon for berørt tid.</li>"
      + "    </ul>"
      + "  </div>"
      + "</div>";
  }

  function showGate() {
    injectRulesCSS();

    var existing = document.querySelector(".gk-rules-overlay");
    if (existing) return;

    var overlay = document.createElement("div");
    overlay.className = "gk-rules-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");

    var modal = document.createElement("div");
    modal.className = "gk-rules-modal";
    overlay.appendChild(modal);

    var head = document.createElement("div");
    head.className = "gk-rules-head";
    modal.appendChild(head);

    var brand = document.createElement("div");
    brand.className = "gk-rules-brand";
    head.appendChild(brand);

    var dot = document.createElement("div");
    dot.className = "gk-rules-dot";
    brand.appendChild(dot);

    var title = document.createElement("div");
    title.className = "gk-rules-title";
    brand.appendChild(title);

    var b = document.createElement("b");
    b.textContent = "Vilkår for booking og bruk (GolfKongen)";
    title.appendChild(b);

    var s = document.createElement("span");
    s.textContent = "Du må bekrefte vilkårene før du kan legge tider i handlekurven. Dette spør vi om én gang per dag.";
    title.appendChild(s);

    var x = document.createElement("button");
    x.type = "button";
    x.className = "gk-x";
    x.setAttribute("aria-label", "Lukk");
    x.textContent = "✕";
    head.appendChild(x);

    var body = document.createElement("div");
    body.className = "gk-rules-body";
    body.innerHTML = rulesHTML();
    modal.appendChild(body);

    var footer = document.createElement("div");
    footer.className = "gk-rules-footer";
    modal.appendChild(footer);

    var checkWrap = document.createElement("label");
    checkWrap.className = "gk-rules-check";
    footer.appendChild(checkWrap);

    var cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = false;
    checkWrap.appendChild(cb);

    var ct = document.createElement("div");
    ct.innerHTML = "Jeg har lest og aksepterer vilkårene.";
    checkWrap.appendChild(ct);

    var actions2 = document.createElement("div");
    actions2.className = "gk-rules-actions";
    footer.appendChild(actions2);

    var more = document.createElement("a");
    more.className = "gk-rules-btn link";
    more.href = TERMS_URL;
    more.target = "_blank";
    more.rel = "noopener";
    more.textContent = "Les mer";
    actions2.appendChild(more);

    var ok = document.createElement("button");
    ok.type = "button";
    ok.className = "gk-rules-btn ok";
    ok.textContent = "Jeg godtar";
    ok.disabled = true;
    actions2.appendChild(ok);

    cb.onchange = function () {
      ok.disabled = !cb.checked;
    };

    function closeOnly() {
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      setButtonsEnabled(false);
    }

    function accept() {
      writeOK();
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      setButtonsEnabled(true);
    }

    x.onclick = closeOnly;

    overlay.onclick = function (e) {
      if (e && e.target === overlay) closeOnly();
    };

    ok.onclick = accept;

    document.body.appendChild(overlay);
  }

  if (readOK()) {
    setButtonsEnabled(true);
  } else {
    setButtonsEnabled(false);

    var tries = 0;
    var t = setInterval(function () {
      setButtonsEnabled(false);
      tries++;
      if (document.querySelectorAll(".gk-bookbtn").length || tries > 60) {
        clearInterval(t);
        showGate();
      }
    }, 250);
  }

})();
