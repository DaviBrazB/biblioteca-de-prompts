# CLAUDE.md

Guia rápido para sessões de IA (Claude Code) trabalhando neste repositório.

## 1. O que é o projeto

Biblioteca de Prompts para a Administração Pública: um site estático e público que reúne prompts prontos e revisados para uso com LLMs no dia a dia do serviço público (redação oficial, licitações e contratos, gestão, engenharia, RH e jurídico).

Não há login, não há backend e não há banco de dados. O site é hospedado na Vercel como arquivos estáticos. Os prompts ficam em `prompts.json` e são editados diretamente pelo dono do projeto via Git: não existe CRUD por interface.

## 2. Stack e estrutura

HTML, CSS e JavaScript puros, sem framework e sem passo de build. Arquivos principais:

- `index.html`: estrutura da página (cabeçalho, busca, filtros, estados de carregamento/erro/vazio) e o `<template>` usado para montar cada card de prompt.
- `style.css`: variáveis CSS (`:root` e `[data-theme="escuro"]`) para tema claro/escuro, e o layout responsivo.
- `script.js`: toda a lógica de comportamento (busca, filtro por área, alternância e persistência de tema, expandir/recolher texto, copiar, montagem dos cards a partir do template, tratamento de carregando/erro/vazio).
- `prompts.json`: dados dos prompts (fonte única de conteúdo).
- `assets/favicon.svg`: favicon do site.
- `README.md`: instruções de uso local, formato de dados e deploy na Vercel.

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
- Filtro por área (select com as seis áreas).
- Mensagem de "nenhum resultado" quando busca e filtro não retornam itens.
- Texto do prompt recolhido por padrão, com botão "Ver mais"/"Ver menos" acessível (`aria-expanded`, `aria-controls`); o botão só aparece quando o texto realmente está truncado na área recolhida.
- Botão "Copiar" com feedback visual temporário ("Copiado!" ou aviso de falha).
- Tratamento de erro ao carregar `prompts.json` (estado de erro visível com `role="alert"`).
- Acessibilidade básica: `lang="pt-BR"`, labels em todos os campos, `aria-expanded` e `aria-pressed` nos botões de estado, foco visível, link "pular para o conteúdo".
- SEO básico: `title`, `meta description` e tags Open Graph no `index.html`.
- Favicon em `assets/favicon.svg`.

## 5. Convenções de workflow

Uma branch e um PR por tarefa (por exemplo `feat/dados`, `feat/layout`, `feat/comportamento`, `feat/deploy`, `fix/...`), mergeados via squash na `main`. Não há suíte de testes automatizada: a validação é manual (confirmar que `prompts.json` é um JSON válido, testar no navegador, checar acessibilidade básica).

## 6. Pendências conhecidas

- Nome definitivo do site e domínio: há um placeholder em `og:url` no `index.html` (`https://exemplo.com/`) esperando a definição do dono.
- Faltam os demais prompts reais do dono: hoje há 7 itens em `prompts.json`, a meta é ter mais.
- O filtro de área lista Engenharia, RH e Jurídico, mas ainda não há prompts dessas áreas em `prompts.json`; selecionar essas opções sempre mostra a lista vazia até existir conteúdo.
- Ressalva técnica conhecida: em `ajustarBotoesToggle` (`script.js`, função que decide se mostra o botão "Ver mais"), o cálculo de truncamento pode esconder o botão mesmo quando o texto está cortado, por não descontar corretamente o padding do bloco `.prompt-card__texto`. Além disso, esse cálculo não é refeito quando a janela é redimensionada.

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
