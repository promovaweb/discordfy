# 0001 Webhooks por canal e mensagens ricas

Status: done

## Goal

Criar o Discordfy a partir do starter kit do Termfy 0.13.4: guardar mais de
um webhook de canal do Discord, cada um com nome próprio, e enviar mensagens
ricas sempre nomeando o canal, pelo CLI, pela TUI e pelo MCP, com a skill
`discordfy` para agentes.

## Behavior

- `webhooks add <channel>` lê a URL sem eco (TTY) ou da primeira linha de
  stdin, valida o formato (`discord.com`, `discordapp.com`, `ptb`, `canary`,
  com ou sem versão), confere com GET no Discord (salvo `--no-verify`) e grava
  a forma canônica no cofre como `webhook.<channel>`. Canal existente exige
  `--force`.
- Listagens mascaram o token; `--reveal` mostra a URL. As tools MCP nunca a
  devolvem.
- `send <channel>` exige o canal; canal desconhecido sai com 6 e
  `details.known`. As options montam um embed com todos os elementos
  (título, link, descrição, cor, autor, campos empilhados e inline, imagem,
  miniatura, rodapé, horário), mais `--embed` extras, nome e avatar da
  mensagem, `tts`, `--silent`, `--suppress-embeds`, tópico e post de fórum.
  Menções desligadas por padrão. `--payload` aceita `embeds` e o formato
  antigo `embed`. Limites do Discord conferidos antes da rede (exit 2).
  `--dry-run` imprime o corpo.
- O envio usa `?wait=true` e devolve id, canal e horário. 429 com espera de
  até 10 s é repetido uma vez.
- `webhooks edit` muda nome e avatar (arquivo ou URL convertidos em data URI).
- A TUI abre na aba Webhooks com canal e endereço.

## Design

- `src/discord/webhooks.ts`: validação de canal e URL, máscara e CRUD sobre
  `readVault`/`writeVault`.
- `src/discord/message.ts`: tipos, `buildPayload`, `normalizePayload`,
  `validatePayload`, cores e campos.
- `src/discord/api.ts`: `sendMessage`, `webhookInfo`, `modifyWebhook`,
  `avatarDataUri`, com `DISCORDFY_API_BASE` para testes.
- Parser ganha options `repeatable` (valores em lista) para `--field`,
  `--inline-field` e `--embed`.
- Commands em `src/cli/commands/send.ts` e `webhooks.ts`; screen em
  `src/tui/screens/webhooks.ts`; tools em `src/mcp/tools/discord.ts`.

## Surface

Commands `send` e `webhooks *`, screen `webhooks`, tools `webhooks_list`,
`webhook_test`, `webhook_edit`, `discord_send`, keys `send.username` e
`send.avatarUrl`, `tui.initialTab = webhooks`.

## Tasks

- [x] Bootstrap do starter kit e licença AGPL `#termfy-init`
- [x] Webhooks no cofre `#termfy-config`
- [x] Client dos webhooks com retry de 429 `#termfy-api`
- [x] Commands `send` e `webhooks` `#termfy-cli`
- [x] Tools MCP `#termfy-mcp`
- [x] Screen `webhooks` e design system do Specsfy `#termfy-tui`
- [x] Testes de domínio, CLI, MCP e TUI `#termfy-test`
- [x] Documentação embutida, README, skill e guia do usuário `#termfy-docs`

## Tests

- [x] URL, máscara, canal, cores, campos, limites e flags (`tests/discord.test.ts`)
- [x] `webhooks add|list|test|edit|rename|remove`, `send` com embed, tópico, payload do Embed Visualizer, `--embed` e `--dry-run` contra servidor local (`tests/discord.test.ts`)
- [x] TUI com a aba Webhooks em todos os tamanhos (`tests/tui-*.test.ts`)
- [x] `bun run validate` verde

## Notes

Origem do pedido: Luiz, 24/11/2026.
