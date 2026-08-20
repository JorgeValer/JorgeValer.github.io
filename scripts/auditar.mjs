// Auditoría de composición del portfolio: busca fallos que se ven mal pero no
// rompen nada, así que ninguna prueba normal los detecta. Nació de uno real —la
// máscara del revelado recortaba la cola de la J del nombre y se leía como una
// l— y desde entonces cubre las demás familias del mismo estilo.
//
//   npm run auditar
//   node scripts/auditar.mjs --url http://localhost:4321/ --anchos 393,768,1680
//
// Devuelve 0 si está limpio y 1 si hay fallos, para poder encadenarlo.
//
// AUTOCOMPROBACIÓN: antes de auditar nada, inyecta un elemento con el fallo
// exacto de la J y verifica que salta. Sin eso, un "cero hallazgos" no
// distingue entre una página limpia y una sonda rota, que es justo el error que
// hace inútil a una herramienta como esta.

import { chromium } from 'playwright';

/* ── Opciones ──────────────────────────────────────────────────────────── */
const arg = (nombre, pordefecto) => {
  const i = process.argv.indexOf(`--${nombre}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : pordefecto;
};

const SITIO = arg('url', 'http://localhost:4321/');
const ANCHOS = arg('anchos', '393,768,950,1680').split(',').map(Number);
const JSON_SALIDA = process.argv.includes('--json');

// 950 no es capricho: es justo por encima del punto donde aparece el raíl
// lateral, el ancho con más papeletas de que algo colisione.
const ALTO = { 393: 852, 768: 1024, 950: 800, 1280: 800, 1680: 1050 };

/* ── Sonda: se ejecuta dentro de la página ─────────────────────────────── */
const AUDITAR = () => {
  const hallazgos = [];
  const anota = (nivel, tipo, donde, detalle) => hallazgos.push({ nivel, tipo, donde, detalle });

  const nombra = (el) => el.tagName.toLowerCase() +
    (typeof el.className === 'string' && el.className.trim()
      ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');

  const seVe = (el) => {
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' &&
           +cs.opacity > 0.01 && el.offsetParent !== null;
  };
  const tieneTextoPropio = (el) =>
    [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  const textoPropio = (el) =>
    [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();

  const todos = [...document.querySelectorAll('body *')].filter(seVe);

  /* ── Medición de TINTA, no de caja ───────────────────────────────────
     Range.getBoundingClientRect() devuelve la caja métrica de la fuente, que
     incluye el hueco de ascendente y descendente que la fuente reserva pero no
     pinta. Con line-height ajustado esas cajas se solapan siempre aunque las
     letras ni se rocen, y da falsos positivos constantes. measureText sí
     devuelve la extensión real de la tinta. */
  const lienzo = document.createElement('canvas').getContext('2d');
  const tintaDe = (texto, cs) => {
    lienzo.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} / ${cs.lineHeight} ${cs.fontFamily}`;
    const m = lienzo.measureText(texto);
    return { sube: m.actualBoundingBoxAscent, baja: m.actualBoundingBoxDescent };
  };
  // Dónde cae la línea base dentro de la caja del elemento.
  const lineaBase = (el) => {
    const sonda = document.createElement('span');
    sonda.textContent = 'x';
    sonda.style.cssText = 'display:inline-block;width:0;overflow:hidden;';
    el.appendChild(sonda);
    const y = sonda.getBoundingClientRect().bottom;
    sonda.remove();
    return y;
  };

  for (const el of todos) {
    const cs = getComputedStyle(el);
    const caja = el.getBoundingClientRect();
    if (!caja.height) continue;

    const recorta = ['hidden', 'clip'].includes(cs.overflowY) ||
                    ['hidden', 'clip'].includes(cs.overflow);

    /* 1 · Tinta comida por un overflow oculto — el fallo de la J.
       Se miran también los descendientes, no sólo el texto propio: en el caso
       original quien recortaba era .mascara mientras el texto vivía en un span
       de dentro. Mirar sólo el texto propio dejaba escapar justo ese fallo. */
    if (recorta) {
      const portadores = [el, ...el.querySelectorAll('*')]
        .filter((x) => tieneTextoPropio(x) && seVe(x));
      for (const p of portadores) {
        const t = textoPropio(p);
        if (!t) continue;
        const { sube, baja } = tintaDe(t, getComputedStyle(p));
        const base = lineaBase(p);
        const fueraAbajo = +((base + baja) - caja.bottom).toFixed(1);
        const fueraArriba = +(caja.top - (base - sube)).toFixed(1);
        const via = p === el ? nombra(el) : `${nombra(el)} › ${nombra(p)}`;
        if (fueraAbajo > 1) anota('fallo', 'TINTA RECORTADA ABAJO', via, `${fueraAbajo}px de descendentes fuera de la ventana — «${t.slice(0, 30)}»`);
        if (fueraArriba > 1) anota('fallo', 'TINTA RECORTADA ARRIBA', via, `${fueraArriba}px por encima — «${t.slice(0, 30)}»`);
      }
    }

    /* 2 · Contenido que no cabe en su propia caja y queda cortado */
    if (recorta && el.scrollHeight - el.clientHeight > 2 && !el.classList.contains('mascara')) {
      anota('aviso', 'CONTENIDO CORTADO', nombra(el), `${el.scrollHeight - el.clientHeight}px de más en vertical`);
    }
    if ((['hidden', 'clip'].includes(cs.overflowX) || ['hidden', 'clip'].includes(cs.overflow)) &&
        el.scrollWidth - el.clientWidth > 2 && !['BODY', 'HTML'].includes(el.tagName)) {
      anota('aviso', 'CORTADO A LO ANCHO', nombra(el), `${el.scrollWidth - el.clientWidth}px de más en horizontal`);
    }

    /* 3 · Texto demasiado pequeño para leerse */
    if (tieneTextoPropio(el) && parseFloat(cs.fontSize) < 10) {
      anota('fallo', 'TEXTO ILEGIBLE', nombra(el), `${cs.fontSize} — «${textoPropio(el).slice(0, 30)}»`);
    }
  }

  /* 4 · Tinta de líneas apiladas que se toca */
  const apilados = '.portada__nombre, .proyecto__titulo, .perfil__titulo, .contacto__correo';
  for (const bloque of document.querySelectorAll(apilados)) {
    const lineas = [...bloque.querySelectorAll('.mascara > span')];
    for (let i = 0; i < lineas.length - 1; i++) {
      const [a, b] = [lineas[i], lineas[i + 1]];
      const ta = tintaDe(a.textContent.trim(), getComputedStyle(a));
      const tb = tintaDe(b.textContent.trim(), getComputedStyle(b));
      const hueco = +((lineaBase(b) - tb.sube) - (lineaBase(a) + ta.baja)).toFixed(1);
      if (hueco < 0) anota('fallo', 'TINTA SOLAPADA', nombra(bloque), `«${a.textContent.trim()}» y «${b.textContent.trim()}» se pisan ${-hueco}px`);
      else if (hueco < 4) anota('aviso', 'TINTA AL LÍMITE', nombra(bloque), `sólo ${hueco}px entre «${a.textContent.trim()}» y «${b.textContent.trim()}»`);
    }
  }

  /* 5 · Contraste del texto contra el fondo que tiene detrás */
  const aLineal = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const luminancia = ([r, g, b]) => 0.2126 * aLineal(r / 255) + 0.7152 * aLineal(g / 255) + 0.0722 * aLineal(b / 255);
  const aRGB = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
  const fondoDe = (el) => {
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const c = getComputedStyle(n).backgroundColor;
      const alfa = (c.match(/[\d.]+/g) || [])[3];
      if (c && c !== 'rgba(0, 0, 0, 0)' && alfa !== '0') return aRGB(c);
    }
    return aRGB(getComputedStyle(document.body).backgroundColor) || [8, 8, 10];
  };
  for (const el of todos) {
    if (!tieneTextoPropio(el)) continue;
    const cs = getComputedStyle(el);
    const [f, b] = [aRGB(cs.color), fondoDe(el)];
    if (f.length < 3 || b.length < 3) continue;
    const [alta, baja] = [luminancia(f), luminancia(b)].sort((x, y) => y - x);
    const ratio = (alta + 0.05) / (baja + 0.05);
    const px = parseFloat(cs.fontSize);
    const esGrande = px >= 24 || (px >= 18.66 && +cs.fontWeight >= 700);
    const minimo = esGrande ? 3 : 4.5;
    if (ratio < minimo) anota('fallo', 'CONTRASTE BAJO', nombra(el), `${ratio.toFixed(2)}:1 a ${px}px, pide ${minimo}`);
  }

  /* 6 · Imágenes: recorte no buscado y alt */
  for (const img of document.querySelectorAll('img')) {
    const src = img.getAttribute('src');
    if (!src) continue;
    const caja = img.getBoundingClientRect();
    if (img.complete && !img.naturalWidth) { anota('fallo', 'IMAGEN ROTA', src.split('/').pop(), 'no carga'); continue; }
    if (!caja.height) continue;
    const alt = img.getAttribute('alt');
    if (alt === null) anota('fallo', 'SIN ALT', src.split('/').pop(), 'falta el atributo');
    else if (!alt.trim() && !img.closest('.lupa')) anota('aviso', 'ALT VACÍO', src.split('/').pop(), 'alt=""');

    // Con object-fit:cover cualquier desvío de proporción recorta imagen. En
    // capturas de interfaz eso se come barras de estado y menús.
    if (getComputedStyle(img).objectFit === 'cover') {
      const nat = img.naturalWidth / img.naturalHeight;
      const vis = caja.width / caja.height;
      const desvio = Math.abs(nat - vis) / nat;
      if (desvio > 0.02) anota('aviso', 'IMAGEN RECORTADA', src.split('/').pop(), `nativa ${nat.toFixed(3)} vs caja ${vis.toFixed(3)}, se pierde ~${Math.round(desvio * 100)}%`);
    }
  }

  /* 7 · Capas fijas que tapan texto */
  const fijos = todos.filter((el) => {
    const cs = getComputedStyle(el);
    return cs.position === 'fixed' && cs.pointerEvents !== 'none' &&
           !el.closest('.lupa') && !el.classList.contains('saltar');
  });
  const textos = [...document.querySelectorAll('p,li,h1,h2,h3,dd,dt,figcaption,a')]
    .filter((el) => el.offsetParent !== null && el.textContent.trim());
  for (const f of fijos) {
    const cf = f.getBoundingClientRect();
    if (!cf.width || !cf.height) continue;
    for (const t of textos) {
      if (f.contains(t)) continue;
      const ct = t.getBoundingClientRect();
      if (ct.bottom < 0 || ct.top > innerHeight) continue;
      const v = Math.min(cf.bottom, ct.bottom) - Math.max(cf.top, ct.top);
      const h = Math.min(cf.right, ct.right) - Math.max(cf.left, ct.left);
      if (v > 4 && h > 4) { anota('fallo', 'CAPA FIJA TAPA TEXTO', nombra(f), `pisa ${nombra(t)} en ${Math.round(h)}x${Math.round(v)}px`); break; }
    }
  }

  /* 8 · Zonas de toque, sólo donde se navega con el dedo */
  if (innerWidth <= 820) {
    for (const a of document.querySelectorAll('a, button, [role="button"]')) {
      if (a.offsetParent === null || a.closest('.lupa')) continue;
      const c = a.getBoundingClientRect();
      if (!c.height) continue;
      if (c.height < 24 || c.width < 24) {
        anota('fallo', 'ZONA DE TOQUE PEQUEÑA', nombra(a), `${Math.round(c.width)}x${Math.round(c.height)}px, mínimo 24`);
      }
    }
  }

  /* 9 · Estructura y accesibilidad básica */
  const niveles = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((x) => +x.tagName[1]);
  const cuantosH1 = niveles.filter((n) => n === 1).length;
  if (cuantosH1 !== 1) anota('fallo', 'ENCABEZADOS', 'documento', `hay ${cuantosH1} h1, debe haber 1`);
  for (let i = 1; i < niveles.length; i++) {
    if (niveles[i] - niveles[i - 1] > 1) anota('aviso', 'ENCABEZADOS', 'documento', `salto de h${niveles[i - 1]} a h${niveles[i]}`);
  }
  for (const a of document.querySelectorAll('a')) {
    if (a.offsetParent === null) continue;
    if (!((a.textContent || '').trim() || a.getAttribute('aria-label') || a.getAttribute('title'))) {
      anota('fallo', 'ENLACE SIN NOMBRE', nombra(a), a.getAttribute('href') || '');
    }
  }
  for (const el of document.querySelectorAll('p,li,dd,figcaption,a')) {
    if (el.offsetParent === null) continue;
    const larga = (el.textContent.match(/\S{28,}/g) || [])[0];
    const cs = getComputedStyle(el);
    if (larga && cs.overflowWrap === 'normal' && cs.wordBreak === 'normal') {
      anota('aviso', 'PALABRA MUY LARGA', nombra(el), `«${larga.slice(0, 30)}» sin overflow-wrap`);
    }
  }

  return hallazgos;
};

// El cebo reproduce el fallo original: caja de línea más baja que la tinta y
// recortada por overflow. Si la sonda no lo caza, es que está rota.
const CEBO = () => {
  const d = document.createElement('div');
  d.className = 'cebo-de-autocomprobacion';
  d.textContent = 'Jorge gjpqy';
  d.style.cssText = 'font:400 120px/0.7 "Instrument Serif",Georgia,serif;overflow:hidden;position:absolute;top:0;left:0;';
  document.body.appendChild(d);
};

/* ── Ejecución ─────────────────────────────────────────────────────────── */
const prepara = async (pagina) => {
  await pagina.goto(SITIO, { waitUntil: 'networkidle' });
  // Recorre la página para disparar la carga perezosa y dar por terminado el
  // revelado; auditar a media animación mide posiciones que no son las finales.
  await pagina.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 45));
    }
    window.scrollTo(0, 0);
    document.querySelectorAll('.revelar').forEach((e) => e.classList.add('dentro'));
  });
  await pagina.waitForTimeout(2000);
};

const navegador = await chromium.launch();
const informe = [];
let fallos = 0;

/* Autocomprobación */
{
  const pagina = await navegador.newPage({ viewport: { width: 1680, height: 1050 } });
  await pagina.goto(SITIO, { waitUntil: 'networkidle' });
  await pagina.waitForTimeout(1000);
  await pagina.evaluate(CEBO);
  const r = await pagina.evaluate(AUDITAR);
  const cazado = r.find((x) => x.donde.includes('cebo-de-autocomprobacion'));
  if (!JSON_SALIDA) {
    console.log(cazado
      ? `autocomprobación · OK — la sonda caza el cebo (${cazado.tipo})`
      : 'autocomprobación · FALLA — la sonda está ciega, no te fíes de lo que venga debajo');
  }
  if (!cazado) { await navegador.close(); process.exit(2); }
  await pagina.close();
}

for (const ancho of ANCHOS) {
  const pagina = await navegador.newPage({
    viewport: { width: ancho, height: ALTO[ancho] || 900 },
    deviceScaleFactor: 2,
  });
  const red = [];
  pagina.on('pageerror', (e) => red.push({ nivel: 'fallo', tipo: 'ERROR JS', donde: 'página', detalle: String(e).slice(0, 140) }));
  pagina.on('console', (m) => { if (m.type() === 'error') red.push({ nivel: 'fallo', tipo: 'ERROR DE CONSOLA', donde: 'página', detalle: m.text().slice(0, 140) }); });
  pagina.on('response', (r) => { if (r.status() >= 400) red.push({ nivel: 'fallo', tipo: 'HTTP ' + r.status(), donde: r.url().split('/').pop(), detalle: '' }); });

  await prepara(pagina);

  const desborde = await pagina.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const propios = await pagina.evaluate(AUDITAR);
  const todos = [
    ...red,
    ...(desborde > 0 ? [{ nivel: 'fallo', tipo: 'DESBORDE HORIZONTAL', donde: 'documento', detalle: `${desborde}px` }] : []),
    ...propios,
  ];

  informe.push({ ancho, hallazgos: todos });
  fallos += todos.filter((x) => x.nivel === 'fallo').length;

  if (!JSON_SALIDA) {
    console.log(`\n──── ${ancho}px`);
    if (!todos.length) console.log('  limpio');
    for (const x of todos) {
      console.log(`  ${x.nivel === 'fallo' ? '✕' : '~'} [${x.tipo}] ${x.donde}${x.detalle ? ' — ' + x.detalle : ''}`);
    }
  }
  await pagina.close();
}

await navegador.close();

if (JSON_SALIDA) {
  console.log(JSON.stringify({ sitio: SITIO, informe, fallos }, null, 2));
} else {
  const avisos = informe.flatMap((x) => x.hallazgos).filter((x) => x.nivel === 'aviso').length;
  console.log(`\n════ ${fallos} fallo(s) y ${avisos} aviso(s) en ${ANCHOS.length} anchos`);
}

process.exit(fallos > 0 ? 1 : 0);
