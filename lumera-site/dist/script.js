import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

window.gsap = gsap;
window.ScrollTrigger = ScrollTrigger;
window.ScrollToPlugin = ScrollToPlugin;

const demoContent = {
  contexto: {
    label: "ETAPA 01 / CONTEXTO",
    title: "Conecte os sinais que já existem.",
    text: "Dados operacionais, regras de negócio e eventos do dia a dia entram em uma visão comum — sem substituir os sistemas que já funcionam.",
    status: "6 fontes sincronizadas",
  },
  raciocinio: {
    label: "ETAPA 02 / RACIOCÍNIO",
    title: "Transforme sinais em entendimento.",
    text: "Modelos e regras analisam o cenário completo, identificam exceções e constroem recomendações que sua equipe consegue verificar.",
    status: "Contexto analisado em tempo real",
  },
  acao: {
    label: "ETAPA 03 / AÇÃO",
    title: "Mova o trabalho com segurança.",
    text: "Agentes executam tarefas dentro dos limites definidos, registram cada decisão e envolvem pessoas sempre que o julgamento humano importa.",
    status: "Políticas de autonomia ativas",
  },
};

const motionPreferenceKey = "lumera-motion-preference";
const motionQuery = new URLSearchParams(window.location.search).get("motion");

function setMotionPreference(value) {
  try {
    if (value) window.localStorage?.setItem(motionPreferenceKey, value);
    else window.localStorage?.removeItem(motionPreferenceKey);
  } catch {
    // Continue with the first-party cookie fallback below.
  }

  const cookieValue = value ? encodeURIComponent(value) : "";
  const maxAge = value ? 31536000 : 0;
  try {
    document.cookie = `${motionPreferenceKey}=${cookieValue}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch {
    // file:// previews do not expose cookies; motion still works through the protocol fallback.
  }
}

function getMotionPreference() {
  try {
    const stored = window.localStorage?.getItem(motionPreferenceKey);
    if (stored) return stored;
  } catch {
    // Read the first-party cookie fallback below.
  }

  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${motionPreferenceKey}=`));
  return cookie ? decodeURIComponent(cookie.split("=").slice(1).join("=")) : null;
}

if (motionQuery === "force") setMotionPreference("full");
if (motionQuery === "reduce") setMotionPreference("reduced");
if (motionQuery === "system") setMotionPreference(null);

const storedMotionPreference = getMotionPreference();

const forceMotion = window.location.protocol === "file:"
  || motionQuery === "force"
  || (motionQuery !== "reduce" && motionQuery !== "system" && storedMotionPreference === "full");
const reduceMotion = motionQuery === "reduce"
  || (!forceMotion && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
document.documentElement.dataset.motion = reduceMotion ? "reduced" : "full";

function splitWords(element) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  nodes.forEach((node) => {
    const fragment = document.createDocumentFragment();
    node.textContent.split(/(\s+)/).forEach((part) => {
      if (!part.trim()) {
        fragment.appendChild(document.createTextNode(part));
        return;
      }
      const mask = document.createElement("span");
      const word = document.createElement("span");
      mask.className = "word-mask";
      word.className = "word";
      word.textContent = part;
      mask.appendChild(word);
      fragment.appendChild(mask);
    });
    node.replaceWith(fragment);
  });
}

document.querySelectorAll("[data-text-reveal]").forEach(splitWords);

const tabs = [...document.querySelectorAll(".demo-tab")];
const panel = document.querySelector("#panel-demo");
const label = panel.querySelector("[data-demo-label]");
const title = panel.querySelector("[data-demo-title]");
const text = panel.querySelector("[data-demo-text]");
const status = panel.querySelector("[data-demo-status]");
const demoParts = [label, title, text, panel.querySelector(".demo-status")];

function updateDemoContent(tab) {
  const content = demoContent[tab.dataset.step];
  tabs.forEach((item) => {
    const selected = item === tab;
    item.classList.toggle("is-active", selected);
    item.setAttribute("aria-selected", String(selected));
    item.tabIndex = selected ? 0 : -1;
  });
  panel.setAttribute("aria-labelledby", tab.id);
  label.textContent = content.label;
  title.textContent = content.title;
  text.textContent = content.text;
  status.textContent = content.status;
}

function selectStep(tab, shouldAnimate = true) {
  if (tab.classList.contains("is-active")) return;
  if (!window.gsap || reduceMotion || !shouldAnimate) {
    updateDemoContent(tab);
    return;
  }

  gsap.timeline({ defaults: { overwrite: "auto" } })
    .to(demoParts, {
      opacity: 0,
      y: -8,
      duration: 0.18,
      stagger: 0.02,
      ease: "power3.out",
      onComplete: () => updateDemoContent(tab),
    })
    .fromTo(demoParts,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.48, stagger: 0.045, ease: "power3.out" },
    )
    .fromTo(".map-core", { scale: 0.96 }, { scale: 1, duration: 0.5, ease: "back.out(1.7)" }, "<");
}

tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectStep(tab, true));
  tab.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const direction = ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1;
    const next = tabs[(index + direction + tabs.length) % tabs.length];
    selectStep(next, false);
    next.focus();
  });
});

const internalNavigationLinks = document.querySelectorAll('a[href^="#"]:not(.skip-link)');
const siteHeader = document.querySelector(".site-header");
let navigationScrollActive = false;

internalNavigationLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    const hash = link.getAttribute("href");
    if (!hash || hash === "#") return;

    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (!target) return;

    event.preventDefault();
    if (window.location.hash !== hash) {
      window.history.pushState(null, "", hash);
    }

    if (!window.gsap || !window.ScrollToPlugin) {
      target.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });
      return;
    }

    const headerOffset = (siteHeader?.getBoundingClientRect().height ?? 0)
      + (window.innerWidth <= 760 ? 16 : 24);
    const destination = Math.max(
      0,
      target.getBoundingClientRect().top + window.scrollY - headerOffset,
    );
    const distance = Math.abs(destination - window.scrollY);
    const duration = reduceMotion
      ? 0.24
      : gsap.utils.clamp(0.62, 0.96, 0.44 + distance / 3200);

    navigationScrollActive = true;
    gsap.killTweensOf(window);
    if (siteHeader) {
      gsap.to(siteHeader, {
        yPercent: 0,
        duration: reduceMotion ? 0.16 : 0.28,
        ease: "power3.out",
        overwrite: "auto",
      });
    }

    gsap.to(window, {
      scrollTo: { y: destination, autoKill: true },
      duration,
      ease: reduceMotion ? "power2.out" : "power3.inOut",
      overwrite: "auto",
      onComplete: () => { navigationScrollActive = false; },
      onInterrupt: () => { navigationScrollActive = false; },
    });
  });
});

function showFallback() {
  document.querySelectorAll(".hero-enter, .reveal").forEach((item) => {
    item.style.opacity = "1";
    item.style.transform = "none";
  });
  document.querySelectorAll(".word").forEach((word) => { word.style.transform = "none"; });
}

if (!window.gsap || !window.ScrollTrigger) {
  showFallback();
} else {
  gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

  if (reduceMotion) {
    showFallback();
  } else {
    const scrollProgress = document.createElement("div");
    scrollProgress.className = "scroll-progress";
    scrollProgress.setAttribute("aria-hidden", "true");
    document.body.appendChild(scrollProgress);

    const curtain = document.createElement("div");
    curtain.className = "motion-curtain";
    curtain.setAttribute("aria-hidden", "true");
    curtain.innerHTML = `
      <div class="motion-curtain__brand">
        <span class="brand-mark"><span></span><span></span><span></span></span>
        <span>Lumera</span>
      </div>
      <span class="motion-curtain__line"></span>
    `;
    document.body.prepend(curtain);

    const heroWords = document.querySelectorAll("#hero-title .word");
    const heroElements = document.querySelectorAll(".hero .hero-enter");
    const loadTimeline = gsap.timeline({
      defaults: { ease: "power4.out" },
      onComplete: () => curtain.remove(),
    });

    loadTimeline
      .fromTo(".motion-curtain__brand", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5 })
      .to(".motion-curtain__line", { scaleX: 1, duration: 0.55, ease: "power2.inOut" }, "-=0.28")
      .to(curtain, { yPercent: -100, duration: 0.82, ease: "power4.inOut" }, "+=0.06")
      .set(heroElements, { opacity: 1, y: 0 }, "-=0.5")
      .fromTo(heroWords,
        { yPercent: 112, rotation: 1.5 },
        { yPercent: 0, rotation: 0, duration: 0.86, stagger: 0.045, ease: "power4.out" },
        "-=0.43",
      )
      .fromTo(".hero .eyebrow, .hero-intro, .hero-actions",
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.65, stagger: 0.07, ease: "power3.out" },
        "-=0.72",
      )
      .fromTo(".tilted-grid-mount",
        { opacity: 0, clipPath: "inset(0 100% 0 0)", x: 26 },
        { opacity: 1, clipPath: "inset(0 0% 0 0)", x: 0, duration: 0.9, ease: "power4.inOut" },
        "-=0.78",
      )
      .fromTo(".signal-card, .activity-strip",
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.48, stagger: 0.055, ease: "power3.out" },
        "-=0.42",
      )
      .fromTo(".hero-foot", { opacity: 0 }, { opacity: 1, duration: 0.5 }, "-=0.28");

    gsap.to(scrollProgress, {
      scaleX: 1,
      ease: "none",
      scrollTrigger: { start: 0, end: "max", scrub: 0.25 },
    });

    const header = siteHeader;
    let headerHidden = false;
    ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate(self) {
        const shouldHide = !navigationScrollActive && self.direction === 1 && self.scroll() > 180;
        header.classList.toggle("is-condensed", self.scroll() > 24);
        if (shouldHide === headerHidden) return;
        headerHidden = shouldHide;
        gsap.to(header, {
          yPercent: shouldHide ? -115 : 0,
          duration: 0.45,
          ease: "power3.out",
          overwrite: "auto",
        });
      },
    });

    const replayOnViewportEntry = "restart none restart none";
    const textRevealElements = [...document.querySelectorAll("[data-text-reveal]:not(#hero-title)")];
    textRevealElements.forEach((element) => {
      gsap.set(element, { opacity: 1, y: 0 });
      gsap.fromTo(element.querySelectorAll(".word"),
        { yPercent: 112, rotation: 1.5 },
        {
          yPercent: 0,
          rotation: 0,
          duration: 0.82,
          stagger: 0.038,
          ease: "power4.out",
          scrollTrigger: {
            trigger: element,
            start: "top 84%",
            toggleActions: replayOnViewportEntry,
          },
        },
      );
    });

    const groupedReveal = new Set([
      ...document.querySelectorAll(".feature-stage .reveal"),
      ...document.querySelectorAll(".principle-list .reveal"),
      ...document.querySelectorAll(".closing .reveal"),
    ]);

    document.querySelectorAll(".reveal").forEach((element) => {
      if (groupedReveal.has(element) || element.hasAttribute("data-text-reveal")) return;
      gsap.fromTo(element,
        { opacity: 0, y: 26 },
        {
          opacity: 1,
          y: 0,
          duration: 0.68,
          ease: "power3.out",
          scrollTrigger: {
            trigger: element,
            start: "top 87%",
            toggleActions: replayOnViewportEntry,
          },
        },
      );
    });

    gsap.fromTo(".feature-stage .reveal",
      { opacity: 0, y: 36, clipPath: "inset(8% 0 0 0)" },
      {
        opacity: 1,
        y: 0,
        clipPath: "inset(0% 0 0 0)",
        duration: 0.78,
        stagger: 0.09,
        ease: "power4.out",
        scrollTrigger: {
          trigger: ".feature-stage",
          start: "top 78%",
          toggleActions: replayOnViewportEntry,
        },
      },
    );

    gsap.fromTo(".decision-stack span",
      { opacity: 0, x: 24 },
      {
        opacity: 1,
        x: 0,
        duration: 0.58,
        stagger: 0.065,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".feature-acid",
          start: "top 72%",
          toggleActions: replayOnViewportEntry,
        },
      },
    );

    gsap.fromTo(".agent-sequence > *",
      { opacity: 0, x: -10 },
      {
        opacity: 1,
        x: 0,
        duration: 0.5,
        stagger: 0.05,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".feature-ink",
          start: "top 75%",
          toggleActions: replayOnViewportEntry,
        },
      },
    );

    gsap.fromTo(".principle-list .principle",
      { opacity: 0, x: 34 },
      {
        opacity: 1,
        x: 0,
        duration: 0.72,
        stagger: 0.08,
        ease: "power4.out",
        scrollTrigger: {
          trigger: ".principle-list",
          start: "top 80%",
          toggleActions: replayOnViewportEntry,
        },
      },
    );

    gsap.fromTo(".closing .eyebrow, .closing .button",
      { opacity: 0, y: 24 },
      {
        opacity: 1,
        y: 0,
        duration: 0.68,
        stagger: 0.08,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".closing",
          start: "top 66%",
          toggleActions: replayOnViewportEntry,
        },
      },
    );

    gsap.fromTo("footer > *",
      { opacity: 0, y: 16 },
      {
        opacity: 1,
        y: 0,
        duration: 0.62,
        stagger: 0.06,
        ease: "power3.out",
        scrollTrigger: {
          trigger: "footer",
          start: "top 92%",
          toggleActions: replayOnViewportEntry,
        },
      },
    );

    gsap.to(".hero-grid", {
      yPercent: 18,
      ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 1 },
    });
    gsap.to(".tilted-grid-mount", {
      yPercent: 9,
      ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 1.1 },
    });
    gsap.to(".context-visual", {
      y: -52,
      rotation: 7,
      ease: "none",
      scrollTrigger: { trigger: ".feature-large", start: "top bottom", end: "bottom top", scrub: 1.2 },
    });
    gsap.to(".orbit-one", {
      rotation: 18,
      ease: "none",
      scrollTrigger: { trigger: ".feature-large", start: "top bottom", end: "bottom top", scrub: 1.2 },
    });
    gsap.to(".map-core", {
      y: -22,
      ease: "none",
      scrollTrigger: { trigger: ".data-map", start: "top bottom", end: "bottom top", scrub: 1 },
    });
    gsap.to(".closing-grid", {
      yPercent: -10,
      scale: 1.08,
      ease: "none",
      scrollTrigger: { trigger: ".closing", start: "top bottom", end: "bottom top", scrub: 1.2 },
    });

    document.querySelectorAll(".map-lines path").forEach((path) => {
      const length = path.getTotalLength();
      gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
      gsap.to(path, {
        strokeDashoffset: 0,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: { trigger: ".data-map", start: "top 76%", once: true },
      });
    });

    document.querySelectorAll(".manifesto, .architecture, .principles, .closing").forEach((section) => {
      const sweep = document.createElement("span");
      sweep.className = "motion-sweep";
      sweep.setAttribute("aria-hidden", "true");
      section.appendChild(sweep);
      gsap.fromTo(sweep,
        { x: 0, opacity: 0 },
        {
          x: () => section.offsetWidth,
          opacity: 0.2,
          duration: 0.86,
          ease: "power4.inOut",
          scrollTrigger: { trigger: section, start: "top 88%", once: true },
          onComplete: () => sweep.remove(),
        },
      );
    });

    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (finePointer.matches) {
      document.querySelectorAll(".feature-stage article, .principle").forEach((card) => {
        card.addEventListener("pointermove", (event) => {
          const rect = card.getBoundingClientRect();
          const rotateX = ((event.clientY - rect.top) / rect.height - 0.5) * -2.2;
          const rotateY = ((event.clientX - rect.left) / rect.width - 0.5) * 2.2;
          gsap.to(card, { rotationX: rotateX, rotationY: rotateY, y: -5, duration: 0.32, ease: "power3.out", overwrite: "auto" });
        });
        card.addEventListener("pointerleave", () => {
          gsap.to(card, { rotationX: 0, rotationY: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.5)", overwrite: "auto" });
        });
      });

      document.querySelectorAll("[data-magnetic]").forEach((button) => {
        button.addEventListener("pointermove", (event) => {
          const rect = button.getBoundingClientRect();
          const x = (event.clientX - rect.left - rect.width / 2) * 0.1;
          const y = (event.clientY - rect.top - rect.height / 2) * 0.12;
          gsap.to(button, { x, y, duration: 0.28, ease: "power3.out", overwrite: "auto" });
        });
        button.addEventListener("pointerleave", () => {
          gsap.to(button, { x: 0, y: 0, duration: 0.65, ease: "elastic.out(1, 0.45)", overwrite: "auto" });
        });
      });
    }

    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
}
