# Portfolio — Jorge Valero

Portfolio personal de Jorge Valero Marcos, ingeniero de software especializado en datos e
inteligencia artificial. Recoge cuatro proyectos: **PROMETEO** (asistente de voz que corre
entero en local), **NEXUS** (plataforma de desarrollo multi-agente), **ITERUM** (gestión de
proyectos con IA) y una **mesa de D&D** en red local.

**[jorgevaler.github.io](https://jorgevaler.github.io)**

## Cómo está hecho

Sitio estático puro: sin framework, sin build y sin dependencias en tiempo de ejecución. Un
HTML, una hoja de estilos y un fichero de JavaScript.

```bash
npx serve -l 4321 .    # http://localhost:4321
```

Lo único que hace falta para desplegarlo es `index.html` y `assets/`. Vale tal cual en
GitHub Pages, Netlify, Vercel o cualquier hosting estático.

- **Tipografía**: Instrument Serif para los titulares y Georgia para el cuerpo; JetBrains
  Mono para metadatos y fichas de datos. Vendorizadas en local, sin peticiones a CDN.
- **Color**: cada proyecto tiene el suyo y tiñe el fondo de su sección, así que la página
  cambia de temperatura al bajar. Los cuatro acentos cumplen el contraste AA de WCAG contra
  su propio fondo.
- **Accesibilidad**: navegable por teclado, respeta `prefers-reduced-motion` y las capturas
  llevan descripciones completas.

## Las capturas

Están tomadas de las aplicaciones reales en ejecución — no son maquetas. Se generan con
Playwright y se optimizan a WebP en dos resoluciones para el `srcset`.

```bash
npm run auditar    # audita composición, contraste y accesibilidad a cuatro anchos
```

---

© Jorge Valero Marcos. El código es libre de mirar; los textos y las capturas de los
proyectos, no reutilizables.
