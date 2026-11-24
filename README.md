# Biblioteca de Prompts

Site estático e público que reúne prompts prontos e revisados para uso com LLMs no serviço público. O conteúdo é organizado por área (Redação oficial, Licitações e contratos, Gestão, Engenharia, RH e Jurídico) e pode ser buscado e filtrado diretamente na página. Não há login nem backend: tudo é HTML, CSS e JavaScript puros, com os dados dos prompts em um arquivo JSON.

## Como rodar localmente

O site faz `fetch` do arquivo `prompts.json`. Navegadores bloqueiam esse tipo de requisição quando o `index.html` é aberto direto como arquivo (`file://`), então é preciso servir os arquivos por um servidor HTTP simples.

Escolha uma das opções abaixo na raiz do projeto:

```bash
# com Python 3 (já vem instalado na maioria dos sistemas)
python3 -m http.server 8000

# ou com Node.js, sem instalar nada global
npx serve .
```

Depois, abra `http://localhost:8000` (ou a porta indicada pelo comando) no navegador.

## Como adicionar um novo prompt

Todo o conteúdo da biblioteca fica em `prompts.json`, na raiz do projeto. Esse arquivo é uma lista de objetos. Para adicionar um prompt, inclua um novo objeto na lista seguindo exatamente este formato:

```json
{
  "id": "revisar-edital",
  "titulo": "Revisar edital",
  "descricao": "Revisa a minuta de edital em busca de inconsistências e cláusulas restritivas.",
  "tipo": "Prompt",
  "area": "Licitações e contratos",
  "tags": ["edital", "licitação", "revisão"],
  "texto": "Revise a minuta de edital a seguir, apontando inconsistências e cláusulas restritivas: [TEXTO].",
  "dataCriacao": "2026-11-23",
  "dataAtualizacao": "2026-11-23"
}
```

Campos:

- `id`: identificador único do prompt, em formato slug kebab-case (letras minúsculas e palavras separadas por hífen, sem espaços ou acentos). Não pode se repetir entre os itens do arquivo.
- `titulo`: nome curto do prompt, exibido na listagem.
- `descricao`: explicação breve do que o prompt faz.
- `tipo`: tipo do item (atualmente, todos os itens usam `"Prompt"`).
- `area`: uma das áreas permitidas, exatamente como escrito abaixo:
  - `Redação oficial`
  - `Licitações e contratos`
  - `Gestão`
  - `Engenharia`
  - `RH`
  - `Jurídico`
- `tags`: lista de palavras-chave usadas na busca.
- `texto`: o texto do prompt em si, pronto para ser copiado e colado em uma LLM. Use `[PLACEHOLDER]` em letras maiúsculas e colchetes para indicar onde a pessoa deve preencher uma informação própria (como `[ASSUNTO]` ou `[TEXTO]`).
- `dataCriacao`: data de criação do prompt, no formato `AAAA-MM-DD`.
- `dataAtualizacao`: data da última atualização do prompt, no formato `AAAA-MM-DD`.

Depois de editar o `prompts.json`, rode o validador (precisa de Node.js 18 ou mais recente, sem instalar nada):

```bash
node scripts/validar-prompts.mjs
```

Ele confere se o arquivo é um JSON válido e se cada item segue o formato acima: campos obrigatórios, `id` em kebab-case e sem repetição, área e tipo permitidos, datas reais no formato `AAAA-MM-DD` (com `dataAtualizacao` igual ou posterior a `dataCriacao`), além de avisar sobre placeholders fora do padrão. Erros fazem o comando falhar; avisos não. O mesmo validador roda automaticamente no GitHub (workflow `Validar prompts`) em cada PR e push na `main` que altere o `prompts.json`.

Por fim, confira o resultado rodando o site localmente, como descrito acima.

### Selos "Novo" e "Atualizado"

O site mostra o selo **Novo** nos prompts com `dataCriacao` de até 30 dias atrás e **Atualizado** quando `dataAtualizacao` é posterior à criação e também tem até 30 dias. Ao revisar um prompt existente, atualize `dataAtualizacao` para ele aparecer como atualizado e subir na ordenação "Atualizados recentemente".

## Sugestões de prompts

Qualquer pessoa pode sugerir um prompt pelo link no rodapé do site, que abre o formulário de issue "Sugestão de prompt" no GitHub (`.github/ISSUE_TEMPLATE/sugestao-de-prompt.yml`). É preciso ter conta no GitHub. A sugestão não entra no site automaticamente: o dono do projeto revisa e, se aprovar, adiciona o item ao `prompts.json`.

## Endereço do site e compartilhamento

Enquanto o endereço definitivo não existir, `og:url` e `og:image` no `index.html` usam o placeholder `https://exemplo.com/`, e o preview do link (WhatsApp, Teams etc.) não mostra a imagem. Quando o endereço estiver definido, rode:

```bash
node scripts/definir-dominio.mjs https://endereco-do-site/
```

O script atualiza `og:url` e `og:image`, cria o `<link rel="canonical">`, gera o `sitemap.xml` e acrescenta a linha `Sitemap:` ao `robots.txt`. Pode ser rodado de novo se o endereço mudar.

A imagem de compartilhamento é `assets/og-image.png` (1200×630), gerada a partir de `assets/og-image.svg`. Para regenerá-la depois de editar o SVG:

```bash
google-chrome --headless --hide-scrollbars --window-size=1200,630 --screenshot=assets/og-image.png assets/og-image.svg
```

## Deploy na Vercel

O projeto não tem passo de build: é servido como arquivos estáticos a partir da raiz do repositório. Para publicar:

1. Acesse [vercel.com](https://vercel.com) e conecte sua conta à conta do GitHub.
2. Clique em "Add New... > Project" e selecione este repositório.
3. Na configuração do projeto, não é necessário definir framework, comando de build ou diretório de saída: a Vercel detecta o projeto como estático e serve o conteúdo da raiz automaticamente.
4. Clique em "Deploy". A cada novo push na branch principal, a Vercel gera um novo deploy automaticamente.

Um domínio customizado pode ser configurado depois, separadamente, nas configurações do projeto na Vercel (Settings > Domains). Essa configuração fica a cargo do responsável pelo domínio e não é necessária para o site funcionar.
