/* Static counterpart of Automation's useChromeNavigation; no build step required. */
(() => {
  'use strict';

  const chrome = document.querySelector('.ax-chrome');
  if (!chrome) return;

  const root = document.documentElement;
  const dialog = chrome.querySelector('.ax-mobile-menu');
  const menuButton = chrome.querySelector('.ax-menu-toggle');
  const closeButton = dialog?.querySelector('.ax-menu-close');
  const backTop = document.querySelector('.ax-back-top');
  const footerBase = document.querySelector('.ax-foot-base');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 721px)');
  let previousY = Math.max(0, window.scrollY);
  let height = chrome.getBoundingClientRect().height;
  let frame = 0;
  let scrollLock = null;

  const update = () => {
    frame = 0;
    const y = Math.max(0, window.scrollY);
    const pinned = motion.matches || dialog?.open || chrome.contains(document.activeElement) || y <= height;
    if (pinned) chrome.dataset.hidden = 'false';
    else if (y !== previousY) chrome.dataset.hidden = String(y > previousY);
    previousY = y;
    if (backTop) backTop.hidden = y < window.innerHeight * .8;
    const footerTop = footerBase?.getBoundingClientRect().top ?? window.innerHeight;
    root.style.setProperty('--back-top-bottom', Math.max(24, window.innerHeight - footerTop + 16) + 'px');
  };
  const queue = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  const measure = () => {
    height = chrome.getBoundingClientRect().height;
    root.style.setProperty('--chrome-height', height + 'px');
    queue();
  };

  const unlockScroll = () => {
    if (!scrollLock) return;
    root.style.overflow = scrollLock.root;
    document.body.style.overflow = scrollLock.body;
    scrollLock = null;
  };
  const closeMenu = () => {
    const wasOpen = dialog?.open || scrollLock !== null;
    if (dialog?.open) dialog.close();
    menuButton?.setAttribute('aria-expanded', 'false');
    // Restore scrolling before the link's default fragment navigation runs.
    unlockScroll();
    if (wasOpen) menuButton?.focus({ preventScroll: true });
    queue();
  };
  const openMenu = () => {
    if (!dialog || dialog.open || desktop.matches) return;
    chrome.dataset.hidden = 'false';
    dialog.showModal();
    menuButton.setAttribute('aria-expanded', 'true');
    scrollLock = { root: root.style.overflow, body: document.body.style.overflow };
    root.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    closeButton?.focus({ preventScroll: true });
    queue();
  };

  menuButton?.addEventListener('click', openMenu);
  closeButton?.addEventListener('click', closeMenu);
  dialog?.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeMenu();
  });
  dialog?.addEventListener('close', closeMenu);
  dialog?.addEventListener('click', (event) => {
    if (event.target.closest('a[href]')) closeMenu();
  });
  dialog?.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const targets = Array.from(dialog.querySelectorAll('a[href], button:not([disabled])'));
    const first = targets[0];
    const last = targets[targets.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  });
  desktop.addEventListener('change', () => {
    if (!desktop.matches || !dialog?.open) return;
    closeMenu();
    // Privacy and 404 have no current global item; the brand remains a visible target.
    (chrome.querySelector('.ax-nav [aria-current="page"]') || chrome.querySelector('.ax-brand'))?.focus({ preventScroll: true });
  });

  const observer = new ResizeObserver(measure);
  observer.observe(chrome);
  observer.observe(document.body);
  if (footerBase) observer.observe(footerBase);
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', measure);
  addEventListener('pageshow', measure);
  chrome.addEventListener('focusin', queue);
  chrome.addEventListener('focusout', queue);
  motion.addEventListener('change', queue);
  measure();
})();
