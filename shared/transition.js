// Native cross-document transitions own their snapshots; older browsers get a DOM wipe.
// Preview iframes stay untouched, so mounting a preview never replays the intro.
if (window.top === window.self) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const native = 'CSSViewTransitionRule' in window && 'onpagereveal' in window;
  let wipe = null;
  let exiting = false;
  let nativeReveal = false;
  let navigationTimer = 0;
  let cleanupTimer = 0;

  function clearWipe() {
    clearTimeout(cleanupTimer);
    wipe?.remove();
    wipe = null;
  }

  function createWipe(state) {
    clearWipe();
    wipe = document.createElement('div');
    wipe.className = 'motion-lab-wipe ' + state;
    wipe.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    const mark = document.createElement('b');
    mark.textContent = '✳';
    label.append(mark, document.createTextNode('MOTION LAB'));
    wipe.append(label);
    document.body.append(wipe);
  }

  function reveal() {
    if (reduced.matches || exiting) return;
    createWipe('is-entering');
    wipe.addEventListener('animationend', clearWipe, { once:true });
    cleanupTimer = setTimeout(clearWipe, 320);
  }

  window.addEventListener('pagereveal', event => {
    nativeReveal = Boolean(event.viewTransition);
    if (nativeReveal) clearWipe();
  });

  // Also reset after Back/Forward cache restoration; never wait for window.load.
  window.addEventListener('pageshow', () => {
    exiting = false;
    clearTimeout(navigationTimer);
    clearWipe();
    requestAnimationFrame(() => {
      if (!nativeReveal) reveal();
      nativeReveal = false;
    });
  });

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target.toLowerCase() !== '_self') || link.relList.contains('external') || link.hasAttribute('data-no-transition')) return;
    const destination = new URL(link.href, location.href);
    if (!/^https?:$/.test(destination.protocol) || destination.origin !== location.origin) return;
    // Anchor navigation, including chapter jumps and skip links, remains native.
    if (destination.pathname === location.pathname && destination.search === location.search) return;
    event.preventDefault();
    if (exiting) return;
    if (native || reduced.matches) {
      location.assign(destination.href);
      return;
    }
    exiting = true;
    // A missing stylesheet or animation failure still navigates within 260ms.
    let committed = false;
    const navigate = () => {
      if (!exiting || committed) return;
      committed = true;
      clearTimeout(navigationTimer);
      location.assign(destination.href);
      // Keep the cover painted while the browser loads the destination.
    };
    navigationTimer = setTimeout(navigate, 260);
    try {
      createWipe('is-exiting');
      wipe.addEventListener('animationend', navigate, { once:true });
    } catch {
      navigate();
    }
  });

  reduced.addEventListener('change', () => { if (reduced.matches) clearWipe(); });
}
