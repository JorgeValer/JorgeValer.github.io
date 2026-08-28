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

await pagina.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' });
// El overlay de arranque se retira solo en cuanto falla el primer fetch a
// /api/web/boot, que aquí no existe.
await pagina.waitForTimeout(6000);
//: Sora ENTERO. Antes entraba un busto y lo que se veia era la cara, que
//: es justo lo que peor sale del generador. Esta ademas se apoya en su
//: base, asi que la rejilla del suelo no la atraviesa.
const MALLA = process.env.MALLA || '8b0905d6a7ad6a8e';
const PREGUNTA = process.env.PREGUNTA || 'Resume en dos frases que eres y que sabes hacer.';
//: pares dx,dy de arrastre sobre el lienzo. Agumon entero ya viene en Z
//: arriba, asi que por defecto no se gira nada.
const GIROS = JSON.parse(process.env.GIROS || '[[0,-45]]');
//: clics de rueda para alejar la camara tras cargar la malla.
const ALEJAR = Number(process.env.ALEJAR ?? 0);
const MEDIO_CICLO = 2850;   // media vuelta del ciclo de apertura del núcleo

async function capturarPar(nombre) {
  await pagina.screenshot({ path: join(destino, `${nombre}-a.png`) });
  await pagina.waitForTimeout(MEDIO_CICLO);
  await pagina.screenshot({ path: join(destino, `${nombre}-b.png`) });
  console.log(`✓ ${nombre} (a/b)`);
}

// El transcript guarda lo ultimo que se hablo con PROMETEO, y en la portada
// salia una NEGATIVA de una prueba vieja ("no tengo acceso a las camaras").
// Se limpia y se hace UNA pregunta de verdad por la interfaz, para que lo que
// se vea sea el sistema respondiendo, no excusandose.
await pagina.evaluate(() => document.getElementById('msgs')?.replaceChildren());
await pagina.fill('#cmd', PREGUNTA);
await pagina.keyboard.press('Enter');
// La respuesta la da un modelo local; el p50 medido ronda los 8 s.
await pagina.waitForTimeout(30000);

await capturarPar('prometeo-inicio');

for (const modo of MODOS) {
  const boton = pagina.locator(`.mode-btn[data-mode="${modo}"]`);
  try {
    await boton.click({ timeout: 8000 });
    await pagina.waitForTimeout(3500);
    // El visor 3D arranca vacio ("esperando una malla"), que es el fotograma
    // menos util del modo. Cargar la primera malla de "Ultimos modelos" ensena
    // lo que el modo hace de verdad. Si no hay ninguna, se captura igual.
    if (modo === '3d') {
      // Solo las fichas STL traen boton "Ver": el visor usa STLLoader y un
      // .3mf no lo carga. Por eso se busca el boton y no la tarjeta.
      // Se carga por id y no pulsando la primera tarjeta: la primera es un
      // busto, y la CARA es justo lo que peor sale del generador. Aqui entra
      // la figura entera, que es la que se imprimio.
      try {
        await pagina.evaluate(async (u) => {
          window.Viewport3D.init();
          window.Viewport3D.clear();
          await window.Viewport3D.loadSTL([u]);
        }, `/api/web/gen3d/modelo/${MALLA}`);
        await pagina.waitForTimeout(12000);  // cargar y encuadrar la malla
      } catch { console.error('  (no se pudo cargar la malla)'); }
      // Orientacion: el visor gira -90 dando por hecho STL en Z arriba, y el
      // exportador NO fija convencion (hay mallas mas largas en X, en Y y en
      // Z). Una que ya viene en Z arriba entra derecha y no hay que tocarla;
      // una tumbada se endereza girando la orbita. Los arrastres se pasan por
      // entorno para no cocinar en el guion el caso de una malla concreta.
      // El encuadre automatico deja la figura entera demasiado cerca y le
      // corta el cuerpo; unos clics de rueda la meten completa.
      for (let i = 0; i < ALEJAR; i++) {
        await pagina.mouse.move(808, 470);
        await pagina.mouse.wheel(0, 240);
        await pagina.waitForTimeout(250);
      }
      await pagina.waitForTimeout(800);
      for (const [dx, dy] of GIROS) {
        await pagina.mouse.move(808, 470);
        await pagina.mouse.down();
        await pagina.mouse.move(808 + dx, 470 + dy, { steps: 16 });
        await pagina.mouse.up();
        await pagina.waitForTimeout(1000);
      }
      // El clic arrastra la barra lateral hasta la tarjeta y deja los botones
      // de modo fuera del encuadre. Devolverla arriba antes de disparar.
      await pagina.evaluate(() => document.querySelectorAll('.sidebar, .rail, aside, .panel-col')
        .forEach(e => { e.scrollTop = 0; }));
      await pagina.waitForTimeout(600);
    }
    await capturarPar(`prometeo-modo-${modo}`);
  } catch (error) {
    console.error(`✗ modo ${modo}: ${error.message.split('\n')[0]}`);
  }
}

await navegador.close();
console.log('\nListo.');
