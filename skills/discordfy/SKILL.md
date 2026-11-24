---
name: discordfy
description: Envia mensagens ricas para canais do Discord pelo Discordfy, com o canal sempre nomeado, pelo CLI ou pelo servidor MCP. Use quando a pessoa pedir para avisar, notificar, reportar, postar ou publicar algo no Discord; para enviar o resultado de uma tarefa, deploy, build, release, teste ou revisão ao time; para montar um embed com título, cor, campos, autor, imagem, rodapé ou horário; para enviar um payload JSON completo de webhook; para cadastrar, listar, testar, renomear, editar ou remover webhooks de canais; ou quando citar o Discordfy.
---

# Discordfy

O Discordfy guarda o webhook de cada canal do Discord com um nome curto
(`deploys`, `alertas`, `time-dev`) e envia mensagens ricas para o canal
indicado. Você sempre informa o canal: o binário não tem canal padrão, então
nenhuma mensagem sai para um destino implícito.

Três modos usam o mesmo cofre (`~/.discordfy/credentials.json`, cifrado com
AES-256-GCM):

- **MCP** (`discordfy mcp`): tools `webhooks_list`, `discord_send`,
  `webhook_test` e `webhook_edit`. Prefira o MCP quando ele estiver
  configurado no cliente.
- **CLI** (`discordfy send <canal> ...`): para scripts, CI e quando o MCP não
  estiver disponível. Use `--json` para ler o resultado.
- **TUI** (`discordfy` sem argumentos): para a pessoa cadastrar e conferir os
  webhooks. A aba Webhooks lista o canal e o endereço com o token mascarado.

## Pré-requisitos

1. Confira o binário com `discordfy --version`. Sem ele, oriente a instalação
   (`npm i -g @promovaweb/discordfy` ou o binário da plataforma em
   <https://github.com/promovaweb/discordfy/releases>) e pare.
2. Liste os canais: tool `webhooks_list` ou `discordfy webhooks list --json`.
3. Se o canal pedido não existir, peça que a pessoa o cadastre no próprio
   terminal com `! discordfy webhooks add <canal>`. O comando pede a URL sem
   eco e confere o webhook no Discord antes de salvar.

**A URL do webhook é um segredo.** Ela carrega o token que permite postar no
canal. Nunca peça a URL no chat, nunca a escreva em arquivo do projeto, em
commit, em log ou em argumento de comando, e nunca rode `--reveal` por conta
própria. As tools do MCP não devolvem a URL. Em CI, a URL entra por stdin a
partir de um secret do provedor (veja `references/automacoes.md`).

## Escolher o canal

- Use o nome que a pessoa disser. Se ela descrever o destino ("o canal de
  deploy"), compare com a lista de `webhooks_list` e confirme quando houver
  mais de um candidato.
- Sem indicação e com mais de um canal cadastrado, pergunte qual usar. Não
  escolha por ela.
- Nomes aceitam letras minúsculas, números, hífen e sublinhado. `#deploys` e
  `Deploys` viram `deploys`.

## Enviar uma mensagem

Mensagem simples:

```bash
discordfy send deploys "Deploy da v1.4.0 concluído"
```

Mensagem rica com embed:

```bash
discordfy send deploys \
  --title "Deploy v1.4.0" --url "https://github.com/acme/app/releases/tag/v1.4.0" \
  --description "Todos os testes passaram.\nTempo total: **42s**" \
  --color green --inline-field "Branch=main" --inline-field "Commit=a1b2c3d" \
  --field "Mudanças=3 correções e 1 recurso" --footer "CI · GitHub Actions" --timestamp
```

Pela tool `discord_send`:

```json
{
  "channel": "deploys",
  "title": "Deploy v1.4.0",
  "description": "Todos os testes passaram.",
  "color": "green",
  "fields": [
    { "name": "Branch", "value": "main", "inline": true },
    { "name": "Commit", "value": "a1b2c3d", "inline": true }
  ],
  "timestamp": "now"
}
```

Antes de enviar algo longo ou montado por você, rode com `--dry-run` (CLI) ou
`dry_run: true` (MCP) e confira o JSON. O dry run não chama o Discord.

## Elementos de uma mensagem

| Elemento | CLI | MCP (`discord_send`) | Limite |
| --- | --- | --- | --- |
| Texto fora do embed | argumentos ou `--stdin` | `content` | 2000 caracteres |
| Título com link | `--title`, `--url` | `title`, `url` | 256 |
| Descrição (Markdown) | `--description` | `description` | 4096 |
| Cor da barra lateral | `--color` | `color` | nome, `#RRGGBB` ou decimal |
| Autor, link e ícone | `--author`, `--author-url`, `--author-icon` | `author { name, url, icon_url }` | 256 no nome |
| Campos empilhados | `--field "Nome=Valor"` | `fields[]` | 25 campos; 256 no nome, 1024 no valor |
| Campos lado a lado | `--inline-field "Nome=Valor"` | `fields[].inline: true` | idem |
| Imagem grande | `--image` | `image` | URL http(s) |
| Miniatura | `--thumbnail` | `thumbnail` | URL http(s) |
| Rodapé e ícone | `--footer`, `--footer-icon` | `footer { text, icon_url }` | 2048 |
| Horário no rodapé | `--timestamp [now\|ISO]` | `timestamp` | data ISO 8601 |
| Nome e avatar da mensagem | `--username`, `--avatar-url` | `username`, `avatar_url` | 80 no nome |
| Leitura em voz alta | `--tts` | `tts` | |
| Sem notificação push | `--silent` | `silent` | |
| Sem prévia de links | `--suppress-embeds` | `suppress_embeds` | |
| Menções ativas | `--allow-mentions` | `allow_mentions` | desligadas por padrão |
| Embeds extras | `--embed '<json>'` ou `--embed @arquivo.json` | `embeds[]` | 10 por mensagem |
| Tópico existente | `--thread-id` | `thread_id` | |
| Post novo em fórum | `--thread-name` | `thread_name` | só canal de fórum |
| Payload completo | `--payload arquivo.json` ou `-` | `payload` | |

A soma de título, descrição, campos, rodapé e autor de todos os embeds fica
em até 6000 caracteres. O Discord recusa nomes de exibição que contenham
"discord" ou "clyde". Cores com nome: `blurple`, `green`/`success`,
`yellow`/`warning`, `red`/`error`, `info`/`blue`, `orange`, `fuchsia`,
`grey`, `white`, `black`. Use `\n` para quebrar linha no texto e na
descrição. A referência completa de cada elemento, com exemplos, está em
`references/mensagens.md`.

## Menções

As menções saem desligadas: `@everyone`, `@here`, cargos e usuários
aparecem no texto, mas ninguém recebe notificação. Ative com
`--allow-mentions` ou `allow_mentions: true` somente quando a pessoa pedir
para chamar alguém.

## Payload completo

Quando a pessoa entregar um JSON pronto (do Embed Visualizer, do Discohook ou
de outro sistema), envie como está:

```bash
discordfy send deploys --payload mensagem.json
```

O Discordfy aceita `embeds` (lista) e o formato antigo `embed` (um objeto),
remove os campos que webhooks não podem definir (`type`, `provider`, `video`,
dimensões de imagem) e confere os limites antes de chamar o Discord. As
opções da linha de comando sobrescrevem os campos do topo e acrescentam
embeds. Pelo MCP, passe o objeto em `payload`.

## Gerenciar webhooks

| Tarefa | Comando | Tool |
| --- | --- | --- |
| Cadastrar ou trocar | `discordfy webhooks add <canal> [--force]` (pessoa no terminal) | sem tool |
| Listar | `discordfy webhooks list` | `webhooks_list` |
| Ver um | `discordfy webhooks show <canal>` | `webhooks_list` |
| Testar sem postar | `discordfy webhooks test <canal>` | `webhook_test` |
| Mudar nome e avatar no Discord | `discordfy webhooks edit <canal> --name ... --avatar ...` | `webhook_edit` |
| Renomear o canal local | `discordfy webhooks rename <de> <para>` | sem tool |
| Remover do cofre | `discordfy webhooks remove <canal>` | sem tool |

`rename` muda só o apelido local. `edit` muda o nome e o avatar padrão do
webhook no próprio Discord. `remove` apaga a cópia local; o webhook continua
no Discord até alguém excluí-lo em Editar canal, Integrações,
Webhooks.

## Erros

Leia o exit code ou o `error.name` do `--json`:

| Código | Nome | O que fazer |
| --- | --- | --- |
| 2 | `USAGE` | opção inválida ou limite do Discord excedido; corrija a mensagem |
| 4 | `CREDENTIALS` | cofre ilegível ou chave mestra ausente; peça `discordfy doctor` à pessoa |
| 5 | `NETWORK_OR_API` | rede, rate limit (30 mensagens por minuto por webhook) ou webhook excluído (HTTP 404); rode `webhook_test` |
| 6 | `NOT_FOUND` | canal sem webhook; `error.details.known` lista os canais existentes |

Um 429 com espera de até 10 segundos é repetido uma vez sozinho. Para muitos
avisos seguidos, agrupe em uma mensagem com campos.

## Ao terminar

Informe o canal, o id da mensagem devolvido (`message.id`) e um resumo do que
foi enviado. Não repita o envio para confirmar: o id já comprova a entrega.

## Referências

- `references/mensagens.md`: cada elemento do embed, exemplos e o payload
  completo do Embed Visualizer.
- `references/automacoes.md`: GitHub Actions, hooks de Git, cron e
  configuração do MCP nos clientes.
- Site: <https://promovaweb.com/discordfy/>.
- Guia do Usuário: <https://github.com/promovaweb/discordfy/tree/main/docs/user>.
- Repositório: <https://github.com/promovaweb/discordfy>.
