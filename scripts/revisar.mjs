// Revisión visual propia del portfolio: captura la página a varias alturas y
// en móvil, y saca por consola cualquier error de consola o petición fallida.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destino = join(raiz, 'revision');
await mkdir(destino, { recursive: true });

const SITIO = 'http://localhost:4321/';

const navegador = await chromium.launch();
const contexto = await navegador.newContext({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 1,
});
const pagina = await contexto.newPage();

pagina.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLA:', m.text().slice(0, 200)); });
pagina.on('pageerror', (e) => console.log('ERROR JS:', String(e).slice(0, 250)));
pagina.on('requestfailed', (r) => console.log('FALLO RED:', r.url().slice(-70), r.failure()?.errorText));
pagina.on('response', (r) => { if (r.status() >= 400) console.log('HTTP', r.status(), r.url().slice(-70)); });

await pagina.goto(SITIO, { waitUntil: 'networkidle' });
await pagina.waitForTimeout(2500);

// Desbordamiento horizontal: el fallo de maquetación más común y más feo.
const desborde = await pagina.evaluate(() =>
  document.documentElement.scrollWidth - document.documentElement.clientWidth);
console.log('Desborde horizontal (px):', desborde);

const secciones = ['portada', 'prometeo', 'nexus', 'iterum', 'mesa', 'perfil', 'contacto'];

await pagina.screenshot({ path: join(destino, '00-portada.png') });

for (const id of secciones.slice(1)) {
  await pagina.evaluate((sel) => {
    document.getElementById(sel)?.scrollIntoView({ behavior: 'instant', block: 'start' });
  }, id);
  await pagina.waitForTimeout(1800);
  await pagina.screenshot({ path: join(destino, `${id}.png`) });
  const acento = await pagina.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--acento').trim());
  console.log(`${id.padEnd(10)} acento=${acento}`);
}

// Móvil
const movil = await navegador.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const pmovil = await movil.newPage();
await pmovil.goto(SITIO, { waitUntil: 'networkidle' });
await pmovil.waitForTimeout(2000);
const desbordeMovil = await pmovil.evaluate(() =>
  document.documentElement.scrollWidth - document.documentElement.clientWidth);
console.log('Desborde horizontal móvil (px):', desbordeMovil);
await pmovil.screenshot({ path: join(destino, 'movil-portada.png') });
await pmovil.evaluate(() => document.getElementById('mesa')?.scrollIntoView());
await pmovil.waitForTimeout(1500);
await pmovil.screenshot({ path: join(destino, 'movil-mesa.png') });

await navegador.close();
console.log('\nRevisión en', destino);
