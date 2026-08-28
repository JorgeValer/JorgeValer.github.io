// Captura el portal de cliente de ITERUM ya autenticado con un código real.
import { chromium } from 'playwright';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destino = join(raiz, 'assets', 'shots');
const PORTAL = 'http://localhost:5173';
const CODIGO = process.argv[2] ?? '1E3AA7';

const navegador = await chromium.launch();
const contexto = await navegador.newContext({
  // El portal centra una columna de ancho fijo: a 1600 px de viewport la
  // captura salia medio vacia. Un lienzo mas estrecho da la MISMA imagen final
  // de 3200x2000 (el 8:5 que pide la rejilla del portfolio) con la columna
  // ocupando bastante mas.
  viewport: { width: 1200, height: 750 },
  deviceScaleFactor: 8 / 3,
  colorScheme: 'dark',
});
const pagina = await contexto.newPage();

await pagina.goto(PORTAL, { waitUntil: 'load' });
await pagina.waitForTimeout(1500);
await pagina.fill('input', CODIGO);
await pagina.screenshot({ path: join(destino, 'iterum-acceso.png') });

await pagina.click('button');
// El portal pide el proyecto tras validar el código; damos margen a la petición.
await pagina.waitForTimeout(6000);
await pagina.screenshot({ path: join(destino, 'iterum-proyecto.png') });
console.log('URL final:', pagina.url());
console.log('Texto:', (await pagina.innerText('body')).slice(0, 400));

// Vista completa de la página, útil si el contenido desborda el viewport.
await pagina.screenshot({ path: join(destino, 'iterum-proyecto-completo.png'), fullPage: true });

await navegador.close();
console.log('\nListo.');
