/*
  Biblioteca de Prompts - comportamento da página.
  Responsável por: montar os cards a partir do template (sem innerHTML),
  busca e filtros combinados, expandir/recolher o texto do prompt,
  copiar o texto, alternar e persistir o tema, e tratar os estados de
  carregamento, erro e lista vazia.
*/

const CHAVE_TEMA = "biblioteca-de-prompts:tema";

const lista = document.getElementById("lista-prompts");
const modelo = document.getElementById("modelo-card");
const estadoCarregando = document.getElementById("estado-carregando");
const estadoErro = document.getElementById("estado-erro");
const estadoVazio = document.getElementById("estado-vazio");

const campoBusca = document.getElementById("busca");
const filtroArea = document.getElementById("filtro-area");
const filtroTipo = document.getElementById("filtro-tipo");
const botaoTema = document.getElementById("alternar-tema");

let todosOsPrompts = [];

/**
 * Remove acentos/diacríticos e normaliza para minúsculas, para permitir
 * busca sem diferenciar maiúsculas/minúsculas ou acentuação.
 */
function normalizarTexto(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function montarCard(prompt, indice) {
  const card = modelo.content.firstElementChild.cloneNode(true);

  card.querySelector(".prompt-card__area").textContent = prompt.area;
  card.querySelector(".prompt-card__tipo").textContent = prompt.tipo;
  card.querySelector(".prompt-card__titulo").textContent = prompt.titulo;
  card.querySelector(".prompt-card__descricao").textContent = prompt.descricao;

  const listaTags = card.querySelector(".prompt-card__tags");
  (prompt.tags || []).forEach((tag) => {
    const item = document.createElement("li");
    item.textContent = tag;
    listaTags.appendChild(item);
  });

  const idTexto = `prompt-texto-${prompt.id || indice}`;
  const blocoTexto = card.querySelector(".prompt-card__texto");
  blocoTexto.id = idTexto;
  card.querySelector(".prompt-card__texto-conteudo").textContent = prompt.texto;

  const botaoToggle = card.querySelector(".prompt-card__toggle");
  botaoToggle.setAttribute("aria-controls", idTexto);
  botaoToggle.addEventListener("click", () => {
    const expandido = blocoTexto.classList.toggle("esta-expandido");
    botaoToggle.setAttribute("aria-expanded", String(expandido));
    botaoToggle.textContent = expandido ? "Ver menos" : "Ver mais";
  });

  const botaoCopiar = card.querySelector(".prompt-card__copiar");
  botaoCopiar.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(prompt.texto);
      botaoCopiar.textContent = "Copiado!";
      botaoCopiar.classList.add("foi-copiado");
      setTimeout(() => {
        botaoCopiar.textContent = "Copiar";
        botaoCopiar.classList.remove("foi-copiado");
      }, 2000);
    } catch (erro) {
      botaoCopiar.textContent = "Não foi possível copiar";
      setTimeout(() => {
        botaoCopiar.textContent = "Copiar";
      }, 2000);
    }
  });

  return card;
}

/**
 * Mostra apenas um dos estados (carregando, erro, vazio ou a lista) e
 * esconde os demais.
 */
function mostrarConteudo(nome) {
  estadoCarregando.hidden = nome !== "carregando";
  estadoErro.hidden = nome !== "erro";
  estadoVazio.hidden = nome !== "vazio";
  lista.hidden = nome !== "lista";
}

function promptCorrespondeABusca(prompt, termoNormalizado) {
  if (!termoNormalizado) {
    return true;
  }

  const camposTexto = [prompt.titulo, prompt.descricao, prompt.texto, ...(prompt.tags || [])];

  return camposTexto.some((campo) => normalizarTexto(campo).includes(termoNormalizado));
}

function filtrarPrompts() {
  const termoNormalizado = normalizarTexto(campoBusca.value.trim());
  const areaSelecionada = filtroArea.value;
  const tipoSelecionado = filtroTipo.value;

  return todosOsPrompts.filter((prompt) => {
    const correspondeArea = !areaSelecionada || prompt.area === areaSelecionada;
    const correspondeTipo = !tipoSelecionado || prompt.tipo === tipoSelecionado;
    const correspondeBusca = promptCorrespondeABusca(prompt, termoNormalizado);

    return correspondeArea && correspondeTipo && correspondeBusca;
  });
}

function renderizarPrompts() {
  const promptsFiltrados = filtrarPrompts();

  lista.textContent = "";

  if (promptsFiltrados.length === 0) {
    mostrarConteudo("vazio");
    return;
  }

  promptsFiltrados.forEach((prompt, indice) => {
    lista.appendChild(montarCard(prompt, indice));
  });

  mostrarConteudo("lista");
}

function aplicarTema(tema) {
  document.documentElement.setAttribute("data-theme", tema);
  const ehEscuro = tema === "escuro";
  botaoTema.setAttribute("aria-pressed", String(ehEscuro));
  botaoTema.textContent = ehEscuro ? "Modo claro" : "Modo escuro";
}

function inicializarTema() {
  const temaSalvo = localStorage.getItem(CHAVE_TEMA);
  aplicarTema(temaSalvo === "escuro" ? "escuro" : "claro");
}

function alternarTema() {
  const temaAtual = document.documentElement.getAttribute("data-theme") === "escuro" ? "escuro" : "claro";
  const novoTema = temaAtual === "escuro" ? "claro" : "escuro";
  aplicarTema(novoTema);

  try {
    localStorage.setItem(CHAVE_TEMA, novoTema);
  } catch (erro) {
    // Sem acesso ao localStorage (ex: modo privado): a escolha só vale para esta visita.
  }
}

inicializarTema();
botaoTema.addEventListener("click", alternarTema);

campoBusca.addEventListener("input", renderizarPrompts);
filtroArea.addEventListener("change", renderizarPrompts);
filtroTipo.addEventListener("change", renderizarPrompts);

mostrarConteudo("carregando");

fetch("prompts.json")
  .then((resposta) => {
    if (!resposta.ok) {
      throw new Error("Falha ao carregar prompts.json");
    }
    return resposta.json();
  })
  .then((prompts) => {
    todosOsPrompts = Array.isArray(prompts) ? prompts : [];
    renderizarPrompts();
  })
  .catch(() => {
    mostrarConteudo("erro");
  });
