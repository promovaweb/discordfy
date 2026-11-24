# Mensagens ricas: referência dos elementos

Cada elemento abaixo existe no CLI (`discordfy send <canal>`) e na tool
`discord_send`. Um embed é o cartão com barra colorida; uma mensagem pode ter
texto fora do embed e até 10 embeds.

## Texto (`content`)

Até 2000 caracteres, com Markdown do Discord: `**negrito**`, `*itálico*`,
`__sublinhado__`, `~~riscado~~`, `` `código` ``, blocos com três crases e
links nomeados `[texto](https://...)`. Webhooks podem usar link nomeado
também fora do embed.

```bash
discordfy send deploys "Build **verde** em \`main\`. Veja [o log](https://ci.example.com/42)."
```

## Título e link (`title`, `url`)

O título tem até 256 caracteres e aceita Markdown. Com `--url`, o título vira
link.

## Descrição (`description`)

Até 4096 caracteres, com Markdown completo, inclusive blocos de código e
links nomeados. Use `\n` para quebrar linha na linha de comando.

## Cor (`color`)

A barra lateral do embed. Aceita nome (`blurple`, `green`, `success`,
`yellow`, `warning`, `red`, `error`, `info`, `blue`, `orange`, `fuchsia`,
`grey`, `white`, `black`), hexadecimal (`#5865F2`, `0x5865F2`) ou decimal
(`5793266`).

## Autor (`author`)

Linha no topo do embed, com nome (até 256), link opcional e ícone pequeno à
esquerda.

```bash
discordfy send deploys --author "GitHub Actions" --author-url "https://github.com/acme/app/actions" \
  --author-icon "https://github.githubassets.com/favicons/favicon.png" --description "Workflow concluído"
```

## Campos (`fields`)

Até 25 campos, cada um com nome (até 256) e valor (até 1024). Campos com
`inline` ficam lado a lado, até três por linha no desktop; os demais ficam
empilhados.

```bash
discordfy send deploys --title "Release v2.0.0" \
  --inline-field "Versão=2.0.0" --inline-field "Ambiente=produção" --inline-field "Duração=3m12s" \
  --field "Notas=Novo painel de faturas\nCorreção no login"
```

## Imagem e miniatura (`image`, `thumbnail`)

`image` mostra uma imagem grande abaixo da descrição; `thumbnail`, uma
miniatura no canto superior direito. Ambas recebem uma URL http(s) pública.

## Rodapé e horário (`footer`, `timestamp`)

O rodapé tem até 2048 caracteres e um ícone opcional. O horário aparece ao
lado do rodapé, no fuso de quem lê. `--timestamp` sem valor usa a hora atual;
também aceita data ISO 8601.

## Identidade da mensagem (`username`, `avatar_url`)

Trocam o nome e o avatar só desta mensagem. Para mudar o padrão do webhook,
use `discordfy webhooks edit` ou a tool `webhook_edit`. Os padrões locais
ficam nas keys `send.username` e `send.avatarUrl` (`discordfy config set`).
O Discord recusa nomes com "discord" ou "clyde".

## Comportamento da entrega

- `--tts` / `tts`: o Discord lê a mensagem em voz alta para quem estiver no
  canal.
- `--silent` / `silent`: entrega sem notificação push; o canal só mostra o
  indicador de não lida.
- `--suppress-embeds` / `suppress_embeds`: esconde as prévias automáticas de
  links do texto.
- `--allow-mentions` / `allow_mentions`: libera as notificações de
  `@everyone`, `@here`, cargos e usuários. Desligadas por padrão.
- `--thread-id` / `thread_id`: posta dentro de um tópico existente do canal.
- `--thread-name` / `thread_name`: cria um post novo em canal de fórum.

## Vários embeds

O CLI monta um embed com as opções de linha de comando e acrescenta cada
`--embed` (JSON ou `@arquivo.json`). Pelo MCP, use `embeds`.

```bash
discordfy send status --title "API" --color green --description "Operacional" \
  --embed '{"title":"Banco","color":"yellow","description":"Lento"}' \
  --embed @fila.json
```

## Limites do Discord

| Item | Limite |
| --- | --- |
| Texto | 2000 caracteres |
| Embeds por mensagem | 10 |
| Título | 256 |
| Descrição | 4096 |
| Campos | 25 por embed |
| Nome e valor de campo | 256 e 1024 |
| Rodapé | 2048 |
| Nome do autor | 256 |
| Soma dos embeds | 6000 caracteres |
| Nome de exibição | 80 |
| Mensagens por webhook | cerca de 30 por minuto |

O Discordfy confere esses limites antes de chamar o Discord e devolve exit
code 2 com o campo e o tamanho que passaram do limite.

## Payload completo (Embed Visualizer)

O exemplo abaixo vem do Embed Visualizer e usa o formato antigo `embed`. O
Discordfy converte para `embeds` e envia:

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

```bash
discordfy send deploys --payload examples/embed-visualizer.json
```

O arquivo está em `examples/embed-visualizer.json` no repositório.
