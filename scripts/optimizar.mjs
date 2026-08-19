// Convierte los pantallazos PNG a WebP en dos anchos (1x y 2x) para servirlos
// con srcset. Los PNG originales se quedan en assets/shots como fuente.
import sharp from 'sharp';
import { readdir, mkdir } from 'node:fs/promises';
import { join, basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const origen = join(raiz, 'assets', 'shots');
const destino = join(raiz, 'assets', 'img');
await mkdir(destino, { recursive: true });

// Todas las capturas de assets/shots entran en la web: las que salían vacías o
// duplicadas ya se descartaron antes de llegar aquí.
const INCLUIR = new Set([
  'prometeo-inicio', 'prometeo-modo-investigacion', 'prometeo-modo-3d',
  'prometeo-modo-entrenamiento', 'prometeo-modo-agentes', 'prometeo-cerebro',
  'prometeo-modo-imagenes', 'prometeo-modo-codigo', 'prometeo-modo-sistema',
  'prometeo-movil',
  'nexus-proyecto', 'nexus-acceso', 'nexus-salud', 'nexus-registros', 'nexus-ajustes',
  'iterum-app-dashboard', 'iterum-app-proyectos', 'iterum-app-calendario',
  'iterum-proyecto', 'iterum-acceso',
  'dnd-galeria-mapas', 'dnd-previsualizacion-mapas', 'dnd-tablero',
  'dnd-master', 'dnd-mapas', 'dnd-home', 'dnd-personaje',
]);

const ANCHOS = [{ sufijo: '', ancho: 1400 }, { sufijo: '@2x', ancho: 2400 }];

const archivos = (await readdir(origen)).filter((f) => f.endsWith('.png'));

for (const archivo of archivos) {
  const nombre = basename(archivo, '.png');
  if (!INCLUIR.has(nombre)) continue;

  for (const { sufijo, ancho } of ANCHOS) {
    const salida = join(destino, `${nombre}${sufijo}.webp`);
    await sharp(join(origen, archivo))
      .resize({ width: ancho, withoutEnlargement: true })
      .webp({ quality: 80, effort: 5 })
      .toFile(salida);
  }
  console.log(`✓ ${nombre}`);
}

console.log(`\nWebP en ${destino}`);
