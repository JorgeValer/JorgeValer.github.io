/* Comportamiento común a las cinco versiones.
   Cuatro cosas: barra de progreso, revelado al entrar en pantalla, promoción
   del color de la sección activa a la raíz (para el raíl y la barra, que viven
   fuera de las secciones) y lupa de capturas. */

(() => {
  'use strict';

  const movimientoReducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const raiz = document.documentElement;

  /* ── Progreso y raíl ─────────────────────────────────────────────── */
  const barra = document.querySelector('.progreso__barra');
  const rail = document.querySelector('.rail');

  function alScroll() {
    const alto = document.documentElement.scrollHeight - window.innerHeight;
    barra.style.width = `${(alto > 0 ? window.scrollY / alto : 0) * 100}%`;
    rail.classList.toggle('visible', window.scrollY > window.innerHeight * 0.6);
  }
  let pendiente = false;
  window.addEventListener('scroll', () => {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => { alScroll(); pendiente = false; });
  }, { passive: true });
  alScroll();

  /* ── Revelado ────────────────────────────────────────────────────── */
  const porRevelar = document.querySelectorAll('.revelar');
  if (movimientoReducido || !('IntersectionObserver' in window)) {
    porRevelar.forEach((el) => el.classList.add('dentro'));
  } else {
    const obs = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('dentro');
        obs.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    porRevelar.forEach((el) => obs.observe(el));
  }

  /* ── Color de la sección activa ──────────────────────────────────── */
  // El raíl, la barra de progreso y el fondo del <body> están fuera de las
  // secciones, así que no heredan su color: hay que promoverlo a la raíz.
  const secciones = document.querySelectorAll('[data-acento]');
  const enlacesRail = document.querySelectorAll('[data-rail]');

  function activar(seccion) {
    const est = getComputedStyle(seccion);
    const acento = est.getPropertyValue('--acento-base').trim();
    const tinte = est.getPropertyValue('--tinte-base').trim();
    if (acento) raiz.style.setProperty('--acento-base', acento);
    if (tinte) raiz.style.setProperty('--tinte-base', tinte);
    document.body.style.background = est.getPropertyValue('--fondo').trim() || '';
    const id = seccion.dataset.railId;
    enlacesRail.forEach((a) => a.classList.toggle('activo', a.dataset.rail === id));
  }

  if ('IntersectionObserver' in window) {
    const obsColor = new IntersectionObserver((entradas) => {
      const visible = entradas
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) activar(visible.target);
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
    secciones.forEach((s) => obsColor.observe(s));
  }

  /* ── Lupa ────────────────────────────────────────────────────────── */
  const lupa = document.getElementById('lupa');
  const lupaImg = lupa.querySelector('.lupa__img');
  const lupaCerrar = lupa.querySelector('.lupa__cerrar');
  let origen = null;

  function abrir(figura) {
    const fuente = figura.dataset.lightbox;
    const img = figura.querySelector('img');
    if (!fuente || !img) return;
    origen = figura;
    lupaImg.src = fuente;
    lupaImg.alt = img.alt;
    lupa.hidden = false;
    requestAnimationFrame(() => lupa.classList.add('abierta'));
    document.body.style.overflow = 'hidden';
    lupaCerrar.focus();
  }
  function cerrar() {
    lupa.classList.remove('abierta');
    document.body.style.overflow = '';
    const fin = () => { lupa.hidden = true; lupaImg.src = ''; if (origen) { origen.focus?.(); origen = null; } };
    movimientoReducido ? fin() : setTimeout(fin, 350);
  }

  document.querySelectorAll('[data-lightbox]').forEach((f) => {
    f.setAttribute('tabindex', '0');
    f.setAttribute('role', 'button');
    f.setAttribute('aria-label', 'Ampliar captura');
    f.addEventListener('click', () => abrir(f));
    f.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(f); }
    });
  });
  lupaCerrar.addEventListener('click', cerrar);
  lupa.addEventListener('click', (e) => { if (e.target === lupa) cerrar(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !lupa.hidden) cerrar(); });
})();
