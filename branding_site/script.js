function setCurrentYear() {
  const yearEl = document.getElementById("year");
  if (!yearEl) return;
  yearEl.textContent = String(new Date().getFullYear());
}

function initAccordions() {
  const triggers = Array.from(document.querySelectorAll(".accordionTrigger"));

  for (const trigger of triggers) {
    const panelId = trigger.getAttribute("aria-controls");
    if (!panelId) continue;
    const panel = document.getElementById(panelId);
    if (!panel) continue;

    trigger.addEventListener("click", () => {
      const expanded = trigger.getAttribute("aria-expanded") === "true";
      const nextExpanded = !expanded;
      trigger.setAttribute("aria-expanded", nextExpanded ? "true" : "false");
      panel.hidden = !nextExpanded;
    });
  }
}

function initSmoothScrollFallback() {
  const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (prefersReduced) return;

  const links = Array.from(document.querySelectorAll('a[href^="#"]'));
  for (const link of links) {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      if (!href || href === "#") return;
      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      history.pushState(null, "", href);
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setCurrentYear();
  initAccordions();
  initSmoothScrollFallback();
});

