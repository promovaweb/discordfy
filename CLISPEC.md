# Discordfy

`discordfy`: CLI, TUI and MCP stdio server to send rich messages to Discord channels through stored webhooks.

## Purpose

Times que conversam no Discord querem saber quando um deploy termina, um
build quebra ou um agente de IA conclui uma tarefa. O webhook do canal
resolve o envio, mas a URL dele carrega um token e acaba colada em scripts,
arquivos `.env` e históricos de shell. O Discordfy guarda cada webhook cifrado
com um nome curto de canal e envia notificações ricas (texto, embeds, campos,
imagens) sempre para um canal nomeado. A mesma base atende a pessoa no
terminal, os scripts de CI e os agentes, que reportam o próprio trabalho no
canal do time pelo MCP e pela skill `discordfy`.

## Audiences

| Público | Modo | Necessidade |
| --- | --- | --- |
| pessoa desenvolvedora | TUI | ver os webhooks cadastrados (canal e endereço), cadastrar, testar e mandar uma mensagem rápida |
| pessoa desenvolvedora | CLI texto | enviar avisos e mensagens ricas sem montar JSON à mão |
| CI, cron e hooks | CLI `--json` | avisar deploys, builds e releases com a URL vinda de um secret por stdin |
| agentes (Claude Code, Codex, OpenCode) | MCP e a skill `discordfy` | reportar progresso e resultados no canal certo, com embeds e sem ver o token |

## Out of scope

- Ler mensagens, responder ou moderar canais: webhooks só enviam. Isso é
  trabalho de bot, com token de bot.
- Criar webhooks no servidor: exige permissão "Gerenciar webhooks" e token de
  bot; a pessoa cria no Discord e cola a URL.
- Componentes interativos, enquetes e anexos de arquivo nesta versão.
- Canal padrão implícito: todo envio nomeia o canal.

## Surface

### Commands

| Command | Função |
| --- | --- |
| `send <channel> [message]` | mensagem com texto, embed montado por options, `--embed` extras ou `--payload` completo |
| `webhooks add <channel>` | salva a URL (sem eco ou stdin), conferida no Discord |
| `webhooks list [--reveal]` | canais e endereços mascarados |
| `webhooks show <channel> [--reveal]` | um webhook |
| `webhooks test <channel>` | GET no webhook, sem postar |
| `webhooks edit <channel>` | nome e avatar padrão no Discord (PATCH com token) |
| `webhooks rename <from> <to>` | apelido local |
| `webhooks remove <channel>` | apaga do cofre |
| `tui`, `about`, `config`, `credentials`, `mcp`, `skill`, `doctor`, `completion` | herdados do starter kit |

### Screens

| Screen | Função |
| --- | --- |
| `webhooks` (aba inicial) | tabela canal e endereço; `a` cadastra, `s` envia, `t` testa, `v` revela, `d` remove |
| `overview`, `settings`, `credentials`, `docs`, `about` | herdadas do starter kit |

### MCP

| Tool | Função |
| --- | --- |
| `webhooks_list` | canais com id e endereço mascarado |
| `webhook_test` | confere um webhook sem postar |
| `webhook_edit` | nome e avatar padrão no Discord |
| `discord_send` | texto, embeds e payload completo para o canal indicado |

Resources e prompts do starter kit seguem iguais.

### Settings

| Key | Função |
| --- | --- |
| `send.username` | nome de exibição padrão de `send` e `discord_send` |
| `send.avatarUrl` | avatar padrão de `send` e `discord_send` |
| `tui.initialTab` | passa a valer `webhooks` por padrão |

### Credentials

Cada webhook é a credencial `webhook.<channel>` no cofre AES-256-GCM. A
chave mestra vem de `DISCORDFY_MASTER_KEY` ou de `master.key`.

### Storage

`~/.discordfy/`: `settings.json`, `credentials.json` e `master.key`. Sem banco.

## Specs

| Spec | Status | Assunto |
| --- | --- | --- |
| [0001](specs/0001-webhooks-e-mensagens-ricas.md) | done | webhooks por canal, mensagens ricas, TUI, MCP e skill |

## Notes

- A TUI mostra o endereço com o token mascarado e só revela com `v`, por
  pedido explícito do produto (listar nome e endereço). Nenhum outro modo
  revela sem `--reveal`.
- `DISCORDFY_API_BASE` existe para os testes, que trocam o Discord por um
  servidor local.
