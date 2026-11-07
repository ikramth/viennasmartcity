/* ============================================================
   VIENNA SMART CITY — app.js
   Vanilla JavaScript · no dependencies
   ============================================================ */
(function () {
  'use strict';

  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ------------------------------------------------------------
     1. NAVIGATION, PROGRESS & BACK TO TOP
     ------------------------------------------------------------ */
  // In-page routing owns the scroll position, including back/forward.
  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
  }

  const nav = $('#siteNav');
  const navLinks = $('#navLinks');
  const navToggle = $('#navToggle');
  const progressBar = $('#scrollProgress');
  const toTop = $('#toTop');
  const navLinkEls = $$('.nav__link');
  const sectionIds = navLinkEls.map(link => link.getAttribute('href')).filter(Boolean);

  function closeMenu() {
    if (!navLinks.classList.contains('is-open')) return;
    navLinks.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Open navigation menu');
  }

  function openMenu() {
    navLinks.classList.add('is-open');
    navToggle.setAttribute('aria-expanded', 'true');
    navToggle.setAttribute('aria-label', 'Close navigation menu');
  }

  navToggle.addEventListener('click', () => {
    if (navLinks.classList.contains('is-open')) closeMenu();
    else openMenu();
  });

  document.addEventListener('click', (event) => {
    if (!navLinks.classList.contains('is-open')) return;
    if (event.target.closest('#siteNav')) return;
    closeMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 1080) closeMenu();
  }, { passive: true });

  let scrollTicking = false;

  function updateScrollUI() {
    const y = window.scrollY || window.pageYOffset;
    nav.classList.toggle('is-stuck', y > 24);

    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
    progressBar.style.width = (ratio * 100).toFixed(2) + '%';

    toTop.classList.toggle('is-visible', y > 680);
    scrollTicking = false;
  }

  function requestScrollUpdate() {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(updateScrollUI);
  }

  window.addEventListener('scroll', requestScrollUpdate, { passive: true });
  window.addEventListener('resize', requestScrollUpdate, { passive: true });
  updateScrollUI();

  toTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
  });

  /* ------------------------------------------------------------
     2. SMOOTH ANCHOR ROUTING + ACTIVE SECTION
     ------------------------------------------------------------ */
  function setActiveLink(hash) {
    navLinkEls.forEach((link) => {
      const isActive = link.getAttribute('href') === hash;
      link.classList.toggle('is-active', isActive);
      if (isActive) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  // Honour a deep link on first load. Scroll restoration is manual, so the
  // browser will not perform this jump for us.
  function jumpToInitialHash() {
    const hash = window.location.hash;
    if (!hash || hash === '#') return;

    const target = document.getElementById(hash.slice(1));
    if (!target) return;

    const offset = nav.getBoundingClientRect().height + 18;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;

    window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
    if (sectionIds.includes(hash)) setActiveLink(hash);
  }

  jumpToInitialHash();

  function scrollToTarget(target) {
    if (!target) return;

    const offset = nav.getBoundingClientRect().height + 18;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;

    window.scrollTo({
      top: Math.max(0, top),
      behavior: prefersReduced ? 'auto' : 'smooth'
    });

    if (!target.hasAttribute('tabindex')) {
      target.setAttribute('tabindex', '-1');
      target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
    }

    window.setTimeout(() => {
      try { target.focus({ preventScroll: true }); } catch (_) { /* no-op */ }
    }, prefersReduced ? 0 : 420);
  }

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;

    const hash = link.getAttribute('href');
    if (!hash || hash === '#') return;

    const target = document.getElementById(hash.slice(1));
    if (!target) return;

    event.preventDefault();
    closeMenu();

    scrollToTarget(target);

    if (window.history && window.history.pushState) {
      window.history.pushState(null, '', hash);
    }

    if (sectionIds.includes(hash)) setActiveLink(hash);
  });

  // Browser back/forward keeps the in-page route and active state in sync.
  window.addEventListener('popstate', () => {
    const hash = window.location.hash;
    if (!hash || hash === '#') {
      window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
      setActiveLink('#home');
      return;
    }

    const target = document.getElementById(hash.slice(1));
    if (!target) return;

    scrollToTarget(target);
    if (sectionIds.includes(hash)) setActiveLink(hash);
  });

  // Active navigation via a narrow horizontal observation band.
  if ('IntersectionObserver' in window) {
    const activeObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const hash = '#' + entry.target.id;
        if (sectionIds.includes(hash)) setActiveLink(hash);
      });
    }, {
      rootMargin: '-38% 0px -56% 0px',
      threshold: 0
    });

    sectionIds.forEach((hash) => {
      const section = document.querySelector(hash);
      if (section) activeObserver.observe(section);
    });
  }

  // Keep the Impact link highlighted while the academic closing card is on screen.
  const academicSection = $('#academic');
  if (academicSection && 'IntersectionObserver' in window) {
    const academicObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActiveLink('#impact');
      });
    }, { rootMargin: '-20% 0px -55% 0px', threshold: 0 });
    academicObserver.observe(academicSection);
  }

  /* ------------------------------------------------------------
     3. REVEAL ON SCROLL
     ------------------------------------------------------------ */
  const revealEls = $$('.reveal');

  if ('IntersectionObserver' in window && !prefersReduced) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -5% 0px'
    });

    revealEls.forEach((el) => revealObserver.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  /* ------------------------------------------------------------
     4. ANIMATED COUNTERS
     ------------------------------------------------------------ */
  function formatCounter(value, decimals, prefix, suffix, plain) {
    const fixed = value.toFixed(decimals);
    const body = plain
      ? fixed
      : Number(fixed).toLocaleString('en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        });
    return prefix + body + suffix;
  }

  function animateCounter(el) {
    if (el.dataset.counted === '1') return;
    el.dataset.counted = '1';

    const target = parseFloat(el.dataset.target || '0');
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const plain = el.dataset.plain === '1';
    const duration = prefersReduced ? 0 : 1650;

    if (!duration) {
      el.textContent = formatCounter(target, decimals, prefix, suffix, plain);
      return;
    }

    const start = performance.now();

    function frame(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = formatCounter(target * eased, decimals, prefix, suffix, plain);

      if (progress < 1) window.requestAnimationFrame(frame);
      else el.textContent = formatCounter(target, decimals, prefix, suffix, plain);
    }

    window.requestAnimationFrame(frame);
  }

  const counters = $$('.counter');
  if ('IntersectionObserver' in window) {
    const counterObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.35 });
    counters.forEach((counter) => counterObserver.observe(counter));
  } else {
    counters.forEach(animateCounter);
  }

  /* ------------------------------------------------------------
     5. POINTER GLOW (cards + interactive map)
     ------------------------------------------------------------ */
  if (canHover && !prefersReduced) {
    const glowTargets = $$('.glow-card, .map-card');

    glowTargets.forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        card.style.setProperty('--mx', x.toFixed(2) + '%');
        card.style.setProperty('--my', y.toFixed(2) + '%');
      }, { passive: true });

      card.addEventListener('pointerleave', () => {
        card.style.removeProperty('--mx');
        card.style.removeProperty('--my');
      }, { passive: true });
    });
  }

  /* ------------------------------------------------------------
     6. RESILIENT IMAGERY
     Every local asset carries a remote fallback. If the fallback
     also fails, a designed placeholder replaces the broken image.
     ------------------------------------------------------------ */
  function bindImageFallback(img) {
    function recover() {
      const fallback = img.getAttribute('data-fallback');

      if (fallback) {
        img.removeAttribute('data-fallback');
        img.src = fallback;
        return;
      }

      img.classList.add('is-missing');
      const media = img.closest('.orbit-card__media');
      if (media) media.classList.add('is-missing');
    }

    img.addEventListener('error', recover);

    if (img.complete && img.naturalWidth === 0) recover();
  }

  $$('img[data-fallback]').forEach(bindImageFallback);

  /* ------------------------------------------------------------
     7. HERO FILM MODAL
     Audio safety: close pauses, mutes, zeroes volume, resets time,
     releases focus and detaches the media pipeline after the fade.
     ------------------------------------------------------------ */
  const videoModal = $('#videoModal');
  const video = $('#hero-modal-video');
  const videoFrame = $('#videoFrame');
  const videoClose = $('#videoClose');
  const videoFullscreen = $('#videoFullscreen');
  const videoFallback = $('#videoFallback');
  const videoRetry = $('#videoRetry');
  const watchVideoBtn = $('#watch-video-btn');
  const fsUse = videoFullscreen ? $('use', videoFullscreen) : null;

  let videoOpen = false;
  let lightboxOpen = false;
  let closeTimer = null;
  let lastFocus = null;

  function lockPageScroll() {
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.classList.add('modal-open');
    if (scrollbar > 0) document.body.style.paddingRight = scrollbar + 'px';
  }

  function unlockPageScroll() {
    if (lightboxOpen || videoOpen) return;
    document.body.classList.remove('modal-open');
    document.body.style.paddingRight = '';
  }

  function hideVideoFallback() {
    if (videoFallback) videoFallback.hidden = true;
  }

  function showVideoFallback() {
    if (videoFallback) videoFallback.hidden = false;
  }

  function resetAndSilenceVideo() {
    if (!video) return;
    try { video.pause(); } catch (_) { /* no-op */ }
    video.muted = true;
    video.volume = 0;
    try { video.currentTime = 0; } catch (_) { /* metadata may not be ready */ }
  }

  function attemptPlayback() {
    if (!video) return;
    video.muted = false;
    video.volume = 1;

    const playAttempt = video.play();
    if (playAttempt && typeof playAttempt.catch === 'function') {
      playAttempt.catch(() => {
        // Autoplay policy fallback: retry muted, then expose the retry panel.
        video.muted = true;
        const mutedAttempt = video.play();
        if (mutedAttempt && typeof mutedAttempt.catch === 'function') {
          mutedAttempt.catch(showVideoFallback);
        }
      });
    }
  }

  function openVideoModal() {
    if (!videoModal || !video) return;
    if (videoOpen) return;

    videoOpen = true;
    window.clearTimeout(closeTimer);
    lastFocus = document.activeElement;

    hideVideoFallback();
    videoModal.hidden = false;
    videoModal.classList.remove('is-closing');

    // Force a reflow so the entrance transition always plays.
    void videoModal.offsetWidth;
    videoModal.classList.add('is-open');

    lockPageScroll();

    try { video.currentTime = 0; } catch (_) { /* no-op */ }
    attemptPlayback();

    window.setTimeout(() => {
      if (videoClose) videoClose.focus({ preventScroll: true });
    }, 80);
  }

  function closeVideoModal() {
    if (!videoModal || !videoOpen) return;

    videoOpen = false;
    resetAndSilenceVideo();

    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => { /* no-op */ });
    }

    videoModal.classList.remove('is-open');
    videoModal.classList.add('is-closing');

    closeTimer = window.setTimeout(() => {
      videoModal.hidden = true;
      videoModal.classList.remove('is-closing');
      unlockPageScroll();

      // Fully release the media element after the exit animation.
      try { video.load(); } catch (_) { /* no-op */ }

      if (lastFocus && typeof lastFocus.focus === 'function') {
        lastFocus.focus({ preventScroll: true });
      }
    }, 340);
  }

  if (watchVideoBtn) {
    watchVideoBtn.addEventListener('click', openVideoModal);
  }

  if (videoModal) {
    videoModal.addEventListener('click', (event) => {
      if (event.target.closest('[data-video-close]')) closeVideoModal();
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && videoOpen) {
      closeVideoModal();
      return;
    }

    if (event.key !== 'Tab' || !videoOpen) return;

    const dialog = $('.video-modal__dialog', videoModal);
    if (!dialog) return;

    const focusable = $$('button, a[href], video, [tabindex]:not([tabindex="-1"])', dialog)
      .filter((el) => !el.disabled && el.offsetParent !== null);

    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (!focusable.includes(document.activeElement)) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  /* ---------- Fullscreen ---------- */
  function fullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function updateFullscreenButton() {
    if (!videoFullscreen || !fsUse) return;
    const active = Boolean(fullscreenElement());
    fsUse.setAttribute('href', active ? '#ic-collapse' : '#ic-expand');
    videoFullscreen.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Enter fullscreen');
    videoFullscreen.setAttribute('title', active ? 'Exit fullscreen' : 'Fullscreen');
  }

  function toggleFullscreen() {
    if (!videoFrame) return;

    if (!fullscreenElement()) {
      const request = videoFrame.requestFullscreen || videoFrame.webkitRequestFullscreen;
      if (request) {
        const result = request.call(videoFrame);
        if (result && typeof result.catch === 'function') {
          result.catch(() => { /* iOS may require native video fullscreen */ });
        }
      } else if (video && video.webkitEnterFullscreen) {
        video.webkitEnterFullscreen();
      }
    } else {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) {
        const result = exit.call(document);
        if (result && typeof result.catch === 'function') {
          result.catch(() => { /* no-op */ });
        }
      }
    }
  }

  if (videoFullscreen) {
    videoFullscreen.addEventListener('click', toggleFullscreen);
  }

  document.addEventListener('fullscreenchange', updateFullscreenButton);
  document.addEventListener('webkitfullscreenchange', updateFullscreenButton);

  /* ---------- Media resilience ---------- */
  if (video) {
    // The media element lives inside a hidden dialog: keep it silent and
    // stopped until the viewer explicitly opens the film.
    resetAndSilenceVideo();

    video.addEventListener('playing', hideVideoFallback);
    video.addEventListener('loadeddata', hideVideoFallback);
    video.addEventListener('error', showVideoFallback);

    const sources = $$('source', video);
    sources.forEach((source, index) => {
      source.addEventListener('error', () => {
        if (index === sources.length - 1) showVideoFallback();
      });
    });
  }

  if (videoRetry) {
    videoRetry.addEventListener('click', () => {
      if (!video) return;
      hideVideoFallback();

      try { video.load(); } catch (_) { /* no-op */ }

      const retry = video.play();
      if (retry && typeof retry.catch === 'function') {
        retry.catch(() => {
          video.muted = true;
          const mutedRetry = video.play();
          if (mutedRetry && typeof mutedRetry.catch === 'function') {
            mutedRetry.catch(showVideoFallback);
          }
        });
      }
    });
  }

  // If the tab is hidden while the film is open, stop the audio immediately.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && videoOpen && video) {
      try { video.pause(); } catch (_) { /* no-op */ }
    }
  });

  /* ------------------------------------------------------------
     8. LANGUAGE SYSTEM · ENGLISH / ARABIC
     The DOM is authored in English. Every translated node is
     remembered once, so switching back restores the original
     markup, icons and animated counters exactly.
     ------------------------------------------------------------ */
  const htmlRoot = document.documentElement;
  const langSwitch = $('#langSwitch');
  const metaDescription = $('meta[name="description"]');
  const EN_TITLE = document.title;
  const EN_DESCRIPTION = metaDescription ? metaDescription.getAttribute('content') : '';

  let currentLang = htmlRoot.lang === 'ar' ? 'ar' : 'en';

  const savedHTML = new Map();
  const savedAttrs = new Map();

  function rememberHTML(el) {
    if (el && !savedHTML.has(el)) savedHTML.set(el, el.innerHTML);
  }

  function rememberAttr(el, name) {
    if (!savedAttrs.has(el)) savedAttrs.set(el, new Map());
    const store = savedAttrs.get(el);
    if (!store.has(name)) store.set(name, el.getAttribute(name));
  }

  function setHTML(target, markup) {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) return;
    rememberHTML(el);
    el.innerHTML = markup;
  }

  function setText(target, text) {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) return;
    rememberHTML(el);

    const textNodes = Array.from(el.childNodes)
      .filter((node) => node.nodeType === 3 && node.nodeValue.trim() !== '');

    if (textNodes.length) {
      textNodes[0].nodeValue = ' ' + text;
      textNodes.slice(1).forEach((node) => node.remove());
    } else {
      el.appendChild(document.createTextNode(' ' + text));
    }
  }

  function setAttr(target, name, value) {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) return;
    rememberAttr(el, name);
    el.setAttribute(name, value);
  }

  function restoreEnglish() {
    savedHTML.forEach((markup, el) => { el.innerHTML = markup; });
    savedAttrs.forEach((store, el) => {
      store.forEach((value, name) => {
        if (value === null) el.removeAttribute(name);
        else el.setAttribute(name, value);
      });
    });
  }

  /* ---------- Section helpers ---------- */
  function translateHeader(sectionSelector, eyebrow, titleHTML, lead) {
    const section = $(sectionSelector);
    if (!section) return;
    setText($('.eyebrow', section), eyebrow);
    setHTML($('h2', section), titleHTML);
    setText($('.section-lead', section), lead);
  }

  function translateOrbitCards(sectionSelector, cards) {
    const els = $$(sectionSelector + ' .orbit-card');
    cards.forEach((data, index) => {
      const card = els[index];
      if (!card) return;
      setHTML($('.orbit-card__body h3', card), data.title);
      const rows = $$('.spec-badges li', card);
      data.specs.forEach((spec, rowIndex) => {
        if (!rows[rowIndex]) return;
        setText($('span', rows[rowIndex]), spec[0]);
        setHTML($('strong', rows[rowIndex]), spec[1]);
      });
      setText($('.orbit-card__tag', card), data.tag);
      const img = $('img', card);
      if (img && data.alt) setAttr(img, 'alt', data.alt);
    });
  }

  function translateHub(sectionSelector, data) {
    const hub = $(sectionSelector + ' .hub-card');
    if (!hub) return;

    setText($('.hub-card__kicker', hub), data.kicker);
    setHTML($('.hub-card__head h3', hub), data.title);
    setHTML($('.hub-card__text', hub), data.text);

    const stats = $$('.hub-card__stats div', hub);
    data.stats.forEach((stat, index) => {
      if (!stats[index]) return;
      setText($('strong', stats[index]), stat[0]);
      setText($('span', stats[index]), stat[1]);
    });

    setText($('.text-link', hub), data.link);
    setText($('.gauge__text small', hub), data.gauge);
  }

  /* ---------- Arabic content ---------- */
  const ARABIC = {
    title: 'فيينا المدينة الذكية — ذكاء حضري متكامل',
    description: 'فيينا المدينة الذكية — عرض أكاديمي للتنقل الحضري المتكامل والبيئة الدائرية والحوكمة المفتوحة والإسكان الاجتماعي ومؤشرات الأداء ISO 37120/37122. ماستر 1 هندسة المدن الذكية، جامعة يحيى فارس بالمدية.',

    planning: {
      kicker: 'أطلس فيينا الحضري',
      title: 'المدينة في المخطط',
      tabs: ['خطة 2035', 'تخصيص الأراضي', 'أقمار صناعية'],
      tablist: 'طبقات التخطيط الحضري',
      pdau: {
        kicker: 'مخطط فيينا · التنمية الرئيسية',
        title: 'STEP 2035 — مخطط التنمية الرئيسي',
        fs: 'تكبير مخطط التنمية الرئيسي',
        figure: 'افتح مخطط التنمية الرئيسي PDAU بحجم الشاشة',
        badge: 'مخطط التنمية المدينة (STEP 2035) — المخطط الرئيسي الاستراتيجي',
        caption: ['المصدر: مدينة فيينا — مخطط فيينا (Wien-Plan) · مخطط التنمية المدينة 2035 (MA 18)', 'انقر على الصورة للتكبير بملء الشاشة'],
        alt: 'مخطط التنمية الحضرية الأصلي لمدينة فيينا STEP 2035 يعرض محاور التطور متعددة المراكز والبنية الحضرية والممرات الخضراء',
        facts: [['أحياء', '23'], ['الحياد المناخي', '2040'], ['محاور استراتيجية', '5']]
      },
      pos: {
        kicker: 'مخطط تخصيص الأراضي · استخدام الأرض',
        title: 'تخصيص الأراضي والمناطق التفصيلي',
        fs: 'تكبير مخطط تخصيص الأراضي',
        figure: 'افتح مخطط تخصيص الأراضي POS بحجم الشاشة',
        badge: 'مخطط تخصيص وبناء الأراضي (MA 21) — تخصيص على مستوى القطعة',
        caption: ['المصدر: بيانات مدينة فيينا المفتوحة — مخطط التخصيص والبناء (MA 21), استخراج WMS', 'انقر على الصورة للتكبير بملء الشاشة'],
        alt: 'استخراج أصلي من مخطط تصنيف الأراضي لمدينة فيينا يعرض توزيع القطع والألوان العمرانية وقواعد البناء',
        facts: [['فئات التخصيص', '5'], ['حصة الاستخدام المختلط', '62%'], ['المساحات الخضراء', '53%']]
      },
      map: {
        kicker: 'Esri World Imagery · Leaflet',
        title: 'خريطة الأقمار الصناعية والنقل المباشر',
        fs: 'تكبير الخريطة التفاعلية',
        label: 'خريطة أقمار صناعية تفاعلية لفيينا مع نقاط الاهتمام الذكية',
        badge: 'صور الأقمار الصناعية · Esri World Imagery — طبقة معالم قابلة للتكبير',
        toggles: ['محطة شببيتلاو', 'المحطة المركزية', 'سيستادت أسبيرن'],
        legend: ['الطاقة', 'التنقل', 'الحياة', 'الحوكمة'],
        hint: 'انقر على الخريطة لعرضها بحجم الشاشة'
      },
      foot: 'طبقات تخطيط تفاعلية · فيينا 48.2082° شمالًا'
    },

    qr: {
      kicker: 'الوصول المباشر إلى العرض',
      title: 'مسح الرابط',
      steps: [
        'امسح الرمز بكاميرا هاتفك',
        'تابع العرض مباشرة على جهازك',
        'بدّل بين العربية وEN من الترويسة'
      ],
      hint: 'رمز QR يتحدّث تلقائيًا إلى عنوان الموقع الفعلي'
    },

    mobility: {
      header: {
        eyebrow: '02 — التنقل الذكي',
        title: 'شبكة واحدة. <span class="text-gradient">لكل وسيلة.</span>',
        lead: 'منظومة تنقل متكاملة واحدة تُنسَّق فيها الترام والمترو والدراجات والسيارات المشتركة والمشي عبر تعرفة واحدة وتطبيق واحد وطبقة بيانات آنية واحدة.'
      },
      cards: [
        {
          title: 'ترام فينر لينين الكهربائي',
          specLabel: ['التقنية', 'السعة', 'البنية التحتية'],
          specs: [
            ['التقنية', 'جرّ كهربائي أخضر 100%'],
            ['السعة', 'أكثر من 280 راكبًا لكل وحدة'],
            ['البنية التحتية', '28 خطًا · شبكة تتجاوز 500 كم']
          ],
          tag: 'سكك',
          alt: 'ترام حديث تابع لفينر لينين في أحد شوارع فيينا'
        },
        {
          title: 'مشاركة الدراجات الذكية WienMobil',
          specs: [
            ['الأسطول', 'أكثر من 3,000 دراجة ذكية بتتبع GPS'],
            ['التكامل', 'فتح رقمي عبر تطبيق واحد'],
            ['النطاق', 'أكثر من 240 محطة في الأحياء الـ23']
          ],
          tag: 'نشط',
          alt: 'محطة مشاركة دراجات WienMobil في فيينا'
        },
        {
          title: 'محطات النقل متعدد الوسائط (U-Bahn / الترام)',
          specs: [
            ['المزامنة', 'مصفوفة وصول آنية بإنترنت الأشياء'],
            ['التبادل', 'زمن تحويل أقل من 3 دقائق'],
            ['التغطية', '95% من السكان على بعد 300 م من محطة']
          ],
          tag: 'تبادل',
          alt: 'قطار مترو فيينا يصل إلى المحطة'
        },
        {
          title: 'البنية العامة لشحن السيارات الكهربائية TANKE',
          specs: [
            ['شبكة الشحن', 'أكثر من 1,000 نقطة شحن عامة'],
            ['مصدر الطاقة', 'طاقة متجددة معتمدة 100%'],
            ['النمط', 'مشاركة سيارات كهربائية وشحن أساطيل ذكي']
          ],
          tag: 'كهربائي',
          alt: 'سيارة كهربائية متصلة بنقطة شحن عامة'
        }
      ],
      hub: {
        kicker: 'منصة متكاملة',
        title: 'تنقل حضري متكامل متعدد الوسائط',
        text: 'تجعل فيينا النقل العام الخيار الافتراضي. توفّر <strong>بطاقة النقل السنوية بـ365 يورو</strong> تنقلًا غير محدود داخل المدينة بأقل من يورو واحد يوميًا. ويربط <strong>WienMobil</strong> المترو والترام والحافلة والدراجة والسيارة المشتركة في حساب واحد، بينما تحافظ بيانات الوصول الآنية عبر إنترنت الأشياء على قابلية توقع كل تحويل. ويغلق كهرباء أسطول الترام والحافلات فجوة الانبعاثات المتبقية.',
        stats: [['365€', 'بطاقة نقل سنوية'], ['73%', 'نقل عام · دراجة · مشي'], ['تطبيق واحد', 'تكامل WienMobil'], ['100%', 'جرّ ترام كهربائي']],
        link: 'راجع مؤشرات التنقل',
        gauge: 'حصة التنقل'
      }
    },

    environment: {
      header: {
        eyebrow: '03 — البيئة الذكية',
        title: 'مدينة دائرية، <span class="text-gradient text-gradient--green">تعمل بمواردها الذاتية</span>.',
        lead: 'تتحوّل النفايات المتبقية إلى تدفئة للمناطق، وتصبح سهول الدانوب بنية تحتية مناخية، ويبقى أكثر من نصف المدينة مساحة خضراء.'
      },
      cards: [
        {
          title: 'محطة شببيتلاو لتحويل النفايات إلى طاقة',
          specs: [
            ['العملية', 'تنظيف متعدد المراحل لغاز العادم'],
            ['الإنتاج', 'استرجاع حراري دائري'],
            ['الشبكة', 'تدفئة المناطق Fernwärme Wien']
          ],
          tag: 'دائري',
          alt: 'محطة شببيتلاو لتحويل النفايات إلى طاقة في فيينا'
        },
        {
          title: 'جزيرة الدانوب والأراضي الرطبة الحضرية',
          specs: [
            ['الوظيفة', 'نظام دفاع طبيعي ضد الفيضانات'],
            ['البيئة', 'تنوع حيوي وممر تبريد'],
            ['النطاق', 'جزيرة ترفيهية بطول 21 كم']
          ],
          tag: 'أزرق-أخضر',
          alt: 'مشهد حديقة خضراء في جزيرة الدانوب بفيينا'
        },
        {
          title: 'مبادرة توسيع الطاقة الشمسية الحضرية',
          specs: [
            ['التمويل', 'محطات كهروضوئية بتمويل المواطنين'],
            ['الإنتاج', 'كهرباء متجددة 100%'],
            ['الشبكة', 'توليد حضري موزع']
          ],
          tag: 'شمسي',
          alt: 'ألواح شمسية كهروضوئية تولّد طاقة متجددة'
        },
        {
          title: 'إدارة النفايات الذكية وتوجيه المسارات بالمستشعرات',
          specs: [
            ['الاستشعار', 'شبكة مستشعرات مستوى الامتلاء'],
            ['العمليات', 'تحسين ديناميكي للمسارات'],
            ['النموذج', 'استرجاع دائري للمواد']
          ],
          tag: 'نفايات',
          alt: 'حاويات فرز نفايات ملونة لإعادة التدوير'
        }
      ],
      hub: {
        kicker: 'الاقتصاد الدائري',
        title: 'تحويل النفايات إلى طاقة وتدفئة المناطق',
        text: 'تنظر فيينا إلى النفايات المتبقية كمورد حراري. تستعيد <strong>شببيتلاو</strong> الحرارة من النفايات غير القابلة لإعادة التدوير وتغذيها في شبكة <strong>Fernwärme Wien</strong>، باستخدام تنظيف متعدد المراحل لغاز العادم للوفاء بحدود الانبعاثات الصارمة. وتوفّر <strong>جزيرة الدانوب</strong> والأراضي الرطبة الحضرية الحماية من الفيضانات والتنوع الحيوي، وتوسّع محطات الطاقة الشمسية الممولة من المواطنين التوليد المتجدد، ويغلق التوجيه القائم على المستشعرات حلقة المواد.',
        stats: [['>50%', 'مساحة حضرية خضراء'], ['~40%', 'حصة تدفئة المناطق'], ['3 مراحل', 'تنظيف غاز العادم'], ['2040', 'الحياد المناخي']],
        link: 'راجع المؤشرات البيئية',
        gauge: 'مساحة خضراء'
      }
    },

    governance: {
      header: {
        eyebrow: '04 — الحوكمة الذكية',
        title: 'حكومة كـ<span class="text-gradient">منصة مفتوحة</span>.',
        lead: 'تحوّل البيانات المفتوحة والميزانية التشاركية وتقارير الأداء الشفافة الإدارة البلدية إلى خدمة عامة قابلة للقياس.'
      },
      cards: [
        {
          title: 'منصة البيانات المفتوحة OGD Wien',
          specs: [
            ['الكتالوج', 'أكثر من 300 مجموعة بيانات بلدية'],
            ['الوصول', 'واجهات REST مجانية'],
            ['الصيغة', 'قابلة للقراءة آليًا وموثقة']
          ],
          tag: 'بيانات مفتوحة',
          alt: 'لوحة تحليلات تعرض بيانات أداء بلدية'
        },
        {
          title: 'الميزانية التشاركية والتصويت الرقمي',
          specs: [
            ['المدخلات', 'مقترحات من المواطنين'],
            ['الهوية', 'مشاركة رقمية موثقة'],
            ['النطاق', 'توزيع على مستوى الأحياء']
          ],
          tag: 'مشاركة',
          alt: 'مواطن يدلي بصوته في تصويت ديمقراطي'
        },
        {
          title: 'لوحة الشفافية البلدية',
          specs: [
            ['الميزانية', 'تقارير مالية مفتوحة'],
            ['المشتريات', 'تتبع العقود والمناقصات'],
            ['الأداء', 'مؤشرات خدمات الأحياء']
          ],
          tag: 'شفافية',
          alt: 'شبكة بيانات عالمية معروضة فوق الأرض ليلًا'
        },
        {
          title: 'الخدمات الرقمية للمواطنين وWienBot',
          specs: [
            ['التوفر', 'خدمة ذكية 24/7'],
            ['الوصول', 'واجهة متعددة اللغات'],
            ['التوجيه', 'فرز ذكي للطلبات']
          ],
          tag: 'رقمي',
          alt: 'مواطنون وموظفون يستخدمون الخدمات العامة الرقمية'
        }
      ],
      hub: {
        kicker: 'المساءلة العامة',
        title: 'حوكمة مفتوحة وتشاركية وشفافة',
        text: 'تنشر فيينا بياناتها البلدية كخدمة عامة. توفّر <strong>OGD Wien</strong> مجموعات بيانات وواجهات مفتوحة قابلة للقراءة آليًا؛ وتوسّع الميزانية التشاركية و<strong>التصويت الرقمي</strong> صناعة القرار خارج يوم الانتخاب؛ وتكشف لوحات الشفافية الميزانيات والمشتريات وأداء الخدمات؛ ويتولى <strong>WienBot</strong> طلبات المواطنين الروتينية على مدار الساعة. وتصبح الحوكمة قابلة للتتبع والقياس والاستجابة.',
        stats: [['300+', 'مجموعات بيانات مفتوحة'], ['100%', 'وصول مفتوح للواجهات'], ['23', 'حيًا مشاركًا'], ['24/7', 'خدمة رقمية للمواطن']],
        link: 'راجع مؤشرات الحوكمة',
        gauge: 'وصول مفتوح'
      }
    },

    living: {
      header: {
        eyebrow: '05 — الحياة الذكية',
        title: 'جودة الحياة، <span class="text-gradient text-gradient--gold">مصممة كبنية تحتية</span>.',
        lead: 'الإسكان الميسور والبناء الخشبي والرعاية الصحية الشاملة والأحياء المتكاملة تجعل جودة الحياة في فيينا نتيجة هيكلية لا شعارًا.'
      },
      cards: [
        {
          title: 'نموذج الإسكان الاجتماعي Gemeindebau',
          specs: [
            ['المخزون', '220,000 وحدة بلدية'],
            ['الحصة', '62% إسكان ميسور'],
            ['النموذج', 'مجتمعات مختلطة الدخل']
          ],
          tag: 'إسكان',
          alt: 'مبنى إسكان اجتماعي كلاسيكي من طراز Gemeindebau في فيينا'
        },
        {
          title: 'بناء HoHo Aspern الخشبي',
          specs: [
            ['الارتفاع', '24 طابقًا · 84 م'],
            ['الهيكل', '75% إنشاء خشبي'],
            ['الكربون', 'تخزين كربون طويل الأمد']
          ],
          tag: 'خشب',
          alt: 'برج HoHo Wien الخشبي في أسبيرن'
        },
        {
          title: 'الرعاية الصحية العامة الشاملة',
          specs: [
            ['التغطية', 'تأمين صحي عام 100%'],
            ['الشبكة', 'مستشفى AKH وعيادات الأحياء'],
            ['النموذج', 'وقاية وفرز رقمي']
          ],
          tag: 'صحة',
          alt: 'المدخل الرئيسي للمستشفى العام في فيينا'
        },
        {
          title: 'أحياء الـ15 دقيقة والفضاء العام',
          specs: [
            ['الوصول', 'الاحتياجات الأساسية خلال 15 دقيقة'],
            ['التصميم', 'أحياء قابلة للمشي ومختلطة الاستخدام'],
            ['الاجتماعي', 'مدارس وحدائق وخدمات قريبة']
          ],
          tag: 'قرب',
          alt: 'حي حديث صديق للمشي في سيستادت أسبيرن'
        }
      ],
      hub: {
        kicker: 'البنية الاجتماعية',
        title: 'حياة ميسورة وصحية وعالية الجودة',
        text: 'تُهندَس جودة الحياة في فيينا عبر الإسكان. يعيش أكثر من ستة من كل عشرة سكان في مساكن مدعومة أو بلدية، بما في ذلك <strong>Gemeindebau</strong> التاريخي والأحياء التعاونية الجديدة. ويُظهر <strong>HoHo Wien</strong> في أسبيرن أن البناء الخشبي المرتفع يمكنه تخزين الكربون على نطاق واسع، بينما تُبقي الرعاية الصحية العامة الشاملة و<strong>أحياء الـ15 دقيقة</strong> الاحتياجات اليومية على مسافة قريبة.',
        stats: [['62%', 'إسكان ميسور'], ['220 ألف', 'شقة بلدية'], ['100%', 'تغطية صحية'], ['15 دقيقة', 'للاحتياجات اليومية']],
        link: 'راجع مؤشرات الإسكان',
        gauge: 'ميسور'
      }
    },

    impact: {
      header: {
        eyebrow: '06 — الأثر والمعايير',
        title: 'مقاسة وفق <span class="text-gradient">معايير دولية</span>.',
        lead: 'يُؤطَّر أداء فيينا عبر عائلتي مؤشرات ISO 37120 وISO 37122، مدعومًا بتصنيفات عالمية لجودة الحياة واستراتيجيات المدن الذكية.'
      },
      standards: [
        {
          status: 'إطار متوافق',
          title: 'مدن ومجتمعات مستدامة',
          text: 'مؤشرات خدمات المدن وجودة الحياة عبر الاقتصاد والتعليم والطاقة والبيئة والصحة والسلامة والمأوى والنقل.',
          foot: 'تغطية المؤشرات الأساسية'
        },
        {
          status: 'إطار متوافق',
          title: 'مؤشرات المدن الذكية',
          text: 'مؤشرات المدن الذكية التي تغطي الاتصال والبيانات المفتوحة والنقل الذكي والخدمات العامة الرقمية والإدارة الحضرية المتكاملة.',
          foot: 'تغطية المؤشرات الذكية'
        }
      ],
      rankingTitle: 'اعتراف عالمي',
      rankings: [
        ['مؤشر ميرسر لجودة الحياة', 'تصنيف دولي لجودة الحياة'],
        ['مؤشر استراتيجية المدينة الذكية', 'مرجع استراتيجي بلدي']
      ],
      rankingNote: 'تعكس تصنيفات فيينا أداءً مستدامًا لا نتيجة سنة واحدة.',
      summary: ['محاور استراتيجية', 'مؤشرات على المسار أو فوقه', 'قيد التقدم الفعلي', 'أفق مستهدف'],
      panelKicker: 'مصفوفة مؤشرات أكاديمية',
      panelTitle: 'لوحة الأداء الاستراتيجي',
      panelMeta: 'خط الأساس ← مسار 2030',
      tableHead: ['المحور الاستراتيجي', 'مؤشر الأداء (KPI)', 'القيمة الحالية', 'الهدف (2030)', 'الحالة'],
      rows: [
        ['التنقل', 'حصة التنقل: النقل العام والمشي والدراجات', 'على المسار'],
        ['البيئة', 'تغطية المساحات الخضراء الحضرية', 'متجاوز'],
        ['المناخ', 'خفض انبعاثات غازات الدفيئة البلدية (مقارنة بـ1990)', 'قيد التقدم'],
        ['الطاقة', 'تكامل الطاقة المتجددة في تدفئة المناطق الذكية', 'قيد التقدم'],
        ['الإسكان', 'توافر الإسكان الميسور والاجتماعي', 'مرجع عالمي']
      ],
      dataLabels: ['المحور الاستراتيجي', 'مؤشر الأداء', 'القيمة الحالية', 'الهدف (2030)', 'الحالة'],
      method: '<strong>ملاحظة منهجية.</strong> تجميع أكاديمي للمؤشرات المعروضة في هذا المشروع. توفّر ISO 37120 وISO 37122 إطار القياس؛ وهذه اللوحة ليست ادعاء شهادة. قد تختلف القيم البلدية الحالية عن الأرقام المعروضة هنا.'
    },

    academic: {
      eyebrow: 'جامعة يحيى فارس بالمدية',
      title: 'عرض مشروع أكاديمي',
      subtitle: '<strong>فيينا المدينة الذكية</strong> — الابتكار، الاستدامة، جودة الحياة',
      labels: ['المؤسسة', 'الكلية والقسم', 'البرنامج', 'الوحدة', 'أستاذ المادة', 'إعداد وتقديم'],
      values: [
        'جامعة يحيى فارس بالمدية',
        'كلية التكنولوجيا — هندسة معمارية، عمران ومهن المدينة (هندسة المدن الذكية)',
        'ماستر 1: هندسة المدن الذكية <span>(السنة الأكاديمية: 2026 – 2027)</span>',
        'التخطيط الحضري التشغيلي والبنية التحتية للنقل (OUPTI) وأساسيات المدينة الذكية (SCF)',
        'د. خوخي',
        'طهراوي إكرام'
      ],
      footer: 'السنة الأكاديمية 2026 – 2027 · دراسة حالة فيينا المدينة الذكية'
    },

    pins: [
      {
        id: 'spittelau',
        lat: 48.2354, lng: 16.3564, color: 'green',
        en: { name: 'Spittelau Waste-to-Energy', desc: 'District heat and circular energy' },
        ar: { name: 'شببيتلاو لتحويل النفايات إلى طاقة', desc: 'تدفئة المناطق والطاقة الدائرية' }
      },
      {
        id: 'cityhall',
        lat: 48.2082, lng: 16.3738, color: 'violet',
        en: { name: 'Innere Stadt · City Hall', desc: 'Open government and civic data' },
        ar: { name: 'البلدة الداخلية · دار البلدية', desc: 'الحكومة المفتوحة والبيانات المدنية' }
      },
      {
        id: 'donauinsel',
        lat: 48.2295, lng: 16.4100, color: 'green',
        en: { name: 'Donauinsel & Wetlands', desc: 'Flood protection and cooling' },
        ar: { name: 'جزيرة الدانوب والأراضي الرطبة', desc: 'الحماية من الفيضانات والتبريد' }
      },
      {
        id: 'aspern',
        lat: 48.2255, lng: 16.5070, color: 'gold',
        en: { name: 'Seestadt Aspern', desc: 'Timber housing and 15-minute living' },
        ar: { name: 'سيستادت أسبيرن', desc: 'الإسكان الخشبي وحياة الـ15 دقيقة' }
      },
      {
        id: 'hbf',
        lat: 48.1850, lng: 16.3760, color: 'cyan',
        en: { name: 'Vienna Hauptbahnhof', desc: 'Multimodal rail and transit hub' },
        ar: { name: 'محطة فيينا المركزية', desc: 'محور السكك والتنقل المتعدد' }
      },
      {
        id: 'prater',
        lat: 48.2167, lng: 16.4000, color: 'green',
        en: { name: 'Prater Green Belt', desc: 'Urban biodiversity corridor' },
        ar: { name: 'حزام براتر الأخضر', desc: 'ممر التنوع الحيوي الحضري' }
      }
    ]
  };

  function applyArabic() {
    document.title = ARABIC.title;
    if (metaDescription) metaDescription.setAttribute('content', ARABIC.description);

    /* Chrome, navigation and footer identity */
    setText('.skip-link', 'انتقل إلى المحتوى الرئيسي');
    $$('.nav__link').forEach((link) => {
      const labels = {
        '#home': 'الرئيسية', '#about': 'عن فيينا', '#mobility': 'التنقل',
        '#environment': 'البيئة', '#governance': 'الحوكمة', '#living': 'الحياة', '#impact': 'الأثر'
      };
      if (labels[link.getAttribute('href')]) setText(link, labels[link.getAttribute('href')]);
    });
    setText('.nav__actions .btn--nav span', 'بطاقة المشروع');
    setAttr('#navLinks', 'aria-label', 'التنقل الرئيسي');
    setAttr('.brand', 'aria-label', 'فيينا المدينة الذكية — الرئيسية');
    setAttr('.hero__metrics', 'aria-label', 'فيينا في لمحة');
    setAttr('#toTop', 'aria-label', 'العودة إلى الأعلى');
    setAttr('#videoFullscreen', 'aria-label', 'ملء شاشة الفيلم');
    setAttr('#videoFullscreen', 'title', 'ملء الشاشة');
    setAttr('#videoClose', 'title', 'إغلاق');
    setAttr('#lightboxZoomIn', 'title', 'تكبير');
    setAttr('#lightboxZoomOut', 'title', 'تصغير');
    setAttr('#lightboxFs', 'title', 'ملء الشاشة');
    setAttr('#lightboxClose', 'title', 'إغلاق');

    const gaugeLabels = [
      '73 بالمئة حصة تنقل مستدامة',
      '53 بالمئة مساحات خضراء حضرية',
      '100 بالمئة وصول مفتوح للبيانات',
      '62 بالمئة إسكان ميسور'
    ];
    $$('.gauge').forEach((gauge, index) => {
      if (gaugeLabels[index]) setAttr(gauge, 'aria-label', gaugeLabels[index]);
    });
    $$('.brand__text').forEach((el) => setHTML(el, 'فيينا <em>المدينة الذكية</em>'));

    /* Hero */
    setHTML('.eyebrow-pill', '<span class="pulse-dot" aria-hidden="true"></span> فيينا المدينة الذكية · دراسة أكاديمية 2026');
    setHTML('.hero__title', '<span class="hero__title-line">فيينا</span><span class="hero__title-line hero__title-line--accent">المدينة الذكية</span>');
    setText('.hero__tagline', 'الابتكار · الاستدامة · جودة الحياة');
    setText('.hero__intro', 'منظومة حضرية متكاملة تُهندَس فيها الحركة متعددة الوسائط والطاقة الدائرية والحوكمة المفتوحة والإسكان الاجتماعي كبنية تحتية عامة واحدة.');
    setText('#watch-video-btn', 'شاهد الفيلم');
    setText('.hero__actions .btn--glass', 'استكشف الإطار');
    setText('.scroll-cue__text', 'مرّر');
    setAttr('.scroll-cue', 'aria-label', 'مرّر إلى قسم عن فيينا');

    const heroMetrics = [
      ['السكان', '23 حيًا بلديًا'],
      ['المساحة الحضرية', 'على ضفاف الدانوب'],
      ['الحصة المستدامة للتنقل', 'النقل العام · الدراجات · المشي'],
      ['الحياد المناخي', 'الأفق البلدي المستهدف']
    ];
    $$('.hero-metric').forEach((metric, index) => {
      if (!heroMetrics[index]) return;
      setText($('.hero-metric__label', metric), heroMetrics[index][0]);
      setText($('.hero-metric__note', metric), heroMetrics[index][1]);
    });

    /* About */
    setText('#about .eyebrow', '01 — عن فيينا');
    setHTML('#aboutTitle', 'عاصمة صُمِّمت من أجل <span class="text-gradient">جودة الحياة</span>.');
    setText('#about .section-lead', 'تجمع فيينا بين مساحة حضرية مدمجة وواحدة من أكثر البنى التحتية العامة نضجًا في العالم. ويتعامل إطارها للمدينة الذكية مع العمل المناخي والتماسك الاجتماعي والخدمات الرقمية باعتبارها منظومة تشغيل حضرية واحدة.');
    setText('.about-copy__lead', 'مليونان من السكان. أربعمائة وأربعة عشر كيلومترًا مربعًا. استراتيجية واحدة متكاملة لمدينة محايدة مناخيًا وشاملة اجتماعيًا بحلول 2040.');
    setText('.about-copy__body', 'النهج البلدي منهجي عمدًا: سياسة الإسكان تدعم التنقل، والفضاء العام يمتص الحرارة ومياه الأمطار، والبيانات المفتوحة تحسّن تقديم الخدمات، وطاقة المناطق تحوّل النفايات المتبقية إلى حرارة. وكل مجال سياساتي يُقاس ويُنشر ويُعدّل وفق مؤشرات مشتركة.');

    const metricCards = $$('#about .metric-card');
    const metricCopy = [
      ['السكان', null, 'سكان داخل الحدود البلدية'],
      ['المساحة', null, 'إقليم حضري مدمج ومتعدد المراكز'],
      ['الرؤية الحضرية', 'الحياد المناخي 2040', 'الأفق الاستراتيجي لفيينا المدينة الذكية'],
      ['جودة الحياة', 'مؤشر جودة حياة مرتفع', 'المرتبة الأولى في مؤشر ميرسر لجودة الحياة']
    ];
    metricCopy.forEach((copy, index) => {
      if (!metricCards[index]) return;
      setText($('.metric-card__label', metricCards[index]), copy[0]);
      if (copy[1]) setText($('.metric-card__value', metricCards[index]), copy[1]);
      setText($('.metric-card__note', metricCards[index]), copy[2]);
    });
    setText('.about-copy__source', 'تُعرض الأرقام الأساسية للتحليل الأكاديمي؛ وتُحدَّث القيم الحالية من قبل مدينة فيينا وأطر المؤشرات الدولية.');

    /* Planning hub */
    const plan = ARABIC.planning;
    setText('#planningHub .planning-hub__kicker', plan.kicker);
    setText('#planningTitle', plan.title);
    setAttr('#planningHub .planning-tabs', 'aria-label', plan.tablist);
    $$('#planningHub .planning-tab__label').forEach((label, index) => {
      if (plan.tabs[index]) setText(label, plan.tabs[index]);
    });

    const pdau = plan.pdau;
    const pdauPanel = $('#panel-pdau');
    setText($('.plan-panel__kicker', pdauPanel), pdau.kicker);
    setText($('h4', pdauPanel), pdau.title);
    setText($('.plan-fs span', pdauPanel), 'تكبير الشاشة');
    setAttr($('.plan-fs', pdauPanel), 'aria-label', pdau.fs);
    setText($('.plan-badge span', pdauPanel), pdau.badge);
    setText($('.plan-caption__source', pdauPanel), pdau.caption[0]);
    setText($('.plan-caption__zoom', pdauPanel), pdau.caption[1]);
    setAttr($('.plan-img', pdauPanel), 'alt', pdau.alt);
    setAttr($('.plan-img', pdauPanel), 'data-lightbox-alt', pdau.alt);
    $$('.plan-facts li', pdauPanel).forEach((item, index) => {
      if (!pdau.facts[index]) return;
      setText($('strong', item), pdau.facts[index][1]);
      setText($('span', item), pdau.facts[index][0]);
    });

    const pos = plan.pos;
    const posPanel = $('#panel-pos');
    setText($('.plan-panel__kicker', posPanel), pos.kicker);
    setText($('h4', posPanel), pos.title);
    setText($('.plan-fs span', posPanel), 'تكبير الشاشة');
    setAttr($('.plan-fs', posPanel), 'aria-label', pos.fs);
    setText($('.plan-badge span', posPanel), pos.badge);
    setText($('.plan-caption__source', posPanel), pos.caption[0]);
    setText($('.plan-caption__zoom', posPanel), pos.caption[1]);
    setAttr($('.plan-img', posPanel), 'alt', pos.alt);
    setAttr($('.plan-img', posPanel), 'data-lightbox-alt', pos.alt);
    $$('.plan-facts li', posPanel).forEach((item, index) => {
      if (!pos.facts[index]) return;
      setText($('strong', item), pos.facts[index][1]);
      setText($('span', item), pos.facts[index][0]);
    });

    const mapCopy = plan.map;
    const mapPanel = $('#panel-map');
    setText($('.plan-panel__kicker', mapPanel), mapCopy.kicker);
    setText($('h4', mapPanel), mapCopy.title);
    setText($('.plan-fs span', mapPanel), 'تكبير الشاشة');
    setAttr($('.plan-fs', mapPanel), 'aria-label', mapCopy.fs);
    setAttr('#viennaMap', 'aria-label', mapCopy.label);
    setText($('.plan-badge span', mapPanel), mapCopy.badge);
    $$('.map-toolbar .map-toggle span', mapPanel).forEach((span, index) => {
      if (mapCopy.toggles[index]) setText(span, mapCopy.toggles[index]);
    });
    $$('.plan-map__foot .map-legend span', mapPanel).forEach((span, index) => {
      if (mapCopy.legend[index]) setText(span, mapCopy.legend[index]);
    });
    setText('.plan-map__hint', mapCopy.hint);
    setText('.planning-hub__foot > span:first-child', plan.foot);

    /* Live QR access card */
    setText('[data-i18n="qr.kicker"]', ARABIC.qr.kicker);
    setText('[data-i18n="qr.title"]', ARABIC.qr.title);
    $$('.qr-card__steps li span:last-child').forEach((span, index) => {
      if (ARABIC.qr.steps[index]) setText(span, ARABIC.qr.steps[index]);
    });
    setAttr('#qrImage', 'alt', 'رمز الاستجابة السريعة للوصول إلى العرض المباشر');
    setAttr('.qr-card__frame', 'title', ARABIC.qr.hint);

    /* Mobility, environment, governance, living */
    ['mobility', 'environment', 'governance', 'living'].forEach((key) => {
      const data = ARABIC[key];
      translateHeader('#' + key, data.header.eyebrow, data.header.title, data.header.lead);
      translateOrbitCards('#' + key, data.cards);
      translateHub('#' + key, data.hub);
    });

    /* Impact */
    const impact = ARABIC.impact;
    translateHeader('#impact', impact.header.eyebrow, impact.header.title, impact.header.lead);

    const standards = $$('#impact .standard-card');
    impact.standards.forEach((copy, index) => {
      if (!standards[index]) return;
      setText($('.standard-card__status', standards[index]), copy.status);
      setText($('h3', standards[index]), copy.title);
      setText($('p', standards[index]), copy.text);
      setText($('.standard-card__foot span', standards[index]), copy.foot);
    });

    setText('.ranking-card__kicker', impact.rankingTitle);
    const rankingRows = $$('.ranking-row');
    impact.rankings.forEach((copy, index) => {
      if (!rankingRows[index]) return;
      setText($('strong', rankingRows[index]), copy[0]);
      setText($('span', rankingRows[index]), copy[1]);
    });
    setText('.ranking-card__note', impact.rankingNote);
    $$('.impact-summary span').forEach((span, index) => {
      if (impact.summary[index]) setText(span, impact.summary[index]);
    });

    setText('.kpi-panel__kicker', impact.panelKicker);
    setText('.kpi-panel__head h3', impact.panelTitle);
    setText('.kpi-panel__meta', impact.panelMeta);

    const headCells = $$('.kpi-table thead th');
    impact.tableHead.forEach((copy, index) => {
      if (headCells[index]) setText(headCells[index], copy);
    });

    const bodyRows = $$('.kpi-table tbody tr');
    impact.rows.forEach((copy, index) => {
      const row = bodyRows[index];
      if (!row) return;
      setText($('.axis-tag', row), copy[0]);
      setText($('td:nth-child(2)', row), copy[1]);
      setText($('.status', row), copy[2]);
    });

    bodyRows.forEach((row) => {
      Array.from(row.children).forEach((cell, index) => {
        if (impact.dataLabels[index]) setAttr(cell, 'data-label', impact.dataLabels[index]);
      });
    });
    setHTML('.kpi-panel__foot p', impact.method);

    /* Academic card */
    setText('.academic-card__eyebrow', ARABIC.academic.eyebrow);
    setText('#academicTitle', ARABIC.academic.title);
    setHTML('.academic-card__subtitle', ARABIC.academic.subtitle);
    const detailRows = $$('.academic-details > div');
    ARABIC.academic.labels.forEach((label, index) => {
      if (!detailRows[index]) return;
      setText($('dt', detailRows[index]), label);
      setHTML($('dd', detailRows[index]), ARABIC.academic.values[index]);
    });
    setText('.academic-card__footer > span:nth-child(2)', ARABIC.academic.footer);

    /* Footer */
    setText('.footer__brand > p', 'دراسة أكاديمية للمنظومات الحضرية المتكاملة: التنقل متعدد الوسائط، الطاقة الدائرية، الحوكمة المفتوحة، الإسكان الاجتماعي، والأداء المقاس بمعايير.');
    const footerNavs = $$('.footer__grid nav.footer__col');
    if (footerNavs[0]) {
      setText($('h3', footerNavs[0]), 'التنقل');
      ['الرئيسية', 'عن فيينا', 'التنقل الذكي', 'البيئة الذكية'].forEach((label, index) => {
        const link = $$('a', footerNavs[0])[index];
        if (link) setText(link, label);
      });
      setAttr(footerNavs[0], 'aria-label', 'تنقل التذييل');
    }
    if (footerNavs[1]) {
      setText($('h3', footerNavs[1]), 'الوحدات');
      ['الحوكمة الذكية', 'الحياة الذكية', 'الأثر ومؤشرات الأداء', 'البطاقة الأكاديمية'].forEach((label, index) => {
        const link = $$('a', footerNavs[1])[index];
        if (link) setText(link, label);
      });
      setAttr(footerNavs[1], 'aria-label', 'تنقل التذييل الثانوي');
    }
    const metaCol = $('.footer__col--meta');
    if (metaCol) {
      setText($('h3', metaCol), 'السياق الأكاديمي');
      const paragraphs = $$('p', metaCol);
      if (paragraphs[0]) setHTML(paragraphs[0], 'ماستر 1: هندسة المدن الذكية<br />2026 – 2027');
      if (paragraphs[1]) setHTML(paragraphs[1], 'جامعة يحيى فارس بالمدية<br />كلية التكنولوجيا — هندسة معمارية، عمران ومهن المدينة');
      setText($('.footer__credit-link', metaCol), 'اعتمادات الصور');
    }
    setHTML('.footer__bottom p:first-child', '© <span id="year">2026</span> فيينا المدينة الذكية · عرض أكاديمي من إعداد طهراوي إكرام.');
    setText('.footer__note', 'تُعرض الأرقام للنقاش الأكاديمي. تحقق من القيم الحالية لدى مدينة فيينا ومصادر مؤشرات ISO.');

    /* Video modal */
    setHTML('.video-modal__eyebrow', '<span></span> فيينا المدينة الذكية · فيلم');
    setText('#videoModalTitle', 'المدينة في حركة');
    setText('#videoModalDesc', 'الابتكار والاستدامة وجودة الحياة — نظرة عامة على المنظومة الحضرية المتكاملة في فيينا.');
    setText('.video-fallback h3', 'البث المرئي غير متاح');
    setText('.video-fallback p', 'تعذّر تحميل الفيلم المحلي. تحقق من الاتصال أو أعد محاولة البث.');
    setText('#videoRetry', 'إعادة محاولة البث');
    setText('.video-modal__foot > p:first-child', 'فيينا المدينة الذكية · الابتكار، الاستدامة، جودة الحياة');
    setHTML('.video-modal__hint', 'اضغط <kbd>Esc</kbd> للإغلاق · يتوقف الصوت عند الخروج');
    setAttr('#videoClose', 'aria-label', 'إغلاق الفيلم');
    setAttr('#videoModal', 'aria-label', 'فيلم فيينا المدينة الذكية');

    /* Lightbox chrome */
    setHTML('.lightbox__eyebrow', '<span aria-hidden="true"></span> نافذة العرض');
    setHTML('#lightboxHint', 'اضغط <kbd>Esc</kbd> أو انقر على الخلفية للإغلاق');
    setAttr('#lightboxClose', 'aria-label', 'إغلاق المعاينة');
    setAttr('#lightboxZoomIn', 'aria-label', 'تكبير');
    setAttr('#lightboxZoomOut', 'aria-label', 'تصغير');
    setAttr('#lightboxFs', 'aria-label', 'تبديل ملء الشاشة');
    setAttr('#lightbox', 'aria-label', 'معاينة العرض');

    refreshMapLocale();
    updatePanelFsLabels();
  }

  function setLanguage(lang, options) {
    const opts = options || {};
    const next = lang === 'ar' ? 'ar' : 'en';

    if (lightboxOpen) closeLightbox();

    if (next === 'ar') {
      applyArabic();
    } else {
      restoreEnglish();
      document.title = EN_TITLE;
      if (metaDescription) metaDescription.setAttribute('content', EN_DESCRIPTION);
    }

    currentLang = next;
    htmlRoot.lang = next;
    htmlRoot.dir = next === 'ar' ? 'rtl' : 'ltr';
    htmlRoot.classList.toggle('lang-ar', next === 'ar');

    if (langSwitch) {
      langSwitch.dataset.active = next;
      langSwitch.setAttribute('aria-label', next === 'ar'
        ? 'التبديل إلى الإنجليزية · العربية / EN'
        : 'Switch to Arabic · العربية / EN');
      langSwitch.setAttribute('title', next === 'ar' ? 'تغيير اللغة' : 'Switch language');
    }

    if (navToggle) {
      const expanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-label', next === 'ar'
        ? (expanded ? 'إغلاق قائمة التنقل' : 'فتح قائمة التنقل')
        : (expanded ? 'Close navigation menu' : 'Open navigation menu'));
    }

    refreshMapLocale();
    updatePanelFsLabels();
    renderLiveQR();

    if (opts.persist !== false) {
      try { localStorage.setItem('vsc-lang', next); } catch (_) { /* no-op */ }
    }
  }

  if (langSwitch) {
    langSwitch.addEventListener('click', () => {
      setLanguage(currentLang === 'ar' ? 'en' : 'ar');
    });
  }

  /* ------------------------------------------------------------
     9. URBAN PLANNING HUB · TABS + LEAFLET
     ------------------------------------------------------------ */
  const planningTabs = $$('.planning-tab');
  const planPanels = {
    pdau: $('#panel-pdau'),
    pos: $('#panel-pos'),
    map: $('#panel-map')
  };

  let viennaMapInstance = null;
  let viennaMarkers = [];

  function pinIcon(color) {
    const tones = {
      green: 'var(--green)',
      violet: 'var(--violet)',
      gold: 'var(--gold)',
      cyan: 'var(--cyan)'
    };
    const tone = tones[color] || 'var(--cyan)';
    return window.L.divIcon({
      className: 'vienna-pin',
      html: '<span class="vienna-pin__pulse" style="--pin:' + tone + '"></span>' +
            '<span class="vienna-pin__dot" style="--pin:' + tone + '"></span>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
      popupAnchor: [0, -12]
    });
  }

  function pinPopup(pin) {
    const copy = currentLang === 'ar' ? pin.ar : pin.en;
    return '<strong>' + copy.name + '</strong><span>' + copy.desc + '</span>';
  }

  function addViennaMarkers(map) {
    return ARABIC.pins.map((pin) => {
      const marker = window.L.marker([pin.lat, pin.lng], {
        icon: pinIcon(pin.color),
        title: currentLang === 'ar' ? pin.ar.name : pin.en.name,
        riseOnHover: true
      });
      marker.bindPopup(pinPopup(pin), { closeButton: true, maxWidth: 240 });
      marker.addTo(map);
      return marker;
    });
  }

  function refreshMapLocale() {
    if (viennaMapInstance && viennaMarkers.length) {
      ARABIC.pins.forEach((pin, index) => {
        const marker = viennaMarkers[index];
        if (!marker) return;
        marker.setPopupContent(pinPopup(pin));
        marker.options.title = currentLang === 'ar' ? pin.ar.name : pin.en.name;
        if (marker.getElement()) marker.getElement().setAttribute('title', marker.options.title);
      });
    }
    if (lightboxMapInstance) {
      // The presentation map is rebuilt with the active language when reopened.
    }
  }

  function addViennaBasemap(map) {
    /* Primary: high-resolution Esri World Imagery satellite tiles. */
    const tiles = window.L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Imagery &copy; <a href="https://www.esri.com/" target="_blank" rel="noopener">Esri</a>, Maxar, Earthstar Geographics',
        maxZoom: 19,
        maxNativeZoom: 18,
        crossOrigin: true
      }
    ).addTo(map);

    /* If imagery is unreachable, fall back to OpenStreetMap. */
    let failures = 0;
    tiles.on('tileerror', () => {
      failures += 1;
      if (failures !== 3) return;
      map.removeLayer(tiles);
      window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);
    });
  }

  /* Marker visibility, shared by the satellite tab toolbar. */
  const markerVisibility = {};

  function setMarkerVisibility(id, visible) {
    markerVisibility[id] = visible;
    const index = ARABIC.pins.findIndex((pin) => pin.id === id);
    if (index === -1) return true;
    const marker = viennaMarkers[index];
    if (!marker || !viennaMapInstance) return true;
    if (visible) {
      if (!viennaMapInstance.hasLayer(marker)) marker.addTo(viennaMapInstance);
    } else if (viennaMapInstance.hasLayer(marker)) {
      viennaMapInstance.removeLayer(marker);
    }
    return true;
  }

  function initMapToggles() {
    $$('.map-toggle').forEach((button) => {
      if (button.dataset.bound === '1') return;
      button.dataset.bound = '1';
      button.addEventListener('click', () => {
        const id = button.dataset.marker;
        const on = !button.classList.contains('is-on');
        button.classList.toggle('is-on', on);
        button.setAttribute('aria-pressed', on ? 'true' : 'false');
        setMarkerVisibility(id, on);
      });
    });
  }

  function initViennaMap() {
    const host = $('#viennaMap');
    if (!host || viennaMapInstance) return;

    if (!window.L) {
      host.classList.add('is-unavailable');
      host.innerHTML = '<div class="map-unavailable"><strong>Leaflet could not load</strong><span>The satellite map needs an internet connection. OpenStreetMap remains available in a new tab.</span></div>';
      initMapToggles();
      return;
    }

    viennaMapInstance = window.L.map(host, {
      center: [48.2082, 16.3738],
      zoom: 12,
      zoomControl: true,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      attributionControl: true
    });

    addViennaBasemap(viennaMapInstance);

    viennaMarkers = addViennaMarkers(viennaMapInstance);

    ARABIC.pins.forEach((pin, index) => {
      const button = $('.map-toggle[data-marker="' + pin.id + '"]');
      const on = !button || button.classList.contains('is-on');
      markerVisibility[pin.id] = on;
      const marker = viennaMarkers[index];
      if (marker && !on) viennaMapInstance.removeLayer(marker);
    });

    initMapToggles();

    viennaMapInstance.on('click', () => openMapLightbox());

    window.requestAnimationFrame(() => {
      if (viennaMapInstance) viennaMapInstance.invalidateSize();
    });
  }

  function activatePlanningTab(name, focusTab) {
    const fsPanel = $('.plan-panel.is-fs');
    if (fsPanel) exitPseudoFullscreen(fsPanel);

    planningTabs.forEach((tab) => {
      const active = tab.id === 'tab-' + name;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.tabIndex = active ? 0 : -1;
      if (active && focusTab) tab.focus({ preventScroll: true });
    });

    Object.keys(planPanels).forEach((key) => {
      const panel = planPanels[key];
      if (!panel) return;
      const active = key === name;
      panel.hidden = !active;
      panel.classList.toggle('is-active', active);
    });

    if (name === 'map') {
      initViennaMap();
      window.setTimeout(() => {
        if (viennaMapInstance) viennaMapInstance.invalidateSize();
      }, 90);
    }
  }

  planningTabs.forEach((tab, tabIndex) => {
    tab.addEventListener('click', () => activatePlanningTab(tab.id.replace('tab-', '')));

    tab.addEventListener('keydown', (event) => {
      let nextIndex = null;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (tabIndex + 1) % planningTabs.length;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (tabIndex - 1 + planningTabs.length) % planningTabs.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = planningTabs.length - 1;
      if (nextIndex === null) return;

      event.preventDefault();
      const nextTab = planningTabs[nextIndex];
      activatePlanningTab(nextTab.id.replace('tab-', ''), true);
    });
  });

  /* Keyboard entry to the presentation map. */
  const viennaMapHost = $('#viennaMap');
  if (viennaMapHost) {
    viennaMapHost.tabIndex = 0;
    viennaMapHost.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openMapLightbox();
      }
    });
  }

  /* ------------------------------------------------------------
     10. PANEL FULLSCREEN (native + graceful CSS fallback)
     ------------------------------------------------------------ */
  function panelFsLabel(active) {
    if (currentLang === 'ar') return active ? 'إنهاء التكبير' : 'تكبير الشاشة';
    return active ? 'Exit fullscreen' : 'Fullscreen';
  }

  function updatePanelFsLabels() {
    $$('[data-fs-target]').forEach((button) => {
      const panel = $(button.getAttribute('data-fs-target'));
      if (!panel) return;
      const active = document.fullscreenElement === panel || panel.classList.contains('is-fs');
      setText($('span', button), panelFsLabel(active));
      const use = $('use', button);
      if (use) use.setAttribute('href', active ? '#ic-collapse' : '#ic-expand');
      setAttr(button, 'aria-label', panelFsLabel(active));
    });
  }

  function exitPseudoFullscreen(panel) {
    panel.classList.remove('is-fs');
    document.body.classList.remove('fs-open');

    // Return the panel to the planning hub after leaving the fixed overlay.
    const home = panel._fsHome;
    if (home && home.parent) {
      const before = home.next && home.next.parentNode === home.parent ? home.next : null;
      home.parent.insertBefore(panel, before);
    }
    panel._fsHome = null;

    updatePanelFsLabels();
  }

  function requestPseudoFullscreen(panel) {
    // A transformed ancestor would trap position:fixed, so host the panel on <body>.
    if (!panel._fsHome) {
      panel._fsHome = { parent: panel.parentNode, next: panel.nextSibling };
    }
    document.body.appendChild(panel);

    panel.classList.add('is-fs');
    document.body.classList.add('fs-open');
    updatePanelFsLabels();
    if (panel.id === 'panel-map') {
      window.setTimeout(() => { if (viennaMapInstance) viennaMapInstance.invalidateSize(); }, 120);
    }
  }

  function openPanelFullscreen(panel) {
    // The in-page overlay behaves identically in every browser and webview,
    // including embedded contexts where the Fullscreen API is blocked.
    requestPseudoFullscreen(panel);
  }

  $$('[data-fs-target]').forEach((button) => {
    button.addEventListener('click', () => {
      const panel = $(button.getAttribute('data-fs-target'));
      if (!panel) return;

      if (panel.classList.contains('is-fs')) {
        exitPseudoFullscreen(panel);
        return;
      }

      openPanelFullscreen(panel);
    });
  });

  function handleFullscreenChange() {
    // Native fullscreen owns the layout; drop the CSS fallback if it arrived late.
    if (document.fullscreenElement) {
      $$('.plan-panel.is-fs').forEach((panel) => exitPseudoFullscreen(panel));
      if (lightbox) lightbox.classList.remove('is-fs');
    }
    updatePanelFsLabels();
    updateLightboxFullscreenButton();
  }

  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

  /* ------------------------------------------------------------
     11. GLOBAL PRESENTATION LIGHTBOX
     Images, planning diagrams and the live map share one
     ultra-crisp, keyboard-accessible overlay.
     ------------------------------------------------------------ */
  const lightbox = $('#lightbox');
  const lightboxImage = $('#lightboxImage');
  const lightboxHtml = $('#lightboxHtml');
  const lightboxMapEl = $('#lightboxMap');
  const lightboxTitle = $('#lightboxTitle');
  const lightboxCaption = $('#lightboxCaption');
  const lightboxLoader = $('#lightboxLoader');
  const lightboxStage = $('#lightboxStage');
  const lightboxClose = $('#lightboxClose');
  const lightboxZoomIn = $('#lightboxZoomIn');
  const lightboxZoomOut = $('#lightboxZoomOut');
  const lightboxFs = $('#lightboxFs');
  const lightboxHint = $('#lightboxHint');
  const lightboxFsUse = lightboxFs ? $('use', lightboxFs) : null;

  let lightboxLastFocus = null;
  let lightboxCloseTimer = null;
  let lightboxZoom = 1;
  let lightboxType = 'image';
  let lightboxMapInstance = null;

  function resetLightboxStage() {
    lightboxZoom = 1;
    if (lightboxImage) {
      lightboxImage.style.transform = '';
      lightboxImage.hidden = true;
      lightboxImage.removeAttribute('src');
      lightboxImage.alt = '';
    }
    if (lightboxHtml) {
      lightboxHtml.style.transform = '';
      lightboxHtml.hidden = true;
      lightboxHtml.innerHTML = '';
    }
    if (lightboxMapEl) lightboxMapEl.hidden = true;
    if (lightboxMapInstance) {
      lightboxMapInstance.remove();
      lightboxMapInstance = null;
    }
    if (lightboxLoader) lightboxLoader.hidden = true;
  }

  function setLightboxZoom(value) {
    lightboxZoom = Math.min(3, Math.max(1, value));
    const target = lightboxType === 'image' ? lightboxImage : lightboxType === 'html' ? lightboxHtml : null;
    if (target) target.style.transform = 'scale(' + lightboxZoom + ')';
    if (lightboxStage) {
      lightboxStage.classList.toggle('is-zoomed', lightboxZoom > 1);
    }
    if (lightboxZoomIn) lightboxZoomIn.disabled = lightboxZoom >= 3;
    if (lightboxZoomOut) lightboxZoomOut.disabled = lightboxZoom <= 1;
  }

  function openLightboxMap() {
    const host = lightboxMapEl;
    if (!host) return;
    host.hidden = false;

    if (!window.L) {
      host.innerHTML = '<div class="map-unavailable"><strong>Leaflet could not load</strong><span>The interactive map needs an internet connection.</span></div>';
      return;
    }

    lightboxMapInstance = window.L.map(host, {
      center: [48.2082, 16.3738],
      zoom: 13,
      zoomControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      attributionControl: true
    });

    addViennaBasemap(lightboxMapInstance);

    addViennaMarkers(lightboxMapInstance);
    window.setTimeout(() => {
      if (lightboxMapInstance) lightboxMapInstance.invalidateSize();
    }, 80);
  }

  function openLightbox(options) {
    if (!lightbox) return;
    const config = options || {};
    if (!lightboxOpen) lightboxLastFocus = document.activeElement;

    lightboxOpen = true;
    window.clearTimeout(lightboxCloseTimer);
    resetLightboxStage();

    lightboxType = config.type || 'image';
    lightboxTitle.textContent = config.title || (currentLang === 'ar' ? 'معاينة بحجم الشاشة' : 'Fullscreen preview');
    lightboxCaption.textContent = config.caption || (currentLang === 'ar' ? 'فيينا المدينة الذكية · نافذة العرض' : 'Vienna Smart City · presentation view');

    lightbox.hidden = false;
    lightbox.classList.remove('is-closing');
    void lightbox.offsetWidth;
    lightbox.classList.add('is-open');
    lockPageScroll();

    if (lightboxLoader) lightboxLoader.hidden = lightboxType !== 'image';
    if (lightboxZoomIn) lightboxZoomIn.disabled = lightboxType === 'map';
    if (lightboxZoomOut) lightboxZoomOut.disabled = lightboxType === 'map';

    if (lightboxType === 'image' && lightboxImage) {
      lightboxImage.hidden = false;
      lightboxImage.alt = config.alt || '';
      lightboxImage.onload = () => {
        if (lightboxLoader) lightboxLoader.hidden = true;
      };
      lightboxImage.onerror = () => {
        if (lightboxLoader) lightboxLoader.hidden = true;
        lightboxCaption.textContent = currentLang === 'ar' ? 'تعذّر تحميل الصورة.' : 'The image could not be loaded.';
      };
      lightboxImage.src = config.src || '';
    } else if (lightboxType === 'html' && lightboxHtml) {
      lightboxHtml.hidden = false;
      lightboxHtml.innerHTML = config.html || '';
      if (lightboxLoader) lightboxLoader.hidden = true;
    } else if (lightboxType === 'map') {
      openLightboxMap();
      if (lightboxLoader) lightboxLoader.hidden = true;
    }

    window.setTimeout(() => {
      if (lightboxClose) lightboxClose.focus({ preventScroll: true });
    }, 80);
  }

  function openImageLightbox(img) {
    if (!img) return;
    const card = img.closest('.orbit-card');
    const title = card && $('h3', card)
      ? $('h3', card).textContent.trim()
      : (img.alt || 'Vienna Smart City');

    openLightbox({
      type: 'image',
      src: img.currentSrc || img.src,
      alt: img.alt || '',
      title: title,
      caption: img.alt || (currentLang === 'ar' ? 'صورة من العرض' : 'Presentation image')
    });
  }

  function openMapLightbox() {
    openLightbox({
      type: 'map',
      title: currentLang === 'ar' ? 'خريطة فيينا التفاعلية' : 'Interactive Vienna Map',
      caption: currentLang === 'ar'
        ? 'فيينا · 48.2082° شمالًا، 16.3738° شرقًا'
        : 'Vienna · 48.2082° N, 16.3738° E'
    });
  }

  function openPlanLightbox(figure) {
    const panel = figure.closest('.plan-panel');
    const title = panel && $('h4', panel) ? $('h4', panel).textContent.trim() : 'Vienna plan';

    const svg = $('.plan-svg', figure);
    if (svg) {
      const legend = $$('.plan-caption span', figure).map((item) => item.textContent.trim()).filter(Boolean);
      openLightbox({
        type: 'html',
        html: svg.outerHTML,
        title: title,
        caption: legend.join(' · ')
      });
      return;
    }

    /* Authentic plan image (STEP 2035 / zoning extract) */
    const img = $('.plan-img', figure) || $('img', figure);
    if (!img) return;

    const badge = $('.plan-badge span', panel || figure);
    const source = $('.plan-caption__source', figure);
    const caption = [badge && badge.textContent.trim(), source && source.textContent.trim()]
      .filter(Boolean)
      .join(' · ');

    openLightbox({
      type: 'image',
      src: figure.dataset.lightboxSrc || img.currentSrc || img.src,
      alt: figure.dataset.lightboxAlt || img.alt || '',
      title: title,
      caption: caption || img.alt || ''
    });
  }

  function closeLightbox() {
    if (!lightbox || !lightboxOpen) return;

    lightboxOpen = false;
    if (lightboxMapInstance) {
      lightboxMapInstance.remove();
      lightboxMapInstance = null;
    }

    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => { /* no-op */ });
    }

    lightbox.classList.remove('is-open');
    lightbox.classList.remove('is-fs');
    lightbox.classList.add('is-closing');
    updateLightboxFullscreenButton();

    lightboxCloseTimer = window.setTimeout(() => {
      lightbox.hidden = true;
      lightbox.classList.remove('is-closing');
      resetLightboxStage();
      unlockPageScroll();

      if (lightboxLastFocus && typeof lightboxLastFocus.focus === 'function') {
        lightboxLastFocus.focus({ preventScroll: true });
      }
    }, 320);
  }

  if (lightbox) {
    lightbox.addEventListener('click', (event) => {
      if (event.target.closest('[data-lightbox-close]')) closeLightbox();
    });
  }

  if (lightboxZoomIn) lightboxZoomIn.addEventListener('click', () => setLightboxZoom(lightboxZoom + 0.5));
  if (lightboxZoomOut) lightboxZoomOut.addEventListener('click', () => setLightboxZoom(lightboxZoom - 0.5));
  if (lightboxImage) lightboxImage.addEventListener('dblclick', () => setLightboxZoom(1));

  function toggleLightboxFullscreen() {
    if (!lightbox) return;
    const active = lightbox.classList.toggle('is-fs');
    updateLightboxFullscreenButton();
    if (active && lightboxMapInstance) {
      window.setTimeout(() => { if (lightboxMapInstance) lightboxMapInstance.invalidateSize(); }, 120);
    }
  }

  if (lightboxFs) lightboxFs.addEventListener('click', toggleLightboxFullscreen);

  function updateLightboxFullscreenButton() {
    if (!lightboxFsUse) return;
    const active = Boolean(document.fullscreenElement) ||
      Boolean(lightbox && lightbox.classList.contains('is-fs'));
    lightboxFsUse.setAttribute('href', active ? '#ic-collapse' : '#ic-expand');
    lightboxFs.setAttribute('aria-label', active
      ? (currentLang === 'ar' ? 'إنهاء ملء الشاشة' : 'Exit fullscreen')
      : (currentLang === 'ar' ? 'دخول ملء الشاشة' : 'Enter fullscreen'));
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && lightboxOpen) {
      closeLightbox();
      return;
    }
    if (event.key === 'Escape') {
      const pseudo = $('.plan-panel.is-fs');
      if (pseudo) exitPseudoFullscreen(pseudo);
      return;
    }
    if (!lightboxOpen || event.key !== 'Tab') return;

    const dialog = $('.lightbox__dialog', lightbox);
    if (!dialog) return;

    const focusable = $$('button, a[href], [tabindex]:not([tabindex="-1"])', dialog)
      .filter((el) => !el.disabled && el.offsetParent !== null);
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (!focusable.includes(document.activeElement)) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  /* ---------- Click / keyboard triggers ---------- */
  function isLightboxableImage(img) {
    if (!img || img.tagName !== 'IMG') return false;
    if (img.closest('.hero__bg, #lightbox, #videoModal, [data-no-lightbox]')) return false;
    return true;
  }

  document.addEventListener('click', (event) => {
    if (event.target.closest('#lightbox, #videoModal')) return;

    const planFigure = event.target.closest('.plan-figure');
    if (planFigure) {
      event.preventDefault();
      openPlanLightbox(planFigure);
      return;
    }

    const img = event.target.closest('img');
    if (isLightboxableImage(img)) {
      event.preventDefault();
      openImageLightbox(img);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const active = document.activeElement;
    if (!active) return;

    if (active.classList && active.classList.contains('plan-figure')) {
      event.preventDefault();
      openPlanLightbox(active);
      return;
    }
    if (active.tagName === 'IMG' && isLightboxableImage(active)) {
      event.preventDefault();
      openImageLightbox(active);
    }
  });

  /* Make every content image keyboard reachable and visibly clickable. */
  $$('main img').forEach((img) => {
    if (!isLightboxableImage(img)) return;
    img.classList.add('is-lightboxable');
    img.tabIndex = 0;
    img.setAttribute('role', 'button');

    const media = img.closest('.orbit-card__media');
    if (media && !$('.media-expand', media)) {
      const cue = document.createElement('span');
      cue.className = 'media-expand';
      cue.setAttribute('aria-hidden', 'true');
      cue.innerHTML = '<svg class="icon"><use href="#ic-expand"/></svg>';
      media.appendChild(cue);
    }
  });

  /* ------------------------------------------------------------
     11b. LIVE QR CODE (follows the current address automatically)
     ------------------------------------------------------------ */
  function renderLiveQR() {
    const qr = $('#qrImage');
    const urlLabel = $('#qrUrl');
    if (!qr) return;

    let href = '';
    try { href = String(window.location.href || ''); } catch (_) { href = ''; }

    if (/^https?:/i.test(href)) {
      const endpoint = 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10' +
        '&color=0f172a&bgcolor=ffffff&data=' + encodeURIComponent(href);
      if (qr.dataset.qrUrl !== endpoint) {
        qr.dataset.qrUrl = endpoint;
        qr.src = endpoint;
      }
      qr.setAttribute('alt', currentLang === 'ar'
        ? 'رمز QR يفتح العرض المباشر: ' + href
        : 'QR code opening the live presentation: ' + href);
      if (urlLabel) {
        urlLabel.textContent = href.replace(/^https?:\/\//i, '').replace(/\?.*$/, '');
        urlLabel.setAttribute('title', href);
        urlLabel.hidden = false;
      }
    } else if (urlLabel) {
      /* Local file preview — no shareable address yet. */
      urlLabel.hidden = true;
    }
  }

  renderLiveQR();

  /* ------------------------------------------------------------
     12. INITIAL LANGUAGE
     ------------------------------------------------------------ */
  if (currentLang === 'ar') {
    setLanguage('ar', { persist: false });
  } else {
    htmlRoot.dir = 'ltr';
    if (langSwitch) langSwitch.dataset.active = 'en';
  }

  /* ------------------------------------------------------------
     8. FOOTER YEAR
     ------------------------------------------------------------ */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

})();
