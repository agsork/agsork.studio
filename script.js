/* ============================================================
   agsork studio — script.js
   Reines JavaScript, keine Libraries. Enthält:
   1. Perlin-Noise (selbst implementiert)
   2. Hero: Flow-Field-Partikelanimation (Canvas 2D)
   3. Sticky Scroll-Story (Angebot A)
   4. Playgrounds (Stil-Umschalter, Hover-Reveal)
   5. Milkshake-Reveals (IntersectionObserver)
   6. Navigation (Scroll-Zustand, Mobile-Menü)
   7. Magnetische Buttons
   8. Cursor-Spotlight-Textmaske (Aufgabe 5)
   9. 3D-Tilt auf dem Hero-Mockup (Aufgabe 7)
   10. Sanftes Scroll-Snap in Angebot A (Aufgabe 9)
   11. Projekt-Spotlight-Bildreveal (Aufgabe 11)
   12. Rechtliches: Impressum-/Datenschutz-Modals (Footer)
   ============================================================ */
(() => {
  "use strict";

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ==========================================================
     1 — PERLIN-NOISE (Ken Perlins improved noise, 3D)
     ========================================================== */
  const Noise = (() => {
    const permutation = [
      151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
      140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247,
      120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177,
      33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165,
      71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211,
      133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25,
      63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196,
      135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217,
      226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206,
      59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213, 119, 248,
      152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22,
      39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218,
      246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241,
      81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157,
      184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93,
      222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180,
    ];
    const p = new Uint8Array(512);
    for (let i = 0; i < 512; i++) p[i] = permutation[i & 255];

    const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    const lerp = (a, b, t) => a + t * (b - a);
    const grad = (hash, x, y, z) => {
      const h = hash & 15;
      const u = h < 8 ? x : y;
      const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
      return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    };

    function noise(x, y, z) {
      const X = Math.floor(x) & 255;
      const Y = Math.floor(y) & 255;
      const Z = Math.floor(z) & 255;
      x -= Math.floor(x);
      y -= Math.floor(y);
      z -= Math.floor(z);
      const u = fade(x);
      const v = fade(y);
      const w = fade(z);
      const A = p[X] + Y;
      const AA = p[A] + Z;
      const AB = p[A + 1] + Z;
      const B = p[X + 1] + Y;
      const BA = p[B] + Z;
      const BB = p[B + 1] + Z;

      return lerp(
        lerp(
          lerp(grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z), u),
          lerp(grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z), u),
          v
        ),
        lerp(
          lerp(grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1), u),
          lerp(
            grad(p[AB + 1], x, y - 1, z - 1),
            grad(p[BB + 1], x - 1, y - 1, z - 1),
            u
          ),
          v
        ),
        w
      );
    }
    return { noise };
  })();

  /* ==========================================================
     2 — HERO: FLOW-FIELD-PARTIKELANIMATION
     ========================================================== */
  const HeroFlow = (() => {
    const canvas = document.getElementById("heroCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });

    // Gerätekontext einmal erkennen
    const coarse =
      !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
    const hasFilter =
      typeof CanvasRenderingContext2D !== "undefined" &&
      "filter" in CanvasRenderingContext2D.prototype;

    // ---- Alle abstimmbaren Werte an EINER Stelle (Feinjustierung) ----
    const CFG = {
      bg: "#05060A",
      // Brennpunkt IM BILD (unteres Drittel, rechts der Textspalte) — hier
      // „landet" der Strahl und bildet den hellen horizontalen Splash.
      focal: { x: 0.6, y: 0.72 },
      // Mobil: tiefer & zentriert — der Text ist dort höher und füllt mehr.
      focalMobile: { x: 0.5, y: 0.86 },
      colorCore: [255, 255, 255], // weiss-heisser Kern
      colorMid: [122, 150, 255],  // kühlblau (etwas kräftiger)
      colorEdge: [150, 102, 255], // violett am Rand
      fieldScale: 0.0016,
      fieldScale2: 0.00368,
      timeScale: 0.0002,
      timeStepMul: 16.7,
      dtCapMs: 33.4,
      noiseStrength: 0.55,  // gebunden – grösser zerstört die Konvergenz
      noiseStrength2: 0.22, // zweite Oktave nur Desktop
      speed: 1.1,
      speedBase: 0.78,
      speedJitter: 0.55,
      downwardDamp: 1, // neutral: Splash darf nach unten/aussen fliessen
      particleDivisor: 6200,
      particleDivisorMobile: 15000,
      densitySmallMul: 0.55,
      countMin: 70,
      countMax: 820,
      countMaxMobile: 150,
      pixelBudget: 3.2e6,
      lifeMin: 60,
      lifeRand: 190,
      lifeFadeFrames: 45,
      lineWidthBase: 0.8,
      lineWidthCore: 0.95,
      lineAlphaBase: 0.045, // bewusst niedrig – additive Überlagerung macht hell
      lineAlphaCore: 0.12,
      colorKHi: 0.8,  // kleinerer Weiss-Kern ⇒ mehr Blau/Violett sichtbar
      colorKLo: 0.32,
      // Pro Frame abdunkelnder Schleier (NIE weiss!): unten kräftiger, damit die
      // nach unten fliessenden Funken NICHT akkumulieren (Brennpunkt bleibt hellste Stelle).
      fade: { top: 0.06, mid: 0.1, bottom: 0.16 },
      beam: {
        // dünne, scharfe Lichtnaht (Huly): heisser Kern + enges Glühen + Halo.
        coreW: 2.8, glowW: 11, haloW: 62, washW: 190, washCap: 240,
        softBlur: 8, glowBlur: 2.2, tailFrac: 0.07,
        alpha: 1, pulseAmp: 0.05, pulseSpeed: 6,
      },
      flare: {
        // horizontaler Splash, wo der Strahl landet (anamorpher Lens-Flare).
        diamFrac: 0.8, diamCap: 520, coreCap: 170, alpha: 1,
        glowWFrac: 0.52, glowHFrac: 0.28, glowAlpha: 0.6, glowAlphaMobile: 0.5,
        streakWFrac: 0.44, streakThick: 3, streakAlpha: 1.2,
        pulseAmp: 0.05, pulseSpeed: 5,
      },
      bloom: {
        downscale: 4, blurPx: 3, kneeAlpha: 0.45, strength: 0.7,
        minWidth: 1000, disabledComp: 1.15,
      },
      mobileBreakpointPx: 760,
      stillBurnSteps: 240,
    };

    // ---- Laufzeit-Zustand ----
    let W = 0, H = 0, dpr = 1, diag = 1;
    let fx = 0, fy = 0, beamW = 0, beamSpriteW = 0, flareD = 0;
    let beamAlpha = CFG.beam.alpha;
    let isMobile = false, bloomOn = false;
    let particles = [];
    let rafId = null, t = 0, lastTs = 0;
    let ready = false, inView = true;
    let fadeGrad = null;

    // Offscreen-Sprites (einmal pro Resize gebacken, danach nur geblittet)
    let beamSprite = null, beamCtx = null;
    let flareSprite = null, flareCtx = null;
    let bloomCanvas = null, bloomCtx = null, bw = 0, bh = 0;
    // Eigener Puffer NUR für die akkumulierenden Strömungslinien (mit Fade).
    // Strahl/Flare/Bloom werden pro Frame frisch komponiert → kein Ausbrennen.
    let trailCanvas = null, trailCtx = null;

    const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
    const lerp = (a, b, k) => a + (b - a) * k;

    /* ---------- Partikel ---------- */
    function particleCount() {
      const div = isMobile ? CFG.particleDivisorMobile : CFG.particleDivisor;
      let count = Math.round((W * H) / div);
      if (W < 700) count = Math.round(count * CFG.densitySmallMul);
      const max = isMobile ? CFG.countMaxMobile : CFG.countMax;
      return Math.max(CFG.countMin, Math.min(max, count));
    }

    // Farbe/Linienstärke/Deckkraft EINMAL bei Geburt festlegen (Position rel. F):
    // nah an F & nah an der Mittelachse → weiss & kräftig; aussen → blau/violett.
    function assignLook(p, x, y) {
      const dx = x - fx, dy = y - fy;
      const rr = clamp01(Math.hypot(dx, dy) / (0.75 * diag));
      const ax = clamp01(1 - Math.abs(x - fx) / (0.42 * W));
      const k = clamp01((1 - rr) * 0.6 + ax * 0.7);
      let r, g, b;
      if (k >= CFG.colorKHi) {
        r = 255; g = 255; b = 255;
      } else if (k >= CFG.colorKLo) {
        const tt = (CFG.colorKHi - k) / (CFG.colorKHi - CFG.colorKLo);
        r = lerp(CFG.colorCore[0], CFG.colorMid[0], tt);
        g = lerp(CFG.colorCore[1], CFG.colorMid[1], tt);
        b = lerp(CFG.colorCore[2], CFG.colorMid[2], tt);
      } else {
        const tt = (CFG.colorKLo - k) / CFG.colorKLo;
        r = lerp(CFG.colorMid[0], CFG.colorEdge[0], tt);
        g = lerp(CFG.colorMid[1], CFG.colorEdge[1], tt);
        b = lerp(CFG.colorMid[2], CFG.colorEdge[2], tt);
      }
      // EINMAL pro Geburt allokiert – pro Frame variiert nur globalAlpha.
      p.stroke = "rgb(" + (r | 0) + "," + (g | 0) + "," + (b | 0) + ")";
      p.lw = CFG.lineWidthBase + k * CFG.lineWidthCore;
      p.baseA = CFG.lineAlphaBase + k * CFG.lineAlphaCore;
    }

    function spawn(p) {
      // Polare Emission UM den Brennpunkt: Funken fächern radial nach aussen,
      // konzentriert nahe F (sonst Akkumulation am Bildrand). 0=rechts, π/2=unten.
      let x, y;
      const u = Math.random();
      let ang, rad;
      if (u < 0.5) {
        // untere Hemisphäre (Splash): ~10°..170°, nach unten/aussen
        ang = (0.06 + Math.random() * 0.88) * Math.PI;
        rad = Math.pow(Math.random(), 0.7) * H * 0.32;
      } else if (u < 0.82) {
        // flache seitliche „Flügel": nahe horizontal, beide Seiten
        ang = (Math.random() < 0.5 ? 0 : Math.PI) + (Math.random() * 2 - 1) * 0.18 * Math.PI;
        rad = Math.pow(Math.random(), 0.6) * W * 0.34;
      } else {
        // feine Funken nach oben, eng am Strahl (schont den Text)
        ang = -Math.PI / 2 + (Math.random() * 2 - 1) * 0.13 * Math.PI;
        rad = Math.pow(Math.random(), 1.3) * H * 0.5;
      }
      x = fx + Math.cos(ang) * rad;
      y = fy + Math.sin(ang) * rad;
      x = Math.max(-20, Math.min(W + 20, x));
      y = Math.max(-20, Math.min(H + 20, y));
      p.x = x; p.y = y; p.px = x; p.py = y;
      p.life = CFG.lifeMin + Math.random() * CFG.lifeRand;
      p.fresh = true; // erster Frame ohne Verbindungslinie
      p.spd = CFG.speed * (CFG.speedBase + Math.random() * CFG.speedJitter);
      assignLook(p, x, y);
    }

    function initParticles() {
      const n = particleCount();
      particles = new Array(n);
      for (let i = 0; i < n; i++) { const p = {}; spawn(p); particles[i] = p; }
    }

    /* ---------- Offscreen-Sprites ---------- */
    // Vertikales Profil einer Strahl-Schicht: hell von oben bis zum Brennpunkt,
    // danach rasch ausklingend (der Strahl „landet" im Splash).
    function drawSeam(c, cx, w, sh, focFrac, tail, col, aTop, aMid, aPeak) {
      const g = c.createLinearGradient(0, 0, 0, sh);
      g.addColorStop(0, "rgba(" + col + "," + aTop + ")");
      g.addColorStop(clamp01(focFrac * 0.5), "rgba(" + col + "," + aMid + ")");
      g.addColorStop(clamp01(focFrac * 0.96), "rgba(" + col + "," + aPeak + ")");
      g.addColorStop(clamp01(focFrac), "rgba(" + col + "," + aPeak + ")");
      g.addColorStop(clamp01(focFrac + tail), "rgba(" + col + ",0)");
      g.addColorStop(1, "rgba(" + col + ",0)");
      c.fillStyle = g;
      c.fillRect(cx - w / 2, 0, w, sh);
    }

    function buildBeam() {
      beamW = Math.min(CFG.beam.washW, CFG.beam.washCap); // breiteste Schicht (Wash)
      beamSpriteW = Math.ceil(beamW * 1.3) + 24;          // Rand für den Blur
      const sh = Math.max(4, Math.ceil(H));
      if (!beamSprite) { beamSprite = document.createElement("canvas"); beamCtx = beamSprite.getContext("2d"); }
      beamSprite.width = beamSpriteW;
      beamSprite.height = sh;
      const c = beamCtx;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, beamSpriteW, sh);
      c.globalCompositeOperation = "lighter"; // Schichten addieren sich
      const cx = beamSpriteW / 2;
      const focFrac = clamp01((isMobile ? CFG.focalMobile : CFG.focal).y);
      const tail = CFG.beam.tailFrac;
      // Weiche, breite Schichten (geblurrt): violetter Wash + blaues Halo
      if (hasFilter) c.filter = "blur(" + CFG.beam.softBlur + "px)";
      drawSeam(c, cx, CFG.beam.washW, sh, focFrac, tail, "150,120,255", 0.06, 0.07, 0.09);
      drawSeam(c, cx, CFG.beam.haloW, sh, focFrac, tail, "120,150,255", 0.18, 0.22, 0.26);
      // Enges Glühen (leicht geblurrt)
      if (hasFilter) c.filter = "blur(" + CFG.beam.glowBlur + "px)";
      drawSeam(c, cx, CFG.beam.glowW, sh, focFrac, tail, "192,208,255", 0.5, 0.6, 0.66);
      // Heisser, scharfer Kern (kein Blur). Desktop fast weiss, Mobil etwas weicher.
      c.filter = "none";
      if (!isMobile) {
        drawSeam(c, cx, CFG.beam.coreW, sh, focFrac, tail, "255,255,255", 0.92, 1, 1);
      } else {
        drawSeam(c, cx, Math.max(1.4, CFG.beam.coreW * 0.7), sh, focFrac, tail, "235,242,255", 0.6, 0.72, 0.8);
      }
      c.globalCompositeOperation = "source-over";
    }

    function addRadial(c, D, rFrac, stops) {
      const R = (D / 2) * rFrac;
      const g = c.createRadialGradient(D / 2, D / 2, 0, D / 2, D / 2, R);
      for (let i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
      c.fillStyle = g;
      c.fillRect(0, 0, D, D);
    }

    function buildFlare() {
      flareD = Math.min(Math.ceil(Math.min(W, H) * CFG.flare.diamFrac), CFG.flare.diamCap);
      const D = Math.max(8, flareD);
      if (!flareSprite) { flareSprite = document.createElement("canvas"); flareCtx = flareSprite.getContext("2d"); }
      flareSprite.width = D; flareSprite.height = D;
      const c = flareCtx;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, D, D);
      c.globalCompositeOperation = "lighter";
      addRadial(c, D, 0.07, [[0, "rgba(255,255,255,1)"], [0.35, "rgba(228,237,255,0.74)"], [1, "rgba(228,237,255,0)"]]);
      addRadial(c, D, 0.2, [[0, "rgba(222,233,255,0.46)"], [0.45, "rgba(150,178,255,0.21)"], [1, "rgba(110,139,255,0)"]]);
      addRadial(c, D, 0.48, [[0, "rgba(122,152,255,0.22)"], [0.5, "rgba(120,132,255,0.08)"], [1, "rgba(120,132,255,0)"]]);
      addRadial(c, D, 1.0, [[0, "rgba(150,120,255,0.12)"], [0.55, "rgba(150,104,255,0.04)"], [1, "rgba(150,104,255,0)"]]);
      c.globalCompositeOperation = "source-over";
    }

    // Horizontale anamorphe Lichtspur (Signatur des Splash): scharfe helle
    // Mittellinie mit weichem vertikalem Abfall, additiv auf Main komponiert.
    function drawHStreak(cxp, cyp, halfW, thick, alpha) {
      const layers = [
        [thick, 1, "255,255,255"],
        [thick * 3, 0.6, "224,234,255"],
        [thick * 8, 0.28, "150,180,255"],
        [thick * 18, 0.12, "150,120,255"], // violette Flügel
      ];
      for (let i = 0; i < layers.length; i++) {
        const h = layers[i][0], am = layers[i][1], col = layers[i][2];
        const g = ctx.createLinearGradient(cxp - halfW, 0, cxp + halfW, 0);
        g.addColorStop(0, "rgba(" + col + ",0)");
        g.addColorStop(0.5, "rgba(" + col + "," + alpha * am + ")");
        g.addColorStop(1, "rgba(" + col + ",0)");
        ctx.fillStyle = g;
        ctx.fillRect(cxp - halfW, cyp - h / 2, halfW * 2, h);
      }
    }

    function buildBloom() {
      bloomOn =
        hasFilter && !isMobile && W >= CFG.bloom.minWidth &&
        dpr * W * H <= CFG.pixelBudget && !coarse;
      if (!bloomOn) return;
      bw = Math.max(1, Math.round(canvas.width / CFG.bloom.downscale));
      bh = Math.max(1, Math.round(canvas.height / CFG.bloom.downscale));
      if (!bloomCanvas) { bloomCanvas = document.createElement("canvas"); bloomCtx = bloomCanvas.getContext("2d"); }
      bloomCanvas.width = bw; bloomCanvas.height = bh;
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      // Layout evtl. noch nicht bereit (0-Grösse) → ResizeObserver versucht erneut.
      if (W < 2 || H < 2) {
        ready = false;
        return false;
      }
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // in CSS-Pixeln zeichnen, scharf auf Retina

      isMobile =
        W < CFG.mobileBreakpointPx || coarse || dpr * W * H > CFG.pixelBudget;
      diag = Math.hypot(W, H);
      const fc = isMobile ? CFG.focalMobile : CFG.focal;
      fx = fc.x * W;
      fy = fc.y * H;

      // Trail-Puffer (Geräteauflösung). Linien zeichnen wir in CSS-Pixeln.
      if (!trailCanvas) {
        trailCanvas = document.createElement("canvas");
        trailCtx = trailCanvas.getContext("2d");
      }
      trailCanvas.width = canvas.width;
      trailCanvas.height = canvas.height;
      trailCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      trailCtx.clearRect(0, 0, W, H);

      // Fade per destination-out: nur das Alpha zählt. Oben langsam (lange
      // Spuren), unten schnell (knackige Konvergenz nahe F).
      fadeGrad = trailCtx.createLinearGradient(0, 0, 0, H);
      fadeGrad.addColorStop(0, "rgba(0,0,0," + CFG.fade.top + ")");
      fadeGrad.addColorStop(0.6, "rgba(0,0,0," + CFG.fade.mid + ")");
      fadeGrad.addColorStop(1, "rgba(0,0,0," + CFG.fade.bottom + ")");

      // Deckende Basis (Main wird ohnehin jeden Frame neu gefüllt).
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.fillStyle = CFG.bg;
      ctx.fillRect(0, 0, W, H);

      buildBeam();
      buildFlare();
      buildBloom();
      beamAlpha = CFG.beam.alpha * (bloomOn ? 1 : CFG.bloom.disabledComp);
      initParticles();
      ready = true;
      return true;
    }

    // Ein Frame:
    // 1) Main deckend leeren (keine Persistenz auf Main → kein Feedback).
    // 2) Trail-Puffer faden (destination-out) + Linien additiv akkumulieren.
    // 3) Strahl, Trail-Puffer, Flare additiv frisch auf Main komponieren.
    // 4) optionaler Bloom. 5) Reset.
    function step(withBloom) {
      // 1) Main deckend leeren
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.fillStyle = CFG.bg;
      ctx.fillRect(0, 0, W, H);

      // 2) Trail-Puffer: erst faden, dann Linien additiv
      trailCtx.globalCompositeOperation = "destination-out";
      trailCtx.globalAlpha = 1;
      trailCtx.fillStyle = fadeGrad;
      trailCtx.fillRect(0, 0, W, H);

      trailCtx.globalCompositeOperation = "lighter";
      trailCtx.lineCap = isMobile ? "butt" : "round";
      const fs = CFG.fieldScale, fs2 = CFG.fieldScale2;
      const ns = CFG.noiseStrength, ns2 = CFG.noiseStrength2;
      const lff = CFG.lifeFadeFrames, damp = CFG.downwardDamp;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        // Grundrichtung radial WEG von F, nur leicht verrauscht (Konvergenz!)
        const dx = p.x - fx, dy = p.y - fy;
        let angle = Math.atan2(dy, dx) + Noise.noise(p.x * fs, p.y * fs, t) * ns;
        if (!isMobile) angle += Noise.noise(p.x * fs2, p.y * fs2, t * 0.6) * ns2;
        let vx = Math.cos(angle) * p.spd;
        let vy = Math.sin(angle) * p.spd;
        if (vy > 0) vy *= damp; // Aufwärtsdrift betonen
        p.px = p.x; p.py = p.y;
        p.x += vx; p.y += vy;
        p.life--;
        if (
          p.life <= 0 ||
          p.x < -40 || p.x > W + 40 ||
          p.y < -40 || p.y > H + 40
        ) { spawn(p); continue; }
        if (p.fresh) { p.fresh = false; continue; }
        const lifeFade = p.life < lff ? p.life / lff : 1;
        trailCtx.globalAlpha = p.baseA * lifeFade;
        trailCtx.strokeStyle = p.stroke;
        trailCtx.lineWidth = p.lw;
        trailCtx.beginPath();
        trailCtx.moveTo(p.px, p.py);
        trailCtx.lineTo(p.x, p.y);
        trailCtx.stroke();
      }
      trailCtx.globalAlpha = 1;
      trailCtx.globalCompositeOperation = "source-over";

      // 3) Lichtebenen additiv auf Main
      ctx.globalCompositeOperation = "lighter";

      // 3a) Kern-Strahl (vorgebacken, nur Alpha pulsiert) — frisch, kumuliert nicht
      const beamPulse = isMobile
        ? 1
        : 1 + CFG.beam.pulseAmp * Math.sin(t * CFG.beam.pulseSpeed);
      ctx.globalAlpha = beamAlpha * beamPulse;
      ctx.drawImage(beamSprite, fx - beamSpriteW / 2, 0, beamSpriteW, H);

      // 3b) Akkumulierte Strömungslinien aus dem Trail-Puffer
      ctx.globalAlpha = 1;
      ctx.drawImage(
        trailCanvas, 0, 0, trailCanvas.width, trailCanvas.height, 0, 0, W, H
      );

      // 3c) Brennpunkt-Splash: breiter Schein (horizontale Ellipse) + heisser
      //     Kern + horizontale anamorphe Streak — die Huly-Signatur, wo der
      //     Strahl „landet".
      const fPulse = 1 + CFG.flare.pulseAmp * Math.sin(t * CFG.flare.pulseSpeed);
      // breiter, kühl-blauer Schein (horizontale Ellipse) — der „Pool"
      const gw = W * CFG.flare.glowWFrac;
      const gh = flareD * CFG.flare.glowHFrac;
      ctx.globalAlpha = (isMobile ? CFG.flare.glowAlphaMobile : CFG.flare.glowAlpha) * fPulse;
      ctx.drawImage(flareSprite, fx - gw, fy - gh / 2, gw * 2, gh);
      // heisser, runder Kern am Kreuzungspunkt
      const cd = Math.min(flareD, CFG.flare.coreCap);
      ctx.globalAlpha = CFG.flare.alpha * fPulse;
      ctx.drawImage(flareSprite, fx - cd / 2, fy - cd / 2, cd, cd);
      // horizontale anamorphe Streak (scharfe helle Linie)
      ctx.globalAlpha = 1;
      drawHStreak(fx, fy, W * CFG.flare.streakWFrac, CFG.flare.streakThick, CFG.flare.streakAlpha * fPulse);
      ctx.globalAlpha = 1;

      // 4) Bloom: Main herunterskalieren, Tiefen wegdrücken, geblurrt additiv
      //    zurück. Kein Frame-Feedback (Main wird nächsten Frame neu aufgebaut).
      if (withBloom && bloomOn) {
        bloomCtx.globalCompositeOperation = "source-over";
        bloomCtx.filter = "none";
        bloomCtx.clearRect(0, 0, bw, bh);
        bloomCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, bw, bh);
        bloomCtx.fillStyle = "rgba(0,0,0," + CFG.bloom.kneeAlpha + ")"; // Knee
        bloomCtx.fillRect(0, 0, bw, bh);
        ctx.globalCompositeOperation = "lighter";
        ctx.filter = hasFilter
          ? "blur(" + CFG.bloom.blurPx * CFG.bloom.downscale + "px)"
          : "none";
        ctx.globalAlpha = CFG.bloom.strength;
        ctx.drawImage(bloomCanvas, 0, 0, bw, bh, 0, 0, W, H);
        ctx.filter = "none";
        ctx.globalAlpha = 1;
      }

      // 5) Reset für nächsten Frame
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.filter = "none";
    }

    function loop(ts) {
      if (!lastTs) lastTs = ts;
      let dt = ts - lastTs;
      lastTs = ts;
      if (!(dt > 0)) dt = 16.7;
      if (dt > CFG.dtCapMs) dt = CFG.dtCapMs; // nach Pause kein Zeitsprung
      t += CFG.timeScale * dt;
      step(true);
      rafId = requestAnimationFrame(loop);
    }

    function renderStill() {
      // Statisches Leucht-Standbild: Feld „einbrennen", letzter Schritt mit Bloom.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.fillStyle = CFG.bg;
      ctx.fillRect(0, 0, W, H);
      const n = CFG.stillBurnSteps;
      for (let s = 0; s < n; s++) {
        t += CFG.timeScale * CFG.timeStepMul;
        step(s === n - 1 && bloomOn);
      }
    }

    function startLoop() {
      if (rafId == null) {
        lastTs = 0; // dt-Reset, damit der erste Frame nach Pause nicht springt
        rafId = requestAnimationFrame(loop);
      }
    }
    function stopLoop() {
      if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    function ensureMotion() {
      if (prefersReducedMotion) {
        renderStill();
        return;
      }
      if (inView) startLoop();
    }

    function handleResize() {
      if (resize()) ensureMotion();
    }

    function start() {
      handleResize();

      // ResizeObserver korrigiert auch eine zu frühe (0-grosse) Erstmessung,
      // sobald das Layout steht.
      let resizeTimer = null;
      const debounced = () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(handleResize, 150);
      };
      if ("ResizeObserver" in window) {
        new ResizeObserver(debounced).observe(canvas);
      } else {
        window.addEventListener("resize", debounced);
      }

      // Animation pausieren, wenn der Hero ausser Sicht ist (Performance).
      if (!prefersReducedMotion && "IntersectionObserver" in window) {
        const io = new IntersectionObserver(
          (entries) => {
            entries.forEach((e) => {
              inView = e.isIntersecting;
              if (inView) {
                if (ready) startLoop();
              } else {
                stopLoop();
              }
            });
          },
          { threshold: 0 }
        );
        io.observe(canvas);
      }

      // Auch pausieren, wenn der Tab in den Hintergrund geht.
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) stopLoop();
        else if (!prefersReducedMotion && inView) startLoop();
      });
    }

    return { start };
  })();

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
     4 — PLAYGROUNDS
     ========================================================== */

  // 4a) Live-Stil-Umschalter
  (() => {
    const demo = document.getElementById("styleDemo");
    if (!demo) return;
    const buttons = Array.from(demo.parentElement.querySelectorAll(".ss-btn"));
    const styles = ["elegant", "verspielt", "minimal"];

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const style = btn.dataset.style;
        styles.forEach((s) => demo.classList.remove("style-" + s));
        demo.classList.add("style-" + style);
        buttons.forEach((b) => b.classList.toggle("is-active", b === btn));
      });
    });
  })();

  // 4b) Hover-/Cursor-Reveal
  (() => {
    const demo = document.getElementById("hoverDemo");
    if (!demo) return;

    function setFromEvent(clientX, clientY) {
      const r = demo.getBoundingClientRect();
      const mx = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
      const my = Math.max(0, Math.min(1, (clientY - r.top) / r.height));
      demo.style.setProperty("--mx", mx.toFixed(3));
      demo.style.setProperty("--my", my.toFixed(3));
    }

    demo.addEventListener("pointermove", (e) => setFromEvent(e.clientX, e.clientY));
    demo.addEventListener("pointerleave", () => {
      demo.style.setProperty("--mx", "0.5");
      demo.style.setProperty("--my", "0.5");
    });
    // Tastatur: leichte automatische Bewegung bei Fokus
    demo.addEventListener("focus", () => {
      demo.style.setProperty("--mx", "0.72");
      demo.style.setProperty("--my", "0.35");
    });

    // Touch-Geräte: keine Maus → die Demo spielt von selbst (sanfte
    // Lissajous-Bahn), Texte werden angepasst, Loop pausiert ausser Sicht.
    if (window.matchMedia("(pointer: coarse)").matches) {
      const card = demo.closest(".play-card");
      const h4 = card && card.querySelector(".play-card-head h4");
      const lead = card && card.querySelector(".play-card-head p");
      if (h4) h4.textContent = "Immer in Bewegung.";
      if (lead)
        lead.textContent =
          "Die Vorschau spielt von selbst — Licht, Layout und Typo reagieren.";
      demo.setAttribute(
        "aria-label",
        "Website-Vorschau mit automatischer Bewegung"
      );
      if (prefersReducedMotion) {
        demo.style.setProperty("--mx", "0.65");
        demo.style.setProperty("--my", "0.4");
      } else {
        let t = 0,
          raf = null;
        const tick = () => {
          t += 0.012;
          demo.style.setProperty("--mx", (0.5 + 0.42 * Math.sin(t * 1.3)).toFixed(3));
          demo.style.setProperty("--my", (0.5 + 0.4 * Math.cos(t * 0.9)).toFixed(3));
          raf = requestAnimationFrame(tick);
        };
        const start = () => { if (raf == null) raf = requestAnimationFrame(tick); };
        const stop = () => { if (raf != null) { cancelAnimationFrame(raf); raf = null; } };
        if ("IntersectionObserver" in window) {
          new IntersectionObserver((entries) => {
            entries.forEach((e) => (e.isIntersecting ? start() : stop()));
          }).observe(demo);
        } else {
          start();
        }
      }
    }
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
     6 — NAVIGATION
     ========================================================== */
  (() => {
    const header = document.getElementById("siteHeader");
    const toggle = document.getElementById("navToggle");
    const menu = document.getElementById("navMenu");
    if (!header) return;

    // Scroll-Zustand: über der dunklen Hero transparent + helle Schrift,
    // ab der hellen Folgesektion weisser Header + dunkle Schrift.
    const heroEl = document.querySelector(".hero");
    let threshold = 12;
    function recalcThreshold() {
      threshold = heroEl ? Math.max(40, heroEl.offsetHeight - 72) : 12;
    }
    recalcThreshold();
    window.addEventListener("resize", recalcThreshold, { passive: true });

    let ticking = false;
    function onScroll() {
      ticking = false;
      header.classList.toggle("scrolled", window.scrollY > threshold);
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

    // Mobile-Menü
    if (toggle && menu) {
      const closeMenu = () => {
        header.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Menü öffnen");
      };
      toggle.addEventListener("click", () => {
        const open = header.classList.toggle("nav-open");
        toggle.setAttribute("aria-expanded", String(open));
        toggle.setAttribute("aria-label", open ? "Menü schliessen" : "Menü öffnen");
      });
      menu.querySelectorAll("a").forEach((a) =>
        a.addEventListener("click", closeMenu)
      );
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeMenu();
      });
    }
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
     INIT
     ========================================================== */
  function init() {
    if (HeroFlow) HeroFlow.start();
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
