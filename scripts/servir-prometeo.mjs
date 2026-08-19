// Sirve el dashboard de PROMETEO (Jarvis) como estático, solo para capturar
// pantallazos. No arranca el backend: la UI se pinta y las llamadas fetch
// fallan, que es justo lo que el overlay de arranque ya sabe manejar.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';

// 2026-08-13: se sirve MASTER, no el worktree. El núcleo nuevo (diamante
// facetado que se abre y suelta rayos) y la conexión con PROMETEO BRAIN se
// implantaron directamente en master; el worktree se quedó con el banco de
// pruebas de forma/textura, no con la versión buena.
const RAIZ = 'C:/Users/jorge.valero/Desktop/Proyectos/Jarvis/jarvis/ui';
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

createServer(async (req, res) => {
  const ruta = new URL(req.url, 'http://localhost').pathname;
  const destino = ruta === '/'
    ? join(RAIZ, 'templates', 'dashboard.html')
    : join(RAIZ, normalize(ruta).replace(/^[/\\]+/, ''));

  try {
    const cuerpo = await readFile(destino);
    res.writeHead(200, { 'Content-Type': TIPOS[extname(destino)] ?? 'application/octet-stream' });
    res.end(cuerpo);
  } catch {
    res.writeHead(404).end('no encontrado');
  }
}).listen(4444, () => console.log('PROMETEO estático en http://localhost:4444'));
