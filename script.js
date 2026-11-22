fetch("prompts.json")
  .then(resposta => resposta.json())
  .then(prompts => {
    const lista = document.getElementById("lista");
    prompts.forEach(p => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <h2>${p.titulo}</h2>
        <small>${p.categoria}</small>
        <pre>${p.texto}</pre>
        <button>Copiar</button>
      `;
      card.querySelector("button").addEventListener("click", () => {
        navigator.clipboard.writeText(p.texto);
      });
      lista.appendChild(card);
    });
  });