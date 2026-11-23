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

Depois de editar o `prompts.json`, valide que o arquivo continua sendo um JSON válido (por exemplo, abrindo-o no editor ou rodando `python3 -m json.tool prompts.json` sem erros) e confira o resultado rodando o site localmente, como descrito acima.

## Deploy na Vercel

O projeto não tem passo de build: é servido como arquivos estáticos a partir da raiz do repositório. Para publicar:

1. Acesse [vercel.com](https://vercel.com) e conecte sua conta à conta do GitHub.
2. Clique em "Add New... > Project" e selecione este repositório.
3. Na configuração do projeto, não é necessário definir framework, comando de build ou diretório de saída: a Vercel detecta o projeto como estático e serve o conteúdo da raiz automaticamente.
4. Clique em "Deploy". A cada novo push na branch principal, a Vercel gera um novo deploy automaticamente.

Um domínio customizado pode ser configurado depois, separadamente, nas configurações do projeto na Vercel (Settings > Domains). Essa configuração fica a cargo do responsável pelo domínio e não é necessária para o site funcionar.
