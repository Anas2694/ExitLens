/**
 * ExitLens Analytics Tracker v1.0.0
 * Lightweight behavioral tracking snippet (<3KB gzipped)
 * Drop this script onto any landing page to start tracking.
 *
 * Usage:
 *   <script src="https://cdn.yourdomain.com/analytics.js"
 *           data-api-key="YOUR_API_KEY"
 *           data-endpoint="https://api.yourdomain.com/track">
 *   </script>
 */
(function (window, document) {
  "use strict";

  // ── Config ────────────────────────────────────────────────────────────────
  const script = document.currentScript || (function () {
    const scripts = document.getElementsByTagName("script");
    return scripts[scripts.length - 1];
  })();

  const CONFIG = {
    apiKey: script.getAttribute("data-api-key") || "",
endpoint: script.getAttribute( "https://exitlens.onrender.com/track",    
    flushInterval: 10000,   // flush every 10s
    maxBatchSize: 20,        // max events per batch
    maxScrollSamples: 5,     // throttle scroll events
    sessionTimeout: 30 * 60 * 1000, // 30 min inactivity = new session
  };

  if (!CONFIG.apiKey) {
    console.warn("[ExitLens] No data-api-key found. Tracking disabled.");
    return;
  }

  // ── Session ID ────────────────────────────────────────────────────────────
  function generateId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for older browsers
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  function getSessionId() {
    const KEY = "el_session";
    const LAST_KEY = "el_last_activity";
    const now = Date.now();
    const lastActivity = parseInt(sessionStorage.getItem(LAST_KEY) || "0", 10);

    // New session if timeout exceeded
    if (now - lastActivity > CONFIG.sessionTimeout) {
      const id = generateId();
      sessionStorage.setItem(KEY, id);
    }

    sessionStorage.setItem(LAST_KEY, String(now));
    return sessionStorage.getItem(KEY);
  }

  // ── State ─────────────────────────────────────────────────────────────────
  const SESSION_ID = getSessionId();
  const SESSION_START = Date.now();
  let eventQueue = [];
  let maxScrollDepth = 0;
  let scrollSampleCount = 0;
  let flushTimer = null;
  let isFlushing = false;

  // ── Helpers ───────────────────────────────────────────────────────────────
  function getElementDescriptor(el) {
    if (!el) return "unknown";
    const tag = el.tagName ? el.tagName.toLowerCase() : "unknown";
    const id = el.id ? `#${el.id}` : "";
    // Only use first class to avoid leaking private data
    const cls = el.classList && el.classList[0] ? `.${el.classList[0]}` : "";
    const text = el.innerText
      ? el.innerText.trim().slice(0, 30).replace(/\s+/g, " ")
      : "";
    return `${tag}${id}${cls}${text ? ` "${text}"` : ""}`;
  }

  function getScrollDepth() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const docHeight =
      Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight
      ) - window.innerHeight;
    if (docHeight <= 0) return 100;
    return Math.min(100, Math.round((scrollTop / docHeight) * 100));
  }

  function sanitizeString(str, maxLen) {
    if (typeof str !== "string") return "";
    return str.slice(0, maxLen).replace(/[<>"']/g, "");
  }

  // ── Event Queue ───────────────────────────────────────────────────────────
  function pushEvent(type, data) {
    eventQueue.push({
      type: sanitizeString(type, 50),
      ts: Date.now(),
      ...data,
    });

    if (eventQueue.length >= CONFIG.maxBatchSize) {
      flush();
    }
  }

  // ── Flush (Batched Send) ──────────────────────────────────────────────────
  function flush(isFinal) {
    if (isFlushing || eventQueue.length === 0) return;
    isFlushing = true;

    const batch = eventQueue.splice(0, CONFIG.maxBatchSize);
    const payload = JSON.stringify({
      sessionId: SESSION_ID,
      apiKey: CONFIG.apiKey,
      pageUrl: sanitizeString(window.location.href, 500),
      referrer: sanitizeString(document.referrer, 500),
      userAgent: sanitizeString(navigator.userAgent, 200),
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      duration: Date.now() - SESSION_START,
      maxScrollDepth,
      events: batch,
      isFinal: !!isFinal,
    });

    // Use sendBeacon for final flush (page unload), fetch otherwise
    if (isFinal && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(CONFIG.endpoint, blob);
      isFlushing = false;
    } else {
      fetch(CONFIG.endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: payload,
  keepalive: true,
})
  .then(res => {
    console.log("🔥 TRACK RESPONSE:", res.status);
  })
  .catch(err => {
    console.error("❌ TRACK ERROR:", err);
  })
  .finally(function () {
    isFlushing = false;
  });
    }
  }

  // ── Click Tracking ────────────────────────────────────────────────────────
  document.addEventListener("click", function (e) {
    const el = e.target;
    pushEvent("click", {
      element: getElementDescriptor(el),
      x: Math.round(e.clientX),
      y: Math.round(e.clientY),
      // Normalize coordinates to % of viewport for responsive analysis
      xPct: Math.round((e.clientX / window.innerWidth) * 100),
      yPct: Math.round((e.clientY / window.innerHeight) * 100),
      scrollY: Math.round(window.pageYOffset),
      isInteractive:
        ["a", "button", "input", "select", "textarea", "label"].indexOf(
          (el.tagName || "").toLowerCase()
        ) !== -1 ||
        el.getAttribute("role") === "button" ||
        el.hasAttribute("onclick"),
    });
  }, true);

  // ── Scroll Tracking (Throttled) ───────────────────────────────────────────
  let scrollThrottle = null;
  window.addEventListener("scroll", function () {
    if (scrollThrottle) return;
    scrollThrottle = setTimeout(function () {
      scrollThrottle = null;
      const depth = getScrollDepth();
      if (depth > maxScrollDepth) {
        maxScrollDepth = depth;
        // Only record scroll milestones (25%, 50%, 75%, 100%)
        const milestones = [25, 50, 75, 100];
        milestones.forEach(function (m) {
          if (depth >= m && maxScrollDepth >= m && scrollSampleCount < CONFIG.maxScrollSamples) {
            pushEvent("scroll_milestone", { depth: m });
            scrollSampleCount++;
          }
        });
      }
    }, 500);
  }, { passive: true });

  // ── Page Visibility / Exit ────────────────────────────────────────────────
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      pushEvent("page_hidden", {
        scrollDepth: maxScrollDepth,
        duration: Date.now() - SESSION_START,
        exitPage: sanitizeString(window.location.pathname, 200),
      });
      flush(true);
    }
  });

  window.addEventListener("beforeunload", function () {
    pushEvent("exit", {
      scrollDepth: maxScrollDepth,
      duration: Date.now() - SESSION_START,
      exitPage: sanitizeString(window.location.pathname, 200),
    });
    flush(true);
  });

  // ── Periodic Flush ────────────────────────────────────────────────────────
  flushTimer = setInterval(function () {
    flush(false);
  }, CONFIG.flushInterval);

  // ── SPA Route Change Detection ─────────────────────────────────────────────
  (function () {
    const _pushState = history.pushState;
    const _replaceState = history.replaceState;

    function onRouteChange(url) {
      pushEvent("page_view", {
        url: sanitizeString(String(url), 500),
        scrollDepth: maxScrollDepth,
      });
      maxScrollDepth = 0; // reset for new page
      scrollSampleCount = 0;
    }

    history.pushState = function () {
      _pushState.apply(this, arguments);
      onRouteChange(arguments[2]);
    };
    history.replaceState = function () {
      _replaceState.apply(this, arguments);
      onRouteChange(arguments[2]);
    };
    window.addEventListener("popstate", function () {
      onRouteChange(window.location.href);
    });
  })();

  // ── Initial Page View ─────────────────────────────────────────────────────
  pushEvent("page_view", {
    url: sanitizeString(window.location.href, 500),
    title: sanitizeString(document.title, 200),
  });

  // ── Expose minimal public API ─────────────────────────────────────────────
  window.ExitLens = {
    track: function (eventName, properties) {
      if (typeof eventName !== "string") return;
      pushEvent("custom_" + sanitizeString(eventName, 40), properties || {});
    },
    flush: function () { flush(false); },
  };
})(window, document);
