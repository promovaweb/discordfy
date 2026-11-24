# Webhooks e canais

Cada canal do Discordfy é um nome escolhido pela pessoa que aponta para um
webhook do Discord.

## Nome do canal

O Discordfy tira os espaços das pontas, passa para minúsculas e remove um
`#` inicial. O resultado precisa casar com `[a-z0-9][a-z0-9_-]{0,47}`:
começa com letra ou número e segue com letras minúsculas, números, hífen e
sublinhado, até 48 caracteres. `#Deploys` vira `deploys`; `_abc` é
recusado.

## Criar o webhook no Discord

A pessoa precisa da permissão **Gerenciar Webhooks** no servidor.

1. Passar o mouse sobre o canal de texto e clicar na engrenagem
   **Editar canal**.
2. Abrir **Integrações** e depois **Webhooks**.
3. Clicar em **Novo webhook**, ajustar o nome e o avatar e conferir o canal.
4. Clicar em **Copiar URL do webhook**.

Em inglês: **Edit Channel**, **Integrations**, **Webhooks**,
**New Webhook**, **Copy Webhook URL**. Sem **Integrações** no menu, falta a
permissão.

A URL tem o formato
`https://discord.com/api/webhooks/<id>/<token>`. O Discordfy aceita também
`discordapp.com`, `ptb.discord.com`, `canary.discord.com` e versões da API
(`/api/v10/webhooks/...`), e grava a forma canônica.

## Cadastrar

O cadastro é feito pela pessoa. Peça que rode no terminal dela, com o nome
confirmado:

```bash
discordfy webhooks add deploys
```

No Claude Code, ela pode digitar `! discordfy webhooks add deploys` no
prompt. O `!` é atalho do cliente; num shell, ele inverteria o status do
comando.

Num terminal, o comando pede a URL sem eco. Fora de um terminal (pipe,
CI), lê a primeira linha do stdin mesmo sem `--stdin`. Depois confere o
webhook no Discord com um GET (nada é publicado) e salva cifrado.

| Option | Efeito |
| --- | --- |
| `--stdin` | lê a URL da primeira linha do stdin, inclusive num terminal |
| `-f`, `--force` | troca o webhook de um canal que já existe |
| `--no-verify` | salva sem conferir no Discord (offline ou CI sem rede no passo) |

Resposta com `--json`: `channel`, `id`, `masked`, `replaced` (se trocou um
webhook existente) e `verified`. Com `--no-verify`, `verified` é `false` e
o campo `webhook` não aparece: o webhook só será conferido no primeiro
envio ou em `webhooks test`. Com verificação, `webhook` traz `id`, `name`,
`channel_id` e, quando o Discord informa, `guild_id`.

## TUI

`discordfy` sem argumentos abre a TUI. Na aba **Webhooks**:

| Tecla | Ação |
| --- | --- |
| `a` | cadastra um canal; se o nome já existir, troca o webhook sem pedir `--force` |
| `s` ou `Enter` | envia uma mensagem de texto ao canal selecionado |
| `t` | testa o webhook selecionado sem publicar |
| `v` | alterna a exibição das URLs completas de todos os canais da lista |
| `d` ou `Delete` | remove o canal do cofre |
| `r` | recarrega a lista |
| setas, `j`, `k` | movem a seleção |

A TUI não renomeia canais nem edita o perfil do webhook no Discord: use
`webhooks rename` e `webhooks edit` no CLI. `v` expõe todos os tokens na
tela; só a própria pessoa usa essa tecla, longe de gravação ou
compartilhamento de tela.

## Listar e conferir

| Tarefa | CLI | MCP |
| --- | --- | --- |
| listar canais | `discordfy webhooks list --json` (alias `ls`) | `webhooks_list` |
| ver um canal | `discordfy webhooks show <canal> --json` (alias `get`) | `webhooks_list`, filtrando por `channel` |
| testar sem publicar | `discordfy webhooks test <canal> --json` (alias `check`) | `webhook_test` |

A listagem traz `count` e `webhooks[]` com `channel`, `id` e `masked`
(token mascarado). Ela sai com sucesso mesmo vazia: para saber se um canal
existe, procure o nome em `webhooks[].channel`. `--reveal` em `show`
mostra a URL completa (campo `url` no `--json`) e só deve ser usado pela
própria pessoa.

`webhooks test` devolve `webhook` com `id`, `name`, `channel_id` e
`guild_id` quando o Discord informa (o campo pode faltar). Use para
diagnosticar um envio que falhou.

## Editar o perfil no Discord

`webhooks edit` muda o nome e o avatar padrão do webhook no próprio
Discord. Uma operação de avatar por chamada: `--avatar` ou
`--remove-avatar`, nunca os dois (USAGE).

```bash
discordfy webhooks edit deploys --name "Deploy bot" --avatar ./bot.png
discordfy webhooks edit deploys --remove-avatar
```

O avatar aceita PNG, JPEG ou GIF até 8 MB, como arquivo local (só no CLI)
ou URL http(s). Pelo MCP, `webhook_edit` aceita só URL em `avatar_url` e
recusa `avatar_url` junto de `remove_avatar`. Use URL pública sem token,
assinatura ou outro segredo na query, e não repita no chat URLs sensíveis
que apareçam num erro. O nome tem de 1 a 80 caracteres e o Discord recusa
"discord" e "clyde".

A resposta traz `channel`, `updated` (só os campos pedidos: `name`,
`avatar`) e `webhook` com o perfil novo.

Para trocar nome e avatar só de uma notificação, use `username` e
`avatar_url` no envio (ver `mensagens.md`).

## Renomear e remover

```bash
discordfy webhooks rename deploys deploys-prod   # alias mv; muda só o apelido local
discordfy webhooks remove deploys-prod --yes     # alias rm; -y pula a confirmação
```

`rename` responde `{ "from", "to" }`. Com origem ausente, sai com 6 e
`details.known` lista os canais; com destino já ocupado, sai com 2.

`remove` responde `{ "channel", "removed" }`. Leia `removed` antes de
anunciar: canal inexistente sai com 0 e `removed: false`. A confirmação só
aparece num terminal interativo; scripts e agentes removem sem pergunta,
então confirme o nome com a pessoa antes.

`remove` não exclui o webhook no Discord: ele continua aceitando envios de
quem tiver a URL. Para desativar de vez, a pessoa exclui em
**Editar canal**, **Integrações**, **Webhooks**.

## URL vazada

Qualquer pessoa com a URL publica no canal. Quando ela vazar (commit,
print, chat, log), siga todos os passos, nesta ordem:

1. **Revogar.** A pessoa exclui o webhook comprometido no Discord em
   **Editar canal**, **Integrações**, **Webhooks**. Criar outro webhook
   não basta: o antigo continua válido até ser excluído.
2. **Criar o substituto.** **Novo webhook** e **Copiar URL do webhook**.
3. **Cadastrar.** No terminal dela: `discordfy webhooks add <canal> --force`.
4. **Testar.** `discordfy webhooks test <canal> --json` deve responder com
   o novo `id`.

Se a URL foi para um commit, ela continua no histórico do Git mesmo depois
de removida do arquivo: só a exclusão no passo 1 resolve.

## O cofre

Os webhooks ficam em `~/.discordfy/credentials.json` como
`webhook.<canal>`, cifrados com AES-256-GCM. `discordfy credentials list`
mostra esses nomes junto com outras credenciais. `discordfy credentials
status` mostra o arquivo e a origem da chave mestra. Para recuperar um
cofre ilegível sem perder outras credenciais, siga `erros.md`, seção
"Cofre ilegível".
