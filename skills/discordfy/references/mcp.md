# Tools do MCP

## Forma das respostas

O resultado de `tools/call` não tem `ok` nem `command` (esses campos são do
envelope do CLI). Leia assim:

| Situação | Onde ler |
| --- | --- |
| sucesso | `structuredContent` com o objeto da tool; `content[0].text` repete o JSON em texto |
| erro de domínio | `isError: true` e `structuredContent.error` com `code`, `name`, `message` e `details` opcional |
| argumentos fora do schema | `isError: true` e só `content[0].text`, começando por `MCP error -32602: Input validation error`; não há `structuredContent` |

Os códigos de erro são os mesmos do CLI (ver `erros.md`). Nenhuma tool
devolve a URL do webhook.

## webhooks_list

Entrada: nenhuma.

Saída:

```json
{
  "count": 2,
  "webhooks": [
    { "channel": "deploys", "id": "123456789012345678", "masked": "https://discord.com/api/webhooks/123456789012345678/AbCd••••••••yz" },
    { "channel": "time-dev", "id": "234567890123456789", "masked": "https://discord.com/api/webhooks/234567890123456789/EfGh••••••••wx" }
  ]
}
```

A lista vazia não é erro. Para confirmar um canal, procure o nome em
`webhooks[].channel`.

## webhook_test

Entrada: `{ "channel": "deploys" }`. Lê o webhook no Discord sem publicar.

Saída: `{ "channel", "ok": true, "webhook": { "id", "name", "channel_id", "guild_id"? } }`.
`guild_id` só aparece quando o Discord informa.

## webhook_edit

Entrada:

| Argumento | Tipo | Observação |
| --- | --- | --- |
| `channel` | texto | obrigatório |
| `name` | texto | novo nome padrão, 1 a 80, sem "discord" nem "clyde" |
| `avatar_url` | URL | imagem PNG, JPEG ou GIF até 8 MB; só URL (arquivo local é opção do CLI) |
| `remove_avatar` | booleano | volta ao avatar padrão |

Pelo menos um de `name`, `avatar_url` ou `remove_avatar`. `avatar_url`
junto de `remove_avatar` é recusado (USAGE). Use URL pública sem segredos
na query. Falha no download devolve `Could not download the avatar image.`
sem a URL. Saída: `{ "channel", "updated": [...], "webhook": { ... } }`,
com `updated` listando só os campos pedidos (`name`, `avatar`).

## discord_send

| Argumento | Tipo | Opção do CLI | Observação |
| --- | --- | --- | --- |
| `channel` | texto | `<channel>` | obrigatório; nome salvo |
| `content` | texto | `[message...]`, `--stdin` | até 2000 |
| `title` | texto | `-t`, `--title` | até 256 |
| `description` | texto | `-d`, `--description` | até 4096, Markdown |
| `url` | URL | `--url` | link do título |
| `color` | texto ou número | `-c`, `--color` | nome, `#RRGGBB` ou decimal |
| `fields` | lista | `--field`, `--inline-field` | `{ name, value, inline? }`, até 25, na ordem da lista |
| `author` | objeto | `--author`, `--author-url`, `--author-icon` | `{ name, url?, icon_url? }` |
| `footer` | objeto | `--footer`, `--footer-icon` | `{ text, icon_url? }` |
| `image` | URL | `--image` | imagem grande |
| `thumbnail` | URL | `--thumbnail` | miniatura |
| `timestamp` | texto | `--timestamp` | `now` ou ISO 8601 |
| `embeds` | lista | `--embed` | embeds extras, normalizados como no CLI |
| `payload` | objeto | `--payload` | corpo completo; aceita `embed` no singular |
| `username` | texto | `-u`, `--username` | nome desta notificação |
| `avatar_url` | URL | `--avatar-url` | avatar desta notificação |
| `tts` | booleano | `--tts` | leitura em voz alta |
| `thread_id` | texto | `--thread-id` | tópico existente |
| `thread_name` | texto | `--thread-name` | post novo em fórum |
| `silent` | booleano | `--silent` | sem notificação push |
| `suppress_embeds` | booleano | `--suppress-embeds` | sem prévias de links |
| `allow_mentions` | booleano | `--allow-mentions` | padrão `false` |
| `dry_run` | booleano | `--dry-run` | devolve o corpo sem chamar o Discord |

`embeds` passa pela mesma normalização do CLI: cores por nome ou
`#RRGGBB` viram número e as chaves que webhooks não definem (`type`,
`provider`, `video` e outras) são descartadas.

Com `payload`, a composição segue `payload.md`: identidade explícita vence
a do payload, que vence o padrão local; `content` e `thread_name` da
chamada substituem os do payload; `tts: false` não desliga um `tts: true`
do payload; flags somam; `embeds` e campos de embed da chamada viram
embeds novos depois dos do payload. `color` sem título, descrição, campo,
autor ou imagem na chamada é recusado (USAGE): para recolorir um embed do
payload, edite o payload.

Menções: com `allow_mentions` ausente ou `false`, o corpo leva
`allowed_mentions: {"parse": []}` mesmo que o payload traga outro objeto.
Com `true`, o `allowed_mentions` do payload vale quando existir.

Saída de envio:

```json
{ "channel": "deploys", "sent": true, "message": { "id": "1310000000000000000", "channel_id": "987654321098765432", "timestamp": "2026-11-24T10:00:00.000000+00:00" } }
```

`message.id` vazio não comprova a entrega (ver `erros.md`, "Entrega
incerta").

Saída de dry run: `{ "channel", "dryRun": true, "payload": { ... }, "threadId"? }`.
O dry run valida o nome do canal e devolve `threadId` quando `thread_id`
foi informado, mas não confere se o canal está cadastrado: use
`webhooks_list` e `webhook_test` para isso.

Os padrões `send.username` e `send.avatarUrl` de `settings.json` valem
quando nem a chamada nem o payload trazem `username` e `avatar_url`.

## Tools de apoio

Cada uma tem formato próprio, sem o envelope `error` das tools de Discord:

| Tool | Entrada | Saída |
| --- | --- | --- |
| `doctor` | nenhuma | `{ checks: [{ name, status, detail }], ok }`; leia `ok` e os itens com status diferente de `ok` |
| `credentials_status` | nenhuma | arquivo, nomes salvos e origem da chave mestra, sem valores |
| `config_list` | nenhuma | toda key de `settings.json` com o valor efetivo |
| `config_get` | `key` obrigatório | `{ key, value, exists }`; key desconhecida volta com `isError: true` e `exists: false` |
| `skill` | `topic` opcional (`cli`, `tui`, `mcp`, `config`, `exit-codes`, `reference`) | só `content[0].text` com Markdown |
| `about`, `exit_codes` | nenhuma | identidade do binário e tabela de códigos |

## Resources e prompt

| Item | Conteúdo |
| --- | --- |
| `discordfy://about` | identidade e runtime em JSON |
| `discordfy://exit-codes` | tabela de exit codes em JSON |
| `discordfy://skill` | documentação completa em Markdown |
| `discordfy://skill/{topic}` | uma seção: `cli`, `tui`, `mcp`, `config`, `exit-codes`, `reference` |
| prompt `operate(task)` | `task` obrigatório; devolve instruções para ler a documentação e executar a tarefa pelo CLI com `--json`. Não executa nada sozinho |

`discordfy mcp --list` mostra tools, resources e prompt sem abrir um
cliente.

## Sem MCP

Quando o servidor não estiver conectado, cada chamada tem um comando
equivalente com `--json`:

| Tool | Comando |
| --- | --- |
| `webhooks_list` | `discordfy webhooks list --json` |
| `webhook_test` | `discordfy webhooks test <canal> --json` |
| `webhook_edit` | `discordfy webhooks edit <canal> --name ... --json` |
| `discord_send` | `discordfy send <canal> ... --json` |
