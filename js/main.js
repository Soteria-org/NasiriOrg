/* Nasiri Orphanage Center — site behaviour
   Vanilla JS. No frameworks, no build step. */

(function () {
  "use strict";

  /* ---------------------------------------------------------
     Mobile navigation
  --------------------------------------------------------- */
  const toggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-nav]");
  const scrim = document.querySelector("[data-nav-scrim]");

  function closeNav() {
    if (!nav) return;
    nav.classList.remove("is-open");
    scrim && scrim.classList.remove("is-open");
    document.body.classList.remove("nav-lock");
    toggle && toggle.setAttribute("aria-expanded", "false");
  }

  function openNav() {
    if (!nav) return;
    nav.classList.add("is-open");
    scrim && scrim.classList.add("is-open");
    document.body.classList.add("nav-lock");
    toggle && toggle.setAttribute("aria-expanded", "true");
  }

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      nav.classList.contains("is-open") ? closeNav() : openNav();
    });
    scrim && scrim.addEventListener("click", closeNav);
    nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeNav));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeNav();
    });
  }

  /* ---------------------------------------------------------
     Scroll-reveal animation
  --------------------------------------------------------- */
  const revealEls = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && revealEls.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach((el, i) => {
      el.style.setProperty("--i", i % 6);
      io.observe(el);
    });
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---------------------------------------------------------
     Sticky donate bar (dismissible, remembered for the session)
  --------------------------------------------------------- */
  const donateBar = document.querySelector("[data-donate-bar]");
  const donateBarClose = document.querySelector("[data-donate-bar-close]");
  if (donateBar) {
    const dismissed = sessionStorage.getItem("nasiri-donate-bar-dismissed");
    if (dismissed) {
      donateBar.hidden = true;
    } else {
      window.addEventListener(
        "scroll",
        () => {
          if (window.scrollY > 480 && !sessionStorage.getItem("nasiri-donate-bar-dismissed")) {
            donateBar.hidden = false;
          }
        },
        { passive: true }
      );
    }
    donateBarClose &&
      donateBarClose.addEventListener("click", () => {
        donateBar.hidden = true;
        sessionStorage.setItem("nasiri-donate-bar-dismissed", "1");
      });
  }

  /* ---------------------------------------------------------
     Form handling (front-end validation only — V1 has no
     backend endpoint wired up yet; see PRD §18 / §31)
  --------------------------------------------------------- */
  function validateField(field) {
    const input = field.querySelector("input, textarea, select");
    if (!input) return true;
    let valid = input.checkValidity();

    if (valid && input.type === "email") {
      valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
    }

    field.classList.toggle("has-error", !valid);
    return valid;
  }

  document.querySelectorAll("form[data-form]").forEach((form) => {
    const fields = form.querySelectorAll(".field");
    const note = form.querySelector("[data-form-note]");

    fields.forEach((field) => {
      const input = field.querySelector("input, textarea, select");
      if (!input) return;
      input.addEventListener("blur", () => validateField(field));
      input.addEventListener("input", () => {
        if (field.classList.contains("has-error")) validateField(field);
      });
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      let allValid = true;
      fields.forEach((field) => {
        if (!validateField(field)) allValid = false;
      });

      if (!note) return;

      if (!allValid) {
        note.hidden = false;
        note.className = "form-note form-note--error";
        note.innerHTML =
          '<svg class="icon" aria-hidden="true"><use href="assets/icons/icons.svg#icon-alert"></use></svg><span>Please check the highlighted fields and try again.</span>';
        note.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      /* No backend endpoint is connected yet for this V1 static
         build — see the PRD's forms & email flow section. Swap
         this block for a real fetch() to the chosen serverless
         endpoint (or hosted form service) when it's wired up. */
      note.hidden = false;
      note.className = "form-note form-note--success";
      note.innerHTML =
        '<svg class="icon" aria-hidden="true"><use href="assets/icons/icons.svg#icon-check"></use></svg><span>Thank you — your message is ready to send once the site’s email delivery is connected.</span>';
      form.reset();
    });
  });

  /* ---------------------------------------------------------
     Polaroid Shuffle carousel — an automatic, clickable fan of
     photos. Each item's position is expressed as an offset from
     the active index (wrapping both directions); JS computes a
     transform from that offset and writes it inline, since the
     math (variable rotation/scale/opacity per offset) is awkward
     to express as a fixed set of CSS classes.
  --------------------------------------------------------- */
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.querySelectorAll("[data-polaroid-carousel]").forEach((root) => {
    const stage = root.querySelector("[data-polaroid-stage]");
    const items = Array.from(root.querySelectorAll(".polaroid"));
    const dotsWrap = root.querySelector("[data-polaroid-dots]");
    const prevBtn = root.querySelector("[data-polaroid-prev]");
    const nextBtn = root.querySelector("[data-polaroid-next]");
    if (!stage || !items.length) return;

    const n = items.length;
    let active = 0;
    let timer = null;

    const dots = items.map((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("aria-label", `Show photo ${i + 1} of ${n}`);
      dot.addEventListener("click", () => goTo(i));
      dotsWrap && dotsWrap.appendChild(dot);
      return dot;
    });

    function layout() {
      items.forEach((el, i) => {
        let offset = i - active;
        if (offset > n / 2) offset -= n;
        if (offset < -n / 2) offset += n;
        const abs = Math.abs(offset);
        const visible = abs <= 3;
        const x = offset * 96;
        const y = abs * 16;
        const rot = offset * 7;
        const scale = Math.max(1 - abs * 0.13, 0.42);
        const opacity = visible ? Math.max(1 - abs * 0.3, 0) : 0;
        el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${rot}deg) scale(${scale})`;
        el.style.zIndex = String(100 - abs);
        el.style.opacity = String(opacity);
        el.style.pointerEvents = visible ? "auto" : "none";
        const isActive = offset === 0;
        el.classList.toggle("is-active", isActive);
        el.setAttribute("aria-hidden", isActive ? "false" : "true");
        el.tabIndex = isActive ? 0 : -1;
      });
      dots.forEach((d, i) => d.classList.toggle("is-active", i === active));
    }

    function goTo(index) {
      active = ((index % n) + n) % n;
      layout();
    }

    function next() { goTo(active + 1); }
    function prev() { goTo(active - 1); }

    function start() {
      if (prefersReducedMotion) return;
      stop();
      timer = setInterval(next, 4200);
    }
    function stop() {
      if (timer) clearInterval(timer);
      timer = null;
    }

    items.forEach((el, i) => {
      el.addEventListener("click", () => {
        if (i === active) return;
        goTo(i);
        stop();
        start();
      });
    });
    prevBtn && prevBtn.addEventListener("click", () => { prev(); stop(); start(); });
    nextBtn && nextBtn.addEventListener("click", () => { next(); stop(); start(); });

    stage.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { next(); stop(); start(); }
      if (e.key === "ArrowLeft") { prev(); stop(); start(); }
    });

    stage.addEventListener("mouseenter", stop);
    stage.addEventListener("mouseleave", start);
    stage.addEventListener("focusin", stop);
    stage.addEventListener("focusout", start);
    stage.addEventListener("touchstart", stop, { passive: true });

    layout();
    start();
  });

  /* ---------------------------------------------------------
     Video feature: muted/looping, play only when JS + motion
     preference allow it; always offer a manual toggle.
  --------------------------------------------------------- */
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.querySelectorAll("[data-video-feature]").forEach((wrap) => {
    const video = wrap.querySelector("video");
    const toggle = wrap.querySelector("[data-video-toggle]");
    if (!video) return;

    const setPlaying = (playing) => {
      wrap.classList.toggle("is-playing", playing);
      toggle && toggle.setAttribute("aria-label", playing ? "Pause video" : "Play video");
    };

    if (!reduceMotion) {
      video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      setPlaying(false);
    }

    toggle &&
      toggle.addEventListener("click", () => {
        if (video.paused) {
          video.play();
          setPlaying(true);
        } else {
          video.pause();
          setPlaying(false);
        }
      });
  });

  /* ---------------------------------------------------------
     Footer year
  --------------------------------------------------------- */
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
})();
