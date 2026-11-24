# Receitas de notificação

Modelos prontos para os casos mais comuns. Troque os valores entre `<>` pelos
dados reais e mantenha a estrutura: título curto com o que aconteceu, cor
pelo estado, campos lado a lado para os dados que a pessoa compara de
relance e link para o detalhe.

| Estado | Cor |
| --- | --- |
| sucesso | `green` |
| atenção, pendência | `yellow` |
| falha, incidente | `red` |
| aviso neutro, relatório | `info` |
| anúncio, lançamento | `blurple` |

## Tarefa do agente concluída

```json
{
  "channel": "<canal>",
  "title": "<o que foi feito, em uma linha>",
  "description": "<resultado em duas ou três frases e o próximo passo>",
  "color": "green",
  "url": "<link do PR, do commit ou do relatório>",
  "fields": [
    { "name": "Testes", "value": "<n> passando", "inline": true },
    { "name": "Arquivos", "value": "<n> alterados", "inline": true },
    { "name": "Branch", "value": "<branch>", "inline": true }
  ],
  "footer": { "text": "<agente> via Discordfy" },
  "timestamp": "now"
}
```

Tarefa interrompida ou com pendência: mesma estrutura com `color: "yellow"`
e o que falta na descrição.

## Deploy concluído

```bash
discordfy send deploys --title "Deploy <versão> em <ambiente>" --url "<link do run>" \
  --description "Publicado sem erros." --color green \
  --inline-field "Versão=<versão>" --inline-field "Commit=<sha curto>" --inline-field "Duração=<tempo>" \
  --footer "<CI>" --timestamp
```

## Deploy ou build falhou

```bash
discordfy send deploys --title "Falha no deploy <versão>" --url "<link do run>" \
  --description "Etapa **<etapa>** falhou. Veja o log no link." --color red \
  --inline-field "Branch=<branch>" --inline-field "Commit=<sha curto>" \
  --field "Erro=<primeira linha do erro, sem segredos>" --timestamp
```

Para chamar um cargo, só quando a pessoa pedir, use a menção do Discord
`<@&ID_DO_CARGO>` no texto: `@nome` escrito à mão não notifica. Para
notificar só esse cargo, envie por payload com o objeto restrito e a flag:

```bash
printf '%s' '{"content":"<@&ID_DO_CARGO> falha no deploy <versão>","allowed_mentions":{"parse":[],"roles":["ID_DO_CARGO"]}}' \
  | discordfy send deploys --payload - --allow-mentions --dry-run --json
```

`--allow-mentions` sem esse payload libera todos os cargos, usuários e
`@everyone` citados no texto. Confira `allowed_mentions` no dry run e
envie sem `--dry-run`.

## Release publicada

```bash
discordfy send anuncios --title "<projeto> <versão>" --url "<link da release>" \
  --description "<duas ou três novidades em lista>\n- <item>\n- <item>" --color blurple \
  --thumbnail "<URL do logo do projeto>" --footer "Changelog completo no link" --timestamp
```

## Pull request aberto ou mergeado

```bash
discordfy send revisoes --title "PR #<n>: <título do PR>" --url "<link do PR>" \
  --author "<autor>" --author-url "<perfil>" --author-icon "<avatar>" \
  --description "<resumo do PR>" --color info \
  --inline-field "Base=<branch base>" --inline-field "Arquivos=<n>" --silent
```

`--silent` entrega sem push: bom para avisos frequentes.

## Incidente

```bash
discordfy send alertas --title "Incidente: <serviço> <sintoma>" \
  --description "Início: <hora>. Impacto: <quem é afetado>. Próxima atualização em <tempo>." \
  --color red --inline-field "Status=investigando" --inline-field "Responsável=<nome>" --timestamp
```

Atualize no mesmo tópico do incidente com `--thread-id <id>` para manter o
histórico junto.

## Relatório diário

```bash
discordfy send time-dev --title "Resumo de <data>" --color info \
  --description "$(cat relatorio.md)" --silent --timestamp
```

A descrição aceita até 4096 unidades UTF-16 (a maioria dos emojis conta 2).
Acima disso, divida em vários embeds (`--embed`), cada descrição com até
4096, sem passar de 6000 no total da mensagem somando títulos, descrições,
campos, autores e rodapés. Acima de 6000, envie mais de uma mensagem ou
publique o relatório e mande o link.

## Aviso simples

```bash
discordfy send geral "Manutenção hoje às 22h. O painel fica fora do ar por 10 minutos." --silent
```
