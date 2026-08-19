// Recorre los modos del dashboard de PROMETEO y captura cada uno, para elegir
// después cuáles entran en el portfolio.
//
// 2026-08-13: el núcleo nuevo se ABRE y se CIERRA en un ciclo de 5.7 s, y solo
// suelta rayos mientras se abre. Una captura suelta cae donde cae, y la mitad
// de las veces pillaría el cuerpo cerrado y sin descarga — el fotograma menos
// interesante de todos. Por eso ahora se toman DOS por modo separadas media
// vuelta de ciclo (2.85 s): sea cual sea la fase al empezar, una de las dos cae
// siempre en la mitad abierta. Se elige mirando.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destino = join(raiz, 'assets', 'shots');
await mkdir(destino, { recursive: true });

const MODOS = ['3d', 'agentes', 'entrenamiento', 'investigacion', 'imagenes', 'codigo', 'sistema'];

// channel: 'chromium' usa el navegador completo en el modo headless nuevo. Sin
// esto, launch() por defecto busca el "headless shell", que es una descarga
// aparte de la de `playwright install chromium` y aqui no estaba.
const navegador = await chromium.launch({ channel: 'chromium' });
const contexto = await navegador.newContext({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 2,
  colorScheme: 'dark',
});
const pagina = await contexto.newPage();

await pagina.goto('http://localhost:4444/', { waitUntil: 'domcontentloaded' });
// El overlay de arranque se retira solo en cuanto falla el primer fetch a
// /api/web/boot, que aquí no existe.
await pagina.waitForTimeout(6000);
const MEDIO_CICLO = 2850;   // media vuelta del ciclo de apertura del núcleo

async function capturarPar(nombre) {
  await pagina.screenshot({ path: join(destino, `${nombre}-a.png`) });
  await pagina.waitForTimeout(MEDIO_CICLO);
  await pagina.screenshot({ path: join(destino, `${nombre}-b.png`) });
  console.log(`✓ ${nombre} (a/b)`);
}

await capturarPar('prometeo-inicio');

for (const modo of MODOS) {
  const boton = pagina.locator(`.mode-btn[data-mode="${modo}"]`);
  try {
    await boton.click({ timeout: 8000 });
    await pagina.waitForTimeout(3500);
    await capturarPar(`prometeo-modo-${modo}`);
  } catch (error) {
    console.error(`✗ modo ${modo}: ${error.message.split('\n')[0]}`);
  }
}

await navegador.close();
console.log('\nListo.');
