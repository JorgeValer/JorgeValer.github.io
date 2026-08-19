// Captura pantallazos reales de los proyectos con Playwright.
// Uso: node scripts/shoot.mjs [nombre-del-grupo]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destino = join(raiz, 'assets', 'shots');
mkdirSync(destino, { recursive: true });

const PROYECTOS = resolve(raiz, '..');
const archivo = (p) => pathToFileURL(join(PROYECTOS, p)).href;

const GRUPOS = {
  dnd: [
    { id: 'dnd-home', url: 'http://localhost:3011/' },
    { id: 'dnd-mapa', url: 'http://localhost:3011/mapa' },
    { id: 'dnd-master', url: 'http://localhost:3011/master' },
    { id: 'dnd-crear-personaje', url: 'http://localhost:3011/personajes/crear' },
    { id: 'dnd-mis-personajes', url: 'http://localhost:3011/mis-personajes' },
    { id: 'dnd-galeria-mapas', url: archivo('dnd/galeria-mapas.html') },
    { id: 'dnd-previsualizacion-mapas', url: archivo('dnd/previsualizacion-mapas.html') },
  ],
  nexus: [
    { id: 'nexus-dashboard', url: 'http://localhost:5190/' },
    { id: 'nexus-health', url: 'http://localhost:5190/health' },
    { id: 'nexus-knowledge', url: 'http://localhost:5190/knowledge' },
    { id: 'nexus-rag', url: 'http://localhost:5190/rag' },
    { id: 'nexus-logs', url: 'http://localhost:5190/logs' },
    { id: 'nexus-settings', url: 'http://localhost:5190/settings' },
  ],
  iterum: [
    { id: 'iterum-acceso', url: 'http://localhost:5174/' },
  ],
  jarvis: [
    { id: 'jarvis-dashboard', url: 'http://localhost:4444/' },
    { id: 'jarvis-standalone', url: archivo('Jarvis/standalone.html') },
  ],
};

const grupoPedido = process.argv[2];
const objetivos = grupoPedido
  ? (GRUPOS[grupoPedido] ?? [])
  : Object.values(GRUPOS).flat();

if (objetivos.length === 0) {
  console.error(`Grupo desconocido: ${grupoPedido}. Disponibles: ${Object.keys(GRUPOS).join(', ')}`);
  process.exit(1);
}

const navegador = await chromium.launch();
const contexto = await navegador.newContext({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 2,
  colorScheme: 'dark',
});

for (const { id, url } of objetivos) {
  const pagina = await contexto.newPage();
  try {
    await pagina.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
  } catch {
    // networkidle no llega en apps con polling/SSE: seguimos con lo que haya pintado.
    console.warn(`  (sin networkidle) ${id}`);
  }
  // Margen para animaciones de entrada y carga diferida.
  await pagina.waitForTimeout(3500);
  const salida = join(destino, `${id}.png`);
  try {
    await pagina.screenshot({ path: salida, timeout: 90000, caret: 'hide' });
    console.log(`✓ ${id}`);
  } catch (error) {
    console.error(`✗ ${id}: ${error.message.split('\n')[0]}`);
  }
  await pagina.close();
}

await navegador.close();
console.log(`\nCapturas en ${destino}`);
