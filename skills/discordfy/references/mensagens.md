# Notificações ricas: referência dos elementos

Cada elemento abaixo existe no CLI (`discordfy send <canal>`) e na tool
`discord_send`. Um embed é o cartão com barra colorida; uma mensagem pode ter
texto fora do embed e até 10 embeds. A tabela completa de opções do CLI e
argumentos do MCP está em `mcp.md`.

## Texto (`content`)

Até 2000 caracteres, com Markdown do Discord: `**negrito**`, `*itálico*`,
`__sublinhado__`, `~~riscado~~`, `` `código` ``, blocos com três crases e
links nomeados `[texto](https://...)`. Webhooks podem usar link nomeado
também fora do embed.

```bash
discordfy send deploys "Build **verde** em \`main\`. Veja [o log](https://ci.example.com/42)."
```

O texto vem dos argumentos depois do canal (`[message...]`) ou do stdin com
`--stdin`, que substitui o texto posicional. `--stdin` e `--payload -`
consomem o mesmo stdin: escolha um dos dois por comando.

## Título e link (`title`, `url`)

`-t`, `--title`: até 256 caracteres, aceita Markdown. Com `--url`, o título
vira link.

## Descrição (`description`)

`-d`, `--description`: até 4096 caracteres, com Markdown completo,
inclusive blocos de código e links nomeados. Use `\n` para quebrar linha na
linha de comando.

## Cor (`color`)

`-c`, `--color`: a barra lateral do embed. Aceita nome (`blurple`,
`green`, `success`, `yellow`, `warning`, `red`, `error`, `info`, `blue`,
`orange`, `fuchsia`, `grey`, `white`, `black`), hexadecimal (`#5865F2`,
`0x5865F2`) ou decimal (`5793266`).

Cor, rodapé, miniatura e outras decorações sozinhas não formam um embed: o
Discordfy recusa com USAGE e pede título, descrição, campo, autor ou
imagem. Junto de `--payload`, essas opções não alteram um embed que já está
no arquivo; para recolorir, edite o payload.

## Autor (`author`)

Linha no topo do embed, com nome (até 256), link opcional e ícone pequeno à
esquerda. `--author-url` e `--author-icon` só valem junto de `--author`.

```bash
discordfy send deploys --author "GitHub Actions" --author-url "https://github.com/acme/app/actions" \
  --author-icon "https://github.githubassets.com/favicons/favicon.png" --description "Workflow concluído"
```

## Campos (`fields`)

Até 25 campos por embed, cada um com nome (até 256) e valor (até 1024),
ambos obrigatórios. Campos com `inline` ficam lado a lado, até três por
linha no desktop; os demais ficam empilhados.

No CLI, `--field "Nome=Valor"` empilha e `--inline-field "Nome=Valor"` põe
lado a lado; o separador `|` também é aceito (`"Nome|Valor"`). O CLI monta
primeiro todos os `--field` e depois todos os `--inline-field`, qualquer
que seja a ordem na linha de comando. Para intercalar, use o array
`fields` no MCP ou um payload.

```bash
discordfy send deploys --title "Release v2.0.0" \
  --inline-field "Versão=2.0.0" --inline-field "Ambiente=produção" --inline-field "Duração=3m12s" \
  --field "Notas=Novo painel de faturas\nCorreção no login"
```

## Imagem e miniatura (`image`, `thumbnail`)

`image` mostra uma imagem grande abaixo da descrição; `thumbnail`, uma
miniatura no canto superior direito. Ambas recebem uma URL http(s) pública.

## Rodapé e horário (`footer`, `timestamp`)

O rodapé tem até 2048 caracteres e um ícone opcional (`--footer-icon`, que
só vale junto de `--footer`). O horário aparece ao lado do rodapé, no fuso
de quem lê. `--timestamp` sem valor usa a hora atual; também aceita data
ISO 8601.

## Identidade da mensagem (`username`, `avatar_url`)

`-u`, `--username` e `--avatar-url` trocam o nome e o avatar só desta
mensagem. Os padrões locais ficam nas keys `send.username` e
`send.avatarUrl` (`discordfy config set`) e valem quando nem a opção nem o
payload trazem o valor. Para mudar o padrão do próprio webhook, use
`discordfy webhooks edit` ou a tool `webhook_edit`. O Discord recusa nomes
com "discord" ou "clyde".

## Comportamento da entrega

- `--tts` / `tts`: o Discord lê a mensagem em voz alta para quem estiver no
  canal.
- `--silent` / `silent`: entrega sem notificação push; o canal só mostra o
  indicador de não lida (flag 4096).
- `--suppress-embeds` / `suppress_embeds`: esconde as prévias automáticas de
  links do texto (flag 4).
- `--thread-id` / `thread_id`: posta dentro de um tópico existente do canal.
- `--thread-name` / `thread_name`: cria um post novo em canal de fórum.

## Menções

Sem `--allow-mentions` / `allow_mentions`, o corpo final sempre leva
`allowed_mentions: {"parse": []}`: ninguém é notificado, mesmo que um
payload recebido traga outro objeto. Só ative quando a pessoa pedir para
chamar alguém.

Com a flag e sem `allowed_mentions` no payload, o Discordfy libera
`everyone`, `roles` e `users`: `@everyone`, `@here`, qualquer cargo e
qualquer usuário citado no texto notificam. Com a flag e um
`allowed_mentions` no payload, vale o objeto do payload.

Sintaxe das menções no texto:

| Alvo | Sintaxe |
| --- | --- |
| cargo | `<@&ID_DO_CARGO>` |
| usuário | `<@ID_DO_USUARIO>` |
| todos | `@everyone`, `@here` |

`@nome-do-cargo` escrito à mão não vira menção: o Discordfy não procura
cargos pelo nome. O ID aparece no Discord com o modo de desenvolvedor
ligado, em **Copiar ID**.

Para chamar só um cargo, restrinja no payload e passe a flag:

```bash
printf '%s' '{"content":"<@&123456789012345678> deploy falhou","allowed_mentions":{"parse":[],"roles":["123456789012345678"]}}' \
  | discordfy send deploys --payload - --allow-mentions --dry-run --json
```

Confira `allowed_mentions` no dry run antes de enviar.

## Vários embeds

O CLI monta um embed com as opções de linha de comando e acrescenta cada
`--embed` (JSON ou `@arquivo.json`). Pelo MCP, use `embeds`. Nos dois, cores
por nome viram número e chaves que webhooks não definem são descartadas.

```bash
discordfy send status --title "API" --color green --description "Operacional" \
  --embed '{"title":"Banco","color":"yellow","description":"Lento"}' \
  --embed @fila.json
```

## Limites do Discord

O Discordfy confere estes limites antes de chamar o Discord e devolve exit
code 2 com o campo e o tamanho que passaram do limite. O tamanho é contado
em unidades UTF-16, como no Discord: letras acentuadas contam 1, a maioria
dos emojis conta 2.

| Item | Limite |
| --- | --- |
| Texto | 2000 |
| Embeds por mensagem | 10 |
| Título | 256 |
| Descrição | 4096 por embed |
| Campos | 25 por embed |
| Nome e valor de campo | 256 e 1024 |
| Rodapé | 2048 |
| Nome do autor | 256 |
| Soma dos embeds | 6000 (títulos, descrições, campos, autores e rodapés de todos os embeds) |
| Nome de exibição | 80 |

Acima de 6000 no total, divida em mais mensagens ou publique um link para
o conteúdo completo.

O Discord também limita a frequência de envios por webhook (orientação de
cerca de 30 por minuto). Esse limite não é conferido localmente: quando o
Discord responde 429, siga `erros.md`, "Entrega incerta".

Para enviar um JSON pronto, compor payload com opções, tópicos e posts de
fórum, veja `payload.md`.
