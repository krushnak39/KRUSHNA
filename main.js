// Simple Auth Form Toggle & Validation + Firebase integration

import {
  initFirebase,
  firebaseReady,
  signUpWithEmail,
  signInWithEmail,
  signOutUser,
  onAuthStateChangedHandler,
} from "./firebase.js";

document.addEventListener("DOMContentLoaded", async () => {
  const tabs = document.querySelectorAll(".tab");
  const forms = document.querySelectorAll(".form");
  const switchButtons = document.querySelectorAll("[data-switch]");
  const authCard = document.querySelector(".auth-card");
  let statusBar = document.getElementById("authStatus");
  if (!statusBar) {
    statusBar = document.createElement("div");
    statusBar.id = "authStatus";
    statusBar.style.cssText =
      "position:absolute;top:.5rem;right:.75rem;font-size:.65rem;font-weight:600;letter-spacing:.5px;padding:.4rem .65rem;border-radius:12px;background:rgba(255,255,255,.15);backdrop-filter:blur(6px);color:#eaffea;display:flex;align-items:center;gap:.5rem;";
    authCard?.appendChild(statusBar);
  }

  function setStatus(msg, type = "info") {
    if (!statusBar) return;
    const colors = {
      info: "rgba(255,255,255,.15)",
      success: "rgba(110,216,107,.25)",
      error: "rgba(255,90,90,.3)",
    };
    statusBar.style.background = colors[type] || colors.info;
    statusBar.textContent = msg;
  }

  setStatus("Loading auth...");
  try {
    await initFirebase();
    await firebaseReady;
    setStatus("Auth ready");
  } catch (e) {
    setStatus("Firebase init failed", "error");
    console.error(e);
  }

  function setMode(mode) {
    tabs.forEach((t) => {
      const active = t.dataset.mode === mode;
      t.classList.toggle("active", active);
      t.setAttribute("aria-selected", active);
      const panelId = active
        ? mode === "signin"
          ? "signinForm"
          : "signupForm"
        : null;
      if (active && panelId) document.getElementById(panelId)?.focus?.();
    });
    forms.forEach((f) => {
      const active = f.dataset.mode === mode;
      f.classList.toggle("active", active);
      f.setAttribute("aria-hidden", (!active).toString());
    });
  }

  tabs.forEach((tab) =>
    tab.addEventListener("click", () => setMode(tab.dataset.mode))
  );
  switchButtons.forEach((btn) =>
    btn.addEventListener("click", () => setMode(btn.dataset.switch))
  );

  // Add dirty attribute on blur for validation styling
  document.addEventListener(
    "blur",
    (e) => {
      if (e.target instanceof HTMLInputElement) {
        if (e.target.value.trim() !== "") e.target.setAttribute("dirty", "");
      }
    },
    true
  );

  // Basic form handlers
  const signinForm = document.getElementById("signinForm");
  const signupForm = document.getElementById("signupForm");

  signinForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("signinEmail");
    const pass = document.getElementById("signinPassword");
    clearErrors(signinForm);
    let ok = true;
    if (!email.value || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value)) {
      setError("signinEmail", "Enter a valid email");
      ok = false;
    }
    if (!pass.value || pass.value.length < 6) {
      setError("signinPassword", "Password too short");
      ok = false;
    }
    if (!ok) return;
    setStatus("Signing in...");
    try {
      await signInWithEmail(email.value, pass.value);
      setStatus("Signed in", "success");
      signinForm.reset();
    } catch (err) {
      console.error(err);
      setStatus(parseFirebaseError(err), "error");
    }
  });

  signupForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const first = document.getElementById("firstName");
    const email = document.getElementById("signupEmail");
    const pass = document.getElementById("signupPassword");
    const confirm = document.getElementById("confirmPassword");
    const terms = document.getElementById("terms");
    clearErrors(signupForm);
    let ok = true;
    if (!first.value.trim()) {
      setError("firstName", "Required");
      ok = false;
    }
    if (!email.value || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value)) {
      setError("signupEmail", "Invalid email");
      ok = false;
    }
    if (!pass.value || pass.value.length < 6) {
      setError("signupPassword", "Min 6 chars");
      ok = false;
    }
    if (pass.value !== confirm.value) {
      setError("confirmPassword", "Passwords do not match");
      ok = false;
    }
    if (!terms.checked) {
      setError("terms", "You must accept terms");
      ok = false;
    }
    if (!ok) return;
    setStatus("Creating account...");
    try {
      await signUpWithEmail(email.value, pass.value, {
        displayName: first.value.trim(),
      });
      setStatus("Account created", "success");
      signupForm.reset();
      setMode("signin");
    } catch (err) {
      console.error(err);
      setStatus(parseFirebaseError(err), "error");
    }
  });

  function setError(id, message) {
    const err = document.querySelector(`.error[data-for="${id}"]`);
    if (err) err.textContent = message;
    const input = document.getElementById(id);
    input?.setAttribute("dirty", "");
  }
  function clearErrors(scope) {
    scope.querySelectorAll(".error").forEach((e) => (e.textContent = ""));
  }

  // Keyboard arrow switching between tabs
  document.querySelector(".tabs")?.addEventListener("keydown", (e) => {
    if (!(e instanceof KeyboardEvent)) return;
    const order = Array.from(tabs);
    const currentIndex = order.findIndex((t) => t.classList.contains("active"));
    let nextIndex = currentIndex;
    if (e.key === "ArrowRight") nextIndex = (currentIndex + 1) % order.length;
    else if (e.key === "ArrowLeft")
      nextIndex = (currentIndex - 1 + order.length) % order.length;
    if (nextIndex !== currentIndex) {
      e.preventDefault();
      order[nextIndex].focus();
      setMode(order[nextIndex].dataset.mode);
    }
  });

  onAuthStateChangedHandler((user) => {
    if (user) {
      setStatus(`Logged in as ${user.email} redirecting to app`, "success");
      let btn = document.getElementById("signoutBtn");
      if (!btn) {
        btn = document.createElement("button");
        btn.id = "signoutBtn";
        btn.textContent = "Sign Out";
        btn.className = "signout-btn";
        const bar = document.getElementById("authStatus");
        bar && bar.appendChild(btn);
        btn.addEventListener("click", async () => {
          setStatus("Signing out...");
          try {
            await signOutUser();
          } catch (e) {
            console.error(e);
            setStatus("Sign out failed", "error");
          }
        });
      }

      if (user) {
        // Use relative redirect so GitHub Pages project path (/KRUSHNA/) is preserved.
        // Hard-coding window.location.pathname removed because it dropped the repo segment in some deployments.
        setTimeout(() => {
          // If already inside a project pages path, a relative link keeps the base.
          window.location.href = '/KRUSHNA/app/app.html';
        }, 1200);
      }
    } else {
      setStatus("Not signed in");
      const btn = document.getElementById("signoutBtn");
      btn?.remove();
    }
  });

  function parseFirebaseError(err) {
    if (!err || !err.code) return "Action failed";
    const map = {
      "auth/email-already-in-use": "Email already in use",
      "auth/invalid-credential": "Invalid email or password",
      "auth/invalid-email": "Invalid email format",
      "auth/weak-password": "Weak password (min 6 chars)",
      "auth/network-request-failed": "Network error",
    };
    return map[err.code] || err.code;
  }
});
