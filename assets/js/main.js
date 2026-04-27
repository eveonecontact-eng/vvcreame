/* ===================================================
   MAEDA COSMETICS — Main JavaScript
   =================================================== */

/* --- Viewport Adaptive Scaling ---
   デバイスの画面幅に応じて CSS カスタムプロパティを動的に補正し、
   スマートフォン・タブレット・PCすべてで最適な表示を実現する。
   デザイン基準幅: PC=1440px / Tablet=768px / Mobile=375px
*/
(function () {
  const DESIGN_PC = 1440;
  const DESIGN_TABLET = 768;
  const DESIGN_MOBILE = 375;

  function adjustViewport() {
    const vw = window.innerWidth;
    const root = document.documentElement;

    // デバイスカテゴリを判定して data 属性にセット（CSS から参照可能）
    let device;
    if (vw >= 1025) {
      device = 'pc';
    } else if (vw >= 601) {
      device = 'tablet';
    } else {
      device = 'mobile';
    }
    root.dataset.device = device;

    // 基準幅に対するスケール係数を算出
    let scale;
    if (device === 'pc') {
      scale = Math.min(vw / DESIGN_PC, 1.2);         // PC は 1.0 基準、超大画面は 1.2 上限
    } else if (device === 'tablet') {
      scale = vw / DESIGN_TABLET;                      // タブレットは 768px 基準でスケーリング
    } else {
      scale = vw / DESIGN_MOBILE;                      // モバイルは 375px 基準でスケーリング
    }

    // スケール係数を CSS 変数に反映
    root.style.setProperty('--vw-scale', scale.toFixed(4));

    // ルートフォントサイズを動的調整 (ベース 62.5% = 10px)
    const baseFontPct = 62.5;
    let adjustedFont;
    if (device === 'pc') {
      adjustedFont = baseFontPct;
    } else if (device === 'tablet') {
      // タブレット: 画面幅に比例して 56%〜62.5% の範囲でスケーリング
      adjustedFont = 56 + (baseFontPct - 56) * ((vw - 601) / (1024 - 601));
      adjustedFont = Math.max(56, Math.min(baseFontPct, adjustedFont));
    } else {
      // モバイル: 画面幅に比例して 52%〜58% の範囲でスケーリング
      adjustedFont = 52 + (58 - 52) * ((vw - 320) / (600 - 320));
      adjustedFont = Math.max(52, Math.min(58, adjustedFont));
    }
    root.style.fontSize = adjustedFont + '%';

    // 動的セクションパディング
    if (device === 'pc') {
      root.style.setProperty('--section-padding', '90px');
    } else if (device === 'tablet') {
      root.style.setProperty('--section-padding', '72px');
    } else {
      root.style.setProperty('--section-padding', '56px');
    }

    // 動的ヘッダー高さ
    if (device === 'pc') {
      root.style.setProperty('--header-height', '96px');
      root.style.setProperty('--header-height-small', '64px');
    } else if (device === 'tablet') {
      root.style.setProperty('--header-height', '80px');
      root.style.setProperty('--header-height-small', '60px');
    } else {
      root.style.setProperty('--header-height', '64px');
      root.style.setProperty('--header-height-small', '56px');
    }
  }

  // 初回実行
  adjustViewport();

  // リサイズ時にデバウンス付きで再実行
  let resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(adjustViewport, 80);
  });

  // 画面回転時に即実行
  window.addEventListener('orientationchange', function () {
    setTimeout(adjustViewport, 100);
  });

  // 外部からもアクセス可能にする
  window.adjustViewport = adjustViewport;
})();

document.addEventListener('DOMContentLoaded', () => {

  // --- Hero Swiper (Fade Carousel) ---
  const hasSwiper = typeof window.Swiper !== 'undefined';
  const heroSwiperEl = document.querySelector('.hero-swiper');

  function updatePagination(swiper) {
    const current = document.querySelector('.hero-current');
    const total = document.querySelector('.hero-total');
    if (current && total) {
      current.textContent = swiper.realIndex + 1;
      total.textContent = swiper.slides.length - 2; // loop duplicates
    }
  }

  function startProgress(swiper) {
    const bar = document.querySelector('.hero-progress-bar');
    if (!bar) return;
    bar.style.transition = 'none';
    bar.style.width = '0%';
    requestAnimationFrame(() => {
      bar.style.transition = `width ${swiper.params.autoplay.delay}ms linear`;
      bar.style.width = '100%';
    });
  }

  if (hasSwiper && heroSwiperEl) {
    new Swiper('.hero-swiper', {
      effect: 'fade',
      fadeEffect: { crossFade: true },
      autoplay: { delay: 5000, disableOnInteraction: false },
      loop: true,
      speed: 1200,
      navigation: {
        nextEl: '.hero-next',
        prevEl: '.hero-prev',
      },
      on: {
        init: function () {
          updatePagination(this);
          startProgress(this);
        },
        slideChange: function () {
          updatePagination(this);
          startProgress(this);
        },
      },
    });
  }

  // --- Gallery Swiper (Horizontal Scroll) ---
  const gallerySwiperEl = document.querySelector('.gallery-swiper');
  if (hasSwiper && gallerySwiperEl) {
    new Swiper('.gallery-swiper', {
      slidesPerView: 'auto',
      spaceBetween: 16,
      freeMode: true,
      grabCursor: true,
    });
  }

  // --- Header Scroll Effect ---
  const header = document.getElementById('header');
  let lastScroll = 0;

  function onScroll() {
    const scrollY = window.scrollY;

    // Add scrolled class
    if (scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    lastScroll = scrollY;
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // --- Hamburger Menu ---
  const menuToggle = document.getElementById('menuToggle');
  const nav = document.getElementById('fullscreenNav');

  if (menuToggle && nav) menuToggle.addEventListener('click', () => {
    const isOpen = nav.classList.contains('open');
    nav.classList.toggle('open');
    menuToggle.classList.toggle('active');
    menuToggle.setAttribute('aria-expanded', !isOpen);
    nav.setAttribute('aria-hidden', isOpen);
    document.body.style.overflow = isOpen ? '' : 'hidden';
  });

  // Close nav on link click
  if (nav) nav.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      menuToggle.classList.remove('active');
      menuToggle.setAttribute('aria-expanded', 'false');
      nav.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    });
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (nav && e.key === 'Escape' && nav.classList.contains('open')) {
      nav.classList.remove('open');
      menuToggle.classList.remove('active');
      menuToggle.setAttribute('aria-expanded', 'false');
      nav.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  });

  // --- Scroll Reveal (IntersectionObserver) ---
  const reveals = document.querySelectorAll('.reveal');
  // Fallback: IntersectionObserver 未対応環境では常に表示する
  if (!('IntersectionObserver' in window)) {
    reveals.forEach(el => el.classList.add('visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    reveals.forEach(el => revealObserver.observe(el));
  }

  // --- Page Top Button ---
  const pageTop = document.getElementById('pageTop');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
      pageTop.classList.add('visible');
    } else {
      pageTop.classList.remove('visible');
    }
  }, { passive: true });

  pageTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // --- Smooth Scroll for Anchor Links ---
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = header.offsetHeight;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

});
