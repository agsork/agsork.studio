/* ============================================================
   agsork studio — script.js
   Reines JavaScript, keine Libraries. Enthält:
   - Sticky Scroll-Story (Webdesign & Entwicklung)
   - Milkshake-Reveals (IntersectionObserver)
   - Navigation: Scroll-Zustand der Kopfzeile
   - Magnetische Buttons · Cursor-Spotlight-Textmaske
   - 3D-Tilt auf dem Hero-Mockup · Scroll-Snap · Projekt-Spotlight
   - Rechtliches: Impressum-/Datenschutz-Modals
   - Gradual Blur an den Viewport-Rändern
   - Glass Dock: Liquid-Glass-Kopfzeile
   - Nav-Menü: barrierefreie Vollflächen-Liste
   ============================================================ */
(() => {
  "use strict";

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ==========================================================
     3 — STICKY SCROLL-STORY (Angebot A)
     ========================================================== */
  const ScrollStory = (() => {
    const scroll = document.getElementById("wsScroll");
    if (!scroll) return;
    const steps = Array.from(document.querySelectorAll(".ws-step"));
    const visuals = Array.from(document.querySelectorAll(".ws-vis"));
    const fill = document.getElementById("wsProgressFill");
    const total = steps.length;
    let current = -1;
    let ticking = false;

    function setActive(idx, progress) {
      if (idx !== current) {
        current = idx;
        steps.forEach((s, i) => s.classList.toggle("is-active", i === idx));
        visuals.forEach((v, i) => v.classList.toggle("is-active", i === idx));
      }
      if (fill) fill.style.width = (progress * 100).toFixed(1) + "%";
    }

    function update() {
      ticking = false;
      const rect = scroll.getBoundingClientRect();
      const vh = window.innerHeight;
      // Fortschritt 0..1 über die scrollbare Distanz der Sektion
      const scrollable = rect.height - vh;
      let progress = scrollable > 0 ? (-rect.top) / scrollable : 0;
      progress = Math.max(0, Math.min(1, progress));
      const idx = Math.min(total - 1, Math.floor(progress * total));
      setActive(idx, progress);
    }

    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
    window.addEventListener("resize", update, { passive: true });
    update();
  })();

  /* ==========================================================
     5 — MILKSHAKE-REVEALS (IntersectionObserver)
     ========================================================== */
  (() => {
    const targets = document.querySelectorAll(
      ".reveal, .reveal-group, .kinetic-title"
    );
    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
    );
    targets.forEach((el) => io.observe(el));
  })();

  /* ==========================================================
     6 — NAVIGATION (Scroll-Zustand der Kopfzeile)
     Öffnen/Schliessen des Menüs übernimmt NavMenu (weiter unten).
     ========================================================== */
  (() => {
    const header = document.getElementById("siteHeader");
    if (!header) return;

    // Scroll-Zustand: am Seitenanfang volle, transparente Leiste; sobald
    // gescrollt wird, minimiert sie sich in die Glass-Pille (.is-condensed).
    // Hysterese (zwei Schwellen) verhindert Flackern an der Kante.
    const CONDENSE_AT = 24; // px — ab hier wird die Leiste zur Pille
    const EXPAND_AT = 6; // px — erst darunter wieder volle Leiste
    let condensed = false;

    let ticking = false;
    function onScroll() {
      ticking = false;
      const y = window.scrollY;
      if (!condensed && y > CONDENSE_AT) {
        condensed = true;
        header.classList.add("is-condensed");
      } else if (condensed && y < EXPAND_AT) {
        condensed = false;
        header.classList.remove("is-condensed");
      }
    }
    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(onScroll);
        }
      },
      { passive: true }
    );
    onScroll();
  })();

  /* ==========================================================
     7 — MAGNETISCHE BUTTONS (roter Faden: Cursor-Anziehung)
     ========================================================== */
  (() => {
    if (prefersReducedMotion) return;
    const isFinePointer = window.matchMedia("(pointer: fine)").matches;
    if (!isFinePointer) return;

    document.querySelectorAll(".magnetic").forEach((el) => {
      const strength = 0.32;
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
      });
      el.addEventListener("pointerleave", () => {
        el.style.transform = "";
      });
    });
  })();

  /* ==========================================================
     8 — CURSOR-SPOTLIGHT-TEXTMASKE (Aufgabe 5)
     Zwei deckungsgleiche Textebenen (Basis gedimmt, Overlay per
     Maske um den Cursor). Nur bei feinem Pointer + Motion-OK,
     sonst bleibt der Text in vollem Kontrast (--c-mid).
     ========================================================== */
  (() => {
    if (prefersReducedMotion) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const GRAD =
      "radial-gradient(circle 80px at 10px 10px, #000 0%, transparent 100%)";
    const supportsMask =
      window.CSS &&
      (CSS.supports("mask-image", GRAD) ||
        CSS.supports("-webkit-mask-image", GRAD));
    if (!supportsMask) return;

    document.querySelectorAll(".section-lead, .hero-sub").forEach((el) => {
      // nur reine Textabsätze — beide Ebenen müssen deckungsgleich sein
      if (el.children.length > 0) return;
      el.dataset.text = el.textContent.replace(/\s+/g, " ").trim();
      el.classList.add("spotlight-on");

      let idleTimer = null;
      // Radius klingt bei Stillstand/Verlassen über ~0.9s auf 0 ab
      const calm = () => {
        el.style.setProperty("--r-speed", "0.9s");
        el.style.setProperty("--r", "0px");
      };
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--x", (e.clientX - r.left).toFixed(1) + "px");
        el.style.setProperty("--y", (e.clientY - r.top).toFixed(1) + "px");
        // Radius wächst in ~200ms auf 100px
        el.style.setProperty("--r-speed", "0.2s");
        el.style.setProperty("--r", "100px");
        clearTimeout(idleTimer);
        idleTimer = setTimeout(calm, 320);
      });
      el.addEventListener("pointerleave", () => {
        clearTimeout(idleTimer);
        calm();
      });
    });
  })();

  /* ==========================================================
     9 — 3D-TILT AUF DEM HERO-MOCKUP (Aufgabe 7)
     Folgt der Cursor-Position (rotateX/rotateY um die Ruhepose),
     federt bei pointerleave zurück. NUR .hero-visual .hv-browser —
     bewusst nicht auf .play-card/.price-card (dosiert).
     ========================================================== */
  (() => {
    if (prefersReducedMotion) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const wrap = document.querySelector(".hero-visual");
    const card = wrap ? wrap.querySelector(".hv-browser") : null;
    if (!card) return;
    const desktop = window.matchMedia("(min-width: 901px)");

    const BASE_RX = 2.5, BASE_RY = -7; // Ruhepose wie im CSS
    const AMP_RX = 6, AMP_RY = 8;      // max. Auslenkung in Grad
    let tx = BASE_RX, ty = BASE_RY;    // Ziel
    let cx = BASE_RX, cy = BASE_RY;    // aktuell (gelerpt)
    let raf = null;

    const apply = () => {
      card.style.transform =
        "rotateX(" + cx.toFixed(2) + "deg) rotateY(" + cy.toFixed(2) + "deg)";
    };
    const tick = () => {
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      apply();
      if (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.02) {
        raf = requestAnimationFrame(tick);
      } else {
        cx = tx; cy = ty; apply();
        raf = null;
      }
    };
    const kick = () => { if (raf == null) raf = requestAnimationFrame(tick); };

    wrap.addEventListener("pointermove", (e) => {
      if (!desktop.matches) return;
      card.style.transition = "none"; // JS-Lerp übernimmt das Easing
      const r = wrap.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;  // -0.5 … 0.5
      const ny = (e.clientY - r.top) / r.height - 0.5;
      tx = BASE_RX - ny * AMP_RX * 2;
      ty = BASE_RY + nx * AMP_RY * 2;
      kick();
    });
    wrap.addEventListener("pointerleave", () => {
      tx = BASE_RX; ty = BASE_RY;
      kick();
    });
    // unter 901px steuert wieder das CSS (Mobile: transform: none)
    desktop.addEventListener("change", (e) => {
      if (!e.matches) {
        if (raf != null) { cancelAnimationFrame(raf); raf = null; }
        card.style.transform = "";
        card.style.transition = "";
        tx = cx = BASE_RX; ty = cy = BASE_RY;
      }
    });
  })();

  /* ==========================================================
     10 — SANFTES SCROLL-SNAP IN ANGEBOT A (Aufgabe 9, niedrige
     Priorität). KEIN Wheel-/Touch-Hijacking: korrigiert erst
     nach dem natürlichen Scroll-Ende per smooth scrollBy.
     ========================================================== */
  (() => {
    if (prefersReducedMotion) return;
    const section = document.getElementById("wsScroll");
    if (!section) return;
    const total = parseInt(section.dataset.steps || "4", 10);
    const desktop = window.matchMedia("(min-width: 901px)");
    let timer = null;

    function trySnap() {
      if (!desktop.matches) return; // Mobile: statische Liste, kein Snap
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      const scrollable = rect.height - vh;
      if (scrollable <= 0) return;
      const progress = -rect.top / scrollable;
      if (progress <= 0.02 || progress >= 0.98) return; // nur solange gepinnt
      const stepF = progress * total;
      let center = Math.round(stepF - 0.5) + 0.5; // nächste Schritt-Mitte
      center = Math.max(0.5, Math.min(total - 0.5, center));
      const delta = (center / total - progress) * scrollable;
      if (Math.abs(delta) < 6) return; // schon nah genug
      window.scrollBy({ top: delta, behavior: "smooth" });
    }

    window.addEventListener(
      "scroll",
      () => {
        clearTimeout(timer);
        timer = setTimeout(trySnap, 220);
      },
      { passive: true }
    );
  })();

  /* ==========================================================
     11 — PROJEKT-SPOTLIGHT: BILD-REVEAL (Aufgabe 11)
     Gleiche Progress-Berechnung wie ScrollStory, aber pro Bild
     ein eigener Schwellenwert (gestaffelter Einflug).
     ========================================================== */
  (() => {
    const blocks = document.querySelectorAll(".project-spotlight");
    if (!blocks.length) return;
    blocks.forEach((block) => {
      const imgs = Array.from(block.querySelectorAll(".ps-img"));
      if (!imgs.length) return;
      if (prefersReducedMotion) {
        imgs.forEach((el) => el.classList.add("is-in"));
        return;
      }
      let ticking = false;
      const update = () => {
        ticking = false;
        const rect = block.getBoundingClientRect();
        const vh = window.innerHeight;
        const scrollable = rect.height - vh;
        let progress = scrollable > 0 ? -rect.top / scrollable : 1;
        progress = Math.max(0, Math.min(1, progress));
        imgs.forEach((el, i) => {
          const threshold =
            0.12 + (i * 0.55) / Math.max(1, imgs.length - 1); // 0.12 … 0.67
          el.classList.toggle("is-in", progress >= threshold);
        });
      };
      window.addEventListener(
        "scroll",
        () => {
          if (!ticking) {
            ticking = true;
            requestAnimationFrame(update);
          }
        },
        { passive: true }
      );
      window.addEventListener("resize", update, { passive: true });
      update();
    });
  })();

  /* ==========================================================
     12 — RECHTLICHES: IMPRESSUM-/DATENSCHUTZ-MODALS
     Zwei getrennte Dialoge, geöffnet über die Footer-Links.
     Barrierearm: aria-hidden-Umschaltung, Fokus-Falle im Dialog,
     Schliessen per ESC, Klick auf den Hintergrund oder ×; der
     Fokus kehrt danach zum auslösenden Button zurück.
     ========================================================== */
  (() => {
    const triggers = Array.from(document.querySelectorAll("[data-modal-open]"));
    if (!triggers.length) return;

    const FOCUSABLE =
      'a[href], button:not([disabled]), input:not([disabled]), ' +
      'select:not([disabled]), textarea:not([disabled]), ' +
      '[tabindex]:not([tabindex="-1"])';

    let activeModal = null; // aktuell offener Dialog
    let lastTrigger = null; // Button, der ihn geöffnet hat

    const open = (modal, trigger) => {
      activeModal = modal;
      lastTrigger = trigger || null;
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("modal-open"); // Seite dahinter einfrieren
      const card = modal.querySelector(".modal-card");
      if (card) card.focus(); // Screenreader liest den Titel (aria-labelledby)
    };

    const close = () => {
      if (!activeModal) return;
      const modal = activeModal;
      activeModal = null;
      // erst Fokus zurückgeben, DANN verstecken — sonst läge der Fokus
      // kurz in einem aria-hidden-Teilbaum
      if (lastTrigger) lastTrigger.focus();
      lastTrigger = null;
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("modal-open");
    };

    triggers.forEach((btn) => {
      const modal = document.getElementById(btn.dataset.modalOpen);
      if (!modal) return;
      btn.addEventListener("click", () => open(modal, btn));
    });

    // Schliessen: ×-Button und Klick auf den Hintergrund tragen beide
    // data-modal-close; Klicks in die Karte selbst bleiben wirkungslos.
    document.querySelectorAll(".modal").forEach((modal) => {
      modal.addEventListener("click", (e) => {
        if (e.target.closest("[data-modal-close]")) close();
      });
    });

    // Tastatur: ESC schliesst, Tab bleibt im Dialog (Fokus-Falle)
    document.addEventListener("keydown", (e) => {
      if (!activeModal) return;
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = Array.from(activeModal.querySelectorAll(FOCUSABLE));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const card = activeModal.querySelector(".modal-card");
      // Fokus ausserhalb (z. B. nach Klick in die Karte) → zurückholen
      if (!activeModal.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
        return;
      }
      if (e.shiftKey) {
        if (document.activeElement === first || document.activeElement === card) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  })();

  /* ==========================================================
     13 — GRADUAL BLUR (Viewport-Ränder, neu in 1.4)
     Vanilla-Port des React-"GradualBlur"-Effekts: N gestaffelte
     Ebenen mit backdrop-filter: blur(), jede über eine mask-
     image-Rampe auf ihr Band begrenzt → der Inhalt läuft zum
     Viewport-Rand hin progressiv in Unschärfe aus.
     ========================================================== */
  const GradualBlur = (() => {
    const CURVES = {
      linear: (p) => p,
      bezier: (p) => p * p * (3 - 2 * p),
      "ease-in": (p) => p * p,
      "ease-out": (p) => 1 - Math.pow(1 - p, 2),
      "ease-in-out": (p) =>
        p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2,
    };
    const DIRECTIONS = {
      top: "to top",
      bottom: "to bottom",
      left: "to left",
      right: "to right",
    };
    const DEFAULTS = {
      position: "bottom",
      strength: 2,
      height: "6rem",
      divCount: 5,
      exponential: false,
      zIndex: 90, // unter Kopfzeile (100), Skip-Link (200), Modals (300)
      opacity: 1,
      curve: "linear",
      target: "page",
    };

    function create(options) {
      const cfg = Object.assign({}, DEFAULTS, options);
      const wrap = document.createElement("div");
      wrap.className =
        "gradual-blur " +
        (cfg.target === "page" ? "gradual-blur-page" : "gradual-blur-parent");
      wrap.setAttribute("aria-hidden", "true");

      const isVertical = cfg.position === "top" || cfg.position === "bottom";
      const s = wrap.style;
      s.position = cfg.target === "page" ? "fixed" : "absolute";
      s.zIndex = String(cfg.zIndex);
      if (isVertical) {
        s.height = cfg.height;
        s.width = "100%";
        s.left = "0";
        s.right = "0";
        s[cfg.position] = "0";
      } else {
        s.width = cfg.width || cfg.height;
        s.height = "100%";
        s.top = "0";
        s.bottom = "0";
        s[cfg.position] = "0";
      }

      const inner = document.createElement("div");
      inner.className = "gradual-blur-inner";
      wrap.appendChild(inner);

      const curveFn = CURVES[cfg.curve] || CURVES.linear;
      const increment = 100 / cfg.divCount;
      const direction = DIRECTIONS[cfg.position] || "to bottom";

      for (let i = 1; i <= cfg.divCount; i++) {
        const progress = curveFn(i / cfg.divCount);
        const blurValue = cfg.exponential
          ? Math.pow(2, progress * 4) * 0.0625 * cfg.strength
          : 0.0625 * (progress * cfg.divCount + 1) * cfg.strength;

        // Maskenband der Ebene: transparent → schwarz → transparent,
        // um Position i herum (identische Stops wie im React-Original)
        const p1 = Math.round((increment * i - increment) * 10) / 10;
        const p2 = Math.round(increment * i * 10) / 10;
        const p3 = Math.round((increment * i + increment) * 10) / 10;
        const p4 = Math.round((increment * i + increment * 2) * 10) / 10;
        let gradient = "transparent " + p1 + "%, black " + p2 + "%";
        if (p3 <= 100) gradient += ", black " + p3 + "%";
        if (p4 <= 100) gradient += ", transparent " + p4 + "%";

        const layer = document.createElement("div");
        const ls = layer.style;
        ls.position = "absolute";
        ls.inset = "0";
        ls.maskImage = "linear-gradient(" + direction + ", " + gradient + ")";
        ls.webkitMaskImage = ls.maskImage;
        ls.backdropFilter = "blur(" + blurValue.toFixed(3) + "rem)";
        ls.webkitBackdropFilter = ls.backdropFilter;
        ls.opacity = String(cfg.opacity);
        inner.appendChild(layer);
      }
      return wrap;
    }

    let mounted = [];
    let bottomStrip = null;

    function mount(small) {
      // Unterer Seitenrand: Inhalt läuft weich aus (Haupteffekt).
      // Bewusst dezent: niedrige strength (sanfter Max-Blur) + viele
      // Ebenen über einen etwas längeren Auslauf → der Verlauf baut sich
      // fast unsichtbar auf, statt an einer harten Kante zu beginnen.
      bottomStrip = create({
        position: "bottom",
        target: "page",
        height: small ? "5rem" : "7rem",
        strength: small ? 0.9 : 1.1,
        divCount: small ? 6 : 9,
        exponential: true,
        curve: "bezier",
      });
      mounted.push(document.body.appendChild(bottomStrip));

      // Oberer Rand (nur Desktop, bewusst dezenter): der Inhalt löst
      // sich unter der Glass-Pille auf, statt hart abzureissen
      if (!small) {
        mounted.push(
          document.body.appendChild(
            create({
              position: "top",
              target: "page",
              height: "5rem",
              strength: 1.1,
              divCount: 4,
              exponential: true,
              curve: "bezier",
            })
          )
        );
      }
    }

    function start() {
      const supported =
        window.CSS &&
        (CSS.supports("backdrop-filter", "blur(1px)") ||
          CSS.supports("-webkit-backdrop-filter", "blur(1px)"));
      if (!supported) return;

      // Mobile: weniger Ebenen + flacher — gestapelte backdrop-filter
      // sind auf schwachen GPUs teuer. Bei Breakpoint-Wechsel (Rotation,
      // Fenstergrösse) werden die Ebenen passend neu aufgebaut.
      const mq = window.matchMedia("(max-width: 760px)");
      mount(mq.matches);

      // Am Seitenende blendet der untere Blur aus: sonst wäre der Footer
      // (Impressum / Datenschutz) am tiefsten Scrollpunkt dauerhaft
      // unlesbar verweichzeichnet. Proportional über die letzten px vor
      // dem Dokument-Ende. Bewusst OHNE rAF-Gate: nur Arithmetik + ein
      // Style-Write, dafür zustandslos und selbstheilend.
      const FADE_ZONE = 220;
      const updateEndFade = () => {
        if (!bottomStrip) return;
        const remaining =
          document.documentElement.scrollHeight -
          window.scrollY -
          window.innerHeight;
        const k = Math.max(0, Math.min(1, remaining / FADE_ZONE));
        // Bewusst KEINE Opacity: opacity < 1 auf dem Wrapper macht ihn
        // zum Backdrop-Root — die backdrop-filter-Ebenen darin verlieren
        // den Seitenhintergrund und bleiben in Chromium danach teils
        // dauerhaft leer ("Blur kommt nach unten/hoch nicht wieder").
        // Stattdessen schiebt sich die Zone aus dem Viewport: transform
        // ist compositor-only und hat keine Backdrop-Semantik.
        bottomStrip.style.transform =
          "translateY(" + ((1 - k) * 100).toFixed(1) + "%)";
      };
      window.addEventListener("scroll", updateEndFade, { passive: true });
      window.addEventListener("resize", updateEndFade, { passive: true });
      updateEndFade();

      const remount = (e) => {
        mounted.forEach((el) => el.remove());
        mounted = [];
        bottomStrip = null;
        mount(e.matches);
        updateEndFade();
      };
      if (typeof mq.addEventListener === "function") {
        mq.addEventListener("change", remount);
      }
    }

    return { start };
  })();

  /* ==========================================================
     14 — GLASS DOCK (Liquid-Glass-Kopfzeile, neu in 1.4)
     Vanilla-Port des React-"GlassSurface"-Effekts: ein SVG-
     Filter verschiebt den Hintergrund der Pille über eine
     generierte Displacement-Map — getrennt pro R/G/B-Kanal
     (chromatische Aberration an den Linsenkanten). Chromium
     rendert echte Refraktion via backdrop-filter: url(#…);
     WebKit/Firefox können das nicht → Frosted-Glass-Fallback
     (Klasse .glass-frost), Uralt-Browser → .glass-solid.
     ========================================================== */
  const GlassDock = (() => {
    const dock = document.getElementById("glassDock");
    if (!dock) return;

    const FILTER_ID = "glassDockFilter";
    const CFG = {
      /* --- Performance-Regler (gemessen, siehe Kommentar unten) ---
         refraction: false        → immer Frosted Glass (schnellste Stufe)
         chromaticAberration: true→ voller RGB-Split-Graph (teuerste Stufe,
                                    nur im Ruhezustand sichtbar — beim
                                    Scrollen greift ohnehin der Frost-Modus)
         Gemessen (Desktop): voller Graph beim Scrollen ~27fps, einfacher
         Graph ~54fps, Frost ~100fps. Deshalb: einfacher Graph im Stand,
         Frost während des Scrollens (.is-scrolling, s.u.). */
      refraction: false, // AUS: durchgehend klares 5px-Glas (kein Lag,
      // kein Glitch beim Anhalten). true = reactbits-Refraktion zurück
      // (chromatische Aberration, sieht im Stand edel aus, ruckelt/
      // glitcht aber beim Scrollen).
      chromaticAberration: true, // nur relevant wenn refraction: true
      borderWidth: 0.07, // relative Breite der Linsenkante
      brightness: 50, // Grundton der Map-Mitte (%)
      opacity: 0.93, // Deckkraft der "flachen" Mitte (kaum Verzerrung)
      blur: 11, // Weichheit der Linsenkante innerhalb der Map (px)
      displace: 0.5, // finale Glättung des Filter-Outputs (stdDeviation)
      distortionScale: -180, // Grundstärke der Verschiebung (reactbits-
      // Default). Falls die Linsenkante zu stark schmiert: Richtung
      // -110 reduzieren.
      redOffset: 0, // chromatische Aberration: Zusatz-Scale pro Kanal
      greenOffset: 10,
      blueOffset: 20,
      xChannel: "R",
      yChannel: "G",
      mixBlendMode: "difference",
    };

    const supportsBackdrop =
      window.CSS &&
      (CSS.supports("backdrop-filter", "blur(1px)") ||
        CSS.supports("-webkit-backdrop-filter", "blur(1px)"));

    // Nur Chromium wendet SVG-Filter (url(#…)) auf backdrop-filter an.
    // WebKit/Firefox parsen die Syntax teils, rendern aber nichts →
    // UA-Weiche wie im React-Original, danach Property-Probe.
    function svgFilterSupported() {
      const ua = navigator.userAgent;
      const isWebkit = /Safari/.test(ua) && !/Chrom/.test(ua);
      const isFirefox = /Firefox/.test(ua);
      if (isWebkit || isFirefox) return false;
      const probe = document.createElement("div");
      probe.style.backdropFilter = "url(#" + FILTER_ID + ")";
      return probe.style.backdropFilter !== "";
    }

    // Displacement-Map als Inline-SVG (data-URI): roter Verlauf = X-,
    // blauer Verlauf = Y-Verschiebung; der geblurte innere Rect hält
    // die Mitte der Pille optisch "flach" — verzerrt wird an der Kante.
    function buildDisplacementMap(w, h) {
      const radius = Math.round((h / 2) * 10) / 10; // Pillenform
      const edge =
        Math.round(Math.min(w, h) * (CFG.borderWidth * 0.5) * 10) / 10;
      const svg =
        '<svg viewBox="0 0 ' +
        w +
        " " +
        h +
        '" xmlns="http://www.w3.org/2000/svg">' +
        "<defs>" +
        '<linearGradient id="gdRed" x1="100%" y1="0%" x2="0%" y2="0%">' +
        '<stop offset="0%" stop-color="#0000"/>' +
        '<stop offset="100%" stop-color="red"/>' +
        "</linearGradient>" +
        '<linearGradient id="gdBlue" x1="0%" y1="0%" x2="0%" y2="100%">' +
        '<stop offset="0%" stop-color="#0000"/>' +
        '<stop offset="100%" stop-color="blue"/>' +
        "</linearGradient>" +
        "</defs>" +
        '<rect width="' + w + '" height="' + h + '" fill="black"/>' +
        '<rect width="' + w + '" height="' + h + '" rx="' + radius +
        '" fill="url(#gdRed)"/>' +
        '<rect width="' + w + '" height="' + h + '" rx="' + radius +
        '" fill="url(#gdBlue)" style="mix-blend-mode:' + CFG.mixBlendMode +
        '"/>' +
        '<rect x="' + edge + '" y="' + edge + '" width="' + (w - edge * 2) +
        '" height="' + (h - edge * 2) + '" rx="' + radius +
        '" fill="hsl(0 0% ' + CFG.brightness + "% / " + CFG.opacity +
        ')" style="filter:blur(' + CFG.blur + 'px)"/>' +
        "</svg>";
      return "data:image/svg+xml," + encodeURIComponent(svg);
    }

    let feImage = null;
    let mapTimer = null;

    function updateMap() {
      if (!feImage) return;
      const r = dock.getBoundingClientRect();
      const w = Math.max(2, Math.round(r.width));
      const h = Math.max(2, Math.round(r.height));
      feImage.setAttribute("href", buildDisplacementMap(w, h));
    }

    // Grössenänderungen entprellt: während des 0.65s-Pillen-Morphs feuert
    // der ResizeObserver pro Frame — die Map erst NACH dem Settle neu zu
    // bauen spart data-URI-Encode + Filter-Rebuild auf jedem Frame (die
    // kurz veraltete Map fällt in Bewegung nicht auf).
    function scheduleUpdate() {
      clearTimeout(mapTimer);
      mapTimer = setTimeout(updateMap, 120);
    }

    function injectFilter() {
      // Standard: EIN feDisplacementMap — sieht im Stand fast identisch
      // aus (nur ohne RGB-Farbsäume an der Kante) und kostet pro Frame
      // grob die Hälfte. Der volle Graph (3 Kanäle + Blends + Glättung)
      // nur bei CFG.chromaticAberration: true.
      const core = CFG.chromaticAberration
        ? '<feDisplacementMap id="glassDockDispR" in="SourceGraphic" ' +
          'in2="map" result="dispRed"/>' +
          '<feColorMatrix in="dispRed" type="matrix" values="1 0 0 0 0 ' +
          '0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="red"/>' +
          '<feDisplacementMap id="glassDockDispG" in="SourceGraphic" ' +
          'in2="map" result="dispGreen"/>' +
          '<feColorMatrix in="dispGreen" type="matrix" values="0 0 0 0 0 ' +
          '0 1 0 0 0 0 0 0 0 0 0 0 0 1 0" result="green"/>' +
          '<feDisplacementMap id="glassDockDispB" in="SourceGraphic" ' +
          'in2="map" result="dispBlue"/>' +
          '<feColorMatrix in="dispBlue" type="matrix" values="0 0 0 0 0 ' +
          '0 0 0 0 0 0 0 1 0 0 0 0 0 1 0" result="blue"/>' +
          '<feBlend in="red" in2="green" mode="screen" result="rg"/>' +
          '<feBlend in="rg" in2="blue" mode="screen" result="output"/>' +
          '<feGaussianBlur in="output" stdDeviation="' + CFG.displace + '"/>'
        : '<feDisplacementMap id="glassDockDisp" in="SourceGraphic" ' +
          'in2="map" result="disp"/>' +
          '<feGaussianBlur in="disp" stdDeviation="' + CFG.displace + '"/>';

      const markup =
        '<svg class="glass-defs" aria-hidden="true" ' +
        'xmlns="http://www.w3.org/2000/svg">' +
        "<defs>" +
        '<filter id="' + FILTER_ID +
        '" color-interpolation-filters="sRGB" x="0%" y="0%" ' +
        'width="100%" height="100%">' +
        '<feImage id="glassDockFeImage" x="0" y="0" width="100%" ' +
        'height="100%" preserveAspectRatio="none" result="map"/>' +
        core +
        "</filter>" +
        "</defs>" +
        "</svg>";
      document.body.insertAdjacentHTML("beforeend", markup);
      feImage = document.getElementById("glassDockFeImage");

      const channels = CFG.chromaticAberration
        ? [
            ["glassDockDispR", CFG.redOffset],
            ["glassDockDispG", CFG.greenOffset],
            ["glassDockDispB", CFG.blueOffset],
          ]
        : [["glassDockDisp", CFG.greenOffset]];
      channels.forEach(([id, offset]) => {
        const node = document.getElementById(id);
        if (!node) return;
        node.setAttribute("scale", String(CFG.distortionScale + offset));
        node.setAttribute("xChannelSelector", CFG.xChannel);
        node.setAttribute("yChannelSelector", CFG.yChannel);
      });
    }

    function start() {
      // Nutzerwunsch "weniger Transparenz" → direkt die solide Stufe
      const reducedTransparency = window.matchMedia(
        "(prefers-reduced-transparency: reduce)"
      ).matches;

      if (!supportsBackdrop || reducedTransparency) {
        dock.classList.add("glass-solid");
        return;
      }
      if (!CFG.refraction || !svgFilterSupported()) {
        dock.classList.add("glass-frost");
        return;
      }

      injectFilter();
      dock.classList.add("glass-svg");
      updateMap();
      if ("ResizeObserver" in window) {
        new ResizeObserver(scheduleUpdate).observe(dock);
      } else {
        window.addEventListener("resize", scheduleUpdate, { passive: true });
      }

      // Scroll-Degrade: WÄHREND des Scrollens rendert die Pille als
      // günstiges Frosted Glass (.is-scrolling, GPU-Pfad), ~150ms nach
      // dem letzten Scroll-Event kehrt die Refraktion zurück. Der
      // SVG-Filter müsste sonst auf jedem Scroll-Frame den kompletten
      // Backdrop neu rastern (Software-Pfad — gemessen ~27fps).
      let settleTimer = null;
      let degraded = false;
      window.addEventListener(
        "scroll",
        () => {
          if (!degraded) {
            degraded = true;
            dock.classList.add("is-scrolling");
          }
          clearTimeout(settleTimer);
          settleTimer = setTimeout(() => {
            degraded = false;
            dock.classList.remove("is-scrolling");
          }, 150);
        },
        { passive: true }
      );
    }

    return { start };
  })();

  /* ==========================================================
     NAV-MENÜ (Vollflächen-Liste, 1.4 — vereinfacht)
     Der Drei-Strich-Button öffnet ein dunkles Overlay mit den vier
     Zielen als klare, grosse Liste (jedes ist eine eigene Seite).
     Kein 3D/Rad, keine Scroll-Physik: schnell, erwartungskonform,
     barrierefrei. Esc / Klick daneben / × schliessen, der Fokus
     bleibt im Overlay, die aktuelle Seite ist markiert.
     ========================================================== */
  const NavMenu = (() => {
    const header = document.getElementById("siteHeader");
    const toggle = document.getElementById("navToggle");
    const overlay = document.getElementById("menuOverlay");
    const menu = document.getElementById("navWheel");
    const wordmark = document.querySelector(".wordmark");
    if (!header || !toggle || !overlay || !menu) return { start() {} };

    const items = Array.from(menu.querySelectorAll(".option-wheel__item"));
    const normPath = (s) => s.replace(/\/+$/, "") || "/";
    let isOpen = false;

    // aktuelle Seite markieren (aria-current + optische Hervorhebung via CSS)
    const here = normPath(location.pathname);
    items.forEach((el) => {
      const p = normPath(new URL(el.getAttribute("href"), location.origin).pathname);
      if (p === here) el.setAttribute("aria-current", "page");
    });

    function open() {
      if (isOpen) return;
      isOpen = true;
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
      header.classList.add("nav-open");
      document.body.classList.add("menu-open");
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Menü schliessen");
      const cur = items.find((el) => el.getAttribute("aria-current") === "page");
      (cur || items[0]).focus({ preventScroll: true });
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
      header.classList.remove("nav-open");
      document.body.classList.remove("menu-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Menü öffnen");
      toggle.focus({ preventScroll: true });
    }

    function bind() {
      toggle.addEventListener("click", () => (isOpen ? close() : open()));

      // Wortmarke im offenen Menü -> schliessen (führt danach zu /)
      if (wordmark) wordmark.addEventListener("click", () => { if (isOpen) close(); });

      // Klick auf den dunklen Hintergrund (kein Ziel) schliesst
      overlay.addEventListener("click", (e) => {
        if (isOpen && !e.target.closest(".option-wheel__item")) close();
      });

      // Klick auf die aktuelle Seite -> nur schliessen statt neu laden
      items.forEach((el) => {
        el.addEventListener("click", (e) => {
          if (normPath(new URL(el.href).pathname) === normPath(location.pathname)) {
            e.preventDefault();
            close();
          }
        });
      });

      // Tastatur: Esc schliesst, Tab bleibt im Overlay (Fokus-Falle über die
      // vier Ziele + den × -Button)
      document.addEventListener("keydown", (e) => {
        if (!isOpen) return;
        if (e.key === "Escape") { close(); return; }
        if (e.key === "Tab") {
          const ring = items.concat(toggle);
          const idx = ring.indexOf(document.activeElement);
          const dir = e.shiftKey ? -1 : 1;
          const ni = (idx + dir + ring.length) % ring.length;
          e.preventDefault();
          ring[ni].focus({ preventScroll: true });
        }
      });
    }

    return { start: bind };
  })();

  /* ==========================================================
     KONTAKT-FORMULAR (1.4)
     Progressive Enhancement: mit fetch() wird ohne Redirect gesendet und ein
     Inline-Status gezeigt; ohne JS greift der native POST (action). Solange
     der Platzhalter-Endpunkt gesetzt ist, wird nicht gesendet, sondern auf
     die direkten Kanäle (E-Mail/WhatsApp) verwiesen.
     ========================================================== */
  (() => {
    const form = document.getElementById("contactForm");
    if (!form) return;
    const status = document.getElementById("cf-status");
    const btn = form.querySelector('button[type="submit"]');
    const endpoint = form.getAttribute("action") || "";
    const placeholder = endpoint.includes("YOUR_FORM_ENDPOINT");

    const setStatus = (msg, kind) => {
      if (!status) return;
      status.textContent = msg;
      status.className = "form-status" + (kind ? " form-status--" + kind : "");
    };

    form.addEventListener("submit", (e) => {
      if (typeof fetch !== "function") return; // sehr alte Browser: nativer POST
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      if (placeholder) {
        setStatus(
          "Das Formular wird gerade aufgeschaltet — am schnellsten erreichst du uns per E-Mail oder WhatsApp.",
          "err"
        );
        return;
      }
      const orig = btn ? btn.textContent : "";
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Wird gesendet …";
      }
      setStatus("", "");
      fetch(endpoint, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      })
        .then((res) => {
          if (res.ok) {
            form.reset();
            setStatus("Danke! Deine Anfrage ist angekommen — wir melden uns bald.", "ok");
          } else {
            setStatus(
              "Das hat nicht geklappt. Bitte versuch es erneut oder schreib uns direkt eine E-Mail.",
              "err"
            );
          }
        })
        .catch(() => {
          setStatus(
            "Netzwerkfehler. Bitte versuch es erneut oder schreib uns direkt eine E-Mail.",
            "err"
          );
        })
        .finally(() => {
          if (btn) {
            btn.disabled = false;
            btn.textContent = orig;
          }
        });
    });
  })();

  /* ==========================================================
     INIT
     ========================================================== */
  function init() {
    if (GradualBlur) GradualBlur.start();
    if (GlassDock) GlassDock.start();
    if (NavMenu) NavMenu.start();
    // Footer-Jahr (statisch belassen, da Datei ohne Server laufen soll;
    // dennoch dynamisch korrekt halten)
    const yearEl = document.getElementById("footerYear");
    if (yearEl) {
      const y = new Date().getFullYear();
      yearEl.textContent = `© ${y} agsork studio`;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
