/*
 * Landing page and authentication flows.
 */
(function () {
  "use strict";

  const COLLAGE_IDS = [
    "dune-part-two",
    "stranger-things",
    "oppenheimer",
    "the-batman",
    "interstellar",
    "wednesday",
    "parasite",
    "john-wick-4",
    "breaking-bad",
    "money-heist",
    "dark-knight",
    "spider-verse",
    "the-crown",
    "squid-game",
    "inception",
    "game-of-thrones",
    "joker",
    "last-of-us",
    "titanic",
    "the-matrix",
    "la-la-land",
    "django",
    "peaky-blinders",
    "the-witcher",
    "shawshank",
    "fight-club",
    "blade-runner-2049",
    "se7en"
  ];

  const TRENDING_IDS = [
    "dune-part-two",
    "stranger-things",
    "oppenheimer",
    "wednesday",
    "the-batman",
    "interstellar"
  ];

  function paintCollage() {
    const wrap = document.querySelector(".auth-collage, .landing-collage");
    if (!wrap) return;
    const posters = COLLAGE_IDS.map(function (id) {
      return window.NF_DATA ? window.NF_DATA.get(id) : null;
    }).filter(Boolean);

    wrap.innerHTML = "";
    posters.forEach(function (item, index) {
      const img = document.createElement("img");
      img.src = item.poster;
      img.alt = "";
      img.width = 220;
      img.height = 330;
      img.decoding = "async";
      img.loading = index < 10 ? "eager" : "lazy";
      img.dataset.fallbackTitle = item.title;
      img.dataset.accent = item.accent || "#8b1e24";
      wrap.appendChild(img);
    });
  }

  function paintTrending() {
    const strip = document.querySelector("[data-trending-strip]");
    if (!strip || !window.NF_DATA) return;

    strip.innerHTML = TRENDING_IDS.map(function (id, index) {
      const item = window.NF_DATA.get(id);
      if (!item) return "";
      return (
        '<a class="trending-poster" href="signup.html" aria-label="Create an account to watch ' +
        NFUI.escapeHtml(item.title) +
        '">' +
        '<img src="' +
        NFUI.escapeHtml(item.poster) +
        '" alt="' +
        NFUI.escapeHtml(item.title + " poster") +
        '" loading="' +
        (index < 3 ? "eager" : "lazy") +
        '" data-fallback-title="' +
        NFUI.escapeHtml(item.title) +
        '" data-accent="' +
        NFUI.escapeHtml(item.accent || "#8b1e24") +
        '">' +
        '<span class="trending-poster__title">' +
        NFUI.escapeHtml(item.title) +
        "</span>" +
        '<span class="trending-poster__lock" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>' +
        "</span>" +
        "</a>"
      );
    }).join("");
  }

  function fillDemoCredentials() {
    const email = document.querySelector("#loginEmail");
    const password = document.querySelector("#loginPassword");
    if (!email || !password) return;
    email.value = NFStore.DEMO_ACCOUNT.email;
    password.value = NFStore.DEMO_ACCOUNT.password;
    email.classList.add("is-filled");
    password.classList.add("is-filled");
    NFUI.clearFieldError(email);
    NFUI.clearFieldError(password);
    const alert = document.querySelector("#loginAlert");
    NFUI.showAlert(alert, "Demo credentials filled in. Press Sign In to continue.", { type: "success" });
    password.focus();
  }

  function showSessionNotice() {
    const notice = document.querySelector("#sessionNotice");
    const active = NFStore.getSession();
    if (!notice || !active) return;
    notice.innerHTML =
      "You're already signed in as <strong>" +
      NFUI.escapeHtml(active.user.name) +
      '</strong>. <a class="text-link" href="browse.html">Continue to Cineflix</a>';
    notice.classList.add("is-visible");
  }

  function safeNextPage() {
    const next = NFUI.getParam("next");
    return /^[a-zA-Z0-9._-]+\.html(?:[?#][^\s]*)?$/.test(next) ? next : "browse.html";
  }

  function initLanding() {
    paintCollage();
    paintTrending();

    if (NFUI.getParam("signedout") === "1") {
      NFUI.toast("You've been signed out. Come back for the next movie night.", {
        title: "Signed out",
        duration: 3600
      });
    }

    const form = document.querySelector("#landingEmailForm");
    const input = document.querySelector("#landingEmail");
    if (!form || !input) return;

    input.value = NFStore.getPendingEmail() || "";
    if (input.value) input.classList.add("is-filled");

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      NFUI.clearFieldError(input);
      const email = input.value.trim();
      if (!NFUI.isEmail(email)) {
        NFUI.setFieldError(input, "Please enter a valid email address.");
        input.focus();
        return;
      }

      if (NFStore.getSession()) {
        window.location.href = "browse.html";
        return;
      }

      NFStore.setPendingEmail(email);
      window.location.href = "signup.html?email=" + encodeURIComponent(email);
    });

    input.addEventListener("input", function () {
      NFUI.clearFieldError(input);
    });

    const signIn = document.querySelector("#landingSignIn");
    if (signIn && NFStore.getSession()) {
      signIn.textContent = "Open Cineflix";
      signIn.href = "browse.html";
    }
  }

  function initLogin() {
    paintCollage();
    showSessionNotice();

    const form = document.querySelector("#loginForm");
    if (!form) return;

    const email = document.querySelector("#loginEmail");
    const password = document.querySelector("#loginPassword");
    const remember = document.querySelector("#rememberMe");
    const alert = document.querySelector("#loginAlert");
    const submit = form.querySelector('button[type="submit"]');
    const prefilled = NFUI.getParam("email") || NFStore.getPendingEmail();

    if (prefilled) {
      email.value = prefilled;
      email.classList.add("is-filled");
    }

    if (NFUI.getParam("reset") === "1") {
      NFUI.showAlert(alert, "Your password was updated. Sign in with your new password.", { type: "success" });
    }

    [email, password].forEach(function (input) {
      input.addEventListener("input", function () {
        NFUI.clearFieldError(input);
        if (alert && alert.classList.contains("is-visible") && !alert.classList.contains("auth-alert--success")) {
          NFUI.clearAlert(alert);
        }
      });
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      NFUI.clearAlert(alert);
      let valid = true;

      if (!NFUI.isEmail(email.value)) {
        NFUI.setFieldError(email, "Please enter a valid email address.");
        valid = false;
      }
      if (!password.value) {
        NFUI.setFieldError(password, "Please enter your password.");
        valid = false;
      }
      if (!valid) return;

      NFUI.setLoading(submit, true);
      window.setTimeout(function () {
        const result = NFStore.authenticate(email.value, password.value);
        if (!result.ok) {
          NFUI.setLoading(submit, false);
          NFUI.showAlert(alert, result.error);
          password.focus();
          password.select();
          return;
        }

        NFStore.setSession(result.user.id);
        NFStore.clearPendingEmail();
        if (remember && remember.checked) {
          try { localStorage.setItem("cineflix_remember", "1"); } catch (error) { /* noop */ }
        }
        window.location.href = safeNextPage();
      }, 260);
    });

    document.querySelectorAll("[data-demo-fill]").forEach(function (button) {
      button.addEventListener("click", fillDemoCredentials);
    });
  }

  function passwordScore(value) {
    const password = String(value || "");
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 10) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;
    return Math.min(score, 4);
  }

  function initSignup() {
    paintCollage();
    showSessionNotice();

    const form = document.querySelector("#signupForm");
    if (!form) return;

    const name = document.querySelector("#signupName");
    const email = document.querySelector("#signupEmail");
    const password = document.querySelector("#signupPassword");
    const confirm = document.querySelector("#signupConfirm");
    const terms = document.querySelector("#signupTerms");
    const alert = document.querySelector("#signupAlert");
    const submit = form.querySelector('button[type="submit"]');
    const meter = document.querySelector("#passwordMeter");
    const emailParam = NFUI.getParam("email") || NFStore.getPendingEmail();

    if (emailParam) {
      email.value = emailParam;
      email.classList.add("is-filled");
    }

    [name, email, password, confirm].forEach(function (input) {
      input.addEventListener("input", function () {
        NFUI.clearFieldError(input);
        if (alert && alert.classList.contains("is-visible")) NFUI.clearAlert(alert);
      });
    });

    password.addEventListener("input", function () {
      if (meter) meter.dataset.score = String(passwordScore(password.value));
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      NFUI.clearAlert(alert);
      let valid = true;

      if (name.value.trim().length < 2) {
        NFUI.setFieldError(name, "Please enter your name.");
        valid = false;
      }
      if (!NFUI.isEmail(email.value)) {
        NFUI.setFieldError(email, "Please enter a valid email address.");
        valid = false;
      }
      if (password.value.length < 6) {
        NFUI.setFieldError(password, "Use at least 6 characters.");
        valid = false;
      }
      if (confirm.value !== password.value || !confirm.value) {
        NFUI.setFieldError(confirm, "Passwords do not match.");
        valid = false;
      }
      if (terms && !terms.checked) {
        NFUI.showAlert(alert, "Please agree to the Terms of Use and Privacy Statement to continue.");
        valid = false;
      }
      if (!valid) return;

      NFUI.setLoading(submit, true);
      window.setTimeout(function () {
        const result = NFStore.createUser({
          name: name.value,
          email: email.value,
          password: password.value
        });

        if (!result.ok) {
          NFUI.setLoading(submit, false);
          NFUI.showAlert(alert, result.error);
          if (/already exists/i.test(result.error)) {
            NFUI.setFieldError(email, "This email is already registered.");
          }
          return;
        }

        NFStore.setSession(result.user.id);
        NFStore.clearPendingEmail();
        window.location.href = "browse.html?welcome=1";
      }, 320);
    });

    if (name) {
      window.setTimeout(function () { name.focus(); }, 50);
    }
  }

  function updateResetDots(step) {
    document.querySelectorAll(".step-dots__dot").forEach(function (dot) {
      const value = Number(dot.dataset.step);
      dot.classList.toggle("is-active", value === step);
      dot.classList.toggle("is-done", value < step);
    });
  }

  function initForgotPassword() {
    paintCollage();

    const emailStep = document.querySelector("#emailStepForm");
    const resetStep = document.querySelector("#resetStepForm");
    if (!emailStep || !resetStep) return;

    const email = document.querySelector("#resetEmail");
    const emailAlert = document.querySelector("#resetEmailAlert");
    const resetAlert = document.querySelector("#resetPasswordAlert");
    const newPassword = document.querySelector("#newPassword");
    const confirmPassword = document.querySelector("#confirmNewPassword");
    const steps = document.querySelectorAll(".reset-step");
    const accountEmail = document.querySelector("#resetAccountEmail");
    let resetEmail = "";
    let resetUser = null;

    emailStep.addEventListener("submit", function (event) {
      event.preventDefault();
      NFUI.clearAlert(emailAlert);
      NFUI.clearFieldError(email);

      if (!NFUI.isEmail(email.value)) {
        NFUI.setFieldError(email, "Enter the email address associated with your account.");
        return;
      }

      const user = NFStore.findUserByEmail(email.value);
      if (!user) {
        NFUI.showAlert(
          emailAlert,
          "We couldn't find an account with that email on this device. Check the address or create a new account."
        );
        return;
      }

      resetEmail = user.email;
      resetUser = user;
      if (accountEmail) accountEmail.textContent = user.email;
      steps.forEach(function (step) {
        step.classList.toggle("is-active", step.dataset.step === "reset");
      });
      updateResetDots(2);
      window.setTimeout(function () { newPassword.focus(); }, 60);
    });

    [newPassword, confirmPassword].forEach(function (input) {
      input.addEventListener("input", function () {
        NFUI.clearFieldError(input);
        if (resetAlert && resetAlert.classList.contains("is-visible")) NFUI.clearAlert(resetAlert);
      });
    });

    resetStep.addEventListener("submit", function (event) {
      event.preventDefault();
      NFUI.clearAlert(resetAlert);
      let valid = true;

      if (newPassword.value.length < 6) {
        NFUI.setFieldError(newPassword, "Use at least 6 characters.");
        valid = false;
      }
      if (confirmPassword.value !== newPassword.value || !confirmPassword.value) {
        NFUI.setFieldError(confirmPassword, "Passwords do not match.");
        valid = false;
      }
      if (!valid) return;

      const result = NFStore.resetPassword(resetEmail, newPassword.value);
      if (!result.ok) {
        NFUI.showAlert(resetAlert, result.error);
        return;
      }

      const signInLink = document.querySelector("#resetSignIn");
      if (signInLink) {
        signInLink.href = "login.html?email=" + encodeURIComponent(resetEmail) + "&reset=1";
      }
      steps.forEach(function (step) {
        step.classList.toggle("is-active", step.dataset.step === "done");
      });
      updateResetDots(3);
      newPassword.value = "";
      confirmPassword.value = "";
      NFStore.setPendingEmail(resetEmail);
    });

    document.querySelectorAll("[data-reset-back]").forEach(function (button) {
      button.addEventListener("click", function (event) {
        event.preventDefault();
        steps.forEach(function (step) {
          step.classList.toggle("is-active", step.dataset.step === "email");
        });
        updateResetDots(1);
        email.focus();
      });
    });

    email.addEventListener("input", function () {
      NFUI.clearFieldError(email);
      if (emailAlert) NFUI.clearAlert(emailAlert);
    });
  }

  function initDemoDetails() {
    document.querySelectorAll("[data-demo-email]").forEach(function (el) {
      el.textContent = NFStore.DEMO_ACCOUNT.email;
    });
    document.querySelectorAll("[data-demo-password]").forEach(function (el) {
      el.textContent = NFStore.DEMO_ACCOUNT.password;
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initDemoDetails();
    paintCollage();

    const page = document.body.dataset.page;
    if (page === "landing") initLanding();
    if (page === "login") initLogin();
    if (page === "signup") initSignup();
    if (page === "forgot") initForgotPassword();
  });
})();
