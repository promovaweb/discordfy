# Payload completo, vários embeds, tópicos e fóruns

## Quando usar

Use o payload completo quando a pessoa entregar um JSON pronto (Embed
Visualizer, Discohook, outro sistema) ou quando a notificação tiver mais de
um embed com estruturas diferentes. Para um embed só, prefira as opções
simples de `mensagens.md`.

## Formato

O corpo segue o formato de execução de webhook do Discord e precisa ser um
objeto JSON:

| Campo | Tipo | Observação |
| --- | --- | --- |
| `content` | texto | até 2000 |
| `username` | texto | nome desta notificação, até 80 |
| `avatar_url` | URL | avatar desta notificação |
| `tts` | booleano | leitura em voz alta |
| `embeds` | lista de objetos | até 10; precisa ser lista |
| `embed` | objeto | formato antigo, um embed só; o Discordfy converte para `embeds` |
| `allowed_mentions` | objeto | só vale com `--allow-mentions` / `allow_mentions`; sem a flag, vira `{ "parse": [] }` |
| `flags` | número | `4` sem prévias de link, `4096` sem notificação push |
| `thread_name` | texto | cria post em canal de fórum |

Cada embed aceita `title`, `description`, `url`, `color` (número, ou texto
com nome ou `#RRGGBB`, que o Discordfy converte), `timestamp` (ISO 8601),
`author` (`name`, `url`, `icon_url`), `footer` (`text`, `icon_url`),
`image` (`url`), `thumbnail` (`url`) e `fields` (`name`, `value`, `inline`).
Os campos que webhooks não podem definir (`type`, `provider`, `video`,
`width`, `height`, `proxy_url`) são descartados antes do envio.

## Antes de usar um JSON recebido

O dry run confere sintaxe, a estrutura de topo (`embeds` como lista de
objetos), campos com nome e valor e os limites de tamanho. Ele não valida
`url`, `timestamp` nem `color` dentro dos embeds: `"url": "bad"` ou
`"color": -1` passam pela prévia e o Discord recusa no envio com HTTP 400.
Confira esses valores à mão.

Confira também no corpo final:

- `allowed_mentions`: sem autorização da pessoa para menções, deve ser
  `{ "parse": [] }`;
- `flags` e `tts`: herdados do arquivo, não são desligados por opções;
- `username` e `avatar_url`: veja a precedência abaixo.

## Enviar

CLI, a partir de arquivo ou do stdin (`--payload -`):

```bash
discordfy send deploys --payload mensagem.json --dry-run --json
gerar-relatorio --json | discordfy send relatorios --payload -
```

`--payload -` e `--stdin` consomem o mesmo stdin. Use um dos dois.

MCP: passe o objeto em `payload`. Os outros argumentos da tool seguem a
mesma composição do CLI:

```json
{ "channel": "deploys", "payload": { "embeds": [{ "title": "Deploy", "color": "green" }] }, "dry_run": true }
```

## Composição com opções

CLI (`--payload`) e MCP (`payload`) usam a mesma regra:

| Item | Resultado |
| --- | --- |
| `username`, `avatar_url` | opção explícita, depois o valor do payload, depois o padrão local (`send.username`, `send.avatarUrl`) |
| `content`, `thread_name` | a opção substitui o valor do payload |
| `tts` | ligado se qualquer lado ligar; `tts: false` não desliga o do payload |
| `flags` | somadas por OU: `--silent` (4096) sobre `flags: 4` resulta em 4100 |
| embeds | os montados pelas opções (`--title`, `--embed`, `embeds`) entram depois dos do payload |
| decoração sem conteúdo (só `--color`, `--footer`, `--thumbnail`) | recusada com USAGE (exit 2) |
| `allowed_mentions` | sem a flag de menções, sempre `{ "parse": [] }`; com a flag, o do payload quando existir |

Para desligar um valor herdado (`tts`, uma flag, uma menção) ou mudar a cor
de um embed do arquivo, edite o objeto de origem. Para acrescentar um embed,
dê título, descrição, campo, autor ou imagem junto com a decoração:

```bash
discordfy send deploys --payload base.json --username "CI" --title "Resumo extra" --color info
```

## Exemplo completo (Embed Visualizer)

Este é o exemplo padrão do Embed Visualizer, no formato antigo `embed`. Ele
usa todos os elementos de um embed:

```json
{
  "content": "this `supports` __a__ **subset** *of* ~~markdown~~ 😃 ```js\nfunction foo(bar) {\n  console.log(bar);\n}\n\nfoo(1);```",
  "embed": {
    "title": "title ~~(did you know you can have markdown here too?)~~",
    "description": "this supports [named links](https://discordapp.com) on top of the previously shown subset of markdown. ```\nyes, even code blocks```",
    "url": "https://discordapp.com",
    "color": 5460938,
    "timestamp": "2026-11-24T09:41:36.835Z",
    "footer": { "icon_url": "https://cdn.discordapp.com/embed/avatars/0.png", "text": "footer text" },
    "thumbnail": { "url": "https://cdn.discordapp.com/embed/avatars/0.png" },
    "image": { "url": "https://cdn.discordapp.com/embed/avatars/0.png" },
    "author": {
      "name": "author name",
      "url": "https://discordapp.com",
      "icon_url": "https://cdn.discordapp.com/embed/avatars/0.png"
    },
    "fields": [
      { "name": "🤔", "value": "some of these properties have certain limits..." },
      { "name": "😱", "value": "try exceeding some of them!" },
      { "name": "🙄", "value": "an informative error should show up, and this view will remain as-is until all issues are fixed" },
      { "name": "<:thonkang:219069250692841473>", "value": "these last two", "inline": true },
      { "name": "<:thonkang:219069250692841473>", "value": "are inline fields", "inline": true }
    ]
  }
}
```

Em qualquer diretório, grave o bloco acima num arquivo temporário ou
envie pelo stdin e confira:

```bash
discordfy send deploys --payload - --dry-run --json < exemplo.json
```

O arquivo `examples/embed-visualizer.json` existe só num clone do
repositório do Discordfy; a instalação da skill não o copia. Use
`--payload examples/embed-visualizer.json` apenas a partir da raiz desse
clone. Fora dela, o caminho falha com `Could not read the payload file`
(exit 6).

## Vários embeds

No CLI, as opções simples montam o primeiro embed e cada `--embed` acrescenta
outro (JSON em linha ou `@arquivo.json`):

```bash
discordfy send status --title "API" --color green --description "Operacional" \
  --embed '{"title":"Banco","color":"yellow","description":"Lento"}' \
  --embed '{"title":"Fila","color":"red","description":"Parada"}'
```

No MCP, use `embeds` com a lista; ela é normalizada como no CLI. O total
fica em até 10 embeds e 6000 unidades UTF-16 somadas.

## Tópicos e fóruns

- Tópico existente: `--thread-id <id>` ou `thread_id`. O id aparece no
  Discord com o modo de desenvolvedor ligado, em **Copiar ID** do tópico.
  O tópico arquivado é reaberto pelo Discord. O dry run devolve
  `threadId`; confira o valor antes de enviar.
- Canal de fórum: todo envio precisa de `--thread-name` (cria um post) ou
  `--thread-id` (responde num post). Sem um dos dois, o Discord recusa.
