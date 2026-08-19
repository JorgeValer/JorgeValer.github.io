// Captura el portal de cliente de ITERUM ya autenticado con un código real.
import { chromium } from 'playwright';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destino = join(raiz, 'assets', 'shots');
const PORTAL = 'http://localhost:5176';
const CODIGO = process.argv[2] ?? '1E3AA7';

const navegador = await chromium.launch();
const contexto = await navegador.newContext({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 2,
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
