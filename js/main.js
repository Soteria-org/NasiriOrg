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
     Carousel arrow controls (native scroll-snap does the rest)
  --------------------------------------------------------- */
  document.querySelectorAll("[data-carousel]").forEach((wrap) => {
    const track = wrap.querySelector(".carousel");
    const prev = wrap.querySelector("[data-carousel-prev]");
    const next = wrap.querySelector("[data-carousel-next]");
    if (!track) return;
    const scrollByCard = (dir) => {
      const card = track.querySelector(".carousel__item");
      const gap = parseFloat(getComputedStyle(track).gap || "0");
      const amount = card ? card.getBoundingClientRect().width + gap : track.clientWidth * 0.8;
      track.scrollBy({ left: dir * amount, behavior: "smooth" });
    };
    prev && prev.addEventListener("click", () => scrollByCard(-1));
    next && next.addEventListener("click", () => scrollByCard(1));
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
