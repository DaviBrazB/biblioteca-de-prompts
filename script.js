/*
  Nota: este script foi adaptado ao mínimo necessário para acompanhar a nova
  marcação do index.html (Tarefa 2 - layout e visual). A lógica completa de
  busca, filtros e tema é de outra tarefa; aqui só garantimos que os cards
  sejam montados a partir do modelo HTML, sem JS quebrado, e que os botões
  "Ver mais" e "Copiar" funcionem de forma básica.
*/

const lista = document.getElementById("lista-prompts");
const modelo = document.getElementById("modelo-card");
const estadoCarregando = document.getElementById("estado-carregando");
const estadoErro = document.getElementById("estado-erro");
const estadoVazio = document.getElementById("estado-vazio");

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
    }
  });

  return card;
}

function mostrarEstado(elemento) {
  [estadoCarregando, estadoErro, estadoVazio].forEach((el) => {
    el.hidden = el !== elemento;
  });
}

fetch("prompts.json")
  .then((resposta) => {
    if (!resposta.ok) {
      throw new Error("Falha ao carregar prompts.json");
    }
    return resposta.json();
  })
  .then((prompts) => {
    if (!prompts || prompts.length === 0) {
      mostrarEstado(estadoVazio);
      return;
    }

    prompts.forEach((prompt, indice) => {
      lista.appendChild(montarCard(prompt, indice));
    });

    mostrarEstado(null);
  })
  .catch(() => {
    mostrarEstado(estadoErro);
  });
