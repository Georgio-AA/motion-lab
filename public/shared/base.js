export function prefersReducedMotion() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
// Demo pages opt in by importing this module; the root hub never receives a back link.
if (!document.body.hasAttribute('data-hub') && !document.querySelector('.back-to-hub')) {
  const link = document.createElement('a');
  link.className = 'back-to-hub'; link.href = '../index.html'; link.textContent = '← All demos';
  document.body.prepend(link);
}
