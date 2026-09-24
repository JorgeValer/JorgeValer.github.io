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

  // Escalonado: cuando varios elementos que se revelan comparten padre —las
  // capturas de una galería, las claves de un proyecto, las etiquetas de
  // stack— entran en fila en vez de todos de golpe. El retraso se tapa a los
  // seis primeros: una lista de nueve claves con retraso acumulado tardaría
  // más de un segundo en acabar y se leería como lentitud, no como ritmo.
  const cuenta = new Map();
  porRevelar.forEach((el) => {
    const padre = el.parentElement;
    const n = cuenta.get(padre) || 0;
    cuenta.set(padre, n + 1);
    if (n > 0) el.style.setProperty('--retraso', `${Math.min(n, 6) * 70}ms`);
  });
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

  /* ── Scroll: inercia dentro de una sección, salto entre secciones ───
     Dos comportamientos con la misma rueda, y manda uno u otro según dónde
     estés. Dentro de un proyecto la página se desliza con inercia. Cuando ya
     has llegado al borde de esa sección, el siguiente golpe de rueda salta a
     la siguiente de una pieza.

     Por qué el salto sólo vive en el borde: las secciones de proyecto miden
     entre 3 y 4 pantallas. Un salto que se pudiera disparar en cualquier punto
     se llevaría por delante tres cuartas partes del contenido. Así hay que
     recorrerlas enteras, y el salto sólo quita el tramo muerto entre una y la
     siguiente.

     Y exige un gesto nuevo: la cola de inercia de un trackpad manda decenas de
     eventos después de levantar los dedos, y sin esto encadenaría saltos hasta
     el pie de página con un solo empujón.

     Sólo con puntero fino y sin "menos movimiento": en el móvil el navegador
     trae su propia inercia y es mejor que cualquiera que escriba yo. */
  if (!movimientoReducido && window.matchMedia('(pointer: fine)').matches) {
    const lupa = document.getElementById('lupa');
    const paradas = Array.from(document.querySelectorAll('[data-acento]'));

    const DURACION_SALTO = 900;
    const PAUSA_GESTO = 140;  // por debajo de esto sigue siendo el mismo gesto
    const MARGEN = 4;         // holgura para dar un borde por alcanzado

    let destino = window.scrollY;
    let corriendo = false;
    let saltando = false;
    let tragarHastaPausa = false;
    let ultimoGesto = 0;

    const tope = () => document.documentElement.scrollHeight - window.innerHeight;
    const dentroDelPapel = (y) => Math.max(0, Math.min(tope(), y));
    const arriba = (el) => Math.round(el.getBoundingClientRect().top + window.scrollY);
    const suave = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    // deltaY no viene siempre en píxeles: Firefox puede darlo en líneas y
    // algunos ratones en páginas. Sin convertirlo, la misma rueda movería tres
    // píxeles en un navegador y la pantalla entera en otro.
    const aPixeles = (e) =>
      e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;

    /* Inercia: la rueda empuja un destino y la página frena hacia él. */
    function paso() {
      const resto = destino - window.scrollY;
      if (Math.abs(resto) < 0.5) {
        window.scrollTo({ top: destino, behavior: 'instant' });
        corriendo = false;
        return;
      }
      const antes = window.scrollY;
      // 'instant' y no el scroll suave del CSS: si los dos animan a la vez, se
      // pelean y el resultado va a tirones.
      window.scrollTo({ top: antes + resto * 0.14, behavior: 'instant' });
      // Freno de mano: si la página no se ha movido, el destino es inalcanzable
      // —el tope calculado no coincide con el real en cuanto hay una barra
      // horizontal o un margen colapsado— y sin esto el bucle pediría cuadros
      // para siempre y congelaría la pestaña.
      if (window.scrollY === antes) { destino = antes; corriendo = false; return; }
      requestAnimationFrame(paso);
    }

    /* Salto: duración fija y easing en las dos puntas, como una diapositiva. */
    function saltar(y) {
      saltando = true;
      tragarHastaPausa = true;
      corriendo = false;
      const desde = window.scrollY;
      const recorrido = dentroDelPapel(y) - desde;
      const t0 = performance.now();
      (function cuadro(ahora) {
        const t = Math.min((ahora - t0) / DURACION_SALTO, 1);
        window.scrollTo({ top: desde + recorrido * suave(t), behavior: 'instant' });
        if (t < 1) requestAnimationFrame(cuadro);
        else { saltando = false; destino = window.scrollY; }
      })(t0);
    }

    // La sección en la que estás es la última cuyo comienzo ya has pasado.
    function seccionActual() {
      let i = 0;
      for (let j = 0; j < paradas.length; j++) {
        if (arriba(paradas[j]) <= window.scrollY + MARGEN) i = j;
      }
      return i;
    }

    window.addEventListener('wheel', (e) => {
      if (e.ctrlKey) return;            // zoom del navegador
      if (lupa && !lupa.hidden) return; // con la lupa abierta la página se queda quieta
      e.preventDefault();

      const ahora = performance.now();
      const gestoNuevo = ahora - ultimoGesto > PAUSA_GESTO;
      ultimoGesto = ahora;

      if (tragarHastaPausa) {
        if (!gestoNuevo) return;
        tragarHastaPausa = false;
      }
      if (saltando) return;

      const delta = aPixeles(e);
      if (delta === 0) return;
      const i = seccionActual();

      if (gestoNuevo) {
        if (delta > 0 && i + 1 < paradas.length) {
          const finDeSeccion = arriba(paradas[i + 1]);
          // Abajo: se salta cuando el final de esta sección ya está en pantalla.
          if (window.scrollY + window.innerHeight >= finDeSeccion - MARGEN) {
            saltar(finDeSeccion);
            return;
          }
        }
        if (delta < 0 && i > 0) {
          const comienzo = arriba(paradas[i]);
          // Arriba: se salta cuando el comienzo de esta sección está pegado al
          // borde superior. Se aterriza en la ÚLTIMA pantalla de la anterior,
          // no en su principio, para no saltarse su contenido al volver.
          if (window.scrollY <= comienzo + MARGEN) {
            saltar(Math.max(arriba(paradas[i - 1]), comienzo - window.innerHeight));
            return;
          }
        }
      }

      const desde = corriendo ? destino : window.scrollY;
      destino = dentroDelPapel(desde + delta);
      if (!corriendo) { corriendo = true; requestAnimationFrame(paso); }
    }, { passive: false });

    // El teclado, las anclas y la barra lateral no pasan por aquí. Si mueven la
    // página por su cuenta, el destino tiene que seguirlas: si no, el siguiente
    // giro de rueda daría un salto hacia atrás, al punto donde se quedó.
    window.addEventListener('scroll', () => {
      if (!corriendo && !saltando) destino = window.scrollY;
    }, { passive: true });
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

  // El idioma ya está decidido cuando esto corre: el script de cambio va
  // incrustado en el HTML y se ejecuta antes. En las maquetas de revision/v no
  // existe, y la raíz sigue en español.
  const etiquetaAmpliar = raiz.lang === 'en' ? 'Enlarge screenshot' : 'Ampliar captura';

  document.querySelectorAll('[data-lightbox]').forEach((f) => {
    f.setAttribute('tabindex', '0');
    f.setAttribute('role', 'button');
    f.setAttribute('aria-label', etiquetaAmpliar);
    f.addEventListener('click', () => abrir(f));
    f.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(f); }
    });
  });
  lupaCerrar.addEventListener('click', cerrar);
  lupa.addEventListener('click', (e) => { if (e.target === lupa) cerrar(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !lupa.hidden) cerrar(); });
})();
