/* Shared page interactions. */

if (window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!reduceMotion) {
    if (window.Lenis) {
      const lenis = new Lenis({ anchors: true });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);
    }

    const revealGroups = [
      { cards: gsap.utils.toArray(".intro-card, .timeline-card"), keyboardSafe: false },
      { cards: gsap.utils.toArray(".postcard-reveal, .envelope"), keyboardSafe: true },
      { cards: gsap.utils.toArray(".favorite-item, .favorite-caption, .contact-closing, .contact-hint"), keyboardSafe: false },
    ];

    revealGroups.forEach(({ cards, keyboardSafe }) => cards.forEach((card, index) => {
      const fromVars = {
        y: 28,
        rotationY: -2,
        transformPerspective: 1000,
        transformOrigin: "left center",
        ...(keyboardSafe ? { opacity: 0, visibility: "visible" } : { autoAlpha: 0 }),
      };
      const toVars = {
        y: 0,
        rotationY: 0,
        duration: 1.1,
        delay: index * 0.12,
        ease: "power2.out",
        ...(keyboardSafe ? { opacity: 1 } : { autoAlpha: 1 }),
        scrollTrigger: {
          trigger: card,
          start: "top 78%",
          toggleActions: "play none none reverse",
        },
      };
      const reveal = gsap.fromTo(card, fromVars, toVars);

      if (keyboardSafe) {
        card.addEventListener("focusin", () => {
          reveal.scrollTrigger?.kill();
          reveal.kill();
          gsap.set(card, { opacity: 1, visibility: "visible", y: 0, rotationY: 0 });
        }, { once: true });
      }
    }));
  }
}

document.querySelectorAll(".postcard").forEach((postcard) => {
  const front = postcard.querySelector(".postcard__front");
  const back = postcard.querySelector(".postcard__back");

  const flip = () => {
    const isFlipped = postcard.classList.toggle("is-flipped");
    postcard.setAttribute(
      "aria-label",
      `${postcard.dataset.projectLabel} postcard, ${isFlipped ? "back" : "front"} face. Press Enter or Space to flip.`,
    );
    front.setAttribute("aria-hidden", String(isFlipped));
    back.setAttribute("aria-hidden", String(!isFlipped));
    front.toggleAttribute("inert", isFlipped);
    back.toggleAttribute("inert", !isFlipped);
  };

  front.addEventListener("click", flip);
  postcard.addEventListener("keydown", (event) => {
    if (event.target.closest("a")) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      flip();
    }
  });
});

const envelope = document.querySelector(".envelope");

if (envelope) {
  const letter = envelope.querySelector(".envelope__letter");
  const flap = envelope.querySelector(".envelope__flap");
  const heading = document.querySelector(".contact-closing");
  const headingText = heading.querySelector(".contact-closing__text");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let isOpen = envelope.dataset.state === "open";
  let isAnimating = false;

  const waitForTransition = (element, propertyName, duration) => new Promise((resolve) => {
    const finish = (event) => {
      if (event && (event.target !== element || event.propertyName !== propertyName)) return;
      clearTimeout(fallback);
      element.removeEventListener("transitionend", finish);
      resolve();
    };
    const fallback = setTimeout(finish, duration + 100);
    element.addEventListener("transitionend", finish);
  });

  const delay = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

  const setEnvelopeState = (state) => {
    envelope.dataset.state = state;
    envelope.setAttribute(
      "aria-label",
      state === "open" ? "Open envelope. Press Enter or Space to close. Contact details are shown."
        : state === "opening" ? "Opening envelope. The flap is lifting."
          : state === "closing" ? "Closing envelope. The letter is returning."
            : "Closed envelope. Press Enter or Space to open.",
    );
  };

  const openInstantly = () => {
    heading.classList.add("is-away");
    envelope.classList.add("is-flap-open", "is-letter-out", "is-open");
    letter.setAttribute("aria-hidden", "false");
    letter.removeAttribute("inert");
    isOpen = true;
    setEnvelopeState("open");
  };

  const closeInstantly = () => {
    heading.classList.remove("is-away");
    envelope.classList.remove("is-flap-open", "is-letter-out", "is-open");
    letter.setAttribute("aria-hidden", "true");
    letter.setAttribute("inert", "");
    isOpen = false;
    setEnvelopeState("closed");
  };

  const openEnvelope = async (shouldFocus) => {
    if (isOpen || isAnimating) return;
    if (reduceMotion) return openInstantly();

    isAnimating = true;
    setEnvelopeState("opening");
    const headingTransition = waitForTransition(headingText, "transform", 520);
    const flapTransition = waitForTransition(flap, "transform", 650);
    heading.classList.add("is-away");
    envelope.classList.add("is-flap-open");

    await Promise.all([headingTransition, flapTransition]);
    // The flap has completed its 650ms turn; keep only a tiny beat before the letter rises.
    await delay(40);

    const letterTransition = waitForTransition(letter, "transform", 650);
    envelope.classList.add("is-letter-out");
    letter.setAttribute("aria-hidden", "false");
    letter.removeAttribute("inert");
    if (shouldFocus) letter.querySelector("a")?.focus({ preventScroll: true });
    await letterTransition;

    envelope.classList.add("is-open");
    isOpen = true;
    isAnimating = false;
    setEnvelopeState("open");
  };

  const closeEnvelope = async () => {
    if (!isOpen || isAnimating) return;
    if (reduceMotion) return closeInstantly();

    isAnimating = true;
    setEnvelopeState("closing");
    const letterTransition = waitForTransition(letter, "transform", 650);
    envelope.classList.remove("is-letter-out", "is-open");

    await delay(160);
    const headingTransition = waitForTransition(headingText, "transform", 520);
    heading.classList.remove("is-away");
    await Promise.all([letterTransition, headingTransition]);

    letter.setAttribute("aria-hidden", "true");
    letter.setAttribute("inert", "");
    const flapTransition = waitForTransition(flap, "transform", 650);
    envelope.classList.remove("is-flap-open");
    await flapTransition;

    isOpen = false;
    isAnimating = false;
    setEnvelopeState("closed");
  };

  const toggleEnvelope = (shouldFocus = false) => {
    if (isAnimating) return;
    if (isOpen) void closeEnvelope();
    else void openEnvelope(shouldFocus);
  };

  envelope.addEventListener("click", (event) => {
    if (event.target.closest("a")) return;
    toggleEnvelope(false);
  });

  envelope.addEventListener("keydown", (event) => {
    if (event.target.closest("a")) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleEnvelope(true);
    }
  });
}

const cover = document.querySelector(".cover-spread");
const particleCanvas = cover?.querySelector(".cover-particles");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (cover && particleCanvas && window.THREE && !reduceMotion) {
  const THREE = window.THREE;

  try {
    const renderer = new THREE.WebGLRenderer({
      canvas: particleCanvas,
      alpha: true,
      antialias: false,
      powerPreference: "low-power",
    });
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 2;
    renderer.setClearColor(0x000000, 0);

    const particleTextureCanvas = document.createElement("canvas");
    particleTextureCanvas.width = 32;
    particleTextureCanvas.height = 32;
    const textureContext = particleTextureCanvas.getContext("2d");
    const radialGlow = textureContext.createRadialGradient(16, 16, 0, 16, 16, 16);
    radialGlow.addColorStop(0, "rgba(255,255,255,0.9)");
    radialGlow.addColorStop(0.28, "rgba(255,255,255,0.42)");
    radialGlow.addColorStop(1, "rgba(255,255,255,0)");
    textureContext.fillStyle = radialGlow;
    textureContext.fillRect(0, 0, 32, 32);
    const particleTexture = new THREE.CanvasTexture(particleTextureCanvas);

    const glowColor = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue("--color-glow").trim());
    const amberColor = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue("--color-accent").trim());
    const particleMaterial = new THREE.PointsMaterial({
      size: 16,
      map: particleTexture,
      transparent: true,
      opacity: 0.68,
      vertexColors: true,
      depthWrite: false,
      sizeAttenuation: false,
    });

    let particleGeometry;
    let particles;
    let drift = [];
    let width = 0;
    let height = 0;
    let running = false;
    let frameId = 0;
    let lastFrameTime = 0;

    const buildParticles = () => {
      const count = width < 640 ? 32 : 64;
      const aspect = width / height;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      drift = Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 0.018,
        y: 0.009 + Math.random() * 0.018,
        phase: Math.random() * Math.PI * 2,
      }));

      for (let i = 0; i < count; i += 1) {
        positions[i * 3] = (Math.random() * 2 - 1) * aspect;
        positions[i * 3 + 1] = Math.random() * 2 - 1;
        positions[i * 3 + 2] = 0;
        const color = Math.random() > 0.5 ? glowColor : amberColor;
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }

      particleGeometry?.dispose();
      particleGeometry = new THREE.BufferGeometry();
      particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      particleGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      if (particles) scene.remove(particles);
      particles = new THREE.Points(particleGeometry, particleMaterial);
      scene.add(particles);
      // Large enough to read as warm dust on the pale paper, while remaining soft.
      particleMaterial.size = width < 640 ? 13 : 16;
    };

    const resizeRenderer = () => {
      width = Math.max(cover.clientWidth, 1);
      height = Math.max(cover.clientHeight, 1);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 640 ? 1.5 : 2));
      renderer.setSize(width, height, false);
      const aspect = width / height;
      camera.left = -aspect;
      camera.right = aspect;
      camera.top = 1;
      camera.bottom = -1;
      camera.updateProjectionMatrix();
      buildParticles();
      if (!running) renderer.render(scene, camera);
    };

    const renderFrame = (time) => {
      if (!running) return;
      const delta = lastFrameTime ? Math.min((time - lastFrameTime) / 1000, 0.05) : 0;
      lastFrameTime = time;
      const positions = particleGeometry.getAttribute("position");
      const aspect = width / height;

      for (let i = 0; i < drift.length; i += 1) {
        const motion = drift[i];
        positions.array[i * 3] += (motion.x + Math.sin(time * 0.0002 + motion.phase) * 0.006) * delta;
        positions.array[i * 3 + 1] += motion.y * delta;

        if (positions.array[i * 3 + 1] > 1.08) {
          positions.array[i * 3 + 1] = -1.08;
          positions.array[i * 3] = (Math.random() * 2 - 1) * aspect;
        }
        if (positions.array[i * 3] > aspect + 0.08) positions.array[i * 3] = -aspect - 0.08;
        if (positions.array[i * 3] < -aspect - 0.08) positions.array[i * 3] = aspect + 0.08;
      }

      positions.needsUpdate = true;
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(renderFrame);
    };

    const startRendering = () => {
      if (running || document.hidden) return;
      running = true;
      lastFrameTime = 0;
      frameId = window.requestAnimationFrame(renderFrame);
    };

    const stopRendering = () => {
      running = false;
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
      lastFrameTime = 0;
    };

    resizeRenderer();
    const resizeObserver = new ResizeObserver(resizeRenderer);
    resizeObserver.observe(cover);
    window.addEventListener("resize", resizeRenderer, { passive: true });
    window.addEventListener("orientationchange", resizeRenderer, { passive: true });

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) startRendering();
      else stopRendering();
    });
    visibilityObserver.observe(cover);

    // Run one post-layout measurement/render pass instead of depending only on
    // IntersectionObserver's first callback to start the visible cover.
    window.requestAnimationFrame(() => {
      if (!cover.isConnected) return;
      resizeRenderer();
      const bounds = particleCanvas.getBoundingClientRect();
      const cssSize = `${Math.round(bounds.width)}x${Math.round(bounds.height)}`;
      const drawingBuffer = renderer.getDrawingBufferSize(new THREE.Vector2());
      const bufferSize = `${drawingBuffer.x}x${drawingBuffer.y}`;
      console.info(`[cover particles] canvas CSS ${cssSize}; drawing buffer ${bufferSize}`);

      if (bounds.width > 0 && bounds.height > 0 && bounds.bottom > 0 && bounds.top < window.innerHeight) {
        startRendering();
      }
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stopRendering();
      else if (cover.getBoundingClientRect().bottom > 0 && cover.getBoundingClientRect().top < innerHeight) startRendering();
    });

    window.addEventListener("pagehide", () => {
      stopRendering();
      visibilityObserver.disconnect();
      resizeObserver.disconnect();
      particleGeometry?.dispose();
      particleTexture.dispose();
      particleMaterial.dispose();
      renderer.dispose();
    }, { once: true });
  } catch (error) {
    console.warn("Cover particles could not initialize.", error);
  }
}

const markerLinks = [...document.querySelectorAll(".page-markers a")];
const markerSections = markerLinks
  .map((link) => ({ link, section: document.querySelector(link.getAttribute("href")) }))
  .filter(({ section }) => section);

if (markerSections.length) {
  let sectionObserver;

  const updateActiveMarker = () => {
    const viewportMiddle = window.innerHeight / 2;
    const current = markerSections.find(({ section }) => {
      const bounds = section.getBoundingClientRect();
      return bounds.top <= viewportMiddle && bounds.bottom > viewportMiddle;
    }) ?? markerSections.reduce((nearest, candidate) => {
      const distanceToMiddle = (section) => {
        const bounds = section.getBoundingClientRect();
        return Math.min(Math.abs(bounds.top - viewportMiddle), Math.abs(bounds.bottom - viewportMiddle));
      };
      return distanceToMiddle(candidate.section) < distanceToMiddle(nearest.section) ? candidate : nearest;
    });

    markerSections.forEach(({ link, section }) => {
      if (section === current.section) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  };

  const observeSections = () => {
    sectionObserver?.disconnect();
    const edgeBand = Math.round(window.innerHeight * 0.48);
    sectionObserver = new IntersectionObserver(updateActiveMarker, {
      rootMargin: `-${edgeBand}px 0px -${edgeBand}px 0px`,
      threshold: 0,
    });
    markerSections.forEach(({ section }) => sectionObserver.observe(section));
    updateActiveMarker();
  };

  observeSections();
  window.addEventListener("resize", observeSections, { passive: true });
  document.fonts?.ready.then(updateActiveMarker);
}

// Shared custom pencil cursor. Touch-first devices keep their native behavior.
if (window.matchMedia("(pointer: fine)").matches) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cursor = document.createElement("div");
  cursor.className = "pencil-cursor";
  cursor.setAttribute("aria-hidden", "true");
  cursor.innerHTML = `<svg viewBox="0 0 30 30" aria-hidden="true" focusable="false">
    <path d="M3 27 6.2 19.2 20.8 4.6a2.1 2.1 0 0 1 3 0l1.6 1.6a2.1 2.1 0 0 1 0 3L10.8 23.8 3 27Z" fill="var(--color-accent)" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="m6.2 19.2 4.6 4.6M20.8 4.6l4.6 4.6" fill="none" stroke="currentColor" stroke-width="1.2"/>
  </svg>`;
  document.body.append(cursor);
  document.documentElement.classList.add("has-pencil-cursor");

  let lastPointer = null;
  const positionCursor = (event) => {
    const x = event.clientX;
    const y = event.clientY;
    // The SVG's pencil tip is at (3, 27); align that point with the pointer.
    cursor.style.transform = `translate3d(${x - 3}px, ${y - 27}px, 0)`;
    cursor.classList.add("is-visible");

    if (!trailContext) return;
    if (!lastPointer) {
      lastPointer = { x, y, spawnX: x, spawnY: y };
      return;
    }

    const dx = x - lastPointer.x;
    const dy = y - lastPointer.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 0) {
      const spacing = 18;
      let sinceSpawn = Math.hypot(lastPointer.x - lastPointer.spawnX, lastPointer.y - lastPointer.spawnY);
      const total = sinceSpawn + distance;
      const count = Math.min(8, Math.floor(total / spacing));
      for (let i = 0; i < count; i += 1) {
        const along = (spacing - sinceSpawn + i * spacing) / distance;
        if (along >= 0 && along <= 1) addTrailMark(lastPointer.x + dx * along, lastPointer.y + dy * along, dx, dy);
      }
      if (count) {
        const remainder = total % spacing;
        const fromCurrent = remainder;
        const back = Math.min(distance, fromCurrent);
        lastPointer.spawnX = x - (dx / distance) * back;
        lastPointer.spawnY = y - (dy / distance) * back;
      }
      lastPointer.x = x;
      lastPointer.y = y;
    }
  };

  let trailCanvas;
  let trailContext;
  let marks = [];
  let trailFrame = 0;
  const markLifetime = 1250;

  const drawTrail = (now) => {
    trailFrame = 0;
    if (!trailContext) return;
    const { width, height, dpr } = trailCanvas._viewport;
    trailContext.clearRect(0, 0, width, height);
    marks = marks.filter((mark) => now - mark.born < markLifetime);
    for (const mark of marks) {
      const age = (now - mark.born) / markLifetime;
      trailContext.globalAlpha = (1 - age) * 0.82;
      trailContext.strokeStyle = mark.color;
      trailContext.lineWidth = mark.width;
      trailContext.lineCap = "round";
      trailContext.beginPath();
      const length = mark.length;
      const bend = mark.bend;
      trailContext.moveTo(mark.x, mark.y);
      trailContext.quadraticCurveTo(
        mark.x + Math.cos(mark.angle) * length * 0.52 + bend,
        mark.y + Math.sin(mark.angle) * length * 0.52 - bend,
        mark.x + Math.cos(mark.angle) * length,
        mark.y + Math.sin(mark.angle) * length,
      );
      trailContext.stroke();
    }
    trailContext.globalAlpha = 1;
    if (marks.length) trailFrame = window.requestAnimationFrame(drawTrail);
  };

  function addTrailMark(x, y, dx, dy) {
    const styles = getComputedStyle(document.documentElement);
    marks.push({
      x, y,
      angle: Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.9,
      length: 5 + Math.random() * 7,
      bend: (Math.random() - 0.5) * 3,
      width: 1 + Math.random() * 1.1,
      color: Math.random() > 0.5
        ? styles.getPropertyValue("--color-accent").trim()
        : styles.getPropertyValue("--color-accent-deep").trim(),
      born: performance.now(),
    });
    if (!trailFrame) trailFrame = window.requestAnimationFrame(drawTrail);
  }

  if (!reducedMotion) {
    trailCanvas = document.createElement("canvas");
    trailCanvas.className = "pencil-trail";
    trailCanvas.setAttribute("aria-hidden", "true");
    document.body.prepend(trailCanvas);
    trailContext = trailCanvas.getContext("2d");
    const resizeTrail = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;
      trailCanvas.width = Math.round(width * dpr);
      trailCanvas.height = Math.round(height * dpr);
      trailCanvas._viewport = { width, height, dpr };
      trailContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resizeTrail();
    window.addEventListener("resize", resizeTrail, { passive: true });
    window.addEventListener("orientationchange", resizeTrail, { passive: true });
  }

  document.addEventListener("mousemove", positionCursor, { passive: true });
  document.addEventListener("mouseleave", () => cursor.classList.remove("is-visible"));
  window.addEventListener("blur", () => cursor.classList.remove("is-visible"));
}
