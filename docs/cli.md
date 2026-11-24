# CLI

## Convenções

- `{{bin}} <command> [subcommand] [arguments] [options]`.
- Options aceitam `--key value` e `--key=value`. Não há agrupamento de flags
  curtas (`-abc`).
- `--` encerra a leitura de options; o que vem depois é argument.
- Options globais valem em qualquer posição, antes ou depois do command.
- Sem argumentos, em terminal interativo, o binário abre a TUI. Sem TTY,
  imprime o help e sai com exit code 2.
- Toda saída de dados vai para stdout. Avisos, progresso e erros em modo
  texto vão para stderr.
- Nomes de commands, subcommands, options, arguments, keys e campos de saída
  são em inglês. Mensagens do binário também.

## Options globais

| Option | Efeito |
| --- | --- |
| `-h`, `--help` | Help do command atual. Exit code 0. |
| `-V`, `--version` | Imprime `{{bin}} <version>`. Exit code 0. |
| `--json` | Saída em JSON com envelope estável. Erros também saem em JSON, em stdout. |
| `--skill [topic]` | Documentação embutida. Topics: `cli`, `tui`, `mcp`, `config`, `exit-codes`, `reference`. |
| `--opencli` | Descrição OpenCLI 0.1 da árvore de commands em JSON. |
| `--no-color` | Desliga cores ANSI. `NO_COLOR=1` tem o mesmo efeito. |

## Saída em texto e em JSON

Texto é o padrão quando `output.format` em settings.json é `text`. Com
`--json`, ou com `output.format = json`, a saída segue este envelope:

```json
{ "ok": true, "command": "{{bin}} config get", "data": { "key": "tui.theme", "value": "terminal" } }
```

Em erro:

```json
{
  "ok": false,
  "command": "{{bin}} credentials get",
  "error": { "code": 4, "name": "CREDENTIALS", "message": "Credential \"x\" not found.", "details": { "name": "x" } }
}
```

O exit code do processo é sempre o mesmo de `error.code`. Um agente deve ler
os dois: o envelope para a mensagem, o code para a classe da falha.

## Commands do Discordfy

| Command | Função |
| --- | --- |
| `send <channel> [message]` | Envia uma mensagem rica ao canal salvo. O canal é obrigatório. |
| `webhooks add <channel>` | Salva a URL do webhook do canal, lida sem eco ou por stdin, conferida no Discord. |
| `webhooks list [--reveal]` | Lista canais e endereços com o token mascarado. |
| `webhooks show <channel> [--reveal]` | Mostra o webhook de um canal. |
| `webhooks test <channel>` | Confere o webhook no Discord sem postar nada. |
| `webhooks edit <channel>` | Muda o nome e o avatar padrão do webhook no Discord. |
| `webhooks rename <from> <to>` | Renomeia o canal local, mantendo o webhook. |
| `webhooks remove <channel> [--yes]` | Apaga o webhook do cofre local. |

### Canais e webhooks

Cada canal é um nome escolhido por você (`deploys`, `alertas`, `time-dev`):
letras minúsculas, números, hífen e sublinhado, até 48 caracteres. `#Deploys`
vira `deploys`. O nome aponta para uma URL de webhook do Discord, guardada no
cofre cifrado como a credencial `webhook.<channel>`. A URL carrega o token
que permite postar, então ela é um segredo: `webhooks add` nunca a recebe
como argument, e as listagens mascaram o token, salvo com `--reveal`.

Copie a URL no Discord em Editar canal > Integrações > Webhooks > Novo
webhook > Copiar URL do webhook. `webhooks add` aceita `discord.com`,
`discordapp.com`, `ptb` e `canary`, com ou sem versão da API, e grava a
forma canônica `https://discord.com/api/webhooks/<id>/<token>`.

| Option de `webhooks add` | Efeito |
| --- | --- |
| `--stdin` | Lê a URL da primeira linha de stdin. |
| `-f`, `--force` | Substitui o webhook de um canal existente. |
| `--no-verify` | Salva sem conferir no Discord (uso offline e CI). |

| Option de `webhooks edit` | Efeito |
| --- | --- |
| `--name <name>` | Novo nome padrão (1 a 80 caracteres, sem "discord" nem "clyde"). |
| `--avatar <file-or-url>` | Novo avatar: PNG, JPEG ou GIF local ou URL http(s), até 8 MB. |
| `--remove-avatar` | Volta ao avatar padrão do Discord. |

`webhooks rename` muda só o apelido local; `webhooks edit` muda o webhook no
Discord. `webhooks remove` apaga a cópia local; o webhook continua no Discord
até ser excluído lá.

### Enviar mensagens

`send` recebe o canal e o texto. O resto das options monta um embed. Sem
texto, a mensagem precisa de pelo menos título, descrição, campo, autor,
imagem, um `--embed` ou um `--payload`.

| Option de `send` | Efeito |
| --- | --- |
| `--stdin` | Lê o texto de stdin. |
| `-t`, `--title <text>` | Título do embed (256). |
| `-d`, `--description <text>` | Descrição do embed (4096), com Markdown. |
| `--url <url>` | Link do título. |
| `-c`, `--color <color>` | Cor: nome, `#RRGGBB` ou decimal. |
| `--field <name=value>` | Campo empilhado. Repetível (até 25). |
| `--inline-field <name=value>` | Campo lado a lado. Repetível. |
| `--embed <json>` | Embed extra em JSON ou `@arquivo.json`. Repetível (até 10 por mensagem). |
| `--author <name>` | Linha de autor. |
| `--author-url <url>` | Link do autor. |
| `--author-icon <url>` | Ícone do autor. |
| `--footer <text>` | Rodapé (2048). |
| `--footer-icon <url>` | Ícone do rodapé. |
| `--image <url>` | Imagem grande. |
| `--thumbnail <url>` | Miniatura no canto superior direito. |
| `--timestamp [when]` | Horário: `now` (padrão sem valor) ou data ISO 8601. |
| `-u`, `--username <name>` | Nome de exibição desta mensagem. Padrão: `send.username`. |
| `--avatar-url <url>` | Avatar desta mensagem. Padrão: `send.avatarUrl`. |
| `--tts` | Leitura em voz alta. |
| `--silent` | Entrega sem notificação push (flag `SUPPRESS_NOTIFICATIONS`). |
| `--suppress-embeds` | Esconde as prévias de links do texto (flag `SUPPRESS_EMBEDS`). |
| `--thread-id <id>` | Posta num tópico existente. |
| `--thread-name <name>` | Cria um post em canal de fórum. |
| `--payload <file>` | Corpo JSON completo; `-` lê stdin. Aceita `embeds` e o formato antigo `embed`. |
| `--allow-mentions` | Libera notificações de `@everyone`, `@here`, cargos e usuários. |
| `--dry-run` | Imprime o JSON que seria enviado, sem chamar o Discord. |

Use `\n` para quebrar linha no texto, na descrição e nos campos. Cores com
nome: `blurple`, `green`, `success`, `yellow`, `warning`, `red`, `error`,
`info`, `blue`, `orange`, `fuchsia`, `grey`, `white`, `black`.

As menções saem desligadas (`allowed_mentions.parse = []`): o texto mostra
`@everyone` e cargos, mas ninguém é notificado sem `--allow-mentions`.

Com `--payload`, a composição segue regras fixas, iguais no MCP: o nome e o
avatar vêm da option, depois do arquivo e por último de `send.username` e
`send.avatarUrl`; texto e `--thread-name` da option substituem os do
arquivo; `--tts` liga a leitura mesmo que o arquivo não ligue; as flags
(`--silent`, `--suppress-embeds`) somam-se às `flags` do arquivo; os embeds
das options entram depois dos embeds do arquivo. Uma option de embed sem
conteúdo próprio (só `--color`, por exemplo) sai com exit code 2: para mudar a
cor de um embed do arquivo, edite o arquivo. Sem `--allow-mentions`, as
menções ficam desligadas mesmo que o arquivo as ligue; com a flag, o
`allowed_mentions` do arquivo prevalece quando existe, o que permite liberar
só um cargo (`{"parse":[],"roles":["<id>"]}` e `<@&id>` no texto). Campos que
webhooks não podem definir (`type`, `provider`, `video`, dimensões de
imagem) são descartados. O exemplo completo do Embed Visualizer está em
`examples/embed-visualizer.json`.

Antes de chamar o Discord, `send` confere os limites: texto 2000, 10 embeds,
título 256, descrição 4096, 25 campos de 256 e 1024, rodapé 2048, autor 256,
6000 caracteres somados nos embeds e nome de exibição 80. Fora disso, sai com
exit code 2 indicando o campo.

A resposta em `--json` traz `data.message` com `id`, `channel_id` e
`timestamp` da mensagem criada (o envio usa `?wait=true`). Um HTTP 429 com
espera de até 10 segundos é repetido uma vez; o Discord aceita cerca de 30
mensagens por minuto por webhook. HTTP 401 ou 404 indicam webhook excluído:
salve uma URL nova com `webhooks add --force`.

## Commands do esqueleto

| Command | Função |
| --- | --- |
| `tui [--tab <tab>]` | Abre a TUI. Exige TTY. |
| `about` | Version, executable, runtime, platform e credits. |
| `config list\|get\|set\|unset\|path\|schema` | Preferências em settings.json. |
| `credentials set\|get\|list\|remove\|status\|clear\|rotate-key` | Cofre cifrado em credentials.json. |
| `mcp [--list]` | Servidor MCP via stdio, ou listagem do que ele registra. |
| `skill [topic]` | Mesmo efeito de `--skill`. |
| `doctor` | Confere runtime, TTY, pasta, settings, chave e cofre. |
| `completion <shell>` | Gera script para `bash`, `zsh` ou `fish`. |

## Como adicionar um command

1. Copie `template/command/example.ts` para `src/cli/commands/<name>.ts`.
2. Preencha `name`, `description`, `arguments`, `options`, `examples` e
   `exitCodes`. Toda option precisa de `description`; é ela que aparece no
   `--help`, no `--skill` e no OpenCLI.
3. Implemente `run(ctx)` devolvendo `{ data, text }`. `data` é o que sai em
   `--json`; `text` é o que sai para humanos. Lance `AppError` (ou use
   `error.*`) para falhas previstas, com o exit code certo.
4. Registre o command em `src/cli/commands.ts`.
5. Rode `bun test`, `bun run opencli` e confira `docs/opencli.json`.

Segredos nunca entram por argument de linha de comando. Leia pelo stdin ou
por `readSecret()`; grave com `setCredential()`; recupere com
`getCredential()`, que encerra com exit code 4 quando o valor não existe.

## Diagnóstico e completion

`{{bin}} doctor` confere Bun 1.4.4 ou superior, TTY de stdin/stdout,
pasta de dados com 0700, leitura de settings.json, origem da master key,
decifragem do cofre, versão e plataforma. Cada linha usa ✓, ! ou ✗.
Em JSON, `data` contém `{ checks, ok }`; cada check tem `name`, `status`
e `detail`. Ausência de TTY ou de arquivos ainda não criados gera `warn`.
Uma verificação com `fail` produz exit code 3; as demais retornam 0.
O diagnóstico não cria arquivos nem mostra segredos.

`{{bin}} completion <shell>` imprime o script em stdout. O argument `shell`
aceita `bash`, `zsh` ou `fish`; subcommands, options locais e globais e valores
de enum vêm do registry. Com `--json`, `data` contém `{ shell, script }`.
O script Zsh usa `compdef` e `compadd`, sem `bashcompinit`.
Instale na sessão atual ou acrescente a linha ao arquivo de inicialização:

```bash
eval "$({{bin}} completion bash)"
eval "$({{bin}} completion zsh)"
# fish
{{bin}} completion fish | source
```

`{{bin}} --skill reference` retorna somente a referência gerada, com
commands, arguments, options e exit codes. `skill reference` tem o mesmo
resultado, sem os capítulos da documentação.
