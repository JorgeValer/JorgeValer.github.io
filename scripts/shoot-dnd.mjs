// Captura las pantallas internas de la mesa de D&D reutilizando una sesión de
// máster ya existente en mesa.db (solo lectura: no crea sesiones nuevas).
import { chromium } from 'playwright';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destino = join(raiz, 'assets', 'shots');
const BASE = 'http://localhost:3011';

// Identificadores de sesión de la mesa. Fuera del fichero a propósito: este
// repo se publica en GitHub Pages, y un token de sesión commiteado sigue
// siendo válido aunque el servidor solo escuche en localhost. Salen de
// `mesa.db`; la forma rápida de recuperarlos está en la bóveda, en el
// changelog de la mesa de D&D.
//
//   $env:DND_TOKEN_MASTER  = '...'
//   $env:DND_TOKEN_JUGADOR = '...'
//   $env:DND_PLAZA_JUGADOR = '...'
//   $env:DND_PARTIDA       = '...'
const faltan = ['DND_TOKEN_MASTER', 'DND_TOKEN_JUGADOR', 'DND_PLAZA_JUGADOR', 'DND_PARTIDA']
  .filter((n) => !process.env[n]);
if (faltan.length) {
  console.error(`Faltan variables de entorno: ${faltan.join(', ')}`);
  console.error('Ver el comentario al principio de este fichero.');
  process.exit(1);
}

const TOKEN_MASTER = process.env.DND_TOKEN_MASTER;
const TOKEN_JUGADOR = process.env.DND_TOKEN_JUGADOR;
const PLAZA_JUGADOR = process.env.DND_PLAZA_JUGADOR;
const PARTIDA = process.env.DND_PARTIDA;   // Crisis en la Casa Noble: 3 mapas, 12 fichas

const COMO_MASTER = [
  { id: 'dnd-master', ruta: '/master' },
  { id: 'dnd-tablero', ruta: `/partidas/${PARTIDA}/tablero` },
  { id: 'dnd-mapas', ruta: `/partidas/${PARTIDA}/mapas` },
  { id: 'dnd-pantalla', ruta: `/partidas/${PARTIDA}/pantalla` },
];

const COMO_JUGADOR = [
  { id: 'dnd-personaje', ruta: `/personaje/${PLAZA_JUGADOR}` },
];

const navegador = await chromium.launch();

async function capturar(objetivos, sesion) {
  const contexto = await navegador.newContext({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 2,
  });
  // La sesión vive en localStorage, así que hay que sembrarla antes de que
  // arranque el JS de la página — de ahí el addInitScript.
  await contexto.addInitScript((s) => {
    localStorage.setItem('dnd-session', JSON.stringify(s));
  }, sesion);

  for (const { id, ruta } of objetivos) {
    const pagina = await contexto.newPage();
    try {
      await pagina.goto(BASE + ruta, { waitUntil: 'load', timeout: 120000 });
      await pagina.waitForTimeout(7000);
      await pagina.screenshot({ path: join(destino, `${id}.png`), timeout: 90000 });
      console.log(`✓ ${id}  (${pagina.url().replace(BASE, '')})`);
    } catch (error) {
      console.error(`✗ ${id}: ${error.message.split('\n')[0]}`);
    }
    await pagina.close();
  }
  await contexto.close();
}

await capturar(COMO_MASTER, { token: TOKEN_MASTER, tipo: 'master', plazaId: null });
await capturar(COMO_JUGADOR, { token: TOKEN_JUGADOR, tipo: 'jugador', plazaId: PLAZA_JUGADOR });

await navegador.close();
console.log('\nListo.');
