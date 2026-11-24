#!/usr/bin/env node
/*
  Valida o prompts.json contra o formato documentado no README.
  Uso: node scripts/validar-prompts.mjs [caminho/do/prompts.json]
  Sai com código 1 se houver erros; avisos não fazem falhar.
  Sem dependências: só Node.js 18+.
*/

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const AREAS = ["Redação oficial", "Licitações e contratos", "Gestão", "Engenharia", "RH", "Jurídico"];
const TIPOS = ["Prompt"];
const CAMPOS = ["id", "titulo", "descricao", "tipo", "area", "tags", "texto", "dataCriacao", "dataAtualizacao"];
const REGEX_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const REGEX_PLACEHOLDER = /\[([A-ZÀ-ÖØ-Þ0-9][A-ZÀ-ÖØ-Þ0-9 _\-/]*)\]/g;
/* Colchetes com letra minúscula: provável placeholder escrito fora do padrão. */
const REGEX_COLCHETE_MINUSCULO = /\[[^\]\n]*[a-zà-ÿ][^\]\n]*\]/g;

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const caminho = process.argv[2] || join(raiz, "prompts.json");

const erros = [];
const avisos = [];

function lerData(texto) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(texto));
  if (!partes) return null;
  const [ano, mes, dia] = partes.slice(1).map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  // Rejeita datas que "transbordam", como 2026-02-31.
  if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) return null;
  return data;
}

function textoNaoVazio(valor) {
  return typeof valor === "string" && valor.trim() !== "";
}

let prompts;
try {
  prompts = JSON.parse(readFileSync(caminho, "utf8"));
} catch (erro) {
  console.error(`ERRO: não foi possível ler ${caminho} como JSON.\n  ${erro.message}`);
  process.exit(1);
}

if (!Array.isArray(prompts)) {
  console.error("ERRO: o arquivo deve conter uma lista (array) de prompts.");
  process.exit(1);
}

const idsVistos = new Map();
const amanha = Date.now() + 86400000; // tolera diferença de fuso

prompts.forEach((prompt, indice) => {
  const rotulo = `item ${indice + 1}${prompt && prompt.id ? ` (${prompt.id})` : ""}`;
  const erro = (msg) => erros.push(`${rotulo}: ${msg}`);
  const aviso = (msg) => avisos.push(`${rotulo}: ${msg}`);

  if (!prompt || typeof prompt !== "object" || Array.isArray(prompt)) {
    erro("deve ser um objeto.");
    return;
  }

  CAMPOS.filter((campo) => !(campo in prompt)).forEach((campo) => erro(`campo obrigatório ausente: "${campo}".`));
  Object.keys(prompt)
    .filter((campo) => !CAMPOS.includes(campo))
    .forEach((campo) => aviso(`campo não documentado: "${campo}" (será ignorado pelo site).`));

  // id
  if ("id" in prompt) {
    if (typeof prompt.id !== "string" || !REGEX_ID.test(prompt.id)) {
      erro(`"id" deve estar em kebab-case (minúsculas, números e hífen, sem acento): ${JSON.stringify(prompt.id)}.`);
    } else if (idsVistos.has(prompt.id)) {
      erro(`"id" repetido; já usado no item ${idsVistos.get(prompt.id) + 1}.`);
    } else {
      idsVistos.set(prompt.id, indice);
    }
  }

  // textos simples
  ["titulo", "descricao", "texto"].forEach((campo) => {
    if (campo in prompt && !textoNaoVazio(prompt[campo])) erro(`"${campo}" deve ser um texto não vazio.`);
  });

  if ("tipo" in prompt && !TIPOS.includes(prompt.tipo)) {
    erro(`"tipo" deve ser um de: ${TIPOS.join(", ")}. Recebido: ${JSON.stringify(prompt.tipo)}.`);
  }

  if ("area" in prompt && !AREAS.includes(prompt.area)) {
    erro(`"area" deve ser exatamente uma de: ${AREAS.join(", ")}. Recebido: ${JSON.stringify(prompt.area)}.`);
  }

  // tags
  if ("tags" in prompt) {
    if (!Array.isArray(prompt.tags)) {
      erro('"tags" deve ser uma lista de textos.');
    } else {
      if (prompt.tags.length === 0) aviso('"tags" está vazia; tags ajudam na busca.');
      prompt.tags.forEach((tag, i) => {
        if (!textoNaoVazio(tag)) erro(`tag ${i + 1} deve ser um texto não vazio.`);
      });
      const normalizadas = prompt.tags.filter(textoNaoVazio).map((t) => t.trim().toLocaleLowerCase("pt-BR"));
      const repetidas = normalizadas.filter((t, i) => normalizadas.indexOf(t) !== i);
      if (repetidas.length) aviso(`tags repetidas: ${[...new Set(repetidas)].join(", ")}.`);
    }
  }

  // datas
  const datas = {};
  ["dataCriacao", "dataAtualizacao"].forEach((campo) => {
    if (!(campo in prompt)) return;
    const data = lerData(prompt[campo]);
    if (!data) {
      erro(`"${campo}" deve ser uma data válida no formato AAAA-MM-DD: ${JSON.stringify(prompt[campo])}.`);
      return;
    }
    if (data.getTime() > amanha) erro(`"${campo}" está no futuro: ${prompt[campo]}.`);
    datas[campo] = data;
  });
  if (datas.dataCriacao && datas.dataAtualizacao && datas.dataAtualizacao < datas.dataCriacao) {
    erro('"dataAtualizacao" não pode ser anterior a "dataCriacao".');
  }

  // placeholders
  if (textoNaoVazio(prompt.texto)) {
    if (!prompt.texto.match(REGEX_PLACEHOLDER)) {
      aviso('"texto" não tem nenhum [PLACEHOLDER]; confirme se a pessoa não precisa preencher nada.');
    }
    const foraDoPadrao = prompt.texto.match(REGEX_COLCHETE_MINUSCULO);
    if (foraDoPadrao) {
      aviso(
        `possível placeholder fora do padrão (use MAIÚSCULAS): ${[...new Set(foraDoPadrao)].join(", ")}.`
      );
    }
  }
});

avisos.forEach((msg) => console.warn(`AVISO: ${msg}`));
erros.forEach((msg) => console.error(`ERRO: ${msg}`));

if (erros.length) {
  console.error(`\n${erros.length} erro(s) e ${avisos.length} aviso(s) em ${prompts.length} prompt(s).`);
  process.exit(1);
}

console.log(`OK: ${prompts.length} prompt(s) válido(s)${avisos.length ? `, ${avisos.length} aviso(s)` : ""}.`);
