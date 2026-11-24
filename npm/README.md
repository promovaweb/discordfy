<p align="center">
  <a href="https://promovaweb.com/discordfy/">
    <picture>
      <source type="image/svg+xml" srcset="https://raw.githubusercontent.com/promovaweb/discordfy/main/brand/logo/icon.svg">
      <img alt="Discordfy" src="https://raw.githubusercontent.com/promovaweb/discordfy/main/brand/logo/icon.png" width="112" height="112">
    </picture>
  </a>
</p>

<h1 align="center">Discordfy</h1>

<p align="center">
  Notificações ricas no Discord, no canal certo, a partir do terminal, do CI e do seu agente.
</p>

<p align="center">Um projeto da <a href="https://promovaweb.com">Promovaweb</a></p>

<p align="center">
  <img alt="Feito para Discord" src="https://img.shields.io/badge/Feito%20para-Discord-5865F2?logo=discord&logoColor=white">
</p>

<p align="center">
  <a href="https://github.com/promovaweb/discordfy/releases/latest"><img alt="GitHub Release" src="https://img.shields.io/github/v/release/promovaweb/discordfy"></a>
  <a href="https://www.npmjs.com/package/@promovaweb/discordfy"><img alt="npm" src="https://img.shields.io/npm/v/@promovaweb/discordfy"></a>
  <a href="https://github.com/promovaweb/discordfy/blob/main/LICENSE"><img alt="Licença" src="https://img.shields.io/github/license/promovaweb/discordfy"></a>
</p>

<p align="center">
  <a href="https://promovaweb.com/discord"><img alt="Discord: obter ajuda e conversar com a Comunidade" src="https://img.shields.io/badge/Discord-Obter%20ajuda%20e%20conversar%20com%20a%20Comunidade-5865F2?style=for-the-badge&logo=discord&logoColor=white"></a>
</p>

<p align="center">
  <a href="https://promovaweb.com/discordfy/">Site do Discordfy</a> ·
  <a href="https://github.com/promovaweb/discordfy/tree/main/docs/user">Guia do Usuário</a> ·
  <a href="https://promovaweb.com/harness/">Harness</a> ·
  <a href="https://promovaweb.com/ferramentas/">Ferramentas</a> ·
  <a href="https://promovaweb.com/discord">Discord</a> ·
  <a href="https://promovaweb.com/planos?utm_source=github&utm_medium=readme&utm_campaign=discordfy">Planos da Promovaweb</a> ·
  <a href="https://github.com/promovaweb/discordfy/blob/main/CHANGELOG.md">Changelog</a>
</p>

## O que é

O Discordfy é um sistema de notificações ricas para o Discord. Ele guarda o
webhook de cada canal com um nome curto (`deploys`, `alertas`, `time-dev`) e
envia notificações com embeds para o canal que você indicar. Não é um bot:
ele não lê nem responde mensagens, só publica nos canais pelos webhooks. O canal é sempre nomeado no envio, então nenhuma mensagem sai
para um destino implícito. O mesmo binário abre três modos:

| Modo | Como abrir | Para quê |
| --- | --- | --- |
| TUI | `discordfy` | ver os webhooks cadastrados (canal e endereço), cadastrar, testar e enviar |
| CLI | `discordfy send <canal> ...` | scripts, CI, hooks e cron, com saída em texto ou `--json` |
| MCP | `discordfy mcp` | seu agente de IA também envia notificações, por exemplo ao terminar uma tarefa |

As URLs ficam cifradas (AES-256-GCM) em `~/.discordfy/credentials.json`. O
token nunca aparece em listagem, log ou tool do MCP sem que você peça.

## Instalação

Com npm (baixa o binário da sua plataforma na primeira execução):

```bash
npm i -g @promovaweb/discordfy
discordfy --version
```

Ou baixe o executável em
[Releases](https://github.com/promovaweb/discordfy/releases/latest):
`discordfy-linux-x64`, `discordfy-linux-arm64`, `discordfy-darwin-x64`,
`discordfy-darwin-arm64` ou `discordfy-windows-x64.exe`, confira o
`SHA256SUMS`, dê permissão de execução e coloque no `PATH`.

### Instalar a skill no agente

A skill `discordfy` ensina Claude Code, Codex, OpenCode e outros agentes a
escolher o canal, montar o embed e enviar:

```bash
npx skills add promovaweb/discordfy
```

## Primeiros passos

1. No Discord, abra **Editar canal > Integrações > Webhooks > Novo webhook** e
   clique em **Copiar URL do webhook**.
2. Cadastre o canal. A URL é pedida sem eco e conferida no Discord:

   ```bash
   discordfy webhooks add deploys
   ```

3. Envie a primeira mensagem:

   ```bash
   discordfy send deploys "Olá, time!"
   ```

## Uso

### Mensagens ricas

```bash
discordfy send deploys \
  --title "Deploy v1.4.0" --url "https://github.com/acme/app/releases/tag/v1.4.0" \
  --description "Todos os testes passaram.\nTempo total: **42s**" \
  --color green --inline-field "Branch=main" --inline-field "Commit=a1b2c3d" \
  --field "Mudanças=3 correções e 1 recurso" \
  --author "GitHub Actions" --author-icon "https://github.githubassets.com/favicons/favicon.png" \
  --thumbnail "https://example.com/logo.png" --footer "CI" --timestamp
```

Cada elemento do embed tem sua option: título e link, descrição com Markdown,
cor (nome, `#RRGGBB` ou decimal), autor com link e ícone, campos empilhados ou
lado a lado, imagem, miniatura, rodapé com ícone e horário. Também é possível
trocar o nome e o avatar da mensagem, entregar sem notificação (`--silent`),
esconder prévias de links, postar num tópico ou criar um post de fórum. As
menções (`@everyone`, cargos, usuários) saem desligadas até você usar
`--allow-mentions`. Use `--dry-run` para ver o JSON antes de enviar.

### Payload completo

Tem um JSON pronto do Embed Visualizer ou do Discohook? Envie como está. O
Discordfy aceita `embeds` e o formato antigo `embed`:

```bash
discordfy send deploys --payload examples/embed-visualizer.json
cat mensagem.json | discordfy send deploys --payload -
```

### Gerenciar webhooks

```bash
discordfy webhooks list                 # canal e endereço, token mascarado
discordfy webhooks test deploys         # confere no Discord sem postar
discordfy webhooks edit deploys --name "Deploy bot" --avatar ./bot.png
discordfy webhooks rename deploys prod-deploys
discordfy webhooks remove prod-deploys
```

### Abrir a TUI

`discordfy` sem argumentos abre a aba **Webhooks**, com o canal e o endereço
de cada webhook. `a` cadastra, `s` envia uma mensagem ao canal selecionado,
`t` testa, `v` revela ou mascara as URLs, `d` remove e `?` mostra todas as
teclas.

### Usar no CI

```yaml
- name: Avisar no Discord
  env:
    DISCORDFY_MASTER_KEY: ${{ secrets.DISCORDFY_MASTER_KEY }}
    DISCORD_WEBHOOK: ${{ secrets.DISCORD_WEBHOOK_DEPLOYS }}
  run: |
    npm i -g @promovaweb/discordfy
    printf '%s' "$DISCORD_WEBHOOK" | discordfy webhooks add deploys --stdin --no-verify
    discordfy send deploys --title "Deploy ${{ github.ref_name }}" --color green --timestamp
```

### Saída para scripts

Com `--json`, toda resposta segue o envelope `{ ok, command, data }` ou
`{ ok, command, error }`. O exit code diz a classe da falha: `2` uso ou limite
do Discord, `4` cofre, `5` rede ou Discord, `6` canal sem webhook.

## Uso com agentes

Configure o servidor MCP no seu cliente:

```bash
claude mcp add discordfy -- discordfy mcp
```

```json
{ "mcpServers": { "discordfy": { "command": "discordfy", "args": ["mcp"] } } }
```

| Tool | Função |
| --- | --- |
| `webhooks_list` | canais cadastrados, sem o token |
| `discord_send` | envia texto, embeds ou o payload completo ao canal indicado |
| `webhook_test` | confere um webhook sem postar |
| `webhook_edit` | muda o nome e o avatar padrão do webhook no Discord |

Peça ao agente, por exemplo: "quando terminar, envie uma notificação no canal
`time-dev` com o que mudou, os testes e o link do PR".

## Documentação

- [Site do Discordfy](https://promovaweb.com/discordfy/)
- [Guia do Usuário](https://github.com/promovaweb/discordfy/blob/main/docs/user/README.md), também em [PDF e EPUB](https://github.com/promovaweb/discordfy/blob/main/ebook/)
- Referência embutida: `discordfy --skill` (CLI, TUI, MCP, configuração e
  exit codes)
- [Skill](https://github.com/promovaweb/discordfy/blob/main/skills/discordfy/SKILL.md) e suas
  [referências](https://github.com/promovaweb/discordfy/blob/main/skills/discordfy/references/)

## Feito com

| Projeto | Para quê |
| --- | --- |
| [Bun](https://github.com/oven-sh/bun) | runtime e compilação do binário |
| [Termfy](https://github.com/promovaweb/termfy) | starter kit com TUI, CLI e MCP no mesmo executável |
| [OpenTUI](https://github.com/sst/opentui) | interface do terminal |
| [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk) | servidor MCP |
| [Discord Webhooks](https://docs.discord.com/developers/resources/webhook) | envio das mensagens |

## Comunidade e suporte

- **Discord:** [obter ajuda e conversar com a Comunidade](https://promovaweb.com/discord).
- **Bugs e pedidos:** abra uma [issue](https://github.com/promovaweb/discordfy/issues)
  com a versão, o sistema operacional e o passo a passo para reproduzir.
- **Novidades:** acompanhe o [CHANGELOG](https://github.com/promovaweb/discordfy/blob/main/CHANGELOG.md)
  e as [releases](https://github.com/promovaweb/discordfy/releases).

## Contribuir

Este README cobre o uso. Para ambiente de desenvolvimento, organização do
código, validação e releases, leia o
[CONTRIBUTING.md](https://github.com/promovaweb/discordfy/blob/main/CONTRIBUTING.md).

## Promovaweb

O Discordfy é mantido pela [Promovaweb](https://promovaweb.com), comunidade de
co-working digital onde profissionais aprendem a construir, automatizar e
gerir negócios de tecnologia e IA com aulas ao vivo, Co-works e revisão de
projetos reais.

Quer usar o Discordfy em projetos de verdade, com acompanhamento? Conheça os
[planos da Promovaweb](https://promovaweb.com/planos?utm_source=github&utm_medium=readme&utm_campaign=discordfy).

## Licença

Distribuído sob a
[GNU AGPL 3.0](https://github.com/promovaweb/discordfy/blob/main/LICENSE).
A licença não concede o uso do nome e do logo do Discordfy nem da marca
Promovaweb (AGPL 3.0, seção 7, item e). Discord é marca da Discord Inc.; o
Discordfy é um projeto independente.
