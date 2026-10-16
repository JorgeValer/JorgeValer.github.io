import { chromium } from "playwright";
const B = "http://127.0.0.1:3010";
const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2, colorScheme: "dark" });
const p = await ctx.newPage();
const foto = async (id) => { await p.waitForTimeout(2500);
  await p.screenshot({ path: `assets/shots/_nuevo_${id}.png`, caret: "hide" });
  const t = await p.evaluate(() => document.body.innerText.replace(/\s+/g," ").trim());
  console.log(`✓ ${id.padEnd(24)} ${t.length} car.  ${t.slice(0,70)}`); };

await p.goto(`${B}/`, { waitUntil: "networkidle" });
await foto("dnd-home");

await p.locator("a,button").filter({ hasText: /Dungeon Master/i }).first().click();
await foto("dnd-master");

// Entrar en una partida ya iniciada
const cont = p.locator("button,a").filter({ hasText: /Continuar partida/i }).first();
if (await cont.count()) { await cont.click(); await p.waitForTimeout(3500); await foto("dnd-tablero"); }
console.log("   url tras entrar:", p.url());

// Creacion de personaje
await p.goto(`${B}/personajes/crear`, { waitUntil: "networkidle" });
await foto("dnd-crear-personaje");
await nav.close();
