/* ════════════════════════════════════════════════════════════════
   MCO Facilities — interactions
   Lenis (smooth scroll) · GSAP ScrollTrigger · reveal · parallax · tilt
   ══════════════════════════════════════════════════════════════════ */

(() => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ─── 1. Smooth scroll (Lenis) — driven by ONE rAF source only ─── */
  let lenis;
  const hasGSAP = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';

  if (!prefersReducedMotion && typeof Lenis !== 'undefined') {
    lenis = new Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.4,
      lerp: 0.12,
    });

    if (hasGSAP) {
      // Driven by GSAP ticker only — do NOT also call requestAnimationFrame
      gsap.registerPlugin(ScrollTrigger);
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      // Fallback rAF loop when GSAP is absent
      const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }

    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (id.length < 2) return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -80, duration: 1.2 });
      });
    });
  } else if (hasGSAP) {
    // No Lenis (reduced motion or lib missing) — still register GSAP plugin for parallax
    gsap.registerPlugin(ScrollTrigger);
  }

  /* ─── 3. Hero parallax (background layers) ─── */
  if (!prefersReducedMotion && typeof gsap !== 'undefined') {
    const orbs = document.querySelectorAll('.bg-orb');
    const grid = document.querySelector('.bg-grid');

    if (grid) {
      gsap.to(grid, {
        yPercent: 14,
        ease: 'none',
        scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom top', scrub: true }
      });
    }
    orbs.forEach((orb, i) => {
      const speed = [0.25, -0.18, 0.32][i] || 0.2;
      gsap.to(orb, {
        yPercent: speed * 100,
        xPercent: speed * 30,
        ease: 'none',
        scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom top', scrub: true }
      });
    });

    /* hero scale on scroll out */
    const hero = document.querySelector('.hero');
    if (hero) {
      gsap.to('.hero__inner', {
        yPercent: -18,
        opacity: 0.4,
        ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
      });
    }
  }

  /* ─── 4. Hero title — line reveal on load ─── */
  const heroLines = document.querySelectorAll('.hero__title .line');
  heroLines.forEach((line, i) => {
    line.style.setProperty('--idx', i);
    requestAnimationFrame(() => line.classList.add('is-visible'));
  });

  /* ─── 5. Reveal-on-scroll (IntersectionObserver) ─── */
  const reveals = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry, idx) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const siblings = el.parentElement ? Array.from(el.parentElement.querySelectorAll(':scope > [data-reveal]')) : [];
          const localIndex = siblings.indexOf(el);
          if (localIndex > -1) el.style.setProperty('--delay', `${localIndex * 70}ms`);
          el.classList.add('is-visible');
          io.unobserve(el);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });

    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('is-visible'));
  }

  /* ─── 6. Counters ─── */
  const counters = document.querySelectorAll('[data-counter]');
  if (counters.length && 'IntersectionObserver' in window) {
    const animate = (el) => {
      const target = parseInt(el.dataset.target, 10) || 0;
      const duration = 1600;
      const start = performance.now();
      const ease = (t) => 1 - Math.pow(1 - t, 3);
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        el.textContent = Math.round(ease(t) * target).toString();
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { animate(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(c => io.observe(c));
  }

  /* ─── 7. Nav: stuck state on scroll ─── */
  const nav = document.getElementById('nav');
  if (nav) {
    const onScroll = () => {
      nav.classList.toggle('is-stuck', window.scrollY > 32);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ─── 8. Card tilt + spotlight (desktop only) ─── */
  if (isFinePointer && !prefersReducedMotion) {
    const tiltCards = document.querySelectorAll('[data-tilt]');
    tiltCards.forEach(card => {
      const handleEnter = () => card.classList.add('is-tilting');
      const handleMove = (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const rx = ((y - cy) / cy) * -3;
        const ry = ((x - cx) / cx) *  3;
        card.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
        card.style.setProperty('--mx', `${(x / rect.width) * 100}%`);
        card.style.setProperty('--my', `${(y / rect.height) * 100}%`);
      };
      const handleLeave = () => {
        card.classList.remove('is-tilting');
        card.style.transform = '';
      };
      card.addEventListener('mouseenter', handleEnter);
      card.addEventListener('mousemove', handleMove);
      card.addEventListener('mouseleave', handleLeave);
    });

    /* spotlight on pillars */
    document.querySelectorAll('.expertise__pillars li').forEach(el => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
  }

  /* ─── 9. Custom cursor (desktop only) ─── */
  if (isFinePointer && !prefersReducedMotion) {
    const cursor = document.querySelector('.cursor');
    if (cursor) {
      let cx = window.innerWidth / 2, cy = window.innerHeight / 2;
      let tx = cx, ty = cy;
      window.addEventListener('mousemove', (e) => { tx = e.clientX; ty = e.clientY; });
      const loop = () => {
        cx += (tx - cx) * 0.18;
        cy += (ty - cy) * 0.18;
        cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
        requestAnimationFrame(loop);
      };
      loop();

      const hoverables = 'a, button, [data-tilt], input, textarea, select';
      document.querySelectorAll(hoverables).forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('is-hover'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
      });

      window.addEventListener('mouseleave', () => cursor.style.opacity = 0);
      window.addEventListener('mouseenter', () => cursor.style.opacity = 1);
    }
  }

  /* ─── 10. Footer year ─── */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

})();
