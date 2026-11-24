/*
  Biblioteca de Prompts - comportamento da página.
  Responsável por: montar os cards a partir do template (sem innerHTML),
  busca e filtros combinados (texto, área e tag), ordenação, contador de
  resultados, datas e selos "Novo"/"Atualizado",
  expandir/recolher o texto do prompt, destacar e preencher os
  [PLACEHOLDERS], copiar o texto e o link direto de cada prompt,
  alternar e persistir o tema, e tratar os estados de carregamento,
  erro e lista vazia.
*/

const CHAVE_TEMA = "biblioteca-de-prompts:tema";

/* Ordem canônica das áreas no filtro; áreas fora desta lista vão ao final. */
const ORDEM_AREAS = ["Redação oficial", "Licitações e contratos", "Gestão", "Engenharia", "RH", "Jurídico"];

/* Por quantos dias um prompt criado ou atualizado ganha o selo "Novo"/"Atualizado". */
const DIAS_SELO = 30;

/*
  Placeholder: texto em MAIÚSCULAS entre colchetes, como [ASSUNTO] ou
  [OBJETO DA CONTRATAÇÃO]. Aceita letras acentuadas, dígitos, espaço,
  hífen, barra e sublinhado.
*/
const REGEX_PLACEHOLDER = /\[([A-ZÀ-ÖØ-Þ0-9][A-ZÀ-ÖØ-Þ0-9 _\-/]*)\]/g;

const lista = document.getElementById("lista-prompts");
const modelo = document.getElementById("modelo-card");
const estadoCarregando = document.getElementById("estado-carregando");
const estadoErro = document.getElementById("estado-erro");
const estadoVazio = document.getElementById("estado-vazio");
const contadorResultados = document.getElementById("contador-resultados");

const formBusca = document.querySelector(".painel-busca");
const campoBusca = document.getElementById("busca");
const filtroArea = document.getElementById("filtro-area");
const campoOrdenacao = document.getElementById("ordenacao");
const botaoTema = document.getElementById("alternar-tema");
const filtroTagAtivo = document.getElementById("filtro-tag-ativo");
const filtroTagNome = document.getElementById("filtro-tag-nome");
const botaoRemoverTag = document.getElementById("remover-filtro-tag");
const botaoLimparFiltros = document.getElementById("limpar-filtros");

let todosOsPrompts = [];
let tagAtiva = "";

/*
  Estado de cada card que precisa sobreviver às re-renderizações
  (a lista é remontada a cada tecla na busca): texto expandido, painel de
  campos aberto e valores digitados nos placeholders. Chave: id do prompt.
*/
const estadoCards = new Map();

function obterEstadoCard(id) {
  if (!estadoCards.has(id)) {
    estadoCards.set(id, { expandido: false, camposAbertos: false, valores: {} });
  }
  return estadoCards.get(id);
}

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

/* ===========================================================
   Placeholders
   =========================================================== */

/** Lista os nomes únicos de placeholder do texto, na ordem em que aparecem. */
function extrairPlaceholders(texto) {
  const nomes = [];
  for (const correspondencia of String(texto || "").matchAll(REGEX_PLACEHOLDER)) {
    if (!nomes.includes(correspondencia[1])) {
      nomes.push(correspondencia[1]);
    }
  }
  return nomes;
}

/** Texto final para copiar: placeholders preenchidos são substituídos; os vazios ficam como estão. */
function textoPreenchido(texto, valores) {
  return String(texto || "").replace(REGEX_PLACEHOLDER, (original, nome) => {
    const valor = (valores[nome] || "").trim();
    return valor || original;
  });
}

/**
 * Escreve o texto do prompt no elemento, destacando cada placeholder.
 * Placeholders já preenchidos mostram o valor digitado com outro estilo.
 * Monta só nós de texto e <span>, sem innerHTML.
 */
function renderizarTextoPrompt(elemento, texto, valores) {
  elemento.textContent = "";
  let posicao = 0;

  for (const correspondencia of String(texto || "").matchAll(REGEX_PLACEHOLDER)) {
    const [original, nome] = correspondencia;
    if (correspondencia.index > posicao) {
      elemento.appendChild(document.createTextNode(texto.slice(posicao, correspondencia.index)));
    }

    const valor = (valores[nome] || "").trim();
    const marca = document.createElement("span");
    marca.className = valor ? "placeholder placeholder--preenchido" : "placeholder";
    marca.textContent = valor || original;
    elemento.appendChild(marca);

    posicao = correspondencia.index + original.length;
  }

  if (posicao < texto.length) {
    elemento.appendChild(document.createTextNode(texto.slice(posicao)));
  }
}

/** Ex.: "OBJETO DA CONTRATAÇÃO" -> "Objeto da contratação". */
function rotuloDoPlaceholder(nome) {
  const minusculo = nome.toLocaleLowerCase("pt-BR");
  return minusculo.charAt(0).toLocaleUpperCase("pt-BR") + minusculo.slice(1);
}

/* ===========================================================
   Datas e selos
   =========================================================== */

/** Converte "AAAA-MM-DD" em Date no fuso local (new Date("AAAA-MM-DD") usaria UTC). */
function lerData(texto) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(texto || ""));
  if (!partes) {
    return null;
  }
  const data = new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
  return Number.isNaN(data.getTime()) ? null : data;
}

function diasDesde(data) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.floor((hoje - data) / 86400000);
}

/** "Novo" para criados há até DIAS_SELO dias; senão "Atualizado" se a atualização for recente. */
function seloDoPrompt(prompt) {
  const criacao = lerData(prompt.dataCriacao);
  const atualizacao = lerData(prompt.dataAtualizacao);

  if (criacao && diasDesde(criacao) <= DIAS_SELO) {
    return "Novo";
  }
  if (atualizacao && criacao && atualizacao > criacao && diasDesde(atualizacao) <= DIAS_SELO) {
    return "Atualizado";
  }
  return "";
}

function preencherData(elemento, prompt) {
  const criacao = lerData(prompt.dataCriacao);
  const atualizacao = lerData(prompt.dataAtualizacao);
  const foiAtualizado = atualizacao && (!criacao || atualizacao > criacao);
  const data = foiAtualizado ? atualizacao : criacao;

  if (!data) {
    elemento.hidden = true;
    return;
  }

  const tempo = document.createElement("time");
  tempo.dateTime = foiAtualizado ? prompt.dataAtualizacao : prompt.dataCriacao;
  tempo.textContent = data.toLocaleDateString("pt-BR");
  elemento.append(foiAtualizado ? "Atualizado em " : "Publicado em ", tempo);
}

/* ===========================================================
   Feedback temporário em botões
   =========================================================== */

function mostrarFeedback(botao, mensagem, classe) {
  if (!botao.dataset.rotuloOriginal) {
    botao.dataset.rotuloOriginal = botao.textContent.trim();
  }
  clearTimeout(Number(botao.dataset.temporizador));

  botao.textContent = mensagem;
  if (classe) {
    botao.classList.add(classe);
  }

  const temporizador = setTimeout(() => {
    botao.textContent = botao.dataset.rotuloOriginal;
    if (classe) {
      botao.classList.remove(classe);
    }
  }, 2000);
  botao.dataset.temporizador = String(temporizador);
}

async function copiarParaAreaDeTransferencia(texto, botao, mensagemSucesso) {
  try {
    await navigator.clipboard.writeText(texto);
    mostrarFeedback(botao, mensagemSucesso, "foi-copiado");
  } catch (erro) {
    mostrarFeedback(botao, "Não foi possível copiar");
  }
}

function linkDoPrompt(id) {
  return `${window.location.origin}${window.location.pathname}#${encodeURIComponent(id)}`;
}

/* ===========================================================
   Montagem do card
   =========================================================== */

function montarCampos(card, prompt, estado, atualizarTexto) {
  const placeholders = extrairPlaceholders(prompt.texto);
  const painel = card.querySelector(".prompt-card__campos");
  if (placeholders.length === 0) {
    return;
  }

  painel.hidden = false;
  painel.open = estado.camposAbertos;
  painel.addEventListener("toggle", () => {
    estado.camposAbertos = painel.open;
  });

  card.querySelector(".prompt-card__campos-resumo").textContent =
    placeholders.length === 1 ? "Preencher 1 campo" : `Preencher ${placeholders.length} campos`;

  const listaCampos = card.querySelector(".prompt-card__campos-lista");
  const entradas = placeholders.map((nome, indice) => {
    const idCampo = `campo-${prompt.id}-${indice}`;

    const rotulo = document.createElement("label");
    rotulo.className = "prompt-card__campo-rotulo";
    rotulo.htmlFor = idCampo;
    rotulo.textContent = rotuloDoPlaceholder(nome);

    const entrada = document.createElement("textarea");
    entrada.id = idCampo;
    entrada.className = "prompt-card__campo-entrada";
    entrada.rows = 2;
    entrada.value = estado.valores[nome] || "";
    entrada.addEventListener("input", () => {
      estado.valores[nome] = entrada.value;
      atualizarTexto();
    });

    listaCampos.append(rotulo, entrada);
    return entrada;
  });

  card.querySelector(".prompt-card__limpar-campos").addEventListener("click", () => {
    estado.valores = {};
    entradas.forEach((entrada) => {
      entrada.value = "";
    });
    atualizarTexto();
    entradas[0].focus();
  });
}

function montarTags(card, prompt) {
  const listaTags = card.querySelector(".prompt-card__tags");
  (prompt.tags || []).forEach((tag) => {
    const item = document.createElement("li");
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "prompt-card__tag";
    botao.textContent = tag;

    const ativa = normalizarTexto(tag) === normalizarTexto(tagAtiva);
    botao.setAttribute("aria-pressed", String(ativa));
    botao.title = ativa ? "Remover filtro desta tag" : "Filtrar por esta tag";

    botao.addEventListener("click", () => {
      definirTagAtiva(ativa ? "" : tag);
    });

    item.appendChild(botao);
    listaTags.appendChild(item);
  });
}

function montarCard(prompt) {
  const card = modelo.content.firstElementChild.cloneNode(true);
  const estado = obterEstadoCard(prompt.id);

  card.id = prompt.id;
  card.dataset.id = prompt.id;
  card.querySelector(".prompt-card__area").textContent = prompt.area;
  card.querySelector(".prompt-card__tipo").textContent = prompt.tipo;
  card.querySelector(".prompt-card__titulo").textContent = prompt.titulo;
  card.querySelector(".prompt-card__descricao").textContent = prompt.descricao;

  const selo = seloDoPrompt(prompt);
  const elementoSelo = card.querySelector(".prompt-card__selo");
  if (selo) {
    elementoSelo.hidden = false;
    elementoSelo.textContent = selo;
    elementoSelo.classList.add(`prompt-card__selo--${normalizarTexto(selo)}`);
  }

  montarTags(card, prompt);
  preencherData(card.querySelector(".prompt-card__data"), prompt);

  const idTexto = `prompt-texto-${prompt.id}`;
  const blocoTexto = card.querySelector(".prompt-card__texto");
  const conteudoTexto = card.querySelector(".prompt-card__texto-conteudo");
  blocoTexto.id = idTexto;

  const botaoToggle = card.querySelector(".prompt-card__toggle");
  botaoToggle.setAttribute("aria-controls", idTexto);

  function aplicarExpansao() {
    blocoTexto.classList.toggle("esta-expandido", estado.expandido);
    botaoToggle.setAttribute("aria-expanded", String(estado.expandido));
    botaoToggle.textContent = estado.expandido ? "Ver menos" : "Ver mais";
  }
  aplicarExpansao();

  botaoToggle.addEventListener("click", () => {
    estado.expandido = !estado.expandido;
    aplicarExpansao();
  });

  function atualizarTexto() {
    renderizarTextoPrompt(conteudoTexto, prompt.texto, estado.valores);
    ajustarBotaoToggle(card);
  }
  renderizarTextoPrompt(conteudoTexto, prompt.texto, estado.valores);

  montarCampos(card, prompt, estado, atualizarTexto);

  const botaoCopiar = card.querySelector(".prompt-card__copiar");
  botaoCopiar.addEventListener("click", () => {
    copiarParaAreaDeTransferencia(textoPreenchido(prompt.texto, estado.valores), botaoCopiar, "Copiado!");
  });

  const botaoLink = card.querySelector(".prompt-card__link");
  botaoLink.setAttribute("aria-label", `Copiar link do prompt ${prompt.titulo}`);
  botaoLink.addEventListener("click", () => {
    copiarParaAreaDeTransferencia(linkDoPrompt(prompt.id), botaoLink, "Link copiado!");
  });

  return card;
}

/* ===========================================================
   Botão "Ver mais"
   =========================================================== */

/**
 * Mostra o botão "Ver mais" só quando o texto não cabe na área recolhida.
 * A área visível é a altura interna do bloco menos o padding; comparar com
 * clientHeight direto (que inclui o padding) escondia o botão em textos
 * levemente cortados. Cards expandidos mantêm o botão para poder recolher.
 */
function ajustarBotaoToggle(card) {
  const blocoTexto = card.querySelector(".prompt-card__texto");
  const conteudo = card.querySelector(".prompt-card__texto-conteudo");
  const botaoToggle = card.querySelector(".prompt-card__toggle");

  if (blocoTexto.classList.contains("esta-expandido")) {
    botaoToggle.hidden = false;
    return;
  }

  const estilo = getComputedStyle(blocoTexto);
  const alturaVisivel =
    blocoTexto.clientHeight - parseFloat(estilo.paddingTop) - parseFloat(estilo.paddingBottom);
  const estaTruncado = conteudo.scrollHeight > alturaVisivel + 1;

  botaoToggle.hidden = !estaTruncado;
  blocoTexto.classList.toggle("esta-truncado", estaTruncado);
}

function ajustarBotoesToggle() {
  lista.querySelectorAll(".prompt-card").forEach(ajustarBotaoToggle);
}

let quadroRedimensionamento = 0;
window.addEventListener("resize", () => {
  cancelAnimationFrame(quadroRedimensionamento);
  quadroRedimensionamento = requestAnimationFrame(ajustarBotoesToggle);
});

/* ===========================================================
   Estados, filtros e renderização
   =========================================================== */

/**
 * Mostra apenas um dos estados (carregando, erro, vazio ou a lista) e
 * esconde os demais.
 */
function mostrarConteudo(nome) {
  estadoCarregando.hidden = nome !== "carregando";
  estadoErro.hidden = nome !== "erro";
  estadoVazio.hidden = nome !== "vazio";
  lista.hidden = nome !== "lista";
  contadorResultados.hidden = nome !== "lista" && nome !== "vazio";
}

function promptCorrespondeABusca(prompt, termoNormalizado) {
  if (!termoNormalizado) {
    return true;
  }

  const camposTexto = [prompt.titulo, prompt.descricao, prompt.texto, ...(prompt.tags || [])];

  return camposTexto.some((campo) => normalizarTexto(campo).includes(termoNormalizado));
}

function promptTemTag(prompt, tag) {
  if (!tag) {
    return true;
  }
  const tagNormalizada = normalizarTexto(tag);
  return (prompt.tags || []).some((item) => normalizarTexto(item) === tagNormalizada);
}

function filtrarPrompts() {
  const termoNormalizado = normalizarTexto(campoBusca.value.trim());
  const areaSelecionada = filtroArea.value;

  const filtrados = todosOsPrompts.filter((prompt) => {
    const correspondeArea = !areaSelecionada || prompt.area === areaSelecionada;
    return correspondeArea && promptTemTag(prompt, tagAtiva) && promptCorrespondeABusca(prompt, termoNormalizado);
  });

  return ordenarPrompts(filtrados, campoOrdenacao.value);
}

/** Ordena sem alterar a lista original; empates mantêm a ordem do prompts.json. */
function ordenarPrompts(prompts, criterio) {
  const copia = [...prompts];
  if (criterio === "titulo") {
    copia.sort((a, b) => String(a.titulo).localeCompare(String(b.titulo), "pt-BR"));
  } else if (criterio === "recentes") {
    const dataMaisRecente = (p) => String(p.dataAtualizacao || p.dataCriacao || "");
    copia.sort((a, b) => dataMaisRecente(b).localeCompare(dataMaisRecente(a)));
  }
  return copia;
}

function haFiltrosAtivos() {
  return Boolean(campoBusca.value.trim() || filtroArea.value || tagAtiva);
}

function atualizarContador(quantidade) {
  const total = todosOsPrompts.length;
  const rotulo = (n) => (n === 1 ? "prompt" : "prompts");

  if (!haFiltrosAtivos()) {
    contadorResultados.textContent = `${total} ${rotulo(total)} na biblioteca`;
  } else if (quantidade === 0) {
    contadorResultados.textContent = `Nenhum de ${total} ${rotulo(total)} corresponde aos filtros`;
  } else {
    const encontrados = quantidade === 1 ? "encontrado" : "encontrados";
    contadorResultados.textContent = `${quantidade} ${rotulo(quantidade)} ${encontrados} (de ${total})`;
  }
}

function renderizarPrompts() {
  const promptsFiltrados = filtrarPrompts();

  lista.textContent = "";
  atualizarContador(promptsFiltrados.length);

  if (promptsFiltrados.length === 0) {
    mostrarConteudo("vazio");
    return;
  }

  promptsFiltrados.forEach((prompt) => {
    lista.appendChild(montarCard(prompt));
  });

  mostrarConteudo("lista");
  ajustarBotoesToggle();
}

function definirTagAtiva(tag) {
  tagAtiva = tag;
  filtroTagAtivo.hidden = !tag;
  filtroTagNome.textContent = tag;
  renderizarPrompts();
}

function limparFiltros() {
  campoBusca.value = "";
  filtroArea.value = "";
  tagAtiva = "";
  filtroTagAtivo.hidden = true;
  filtroTagNome.textContent = "";
  renderizarPrompts();
}

/**
 * Monta as opções do filtro de área a partir dos dados: só aparecem áreas
 * que têm prompts, com a quantidade de cada uma.
 */
function montarFiltroArea() {
  const contagem = new Map();
  todosOsPrompts.forEach((prompt) => {
    if (prompt.area) {
      contagem.set(prompt.area, (contagem.get(prompt.area) || 0) + 1);
    }
  });

  const areas = [...contagem.keys()].sort((a, b) => {
    const ia = ORDEM_AREAS.indexOf(a);
    const ib = ORDEM_AREAS.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b, "pt-BR");
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  filtroArea.querySelectorAll("option:not([value=''])").forEach((opcao) => opcao.remove());
  areas.forEach((area) => {
    const opcao = document.createElement("option");
    opcao.value = area;
    opcao.textContent = `${area} (${contagem.get(area)})`;
    filtroArea.appendChild(opcao);
  });
}

/* ===========================================================
   Link direto (#id-do-prompt)
   =========================================================== */

function idDoHash() {
  try {
    return decodeURIComponent(window.location.hash.slice(1));
  } catch (erro) {
    return "";
  }
}

/**
 * Leva até o prompt indicado no endereço (#id). Se ele estiver escondido
 * pelos filtros, limpa os filtros antes. Destaca o card e move o foco para
 * o título, para leitores de tela anunciarem o prompt.
 */
function irParaPromptDoHash() {
  const id = idDoHash();
  if (!id || !todosOsPrompts.some((prompt) => prompt.id === id)) {
    return;
  }

  let card = lista.querySelector(`[data-id="${CSS.escape(id)}"]`);
  if (!card) {
    limparFiltros();
    card = lista.querySelector(`[data-id="${CSS.escape(id)}"]`);
  }
  if (!card) {
    return;
  }

  card.scrollIntoView({ block: "center" });
  card.querySelector(".prompt-card__titulo").focus({ preventScroll: true });
  card.classList.remove("esta-destacado");
  void card.offsetWidth; // reinicia a animação se o mesmo card for destacado de novo
  card.classList.add("esta-destacado");
}

window.addEventListener("hashchange", irParaPromptDoHash);

/* ===========================================================
   Tema
   =========================================================== */

function aplicarTema(tema) {
  document.documentElement.setAttribute("data-theme", tema);
  const ehEscuro = tema === "escuro";
  botaoTema.setAttribute("aria-pressed", String(ehEscuro));
}

/**
 * O <head> já aplicou o tema antes da pintura (tema salvo ou preferência do
 * sistema). Aqui só sincronizamos o botão e, enquanto a pessoa não escolher
 * um tema, acompanhamos mudanças na preferência do sistema.
 */
function lerTemaSalvo() {
  try {
    const tema = localStorage.getItem(CHAVE_TEMA);
    return tema === "claro" || tema === "escuro" ? tema : null;
  } catch (erro) {
    // Sem acesso ao localStorage (ex: modo privado restrito).
    return null;
  }
}

function inicializarTema() {
  const preferenciaEscura = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  const temaAtual = document.documentElement.getAttribute("data-theme");
  const temaInicial =
    lerTemaSalvo() || (temaAtual === "escuro" || temaAtual === "claro" ? temaAtual : null) ||
    (preferenciaEscura && preferenciaEscura.matches ? "escuro" : "claro");
  aplicarTema(temaInicial);

  if (preferenciaEscura) {
    preferenciaEscura.addEventListener("change", (evento) => {
      if (!lerTemaSalvo()) {
        aplicarTema(evento.matches ? "escuro" : "claro");
      }
    });
  }
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

/* ===========================================================
   Atalhos de teclado
   =========================================================== */

function estaDigitando(elemento) {
  return Boolean(
    elemento &&
      (elemento.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(elemento.tagName))
  );
}

/* "/" leva à busca (como em muitos sites), exceto quando já se está digitando. */
document.addEventListener("keydown", (evento) => {
  if (evento.key !== "/" || evento.ctrlKey || evento.metaKey || evento.altKey) {
    return;
  }
  if (estaDigitando(document.activeElement)) {
    return;
  }
  evento.preventDefault();
  campoBusca.focus();
  campoBusca.select();
});

/* "Esc" na busca limpa o termo; com a busca já vazia, tira o foco do campo. */
campoBusca.addEventListener("keydown", (evento) => {
  if (evento.key !== "Escape") {
    return;
  }
  evento.preventDefault();
  if (campoBusca.value) {
    campoBusca.value = "";
    renderizarPrompts();
  } else {
    campoBusca.blur();
  }
});

/* ===========================================================
   Inicialização
   =========================================================== */

inicializarTema();
botaoTema.addEventListener("click", alternarTema);

formBusca.addEventListener("submit", (evento) => {
  evento.preventDefault();
});

campoBusca.addEventListener("input", renderizarPrompts);
filtroArea.addEventListener("change", renderizarPrompts);
campoOrdenacao.addEventListener("change", renderizarPrompts);
botaoRemoverTag.addEventListener("click", () => {
  definirTagAtiva("");
  campoBusca.focus();
});
botaoLimparFiltros.addEventListener("click", () => {
  limparFiltros();
  campoBusca.focus();
});

mostrarConteudo("carregando");

fetch("prompts.json")
  .then((resposta) => {
    if (!resposta.ok) {
      throw new Error("Falha ao carregar prompts.json");
    }
    return resposta.json();
  })
  .then((prompts) => {
    todosOsPrompts = (Array.isArray(prompts) ? prompts : []).map((prompt, indice) => ({
      ...prompt,
      id: prompt.id || `prompt-${indice + 1}`,
    }));
    montarFiltroArea();
    renderizarPrompts();
    irParaPromptDoHash();
  })
  .catch(() => {
    mostrarConteudo("erro");
  });
