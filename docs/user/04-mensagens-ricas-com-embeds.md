# Capítulo 4: Mensagens ricas com embeds

Uma linha de texto informa que o deploy terminou. Um embed informa qual
versão subiu, em qual ambiente, quanto tempo levou e onde abrir o log, com
uma barra lateral verde que o time reconhece antes de ler. O embed é o
cartão que o Discord desenha abaixo da mensagem. O `send` monta um embed a
partir das options da linha de comando.

## Um aviso de deploy completo

O exemplo abaixo usa a maior parte dos elementos de uma vez. As seções
seguintes explicam cada option separadamente:

```bash
discordfy send deploys \
  --title "Deploy v1.4.0 em produção" \
  --url "https://github.com/sua-org/app/releases/tag/v1.4.0" \
  --description "Todos os testes passaram.\nMigração **0042** aplicada sem erro." \
  --color green \
  --author "Pipeline de release" \
  --author-icon "https://cdn.discordapp.com/embed/avatars/0.png" \
  --field "Branch=main" \
  --inline-field "Tempo=42s" \
  --inline-field "Ambiente=produção" \
  --inline-field "Commit=a1b2c3d" \
  --thumbnail "https://cdn.discordapp.com/embed/avatars/1.png" \
  --footer "GitHub Actions" \
  --timestamp
```

Rode o mesmo comando com `--dry-run` para ver o JSON montado. O embed exige
pelo menos um título, uma descrição, um campo, um autor ou uma imagem. Uma
cor ou um rodapé sozinhos não formam um embed. Nesse caso, o `send` para com
exit code 2 e explica o que falta.

## Texto, título e link

O `content` é o texto comum da mensagem, que aparece acima do embed. Ele
continua vindo dos argumentos depois do canal, do `--stdin` ou do payload.
Texto e embed podem conviver na mesma mensagem.

O `--title` (ou `-t`) define o título do embed, com até 256 caracteres. O
`--url` transforma esse título num link clicável, útil para apontar a release,
o pull request ou a página do log. A URL precisa começar com `http://` ou
`https://`. Outro formato para com exit code 2.

O `--description` (ou `-d`) aceita até 4096 caracteres e o mesmo Markdown do
texto comum, incluindo links nomeados no formato `[texto](url)`, listas e
blocos de código. Use `\n` para quebrar linha, como no `content`. A descrição
é o lugar do resumo legível: o que mudou, o que falhou e o que a pessoa
precisa fazer.

## A cor da barra lateral

O `--color` (ou `-c`) pinta a barra à esquerda do embed. Ele aceita três
formas: um nome da tabela abaixo, um hexadecimal como `#5865F2` ou
`0x5865F2` e um inteiro decimal como `5793266`, que é o formato do JSON do
Discord.

| Nome | Hexadecimal | Uso sugerido |
| --- | --- | --- |
| `blurple` | `#5865F2` | avisos neutros, identidade do Discord |
| `green`, `success` | `#57F287` | deploy concluído, testes verdes |
| `yellow`, `warning` | `#FEE75C` | atenção, ação recomendada |
| `red`, `error` | `#ED4245` | falha, rollback, incidente |
| `info`, `blue` | `#3498DB` | informação, relatório |
| `orange` | `#E67E22` | degradação parcial |
| `fuchsia` | `#EB459E` | destaque de evento |
| `grey` | `#95A5A6` | registro de rotina |
| `white` | `#FFFFFF` | contraste em tema escuro |
| `black` | `#23272A` | contraste em tema claro |

Um nome fora da tabela para com exit code 2 e a mensagem lista os nomes
aceitos. Combine cor e título de forma estável entre as mensagens do mesmo
canal. Quando vermelho significa falha em todo aviso, o time aprende a
reconhecer o incidente pela cor na lista de mensagens.

## Autor

O `--author` coloca uma linha pequena acima do título, com até 256
caracteres. O `--author-url` transforma essa linha em link. O
`--author-icon` mostra uma imagem redonda ao lado do nome. As duas options
complementares só têm efeito com o `--author` presente.

A linha de autor funciona bem para identificar o sistema que gerou o aviso quando
vários sistemas postam no mesmo canal: o nome do pipeline, do agente ou do
serviço de monitoramento.

## Campos empilhados e lado a lado

O `--field "Nome=Valor"` acrescenta um campo empilhado, ocupando a largura
do embed. O `--inline-field "Nome=Valor"` acrescenta um campo que divide a
linha com outros campos inline, em geral até três por linha no desktop. As
duas options podem ser repetidas. Os campos aparecem na ordem de escrita.

```bash
discordfy send deploys --title "Resumo do build" \
  --field "Mudanças=Correção no login\nNova tela de planos" \
  --inline-field "Testes=212" \
  --inline-field "Falhas=0" \
  --inline-field "Cobertura=87%"
```

O separador entre nome e valor pode ser `=` ou `|`. O primeiro que aparece
divide o texto. Com isso, `--field "URL|https://exemplo.com/?a=1"` preserva o
`=` dentro do valor. O valor aceita `\n` e Markdown. O nome aceita até 256
caracteres e o valor até 1024. Um embed comporta até 25 campos.

## Imagem e miniatura

O `--image` mostra uma imagem grande na parte de baixo do embed, como um
gráfico de desempenho ou a captura de uma tela. O `--thumbnail` mostra uma
imagem pequena no canto superior direito, boa para o logo do projeto ou o
avatar do serviço. As duas recebem URLs http(s) públicas, porque é o Discord
que baixa a imagem para exibir. Um arquivo local ou uma URL que exige login
não aparece no canal.

## Rodapé e data

O `--footer` escreve uma linha pequena no fim do embed, com até 2048
caracteres. O `--footer-icon` coloca uma imagem ao lado dela. O
`--timestamp` mostra a data no rodapé, convertida pelo Discord para o fuso da
pessoa que lê. Sem valor, ou com `now`, ele usa o momento do envio. Com uma data ISO
8601, como `2026-11-24T12:00:00-03:00`, ele usa essa data, convertida para
UTC no JSON.

```bash
discordfy send relatorios --title "Backup diário" \
  --footer "Servidor db-01" --timestamp 2026-11-24T03:00:00-03:00
```

## Nome e avatar só nesta mensagem

O `--username` (ou `-u`) troca o nome exibido para esta mensagem, com até 80
caracteres. O `--avatar-url` troca o avatar. O webhook continua com o nome
e o avatar originais para as outras mensagens. Os padrões dessas duas options
vêm das chaves `send.username` e `send.avatarUrl` do `settings.json`, que o
capítulo 8 apresenta. Para mudar a identidade do webhook de forma
permanente, use o `webhooks edit` do capítulo 2.

O Discord recusa nomes que contenham `discord` ou `clyde`, em qualquer
combinação de maiúsculas e minúsculas. O `send` confere isso antes da
requisição e para com exit code 2.

## Comportamentos da mensagem

Quatro options mudam a forma como o Discord trata a mensagem, sem alterar o
visual do embed:

- **`--tts`:** pede ao Discord que leia a mensagem em voz alta para as
  pessoas com o canal aberto e a leitura habilitada.
- **`--silent`:** entrega sem notificação push. O canal mostra o indicador
  de não lida, mas o celular de ninguém vibra. Use para relatórios de rotina.
- **`--suppress-embeds`:** esconde as prévias automáticas de links que
  aparecem no texto. O embed montado pelas options continua aparecendo.
- **`--allow-mentions`:** libera `@everyone`, `@here`, cargos e usuários
  para notificar, como no capítulo 3.

O `--silent` e o `--suppress-embeds` viram o campo `flags` do JSON, com os
valores 4096 e 4. Juntos, somam 4100.

## Vários embeds na mesma mensagem

As options montam um embed. O `--embed` acrescenta outros, depois dele, a
partir de um objeto JSON na própria linha ou de um arquivo com `@`:

```bash
discordfy send deploys --title "Deploy v1.4.0" --color green \
  --embed '{"title": "Rollback disponível", "description": "Use a tag v1.3.9.", "color": "yellow"}' \
  --embed @embed-metricas.json
```

O `--embed` pode ser repetido. A mensagem comporta até 10 embeds. Dentro
do JSON, a cor também aceita nome ou hexadecimal em texto, que o binário
converte para o inteiro esperado pelo Discord. O formato completo dos campos
do objeto é o do próximo capítulo.

## Limites do Discord

O `send` confere estes limites antes de qualquer requisição. Quando um deles
é ultrapassado, o erro nomeia o campo, a quantidade encontrada e o máximo:

| Elemento | Limite |
| --- | --- |
| `content` | 2000 caracteres |
| `username` | 80 caracteres |
| embeds por mensagem | 10 |
| título do embed | 256 caracteres |
| descrição do embed | 4096 caracteres |
| nome do autor | 256 caracteres |
| campos por embed | 25 |
| nome do campo | 256 caracteres |
| valor do campo | 1024 caracteres |
| texto do rodapé | 2048 caracteres |
| soma de todos os embeds | 6000 caracteres |

A última linha merece atenção. Título, descrição, autor, rodapé, nomes e
valores de campos de todos os embeds somam no máximo 6000 caracteres por
mensagem. Um relatório com dez embeds cheios passa desse total. Nesse caso,
divida o conteúdo em duas mensagens.
