import { initDashboard } from "./dashboard.js";

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

document.addEventListener("DOMContentLoaded", () => {
  initDashboard();
  requestAnimationFrame(() => {
    if (window.__crmMap) window.__crmMap.invalidateSize();
  });
});
