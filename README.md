# Portfolio — Jorge Valero

Sitio estático, sin build ni dependencias en tiempo de ejecución. Se abre
directamente o se sirve como carpeta plana.

```bash
npx serve -l 4321 .    # http://localhost:4321
```

## Qué hace falta para desplegar

Solo esto:

```
index.html
assets/css/estilo.css
assets/js/main.js
assets/fonts/          # Instrument Serif + JetBrains Mono, vendorizadas
assets/img/            # capturas en WebP (2,4 MB en total)
```

`assets/shots/` (los PNG originales a 3200×2000) y `scripts/` **no** hacen falta
en producción: son el material de origen para regenerar las imágenes.

Vale para GitHub Pages, Netlify, Vercel o cualquier hosting estático tal cual,
sin configuración.

## Las capturas

Todas están tomadas de las aplicaciones reales en ejecución — no son maquetas.
`scripts/shoot.mjs` levanta Playwright contra cada app y guarda el PNG;
`scripts/optimizar.mjs` los pasa a WebP en dos anchos para el `srcset`.

| Proyecto | Cómo se capturó |
|---|---|
| Prometeo | `scripts/servir-prometeo.mjs` sirve la UI **de `master`** en `:4444`; `scripts/shoot-prometeo.mjs` recorre los modos, cada uno con su propio tema, y captura dos fotogramas de cada uno. |
| Nexus | `scripts/shoot-nexus.mjs` hace login por el formulario en `:5190` contra el contenedor `nexus-api` (`:3900`) y entra al detalle del proyecto FitFuel. |
| Iterum | La **app de escritorio** con Metro en modo desarrollo (ver abajo), más el portal de cliente contra el contenedor `iterum-backend` (`:4000`). |
| Mesa D&D | Servidor Next en `:3011` reutilizando una sesión de máster ya existente en `mesa.db`, en solo lectura. |

### Qué versión de Prometeo se fotografía

**`master`**, desde el 2026-08-13. Hasta entonces la interfaz buena vivía en el
worktree `.claude/worktrees/prometeo-core3d` y `servir-prometeo.mjs` apuntaba
allí; el núcleo nuevo ya está en `master`, así que el worktree no es la
referencia.

El núcleo respira: se abre y se cierra en un ciclo de 5,7 s. Por eso
`shoot-prometeo.mjs` captura **dos fotogramas de cada pantalla separados
2850 ms** (`-a` y `-b`) y se elige a mano el que mejor enseña el facetado — con
uno solo puede tocar el núcleo cerrado.

`standalone.html` de la raíz del repo es una UI antigua a la que no llegó el
rebrand — sigue diciendo "JARVIS". No se usa en el portfolio.

### La app de escritorio de Iterum

Es React Native for Windows, así que no se puede fotografiar con Playwright.
El procedimiento fue:

```powershell
# 1. Registrar el build de desarrollo ya compilado
Add-AppxPackage -Register "...\frontend\windows\x64\Debug\iterum-frontend\AppX\AppxManifest.xml"

# 2. Permitir a la app UWP hablar con localhost
CheckNetIsolation.exe LoopbackExempt -a -n=3834bdd0-0e82-4062-a986-f61aecf1097f_0w2ygeajt7pft

# 3. Metro sirviendo el código actual (config.js -> http://localhost:4000/api)
cd ...\TFG-main\frontend && npx react-native start

# 4. Lanzar y capturar
Start-Process "shell:AppsFolder\3834bdd0-0e82-4062-a986-f61aecf1097f_0w2ygeajt7pft!App"
powershell -File scripts\capturar-ventana.ps1 -Titulo "Iterum" -Salida "assets\shots\iterum-app.png"
```

`scripts/clic-ventana.ps1` navega por coordenadas cuando hace falta cambiar de
pantalla. Las capturas se recortan (barra de título de Windows) y se rellenan
hasta 8:5 antes de convertirlas.

Credenciales de la app: cualquiera de los admins que siembra `seed-admins.js`
en el repo de Iterum. **No se copian aquí**: este README es público desde que
el portfolio se publica en GitHub Pages, y unas credenciales en un fichero de
un repo público las indexa Google. Igual que las de NEXUS, viven en la bóveda
Obsidian, en el changelog del proyecto.

Para desinstalar la app registrada:

```powershell
Get-AppxPackage *3834bdd0* | Remove-AppxPackage
```

### Credenciales de NEXUS

No están en este repo a propósito: viven en la bóveda Obsidian, en el
changelog del proyecto NEXUS. Ahí está el usuario admin con el que se hicieron
estas capturas.

> Cuidado: hay **dos** MongoDB distintos en la máquina — el servicio nativo de
> Windows y el contenedor `nexus-mongo`, ambos accesibles por `127.0.0.1:27017`
> según quién gane el puerto. La API en Docker usa **el del contenedor**, y su
> `admin@nexus.local` es un registro distinto (con otra contraseña) del que
> tiene el Mongo nativo. Confundirlos cuesta una hora.

Los scripts necesitan `playwright` y `sharp`. La forma rápida es enlazar los
`node_modules` de `../dnd`, que ya los tiene instalados:

```powershell
cmd /c mklink /J node_modules ..\dnd\node_modules
```

> Ya no hace falta: desde el 2026-08-13 `playwright` y `sharp` son dependencias
> del propio proyecto, así que basta `npm install` (más
> `npx playwright install chromium` la primera vez). El enlace queda documentado
> por si se quiere ahorrar el espacio.

> Si se usa el enlace, hazlo con `mklink /J` desde cmd o PowerShell, **no** con
> `ln -s` desde git-bash: allí `ln -s` no crea un enlace sino una copia real
> (540 MB).

## Para regenerar las imágenes

```bash
node scripts/servir-prometeo.mjs       # sirve la UI de Prometeo en :4444
node scripts/shoot-prometeo.mjs         # núcleo + todos los modos
node scripts/shoot-nexus.mjs           # login real + detalle de proyecto + salud
node scripts/shoot-dnd.mjs             # pantallas internas de la mesa
node scripts/shoot-iterum.mjs EA0BE2   # portal de cliente con un código
node scripts/shoot.mjs                 # capturas sueltas por grupo
node scripts/optimizar.mjs             # PNG -> WebP (1x y 2x)
node scripts/revisar.mjs               # revisión visual del sitio + errores de consola
npm run auditar                        # auditoría de composición (ver más abajo)
```

Los puertos están al principio de cada script: hay que ajustarlos si levantas
las apps en otros. `optimizar.mjs` tiene la lista blanca `INCLUIR` — si añades
una captura nueva, mételo ahí o no se convertirá.

## Notas de diseño

- **Tipografía**: Instrument Serif para el display y Georgia para el cuerpo de
  texto; JetBrains Mono queda para metadatos, etiquetas y fichas de datos. El
  cuerpo en mono ligero se leía a web de dev, no a portfolio profesional.
  Instrument Serif y JetBrains Mono van vendorizadas en local, sin CDN.
- **Composición**: márgenes anchos, el numeral de cada proyecto fuera de la
  columna de texto como folio de revista, capturas sin marco y una ficha de
  datos por proyecto (año, rol, superficie, estado).
- **Color**: un acento por proyecto —Prometeo naranja, Nexus morado, Iterum
  azul marino, Mesa de D&D oro— que además **tiñe el suelo de su sección**, así
  que la página cambia de temperatura al bajar en vez de cambiar sólo cuatro
  detalles. El acento vivo se promueve a `:root` desde JS, porque el raíl y la
  barra de progreso viven fuera de las secciones y no lo heredarían.
  Portada, perfil y contacto van en negro con el acento en hueso: no son
  proyectos y no deben vestir el color de ninguno.
- **El azul marino de Iterum**: un azul oscuro de verdad da ~2:1 de contraste
  contra la tinta y no puede escribir. Por eso el color tiene dos papeles
  separados: el tono oscuro tiñe el fondo, donde lo oscuro suma profundidad, y
  el que escribe y subraya es una variante más brillante de la misma familia.
  Los cuatro acentos pasan AA contra su propio fondo.
- **Movimiento**: entrada escalonada en portada, revelado por
  `IntersectionObserver`. Todo se desactiva con `prefers-reduced-motion`, y el
  desplazamiento al pasar sobre una captura también con `hover: none`, porque
  en un teléfono se queda pegado tras el toque y parece un fallo.
- **Contenido**: los textos salen de los README de cada proyecto y del CV; los
  datos de formación y contacto, del CV.

## Auditoría de composición

```bash
npm run auditar                                    # cuatro anchos, con el sitio en :4321
node scripts/auditar.mjs --anchos 393,1680         # sólo los que interesen
node scripts/auditar.mjs --url https://otro/ --json
```

Busca los fallos que se ven mal pero no rompen nada, así que ninguna prueba
normal los detecta: tinta recortada por un `overflow: hidden`, líneas apiladas
cuyas letras se tocan, contraste por debajo de AA, imágenes recortadas por
`object-fit`, capas fijas que tapan texto, zonas de toque por debajo de 24 px,
texto por debajo de 10 px, desbordes horizontales y accesibilidad básica.

Nació de un fallo real: la máscara del revelado recortaba la cola de la J del
nombre y se leía como una l. Devuelve 0 si está limpio y 1 si hay fallos.

**Por qué se autocomprueba**: antes de auditar inyecta un elemento con ese
mismo fallo y verifica que salta. Un «cero hallazgos» de una sonda rota es
indistinguible de una página limpia, y esa es justo la forma en la que una
herramienta así deja de servir sin que nadie se entere. Si el cebo no se caza,
sale con código 2 y no llega a auditar.

Dos avisos si tocas la sonda: mide **tinta** con `measureText`, no la caja de
`Range` —que incluye el hueco que la fuente reserva y no pinta, y da falsos
positivos constantes—, y recorre los **descendientes** del elemento que
recorta, porque en el fallo original quien recortaba era la máscara mientras el
texto vivía en un `span` de dentro.
