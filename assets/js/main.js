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

  // --- Top Flow Marquee（自動スクロール + 手動スワイプ対応） ---
  const topFlowMarquee = document.querySelector('.top-flow-marquee');
  const topFlowTrack = topFlowMarquee ? topFlowMarquee.querySelector('.top-flow-track') : null;
  const pauseBtn = document.querySelector('.top-flow-pause');

  if (topFlowMarquee && topFlowTrack) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const firstSet = topFlowTrack.querySelector('.top-flow-set');
    let buttonPaused = false;
    let userInteracting = false;
    let resumeTimer = null;
    let offset = 0;
    let scrollCarry = 0;
    const speed = 0.45;

    const loopWidth = () => (firstSet ? firstSet.offsetWidth : topFlowTrack.scrollWidth / 2);

    const applyOffset = () => {
      const w = loopWidth();
      if (w > 0) {
        offset = ((offset % w) + w) % w;
      }
      topFlowTrack.style.transform = 'translate3d(' + (-offset) + 'px,0,0)';
    };

    const pauseForUser = () => {
      userInteracting = true;
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => {
        userInteracting = false;
      }, 1800);
    };

    const ensureCopies = () => {
      if (!firstSet) return;
      const w = loopWidth();
      if (w <= 0) return;
      const needed = topFlowMarquee.clientWidth + w + 1;
      let guard = 0;
      while (topFlowTrack.scrollWidth < needed && guard < 8) {
        const clone = firstSet.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        topFlowTrack.appendChild(clone);
        guard += 1;
      }
    };

    ensureCopies();
    window.addEventListener('resize', ensureCopies);

    if (reduceMotion) {
      topFlowMarquee.style.overflowX = 'auto';
    } else {
      const tick = () => {
        if (!buttonPaused && !userInteracting && !document.hidden) {
          scrollCarry += speed;
          const step = Math.floor(scrollCarry);
          if (step > 0) {
            offset += step;
            scrollCarry -= step;
            applyOffset();
          }
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }

    topFlowMarquee.addEventListener('wheel', (e) => {
      if (reduceMotion || Math.abs(e.deltaX) < 1) return;
      pauseForUser();
      offset += e.deltaX;
      applyOffset();
    }, { passive: true });

    let isDragging = false;
    let startX = 0;
    let startOffset = 0;

    topFlowMarquee.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      isDragging = true;
      startX = e.clientX;
      startOffset = offset;
      topFlowMarquee.classList.add('is-dragging');
      pauseForUser();
      topFlowMarquee.setPointerCapture(e.pointerId);
    });

    topFlowMarquee.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      pauseForUser();
      offset = startOffset - (e.clientX - startX);
      applyOffset();
    });

    const endDrag = () => {
      isDragging = false;
      topFlowMarquee.classList.remove('is-dragging');
    };

    topFlowMarquee.addEventListener('pointerup', endDrag);
    topFlowMarquee.addEventListener('pointercancel', endDrag);

    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        buttonPaused = !buttonPaused;
        pauseBtn.classList.toggle('is-paused', buttonPaused);
        pauseBtn.setAttribute(
          'aria-label',
          buttonPaused ? '自動再生を再開' : '自動再生の一時停止'
        );
      });
    }
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

  const navCloseButton = nav ? nav.querySelector('.nav-close') : null;

  function openNav() {
    if (!nav || !menuToggle) return;
    nav.classList.add('open');
    menuToggle.classList.add('active');
    menuToggle.setAttribute('aria-expanded', 'true');
    nav.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeNav() {
    if (!nav || !menuToggle) return;
    nav.classList.remove('open');
    menuToggle.classList.remove('active');
    menuToggle.setAttribute('aria-expanded', 'false');
    nav.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  if (menuToggle && nav) menuToggle.addEventListener('click', () => {
    const isOpen = nav.classList.contains('open');
    if (isOpen) closeNav();
    else openNav();
  });

  if (navCloseButton) navCloseButton.addEventListener('click', closeNav);

  // Close nav on link click
  if (nav) nav.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      closeNav();
    });
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (nav && e.key === 'Escape' && nav.classList.contains('open')) {
      closeNav();
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
