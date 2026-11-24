# Erros e como resolver

## Forma das respostas

CLI com `--json` (stdout, exit code no processo):

| Situação | Corpo |
| --- | --- |
| sucesso | `{ "ok": true, "command": "discordfy send", "data": { "channel", "sent": true, "message": { "id", "channel_id", "timestamp" } } }` |
| dry run | `{ "ok": true, "command": "discordfy send", "data": { "channel", "dryRun": true, "payload": { ... } } }` |
| falha | `{ "ok": false, "command": "...", "error": { "code", "name", "message", "details"? } }` |

Tool do MCP (resultado JSON-RPC, sem `ok` nem `command`):

| Situação | Onde ler |
| --- | --- |
| sucesso | `structuredContent` traz o mesmo objeto de `data` do CLI |
| erro de domínio | `isError: true` e `structuredContent.error` com `code`, `name`, `message`, `details`? |
| argumentos fora do schema | `isError: true`, só `content[0].text`, começando por `MCP error -32602: Input validation error` |

`details` é opcional: leia `details.known`, `details.retryAfter` ou
`details.errors` só quando existirem. `content[0].text` repete o JSON em
texto e serve de alternativa quando o cliente não mostra
`structuredContent`. Tools auxiliares têm formatos próprios (ver `mcp.md`).

## Exit codes

| Código | Nome | Significado |
| --- | --- | --- |
| 0 | `SUCCESS` | enviado ou concluído |
| 1 | `GENERIC_ERROR` | falha inesperada, sem classificação |
| 2 | `USAGE` | option inválida, dado inválido, limite do Discord excedido, stdin vazio |
| 3 | `CONFIG` | `settings.json` inválido ou key desconhecida |
| 4 | `CREDENTIALS` | cofre ilegível ou chave mestra ausente |
| 5 | `NETWORK_OR_API` | rede, rate limit ou recusa do Discord |
| 6 | `NOT_FOUND` | canal sem webhook ou arquivo inexistente |
| 7 | `PERMISSION` | sem permissão no sistema de arquivos |
| 8 | `NO_TTY` | a TUI precisa de terminal interativo |
| 9 | `MCP` | o processo `discordfy mcp` não iniciou ou perdeu o stdio |
| 130 | `INTERRUPTED` | cancelado pela pessoa |

O código 9 é do processo do servidor. Uma tool que falha devolve o código
do erro dentro de `structuredContent.error.code`, e o servidor segue
rodando.

`webhooks add` fora de um terminal não pede nada: lê a primeira linha do
stdin mesmo sem `--stdin`. Com stdin vazio, sai com 2 e
`No value received on stdin. Send the secret as one line.` (sem `--stdin`)
ou `No URL received.` (com `--stdin`).

## Entrega incerta

`Could not reach Discord (network failure)` ou `(no answer in 15s)` pode
acontecer depois de o POST chegar ao Discord. Um sucesso com
`message.id` vazio também não comprova a mensagem. Nesses casos:

1. Relate entrega incerta e não invente um id.
2. Peça que a pessoa confira o canal no Discord.
3. Só repita o envio se a mensagem não estiver lá.

Um 429 é diferente: o Discord recusou o envio de forma explícita e nada foi
publicado. O Discordfy espera e repete uma vez quando a espera pedida é de
até 10 segundos. Acima disso, sai com 5 e `details.retryAfter` (segundos);
espere esse tempo antes de tentar de novo. Um segundo 429 depois da
repetição chega como `Discord answered HTTP 429`. A cota de cerca de 30
mensagens por minuto é orientação do Discord, não um limite que o Discordfy
confere antes do envio.

## Mensagens e ações

### Canal e cadastro

| Mensagem (início) | Causa | Ação |
| --- | --- | --- |
| `No webhook saved for channel "<canal>"` | canal não cadastrado (send, show, test, edit, rename) | compare com `details.known`; peça que a pessoa rode no terminal dela `discordfy webhooks add <canal>` |
| `Invalid channel name` | nome fora de `[a-z0-9][a-z0-9_-]{0,47}` depois de tirar espaços das pontas, passar para minúsculas e remover um `#` inicial | use letra ou número no início, depois letras minúsculas, números, hífen e sublinhado, até 48 |
| `Invalid webhook URL` | texto que não é URL | copie de novo em **Copiar URL do webhook** |
| `This is not a Discord webhook URL` | URL incompleta ou de outro domínio | copie de novo em **Copiar URL do webhook** |
| `Channel "<canal>" already has a webhook` | cadastro repetido | `--force` para trocar |
| `Channel "<destino>" already exists` | `webhooks rename` para um nome ocupado | escolha outro nome ou remova o destino antes |
| `Discord rejected the webhook (HTTP 404` ou `401` | webhook excluído ou token trocado | a pessoa cria um webhook novo e roda `discordfy webhooks add <canal> --force` |

### Rede e Discord

| Mensagem (início) | Causa | Ação |
| --- | --- | --- |
| `Discord rate limit: try again in <n>s` | 429 com espera acima de 10 s | espere `details.retryAfter` e agrupe notificações |
| `Could not reach Discord` | sem rede ou timeout de 15 s | entrega incerta: confira o canal antes de repetir |
| `Discord answered HTTP 400` | corpo recusado pelo Discord | guarde `details.errors` da resposta antes de qualquer nova chamada, depois rode `--dry-run` para ver o corpo |

### Conteúdo

| Mensagem (início) | Causa | Ação |
| --- | --- | --- |
| `Nothing to send` | sem texto, embed nem payload (decoração sozinha, como `--author-url`, não conta) | dê texto, `--title`, `--description` ou `--payload` |
| `An embed needs at least a title, description, field, author or image` | opções de decoração (cor, rodapé, miniatura) sem conteúdo de embed próprio, inclusive junto de `--payload` | acrescente título ou descrição; para mudar a cor de um embed do payload, edite o payload |
| `<campo> has <n> characters; Discord accepts up to <m>` | limite de um campo, contado em unidades UTF-16 (emoji conta 2) | resuma ou divida em mais embeds |
| `The embeds add up to <n> characters` | soma acima de 6000 | divida em mais mensagens |
| `Discord accepts up to 10 embeds per message` | embeds demais | envie em duas mensagens |
| `embeds[<i>] has <n> fields; Discord accepts up to 25` | campos demais num embed | divida em mais embeds |
| `embeds[<i>].fields[<j>] needs a name and a value` | campo de JSON sem nome ou sem valor | preencha os dois |
| `Invalid field "<texto>". Use "Name=Value"` | `--field` sem `=` | use `Nome=Valor` |
| `Invalid field "<texto>". Name and value cannot be empty` | nome ou valor vazio em `--field` | preencha os dois lados |
| `Invalid color` | cor fora do padrão | use nome, `#RRGGBB` ou decimal |
| `Invalid timestamp` | data inválida | use `now` ou ISO 8601 |
| `Invalid <rótulo>: "<valor>". Use an http(s) URL.` | URL de imagem ou link inválida | use URL http(s) pública |
| `Discord rejects usernames containing "discord" or "clyde"` | nome de envio proibido | escolha outro nome |

### Arquivos e JSON

| Mensagem (início) | Causa | Ação |
| --- | --- | --- |
| `Could not read the payload file` (6) | arquivo do `--payload` ausente | confira o caminho ou use `--payload -` para o stdin |
| `The payload "<arquivo>" is not valid JSON` (2) | sintaxe JSON inválida | valide o JSON; com `--stdin` junto, o stdin já foi consumido |
| `The payload "<arquivo>" must be a JSON object` (2) | lista, texto ou número no topo | envolva num objeto com `content` ou `embeds` |
| `` `embeds` must be an array of embed objects `` (2) | `embeds` como objeto ou texto | use uma lista de objetos |
| `embeds[<i>] must be an object` (2) | item da lista não é objeto | corrija o item |
| `Could not read the embed file` (6) | `--embed @arquivo.json` ausente | confira o caminho |
| `--embed expects a JSON object or @file.json` (2) | JSON do `--embed` inválido | confira aspas e chaves |

Um dry run bem-sucedido confere sintaxe, tipos de topo e limites de
tamanho. Ele não valida `url`, `timestamp` ou `color` dentro de um embed cru
de payload: confira esses valores à mão antes de enviar.

### Edição do webhook e avatar

| Mensagem (início) | Causa | Ação |
| --- | --- | --- |
| `Give --name, --avatar or --remove-avatar` / `Give name, avatar_url or remove_avatar` | edição sem mudança | informe o que mudar |
| `Use --avatar or --remove-avatar, not both` / `Use avatar_url or remove_avatar, not both` | duas operações de avatar | escolha uma por chamada |
| `The name must have 1 to 80 characters` | nome vazio ou longo em `webhooks edit` | ajuste o tamanho |
| `Discord rejects names containing "discord" or "clyde"` | nome proibido em `webhooks edit` | escolha outro nome |
| `Avatar file not found: <caminho>` (6) | arquivo local ausente (só CLI) | confira o caminho |
| `Could not download the avatar image.` (5) | rede ao baixar a URL | confira a URL e a conexão |
| `The avatar URL answered HTTP <n>` (5) | a URL respondeu erro | use URL pública que devolva a imagem |
| `The avatar must be a PNG, JPEG or GIF image` (2) | formato | converta a imagem |
| `The avatar must be up to 8 MB` (2) | acima de 8 × 1024 × 1024 bytes | reduza a imagem |

## Diagnóstico

1. `discordfy webhooks test <canal> --json` (ou `webhook_test`): confirma se
   o webhook ainda existe, sem publicar.
2. `discordfy doctor --json` (ou a tool `doctor`): leia `ok` e cada item de
   `checks` (pasta, settings, chave mestra, cofre).
3. `discordfy credentials status`: mostra o arquivo do cofre e de onde vem a
   chave mestra.
4. `discordfy send <canal> ... --dry-run --json`: mostra o corpo exato.

## Cofre ilegível

`CREDENTIALS` ao ler o cofre significa que a chave mestra em uso não abre
`credentials.json`. Cadastrar de novo no mesmo cofre também falha, porque o
cadastro lê o cofre antes de gravar. Siga nesta ordem:

1. Rode `discordfy credentials status` e veja a origem da chave.
   `DISCORDFY_MASTER_KEY` no ambiente tem prioridade sobre
   `~/.discordfy/master.key`; uma variável velha no shell basta para
   quebrar a leitura.
2. Se a chave correta existir (outra variável, backup de `master.key`),
   restaure-a e rode `discordfy doctor` de novo.
3. Antes de qualquer limpeza, peça que a pessoa guarde uma cópia de
   `credentials.json`.
4. Sem a chave, o cofre não pode ser aberto. Explique que
   `discordfy credentials clear` apaga todas as entradas do arquivo
   (webhooks e outras credenciais) e mantém `master.key`. Só siga com o
   aceite explícito dela. Alternativa sem perda: usar um diretório novo com
   `DISCORDFY_HOME` e cadastrar os webhooks ali.
