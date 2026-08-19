// Captura NEXUS ya autenticado. El token vive solo en memoria y el refresh en
// una cookie httpOnly, así que no se puede inyectar sesión: hay que pasar por
// el formulario de acceso como un usuario real.
import { chromium } from 'playwright';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destino = join(raiz, 'assets', 'shots');
const BASE = 'http://localhost:5190';

// Las credenciales no se hardcodean: viven en la bóveda Obsidian (changelog de
// NEXUS). Pásalas por entorno:
//   NEXUS_EMAIL=... NEXUS_PASS=... node scripts/shoot-nexus.mjs
const EMAIL = process.env.NEXUS_EMAIL;
const PASS = process.env.NEXUS_PASS;
if (!EMAIL || !PASS) {
  console.error('Faltan NEXUS_EMAIL y NEXUS_PASS. Están en el changelog de NEXUS de la bóveda.');
  process.exit(1);
}

// FitFuel es el único proyecto con nombre y stack reales; el resto del
// workspace son artefactos de las suites e2e (`e2e-proj-…`, `runner-test-…`).
const PROYECTO = '6a601ad6c1cb8f5657304d2a';

const RUTAS = [
  { id: 'nexus-proyecto', ruta: `/projects/${PROYECTO}` },
  { id: 'nexus-salud', ruta: '/health' },
  { id: 'nexus-conocimiento', ruta: '/knowledge' },
  { id: 'nexus-registros', ruta: '/logs' },
  { id: 'nexus-ajustes', ruta: '/settings' },
];

const navegador = await chromium.launch();
const contexto = await navegador.newContext({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 2,
  colorScheme: 'dark',
});
const pagina = await contexto.newPage();

await pagina.goto(BASE, { waitUntil: 'domcontentloaded' });
await pagina.waitForTimeout(3000);

await pagina.fill('input[type="email"], input[name="email"]', EMAIL);
const campoClave = pagina.locator('input[type="password"]').first();
await campoClave.fill(PASS);
// Ojo: "Sign in" también es el nombre de la pestaña del selector superior, y
// un click por texto la golpea a ella. Enter sobre la contraseña envía el
// formulario sin ambigüedad.
await campoClave.press('Enter');

// El dashboard carga proyectos y estado de servicios tras autenticar.
await pagina.waitForTimeout(9000);
console.log('tras login ->', pagina.url());

const sigueEnLogin = await pagina.locator('input[type="password"]').count();
if (sigueEnLogin > 0) {
  console.error('No entró: el formulario sigue en pantalla.');
  console.error((await pagina.innerText('body')).slice(0, 300));
  await pagina.screenshot({ path: join(destino, '_nexus-fallo-login.png') });
  await navegador.close();
  process.exit(1);
}

for (const { id, ruta } of RUTAS) {
  try {
    await pagina.goto(BASE + ruta, { waitUntil: 'domcontentloaded' });
    await pagina.waitForTimeout(6000);
    await pagina.screenshot({ path: join(destino, `${id}.png`), timeout: 60000 });
    console.log(`✓ ${id}`);
  } catch (error) {
    console.error(`✗ ${id}: ${error.message.split('\n')[0]}`);
  }
}

await navegador.close();
console.log('\nListo.');
