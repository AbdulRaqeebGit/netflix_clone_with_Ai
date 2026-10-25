/*
 * Shared browser helpers: escaping, toasts, field validation and lazy image
 * fallbacks. Exposed as window.NFUI for the page scripts.
 */
(function () {
  "use strict";

  function escapeHtml(value) {
    return String(value === null || value === undefined ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeXml(value) {
    return escapeHtml(value);
  }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name) || "";
  }

  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || "").trim());
  }

  function debounce(fn, wait) {
    let timer = null;
    return function debounced() {
      const args = arguments;
      const context = this;
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        fn.apply(context, args);
      }, wait);
    };
  }

  function makeToastContainer() {
    let container = document.querySelector(".toast-stack");
    if (!container) {
      container = document.createElement("div");
      container.className = "toast-stack";
      container.setAttribute("aria-live", "polite");
      container.setAttribute("aria-atomic", "false");
      document.body.appendChild(container);
    }
    return container;
  }

  function toast(message, options) {
    const opts = options || {};
    const container = makeToastContainer();
    const el = document.createElement("div");
    const type = opts.type === "error" ? " error" : "";
    el.className = "cine-toast" + (opts.type === "error" ? " cine-toast--error" : "");
    el.setAttribute("role", "status");
    el.innerHTML =
      '<span class="cine-toast__icon" aria-hidden="true">' +
      (opts.type === "error"
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 8v5"/><path d="M12 17h.01"/><circle cx="12" cy="12" r="9"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m5 12 4.2 4.2L19 6.5"/></svg>') +
      "</span>" +
      '<div class="cine-toast__body">' +
      (opts.title ? "<strong>" + escapeHtml(opts.title) + "</strong>" : "") +
      "<span>" + escapeHtml(message) + "</span>" +
      "</div>" +
      '<button class="cine-toast__close" type="button" aria-label="Dismiss notification">&times;</button>';

    const dismiss = function () {
      if (!el.isConnected) return;
      el.classList.add("is-leaving");
      window.setTimeout(function () { el.remove(); }, 260);
    };

    el.querySelector(".cine-toast__close").addEventListener("click", dismiss);
    container.appendChild(el);
    window.setTimeout(dismiss, opts.duration || 4200);
  }

  function clearFieldError(input) {
    if (!input) return;
    input.classList.remove("is-invalid");
    const field = input.closest(".nf-field");
    if (field) {
      field.classList.remove("has-error");
      const error = field.querySelector(".field-error");
      if (error) error.remove();
    }
  }

  function setFieldError(input, message) {
    if (!input) return;
    clearFieldError(input);
    input.classList.add("is-invalid");
    const field = input.closest(".nf-field");
    if (field) {
      field.classList.add("has-error");
      const error = document.createElement("p");
      error.className = "field-error";
      error.textContent = message;
      field.appendChild(error);
    }
    input.setAttribute("aria-invalid", "true");
  }

  function clearAlert(el) {
    if (!el) return;
    el.classList.remove("is-visible", "auth-alert--success");
    el.textContent = "";
  }

  function showAlert(el, message, options) {
    if (!el) return;
    const opts = options || {};
    el.classList.toggle("auth-alert--success", opts.type === "success");
    el.textContent = message;
    el.classList.remove("is-visible");
    /* Force the animation to restart when the same alert is reused. */
    void el.offsetWidth;
    el.classList.add("is-visible");
  }

  function setLoading(button, loading) {
    if (!button) return;
    button.classList.toggle("is-loading", !!loading);
    button.disabled = !!loading;
    if (loading) {
      button.setAttribute("aria-busy", "true");
    } else {
      button.removeAttribute("aria-busy");
    }
  }

  function bindPasswordToggles() {
    document.querySelectorAll("[data-toggle-password]").forEach(function (button) {
      button.addEventListener("click", function () {
        const selector = button.getAttribute("data-toggle-password");
        const input = selector ? document.querySelector(selector) : null;
        if (!input) return;
        const showing = input.type === "text";
        input.type = showing ? "password" : "text";
        button.setAttribute("aria-label", showing ? "Show password" : "Hide password");
        button.classList.toggle("is-showing", !showing);
        const eye = button.querySelector("[data-eye-open]");
        const eyeOff = button.querySelector("[data-eye-off]");
        if (eye && eyeOff) {
          eye.classList.toggle("hidden", !showing);
          eyeOff.classList.toggle("hidden", showing);
        }
        input.focus();
      });
    });
  }

  function bindNavScroll() {
    const nav = document.querySelector(".site-nav");
    if (!nav) return;
    const update = function () {
      nav.classList.toggle("is-scrolled", window.scrollY > 22);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  function bindInputFilledState() {
    document.querySelectorAll(".nf-field input").forEach(function (input) {
      const sync = function () {
        input.classList.toggle("is-filled", !!input.value);
      };
      input.addEventListener("input", sync);
      sync();
    });
  }

  function posterFallback(title, accent) {
    const safeTitle = String(title || "Cineflix").trim() || "Cineflix";
    const color = /^#[0-9a-f]{6}$/i.test(String(accent || "")) ? accent : "#9e2a2f";
    const words = safeTitle.split(/\s+/);
    const lines = [];
    let line = "";
    words.forEach(function (word) {
      const next = line ? line + " " + word : word;
      if (next.length > 15 && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    });
    if (line) lines.push(line);
    const clipped = lines.slice(0, 5);
    const startY = 330 - (clipped.length - 1) * 21;
    const tspans = clipped
      .map(function (text, index) {
        return '<tspan x="34" y="' + (startY + index * 42) + '">' + escapeXml(text) + "</tspan>";
      })
      .join("");
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">' +
      "<defs>" +
      '<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#09090b"/>' +
      '<stop offset=".62" stop-color="' + color + '"/>' +
      '<stop offset="1" stop-color="#09090b"/>' +
      "</linearGradient>" +
      '<radialGradient id="glow" cx=".78" cy=".18" r=".75">' +
      '<stop offset="0" stop-color="' + color + '" stop-opacity=".75"/>' +
      '<stop offset="1" stop-color="' + color + '" stop-opacity="0"/>' +
      "</radialGradient>" +
      "</defs>" +
      '<rect width="400" height="600" fill="url(#g)"/>' +
      '<rect width="400" height="600" fill="url(#glow)"/>' +
      '<circle cx="325" cy="95" r="105" fill="none" stroke="#ffffff" stroke-opacity=".13" stroke-width="1"/>' +
      '<circle cx="325" cy="95" r="155" fill="none" stroke="#ffffff" stroke-opacity=".07" stroke-width="1"/>' +
      '<path d="M0 455 C 100 420, 210 520, 400 430 L400 600 L0 600Z" fill="#000" opacity=".55"/>' +
      '<text x="34" y="54" fill="#ffffff" fill-opacity=".55" font-family="Arial, sans-serif" font-size="12" letter-spacing="4">CINEFLIX</text>' +
      '<rect x="34" y="76" width="34" height="3" fill="#e50914"/>' +
      '<text fill="#ffffff" font-family="Arial, sans-serif" font-size="34" font-weight="700" letter-spacing="-1">' +
      tspans +
      "</text>" +
      '<text x="34" y="555" fill="#ffffff" fill-opacity=".55" font-family="Arial, sans-serif" font-size="11" letter-spacing="2.5">A CINEFLIX PRESENTATION</text>' +
      "</svg>";
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }

  function imageFallback(img) {
    if (!img || img.dataset.fallbackApplied === "true") return;
    img.dataset.fallbackApplied = "true";
    img.src = posterFallback(img.dataset.fallbackTitle || img.alt, img.dataset.accent);
  }

  document.addEventListener(
    "error",
    function (event) {
      if (event.target && event.target.tagName === "IMG" && event.target.dataset.fallbackTitle) {
        imageFallback(event.target);
      }
    },
    true
  );

  document.addEventListener("click", function (event) {
    const demoLink = event.target.closest("[data-demo-link]");
    if (!demoLink) return;
    event.preventDefault();
    toast("This link is part of the Cineflix demo and is not connected to a live service.", {
      title: "Demo link",
      duration: 3200
    });
  });

  document.addEventListener("DOMContentLoaded", function () {
    bindPasswordToggles();
    bindNavScroll();
    bindInputFilledState();
    document.querySelectorAll("[data-year]").forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  });

  window.NFUI = {
    escapeHtml: escapeHtml,
    escapeXml: escapeXml,
    getParam: getParam,
    isEmail: isEmail,
    debounce: debounce,
    toast: toast,
    setFieldError: setFieldError,
    clearFieldError: clearFieldError,
    clearAlert: clearAlert,
    showAlert: showAlert,
    setLoading: setLoading,
    posterFallback: posterFallback,
    imageFallback: imageFallback
  };
})();
