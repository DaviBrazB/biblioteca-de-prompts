# CLAUDE.md

Guia rápido para sessões de IA (Claude Code) trabalhando neste repositório.

## 1. O que é o projeto

Biblioteca de Prompts para a Administração Pública: um site estático e público que reúne prompts prontos e revisados para uso com LLMs no dia a dia do serviço público (redação oficial, licitações e contratos, gestão, engenharia, RH e jurídico).

Não há login, não há backend e não há banco de dados. O site é hospedado na Vercel como arquivos estáticos. Os prompts ficam em `prompts.json` e são editados diretamente pelo dono do projeto via Git: não existe CRUD por interface.

## 2. Stack e estrutura

HTML, CSS e JavaScript puros, sem framework e sem passo de build. Arquivos principais:

- `index.html`: estrutura da página (cabeçalho, busca, filtros, estados de carregamento/erro/vazio) e o `<template>` usado para montar cada card de prompt.
- `style.css`: variáveis CSS (`:root` e `[data-theme="escuro"]`) para tema claro/escuro, e o layout responsivo.
- `script.js`: toda a lógica de comportamento (busca, filtros por área e por tag, contador de resultados, alternância e persistência de tema, expandir/recolher texto, destaque e preenchimento de placeholders, copiar texto e link, link direto por `#id`, montagem dos cards a partir do template, tratamento de carregando/erro/vazio).
- `prompts.json`: dados dos prompts (fonte única de conteúdo).
- `assets/favicon.svg`: favicon do site.
- `scripts/validar-prompts.mjs`: validador do `prompts.json` (Node 18+, sem dependências); roda também no GitHub Actions (`.github/workflows/validar-prompts.yml`).
- `.github/ISSUE_TEMPLATE/sugestao-de-prompt.yml`: formulário de issue usado pelo link "Sugira um prompt" do site.
- `README.md`: instruções de uso local, formato de dados, validação, sugestões e deploy na Vercel.

## 3. Formato dos dados (`prompts.json`)

Lista de objetos. Cada item tem 9 campos:

- `id`: identificador único, em kebab-case (minúsculas, hífen, sem acento). Não pode se repetir.
- `titulo`: nome curto exibido na listagem.
- `descricao`: explicação breve do que o prompt faz.
- `tipo`: tipo do item (hoje, sempre `"Prompt"`).
- `area`: uma das seis áreas permitidas, exatamente como escrito: `Redação oficial`, `Licitações e contratos`, `Gestão`, `Engenharia`, `RH`, `Jurídico`.
- `tags`: lista de palavras-chave usadas na busca.
- `texto`: o texto do prompt, pronto para copiar e colar em uma LLM, com `[PLACEHOLDER]` em colchetes e maiúsculas para os campos que a pessoa deve preencher.
- `dataCriacao`: data de criação, formato `AAAA-MM-DD`.
- `dataAtualizacao`: data da última atualização, formato `AAAA-MM-DD`.

## 4. O que já foi implementado (MVP concluído)

- Estrutura de dados em `prompts.json` com os prompts atuais (hoje 7 itens, cobrindo Redação oficial, Gestão e Licitações e contratos).
- Layout responsivo com tema claro/escuro persistido em `localStorage`; o site sempre inicia no tema claro, independente do tema salvo na visita anterior, carregando-o só depois.
- Busca por título, descrição, texto e tags, sem diferenciar acento ou maiúsculas/minúsculas.
- Filtro por área montado a partir dos dados: o select só lista áreas que têm prompts, com a contagem de cada uma, na ordem canônica das seis áreas.
- Tags clicáveis: clicar numa tag filtra por ela (combinável com busca e área); um aviso no painel de busca mostra a tag ativa e permite removê-la.
- Contador de resultados (`role="status"`, `aria-live="polite"`) e botão "Limpar filtros" no estado vazio.
- Placeholders (`[TEXTO EM MAIÚSCULAS]`) destacados no texto do prompt; painel "Preencher N campos" (`<details>`) com um campo por placeholder. O botão "Copiar" copia o texto já preenchido (campos vazios ficam como placeholder). Valores, painel aberto e texto expandido sobrevivem à re-renderização da lista (estado em memória por `id`, não persistido).
- Aviso de uso responsável (LGPD, informação restrita, ferramenta autorizada, revisão humana) no topo da lista, recolhido em um `<details>`.
- Data de publicação/atualização em cada card, selos "Novo"/"Atualizado" (janela de 30 dias, constante `DIAS_SELO`) e ordenação (ordem da biblioteca, atualizados recentemente, título A a Z).
- Link "Sugira um prompt" (rodapé e estado vazio) para o formulário de issue no GitHub.
- Validador `scripts/validar-prompts.mjs` + workflow no GitHub Actions.
- Link direto para cada prompt (`#id-do-prompt`) com botão "Copiar link"; ao abrir o link, os filtros são limpos se necessário, a página rola até o card, destaca-o e move o foco para o título.
- Mensagem de "nenhum resultado" quando busca e filtro não retornam itens.
- Texto do prompt recolhido por padrão, com botão "Ver mais"/"Ver menos" acessível (`aria-expanded`, `aria-controls`); o botão (e o degradê de corte) só aparecem quando o texto realmente está truncado, descontando o padding do bloco, e o cálculo é refeito ao redimensionar a janela.
- Botão "Copiar" com feedback visual temporário ("Copiado!" ou aviso de falha).
- Tratamento de erro ao carregar `prompts.json` (estado de erro visível com `role="alert"`).
- Acessibilidade básica: `lang="pt-BR"`, labels em todos os campos, `aria-expanded` e `aria-pressed` nos botões de estado, foco visível, link "pular para o conteúdo".
- SEO básico: `title`, `meta description` e tags Open Graph no `index.html`.
- Favicon em `assets/favicon.svg`.

## 5. Convenções de workflow

Uma branch e um PR por tarefa (por exemplo `feat/dados`, `feat/layout`, `feat/comportamento`, `feat/deploy`, `fix/...`), mergeados via squash na `main`. Não há suíte de testes automatizada para a interface. Ao mexer em `prompts.json`, rode `node scripts/validar-prompts.mjs` (também roda no CI); o resto da validação é manual (testar no navegador, checar acessibilidade básica).

## 6. Pendências conhecidas

- Nome definitivo do site e domínio: há um placeholder em `og:url` no `index.html` (`https://exemplo.com/`) esperando a definição do dono.
- Faltam os demais prompts reais do dono: hoje há 7 itens em `prompts.json`, a meta é ter mais.
- Ainda não há prompts de Engenharia, RH e Jurídico em `prompts.json` (essas áreas não aparecem no filtro até existir conteúdo).
- O placeholder costuma ficar no fim de prompts longos; com o texto recolhido, o valor preenchido só aparece no texto ao clicar em "Ver mais" (o campo em si fica sempre visível).

- O link "Sugira um prompt" exige conta no GitHub, o que pode afastar servidores sem conta; uma alternativa sem login (ex.: formulário externo) depende de decisão do dono.
- O formulário de issue aplica o rótulo `sugestão de prompt`, que precisa ser criado no repositório para aparecer nas issues.

## 7. Fases futuras (fora do MVP atual)

Não implementar nenhum destes itens sem pedido explícito do dono do projeto:

- Login.
- Favoritos.
- Recomendações de MCP.
- Página "como instalar skills".
- CRUD por interface (hoje os prompts só podem ser editados direto em `prompts.json` via Git).
- Contador de cópias.
- Fonte personalizada.

## 8. Regra importante para agentes de IA

Qualquer `git push` ou `git stash push` neste ambiente é bloqueado por um hook de segurança (bash-guard) e precisa ser rodado manualmente pelo dono do projeto. Um agente de IA não deve tentar contornar esse bloqueio.
