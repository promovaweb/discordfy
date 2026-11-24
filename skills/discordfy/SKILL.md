---
name: discordfy
description: Envia notificações ricas para canais do Discord pelo Discordfy, sempre com o canal nomeado, pelo servidor MCP ou pelo CLI. Use quando a pessoa pedir para avisar, notificar, alertar, postar ou publicar algo no Discord; para enviar o resultado de uma tarefa, deploy, build, release, teste, revisão, incidente ou relatório a um canal; para montar uma notificação com título, cor, campos, autor, imagem, rodapé ou horário; para enviar um payload JSON de webhook pronto (Embed Visualizer, Discohook); para cadastrar, listar, testar, editar, renomear ou remover webhooks de canais; para configurar o Discordfy no CI, em hooks do Git, no cron ou no cliente MCP; ou quando citar o Discordfy.
---

# Discordfy

O Discordfy é um sistema de notificações ricas para o Discord. Ele guarda o
webhook de cada canal com um nome curto (`deploys`, `alertas`, `time-dev`) e
publica notificações com embeds no canal indicado. Ele não é um bot: não lê,
não responde e não modera mensagens.

Todo envio nomeia o canal. O binário não tem canal padrão, então nenhuma
notificação sai para um destino implícito.

## Leitura prévia

Abra a referência que corresponde à tarefa antes de agir. Citar uma
referência não substitui abri-la.

| Tarefa | Referência |
| --- | --- |
| instalar o binário, configurar o MCP no cliente, instalar esta skill, ler as configurações | `references/instalacao.md` |
| criar o webhook no Discord, cadastrar, listar, testar, editar, renomear, remover, revogar uma URL vazada, atalhos da TUI | `references/webhooks.md` |
| montar a notificação: texto, embed, cor, campos, autor, imagem, rodapé, horário, menções, limites | `references/mensagens.md` |
| enviar um JSON pronto, compor payload com opções, vários embeds, tópicos e posts de fórum | `references/payload.md` |
| argumentos de cada tool MCP, resources, prompt e a forma das respostas | `references/mcp.md` |
| modelos prontos: deploy, build quebrado, release, PR, incidente, relatório, tarefa concluída | `references/receitas.md` |
| GitHub Actions, GitLab CI, hooks do Git, cron e scripts | `references/automacoes.md` |
| exit codes, mensagens de erro, entrega incerta, cofre ilegível | `references/erros.md` |

## Regras

1. **A URL do webhook é um segredo.** Ela carrega o token que publica no
   canal. Nunca peça a URL no chat, nunca a escreva em arquivo do projeto,
   commit, issue, log ou argumento de comando, e nunca rode `--reveal` (nem
   a tecla `v` da TUI) por conta própria. As tools do MCP não devolvem a URL.
2. **O canal vem da pessoa.** Use o nome que ela disser. Se ela descrever o
   destino ("o canal de deploy"), compare com a lista de canais e confirme o
   nome escolhido. Sem indicação, pergunte, mesmo quando só houver um canal
   cadastrado. Não escolha por ela.
3. **Cadastro é com a pessoa.** Cadastrar, trocar, renomear e remover
   webhooks ficam no terminal ou na TUI dela. Peça que rode no terminal
   dela, com o nome já confirmado no lugar de `<canal>`:
   `discordfy webhooks add <canal>`. O comando lê a URL sem eco. No Claude
   Code, ela pode digitar `! discordfy webhooks add <canal>` no prompt; o
   `!` é atalho do cliente e nunca entra num comando de shell.
4. **Menções desligadas.** Só use `allow_mentions` ou `--allow-mentions`
   quando a pessoa pedir para chamar alguém. Sem a flag, o corpo final
   sempre leva `allowed_mentions: {"parse": []}`, mesmo que um JSON
   recebido traga outro objeto. Com a flag, o `allowed_mentions` do payload
   vale quando existir; prefira um payload restrito ao cargo ou usuário
   pedido (ver `references/mensagens.md`).
5. **Conteúdo sensível.** Antes de publicar erro com dados de cliente,
   chaves, caminhos internos ou trechos de log, confirme com a pessoa o que
   pode ir para o canal.
6. **Sem envio duplicado.** Um `message.id` não vazio comprova a entrega.
   Não reenvie para confirmar. Depois de falha de rede (`Could not reach
   Discord`) ou de id vazio, a entrega é incerta: peça que a pessoa confira
   o canal antes de repetir (ver `references/erros.md`).

## Passos

1. **Escolha o modo.** Prefira as tools do MCP (`webhooks_list`,
   `discord_send`) quando o servidor `discordfy` estiver conectado. Sem MCP,
   use o CLI com `--json`. Sem o binário, siga `references/instalacao.md` e
   pare até a pessoa instalar.
2. **Confira o canal.** Tool `webhooks_list` ou
   `discordfy webhooks list --json` e procure o nome em `webhooks[].channel`.
   A lista não acusa ausência: sai com sucesso e `count: 0` em cofre vazio.
   Se o nome faltar, peça o cadastro (regra 3). `webhook_test` ou
   `discordfy webhooks test <canal> --json` confirma que o webhook ainda
   existe no Discord, sem publicar.
3. **Monte a notificação.** Comece por uma receita de
   `references/receitas.md` quando houver uma para o caso. Ajuste título,
   descrição, cor e campos com os dados reais da tarefa. Use cor pelo
   estado: `green` sucesso, `yellow` atenção, `red` falha, `info` aviso
   neutro, `blurple` anúncio.
4. **Confira antes de enviar** quando a mensagem for longa, montada a partir
   de saída de outro programa ou vier de um JSON pronto: rode com
   `dry_run: true` ou `--dry-run` e leia o corpo final (`allowed_mentions`,
   `flags`, `tts`, `username`, embeds). O dry run não chama o Discord, não
   confere se o canal está cadastrado e não valida URLs, datas nem cores
   cruas de um payload.
5. **Envie** com `discord_send` ou `discordfy send <canal>`.
6. **Leia o resultado** no caminho certo de cada modo (ver
   `references/mcp.md` e `references/erros.md`). CLI: `data.message.id` em
   sucesso, `error.code`, `error.name` e `error.message` em falha. MCP:
   `structuredContent.message.id` em sucesso; em falha, `isError: true` e
   `structuredContent.error`. `details` é opcional.

### Envio mínimo

```bash
discordfy send deploys "Deploy da v1.4.0 concluído"
```

```json
{ "channel": "deploys", "content": "Deploy da v1.4.0 concluído" }
```

### Notificação rica

```bash
discordfy send deploys \
  --title "Deploy v1.4.0" --url "https://github.com/acme/app/releases/tag/v1.4.0" \
  --description "Todos os testes passaram." --color green \
  --inline-field "Ambiente=produção" --inline-field "Commit=a1b2c3d" \
  --footer "GitHub Actions" --timestamp
```

```json
{
  "channel": "deploys",
  "title": "Deploy v1.4.0",
  "url": "https://github.com/acme/app/releases/tag/v1.4.0",
  "description": "Todos os testes passaram.",
  "color": "green",
  "fields": [
    { "name": "Ambiente", "value": "produção", "inline": true },
    { "name": "Commit", "value": "a1b2c3d", "inline": true }
  ],
  "footer": { "text": "GitHub Actions" },
  "timestamp": "now"
}
```

## Marcos

Informe a pessoa quando: o canal for confirmado, um cadastro for necessário
(com o comando exato), o dry run mostrar algo que ela precise aprovar, a
entrega ficar incerta e o envio terminar.

## Saída

Relate o canal, o `message.id` e um resumo de uma linha do que foi
publicado. Em falha, relate o `error.name`, a mensagem e a próxima ação
indicada em `references/erros.md`. Em entrega incerta, diga isso com essas
palavras e não invente um id.

## Links

- Site: <https://promovaweb.com/discordfy/>
- Guia do Usuário: <https://github.com/promovaweb/discordfy/tree/main/docs/user>
- Repositório: <https://github.com/promovaweb/discordfy>
- Referência embutida no binário: `discordfy --skill` (topics `cli`, `tui`,
  `mcp`, `config`, `exit-codes`, `reference`)
