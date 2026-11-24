#!/usr/bin/env node
/*
  Define o endereço público do site em todos os lugares que precisam de URL
  absoluta. Pode ser rodado de novo sempre que o endereço mudar.

  Uso: node scripts/definir-dominio.mjs https://endereco-do-site/

  O que ele faz:
  - index.html: atualiza og:url e og:image e cria/atualiza <link rel="canonical">;
  - sitemap.xml: cria/atualiza com a página inicial;
  - robots.txt: cria/atualiza a linha "Sitemap:".

  O canonical e o sitemap só são criados aqui, de propósito: apontá-los para o
  placeholder (exemplo.com) diria aos buscadores que o site oficial é outro.
*/

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const entrada = process.argv[2];

let url;
try {
  url = new URL(entrada);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
} catch {
  console.error("Uso: node scripts/definir-dominio.mjs https://endereco-do-site/");
  process.exit(1);
}

const base = `${url.origin}${url.pathname.replace(/\/?$/, "/")}`;
const agora = new Date();
const hoje = [agora.getFullYear(), agora.getMonth() + 1, agora.getDate()]
  .map((n) => String(n).padStart(2, "0"))
  .join("-");

function substituirMeta(html, propriedade, valor) {
  const regex = new RegExp(`(<meta property="${propriedade}" content=")[^"]*(">)`);
  if (!regex.test(html)) {
    throw new Error(`meta ${propriedade} não encontrada no index.html`);
  }
  return html.replace(regex, `$1${valor}$2`);
}

// index.html
const caminhoHtml = join(raiz, "index.html");
let html = readFileSync(caminhoHtml, "utf8");
html = substituirMeta(html, "og:url", base);
html = substituirMeta(html, "og:image", `${base}assets/og-image.png`);
const canonical = `<link rel="canonical" href="${base}">`;
if (/<link rel="canonical" href="[^"]*">/.test(html)) {
  html = html.replace(/<link rel="canonical" href="[^"]*">/, canonical);
} else {
  html = html.replace(/(\n\s*)(<link rel="icon")/, `$1${canonical}$1$2`);
}
writeFileSync(caminhoHtml, html);

// sitemap.xml
writeFileSync(
  join(raiz, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${base}</loc>
    <lastmod>${hoje}</lastmod>
  </url>
</urlset>
`
);

// robots.txt
const caminhoRobots = join(raiz, "robots.txt");
let robots = "";
try {
  robots = readFileSync(caminhoRobots, "utf8");
} catch {
  robots = "User-agent: *\nAllow: /\n";
}
robots = robots.replace(/^Sitemap:.*\n?/gm, "").replace(/\n*$/, "\n");
robots += `\nSitemap: ${base}sitemap.xml\n`;
writeFileSync(caminhoRobots, robots);

console.log(`Endereço definido: ${base}`);
console.log("Atualizados: index.html (og:url, og:image, canonical), sitemap.xml, robots.txt.");
