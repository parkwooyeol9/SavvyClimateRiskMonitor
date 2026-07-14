import { initDashboard } from "./dashboard.js";
import { initClimateMarkets } from "./markets.js";
import { initEuropeHeat } from "./europe-heat.js";

const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");
const form = document.getElementById("waitlist-form");
const formMessage = document.getElementById("form-message");

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(open));
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

if (form && formMessage) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    formMessage.hidden = false;
    form.reset();
  });
}

function boot() {
  try {
    initDashboard();
  } catch (e) {
    console.error("dashboard init failed", e);
  }
  try {
    initClimateMarkets();
  } catch (e) {
    console.error("markets init failed", e);
    const s = document.getElementById("markets-status");
    if (s) s.textContent = "Markets failed to load — try hard-refresh (Cmd+Shift+R).";
  }
  try {
    initEuropeHeat();
  } catch (e) {
    console.error("europe heat init failed", e);
    const s = document.getElementById("heat-status");
    if (s) s.textContent = "Heat watch failed to load — try hard-refresh (Cmd+Shift+R).";
  }
  requestAnimationFrame(() => {
    if (window.__crmMap) window.__crmMap.invalidateSize();
  });
}

// Module scripts can miss DOMContentLoaded if it already fired — always boot.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
