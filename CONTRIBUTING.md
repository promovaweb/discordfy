# Contribuindo com o Discordfy

Este guia é para quem desenvolve, revisa ou mantém o Discordfy. Para instalar
e usar a ferramenta, leia o [README.md](README.md).

O Discordfy é um binário Bun em TypeScript, criado com o starter kit do
[Termfy](https://github.com/promovaweb/termfy). O mesmo executável abre a TUI,
roda como CLI e sobe um servidor MCP por stdio. Ele guarda os webhooks dos
canais do Discord no cofre cifrado do usuário e envia mensagens ricas por eles.
Não há banco de dados: o estado vive no cofre e no `settings.json` em
`~/.discordfy/`.

## Antes de começar

Mudanças de comportamento começam por uma conversa. Use o
[Discord](https://promovaweb.com/discord) para dúvidas de uso e de direção.
Abra uma [issue](https://github.com/promovaweb/discordfy/issues) por mudança.
Descreva o problema, a versão (`discordfy --version`), o sistema operacional e
o passo a passo para reproduzir.

Pull requests grandes sem issue discutida antes podem ficar em revisão por mais
tempo. Correções pequenas de documentação e de texto podem ir direto para o
pull request.

## Ambiente

Requisitos:

- Bun 1.4.4 ou superior. O binário roda sobre Bun, não sobre Node.js.
- Git.

```bash
git clone https://github.com/promovaweb/discordfy.git
cd discordfy
bun install
bun run dev -- --help                                   # executa o CLI pelo TypeScript
bun run dev -- send deploys "Teste" --dry-run           # mostra o JSON sem chamar o Discord
```

Para experimentar sem tocar no cofre real, aponte a pasta de dados para um
diretório temporário com `DISCORDFY_HOME`:

```bash
export DISCORDFY_HOME="$(mktemp -d)"
bun run dev -- webhooks list
```

O cofre e as preferências ficam em `~/.discordfy/` (`credentials.json` e
`settings.json`). A variável `DISCORDFY_HOME` troca essa pasta. A chave mestra
pode vir de `DISCORDFY_MASTER_KEY`, sem gravar nada em disco.

### Os testes não usam rede

A suíte troca a API do Discord por um servidor local criado com `Bun.serve`,
apontado por `DISCORDFY_API_BASE`. Cada teste usa um `DISCORDFY_HOME`
temporário, removido ao final. O teste de webhooks em `tests/discord.test.ts`
cobre o domínio (URL, máscara, cores, campos, limites) e o CLI (`add`, `list`,
`send`, `webhooks edit`, `test`, `rename` e `remove`) contra esse servidor. Um
webhook que responde 404 é simulado para confirmar a mensagem de erro. Não há
chamada ao Discord, por isso a suíte roda em CI e em máquina sem webhook.

## Organização do código

```text
src/
  main.ts               entrada: TUI sem argumentos, CLI com argumentos, mcp com subcomando
  app/                  erros, tabela de exit codes e identidade do binário (manifest)
  config/               cofre cifrado, chave mestra, settings.json e caminhos
  discord/              domínio: webhooks.ts (cofre de canais), message.ts (montagem e limites), api.ts (cliente HTTP)
  cli/                  registry, parser, saída e um arquivo por command em cli/commands/
  mcp/                  servidor, resources, prompts e um grupo de tools por arquivo
  tui/                  tema, componentes e telas em tui/screens/
  skill/                documentação embutida lida por --skill
docs/                   documentação embutida, impressa por discordfy --skill
docs/user/              guia do usuário, fonte do ebook
skills/discordfy/       skill para agentes que usam o binário, com references/
.agents/skills/         skills do framework Termfy, instaladas por npx skills
template/               stubs de command, screen, tool e de banco de dados (inativos neste projeto)
examples/               exemplos de payload, como o embed do Embed Visualizer
ebook/                  VERSION e build.json da edição do guia
.ebook/                 gerador do PDF e do EPUB, templates, CSS e metadados
brand/                  logo, paleta, tokens e fontes da marca
npm/                    pacote @promovaweb/discordfy: invólucro que baixa o binário da release
scripts/                build, validações, init e geração do README do npm
tests/                  bun test, com servidor local da API
.github/workflows/      ci.yml (validação) e release.yml (binários e GitHub Release)
dist/                   binários compilados por bun run build (gerado, fora do Git)
```

As partes que fazem o Discordfy ser Discordfy:

| Caminho | Responsabilidade |
| --- | --- |
| `src/discord/webhooks.ts` | guardar webhooks no cofre como `webhook.<canal>`, validar nomes de canal e URLs, mascarar tokens |
| `src/discord/message.ts` | montar o payload a partir de flags ou JSON, converter cores e campos, checar os limites do Discord |
| `src/discord/api.ts` | cliente HTTP: envio com `?wait=true`, leitura e edição do webhook, avatar em data URI, retry de 429 |
| `src/cli/commands/send.ts` | command `send`, com `--dry-run`, `--payload` e as opções de embed |
| `src/cli/commands/webhooks.ts` | subcommands `add`, `list`, `show`, `test`, `edit`, `rename` e `remove` |
| `src/mcp/tools/discord.ts` | tools `webhooks_list`, `webhook_test`, `webhook_edit` e `discord_send` |
| `src/tui/screens/webhooks.ts` | aba Webhooks: lista, revelar URL, adicionar, enviar texto, testar e remover |

O resto vem do Termfy e segue a estrutura do starter kit: cofre, settings,
`about`, `doctor`, `completion`, resources e prompts do MCP, tema da TUI. As
camadas e o fluxo de dados estão em
[docs/architecture.md](docs/architecture.md). O mapa de onde cada mudança entra
está em [docs/customize-template.md](docs/customize-template.md).

## Skills e especificação

As skills do framework [Termfy](https://github.com/promovaweb/termfy) ficam em
`.agents/skills/`, com origem registrada em `skills-lock.json`. A skill
`skills/discordfy/` ensina um agente a usar o binário e fica versionada no
próprio repositório. O [AGENTS.md](AGENTS.md) lista a ordem de leitura e as
regras que valem para toda mudança. Não edite `.agents/skills/termfy-*` à mão:
a atualização chega por `bun run skills:update` ou pela manutenção conduzida
por `termfy-init`.

A visão do binário está em `CLISPEC.md` e cada evolução tem uma spec em
`specs/`. Quando um pedido não for trivial, escreva a spec com a skill
`termfy-spec` antes de implementar e
registre o comportamento em `Behavior` e o desenho em `Design`. Marque a
checklist ao concluir e mude o status para `done`.

## Fluxo de trabalho

1. Abra ou escolha uma issue que descreva o comportamento esperado.
2. Crie um branch curto a partir da `main`.
3. Faça a mudança em `src/` e acrescente o teste correspondente em `tests/`.
4. Se a mudança alterar a superfície do CLI, do MCP ou da TUI, atualize `docs/`.
   Quando o registry de commands mudar, rode `bun run opencli` e revise o diff de
   `docs/opencli.json`. `bun run docs:check` confere que todo command, option,
   tool, resource, prompt, chave e exit code aparece na documentação.
5. Rode `bun run validate`. Quando o guia do usuário mudar, rode também
   `bun run ebook` e `bun run ebook:verify`.
6. Abra o pull request com a issue relacionada e a validação executada.

## Regras do código

- Código, nomes de arquivos, comandos, mensagens do binário, options,
  arguments, chaves de configuração e campos do `--json` em inglês. Documentação
  para pessoas, comentários de cabeçalho e JSDoc em português do Brasil, com os
  termos técnicos em inglês.
- Toda option, argument, tool e chave nasce documentada: `description` no
  registry, linha em `docs/` e, quando for conceito novo, um parágrafo em prosa.
  O `--skill` imprime `docs/` inteiro mais a referência gerada do registry.
- Exit codes vêm de `src/app/exit-codes.ts`. Zero é sucesso. Não invente número
  em command: acrescente a família na tabela.
- Segredos nunca passam por argumento, log, erro, `--json` sem `--reveal`, tool
  do MCP ou frame da TUI. A URL do webhook carrega o token, então ela é segredo:
  `webhooks add` lê a URL sem eco ou pela entrada padrão, nunca por argumento.
  Leia credenciais com `getCredential()`.
- Mensagens de erro não podem citar a URL nem o token do webhook.
- Stdout recebe dados. Stderr recebe progresso e avisos. No modo `mcp`, o
  stdout é do JSON-RPC.
- Um arquivo por command, por tela e por grupo de tools. O registro central fica
  em `src/cli/commands.ts`, `src/tui/screens/index.ts` e `src/mcp/server.ts`.
- Cores da TUI só em `src/tui/theme.ts`.
- Limites do Discord ficam em `src/discord/message.ts`. Mudou um limite da API,
  mude ali e no teste correspondente.
- Menções ficam desligadas por padrão (`allowed_mentions.parse = []`). Ligar
  menções é escolha explícita de quem chama (`--allow-mentions`).
- Node e npm não entram no binário. O projeto usa Bun para rodar, testar e
  compilar. O `npx skills` é a única exceção, por ser a ferramenta oficial de
  distribuição de skills.
- Documente o código novo ou alterado com cabeçalho explicando o propósito do
  arquivo e JSDoc em funções exportadas.
- `dist/` é gerado. Não edite à mão: rode `bun run build`.

## Validar

O comando completo é:

```bash
bun run validate
```

Ele executa, nesta ordem:

1. `bun run typecheck`: `tsc --noEmit`.
2. `bun test`: suíte completa, sem rede.
3. `bun run skills:check`: confere as skills do framework instaladas e o lock.
4. `bun run opencli:check`: confere `docs/opencli.json` contra o registry.
5. `bun run docs:check`: confere a documentação contra o código.
6. `bun run build`: compila o binário em `dist/discordfy`.

Comandos auxiliares:

```bash
bun test tests/discord.test.ts          # um arquivo de teste
bun run opencli                         # regera docs/opencli.json
bun run dev -- mcp --list               # tools, resources e prompts do servidor
bun run build:all                       # binários para as cinco plataformas
bun run ebook                           # gera PDF e EPUB do guia do usuário
bun run ebook:verify                    # confere a edição sem gerar
```

A CI em `.github/workflows/ci.yml` roda `bun install --frozen-lockfile` e
`bun run validate` a cada pull request e push na `main`.

## Documentação

| Onde | O que fica |
| --- | --- |
| `README.md` | instalação e uso, publicado também na página do npm (`npm/README.md`, gerado) |
| `docs/` | documentação embutida, impressa por `discordfy --skill` |
| `docs/user/` | guia do usuário, fonte do ebook |
| `docs/architecture.md` | camadas, fluxo de dados e testes |
| `docs/customize-template.md` | onde cada mudança entra no código |
| `docs/release.md` | publicação de versões |
| `skills/discordfy/` | instruções lidas pelo agente que usa o binário |
| `brand/README.md` | logo, paleta e regras de uso da marca |

Quando o README mudar, gere a cópia do npm com `bun run npm:readme`. O teste
`tests/npm-wrapper.test.ts` falha se `npm/README.md` ficar desatualizado.

### Ebook

O PDF e o EPUB saem de `docs/user/`, na ordem definida em
`docs/user/reading-order.txt`. O gerador fica em `.ebook/build-ebook.mjs`, usa
`brand/logo/icon.svg` e os templates de `.ebook/`, e grava a edição em `ebook/`.
A versão em `ebook/VERSION` identifica a edição e deve acompanhar a versão do
`package.json`.

```bash
bun run ebook
bun run ebook:verify
```

A geração precisa de `pandoc`, `weasyprint`, `unzip`, `xmllint`, `magick`
(ImageMagick), `fc-match` e `pdftohtml`. O `ebook:verify` confere versão, hash
da fonte e a edição gerada, sem gerar nada de novo.

## Commits e pull requests

Os commits seguem Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`,
`build:`). Os prefixos orientam a seção da próxima versão no `CHANGELOG.md`.

Um pull request deve trazer:

- descrição do problema e do comportamento novo;
- a issue relacionada;
- os comandos de validação executados;
- trecho de saída ou captura de tela quando a mudança for visível no terminal.

Não inclua o webhook, a URL completa de um canal, o conteúdo de
`~/.discordfy/` nem mensagens reais de servidores no pull request. Use um
servidor de teste e um webhook descartável.

## Releases

A versão vem do `package.json` e o histórico fica no `CHANGELOG.md`. A tag
`vX.Y.Z` dispara o workflow `release.yml`, que compila os binários das cinco
plataformas, gera o `SHA256SUMS` e publica a GitHub Release com as notas do
changelog. A versão da tag precisa ser igual à do `package.json` e à do
`npm/package.json`.

Depois da release, o pacote npm `@promovaweb/discordfy` é publicado desta
máquina a partir da pasta `npm/`, com a conta `contatopromovaweb`. O invólucro
baixa o binário da release da mesma versão, então a release precisa existir
antes do `npm publish`.

O passo a passo está em [RELEASING.md](RELEASING.md) e em
[docs/release.md](docs/release.md).

## Licença

Ao enviar uma contribuição, você concorda que ela entra sob a mesma licença
do projeto, a [GNU AGPL 3.0](LICENSE).
