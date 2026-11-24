# Capítulo 5: Payload completo

As options do `send` cobrem a mensagem com um embed montado na linha de
comando. Quando a mensagem já existe como JSON, gerada por outro sistema,
desenhada num editor visual ou guardada como modelo no repositório, o
`--payload` envia esse corpo no formato que o webhook do Discord aceita.

## O formato do corpo

O arquivo é um objeto JSON com os campos do webhook. Os mais usados são
`content`, `username`, `avatar_url`, `tts`, `embeds`, `flags` e
`allowed_mentions`. Cada item de `embeds` usa os nomes do Discord: `title`,
`description`, `url`, `color` e `timestamp` no primeiro nível. Os objetos
`author` (`name`, `url`, `icon_url`), `footer` (`text`, `icon_url`), `image`
e `thumbnail` (`url`) agrupam os demais elementos. A lista `fields` traz
`name`, `value` e `inline` em cada campo.

```json
{
  "content": "Relatório noturno pronto.",
  "embeds": [
    {
      "title": "Backup do banco",
      "description": "Todos os bancos foram copiados para o storage.",
      "color": "green",
      "fields": [
        { "name": "Bancos", "value": "4", "inline": true },
        { "name": "Tamanho", "value": "18 GB", "inline": true }
      ],
      "footer": { "text": "db-01" },
      "timestamp": "2026-11-24T03:00:00-03:00"
    }
  ]
}
```

Salve como `relatorio.json` e envie:

```bash
discordfy send relatorios --payload relatorio.json
```

A cor do embed aceita o inteiro do Discord e também os nomes e os
hexadecimais do capítulo 4, que o binário converte antes do envio. Os limites
daquele capítulo valem igualmente para o payload. Uma violação para com exit
code 2 antes da requisição.

## Payload pelo stdin

Para um corpo gerado por outro programa, use `-` como nome de arquivo para
ler o stdin:

```bash
gerar-relatorio --json | discordfy send relatorios --payload -
```

A forma `--payload=-` tem o mesmo efeito.

## Options por cima do payload

As options da linha de comando se combinam com o arquivo. Os campos de topo
informados por option, como `--username`, `--avatar-url`, `--tts` e `--silent`,
substituem os do arquivo. Os embeds montados por `--title`, `--field` e
`--embed` são acrescentados depois dos embeds do arquivo, sem apagá-los:

```bash
discordfy send deploys --payload=modelo-deploy.json \
  --username "Release v1.4.0" \
  --title "Notas da versão" --description "Veja o CHANGELOG."
```

Esse arranjo permite guardar um modelo fixo no repositório e completar só o
que muda a cada execução. Confira o resultado com `--dry-run` antes de
publicar o modelo para o time usar.

As menções seguem a mesma proteção do restante do binário. Sem
`--allow-mentions`, a mensagem sai com as menções desligadas, a não ser que o
próprio arquivo declare `allowed_mentions`. Nesse caso, o valor do arquivo é
preservado, porque o autor do modelo já escolheu os cargos e as pessoas que
podem ser notificados.

## O campo legado embed

Exemplos antigos de bots e o Embed Visualizer, editor visual feito para
desenhar embeds, exportam um objeto único em `embed`, no singular. A API
atual de webhooks espera a lista `embeds`. O Discordfy aceita os dois
formatos e move o `embed` para o início da lista `embeds`.

O binário também descarta chaves que um webhook não pode definir, como
`type`, `provider`, `video` e as dimensões e o `proxy_url` das imagens. Essas
chaves aparecem quando você copia o JSON de uma mensagem existente. O Discord
recusaria o corpo se elas fossem enviadas.

## O exemplo completo do Embed Visualizer

O arquivo `examples/embed-visualizer.json` do repositório reproduz a
exportação padrão do Embed Visualizer, com todos os elementos que um embed
aceita:

```json
{
  "content": "this `supports` __a__ **subset** *of* ~~markdown~~ 😃 ```js\nfunction foo(bar) {\n  console.log(bar);\n}\n\nfoo(1);```",
  "embed": {
    "title": "title ~~(did you know you can have markdown here too?)~~",
    "description": "this supports [named links](https://discordapp.com) on top of the previously shown subset of markdown. ```\nyes, even code blocks```",
    "url": "https://discordapp.com",
    "color": 5460938,
    "timestamp": "2026-11-24T09:41:36.835Z",
    "footer": {
      "icon_url": "https://cdn.discordapp.com/embed/avatars/0.png",
      "text": "footer text"
    },
    "thumbnail": {
      "url": "https://cdn.discordapp.com/embed/avatars/0.png"
    },
    "image": {
      "url": "https://cdn.discordapp.com/embed/avatars/0.png"
    },
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

O arquivo mostra Markdown no texto, no título e na descrição, um bloco de
código dentro do `content`, link no título e no autor, as duas imagens, o
rodapé com ícone, a data e cinco campos, sendo os dois últimos inline. Os
nomes no formato `<:thonkang:219069250692841473>` são emojis personalizados de
um servidor específico. Em outro servidor, eles aparecem como texto.

Para testar o arquivo no seu canal, confira primeiro a conversão:

```bash
discordfy send testes --payload examples/embed-visualizer.json --dry-run
```

O JSON impresso já traz `embeds` como lista e o campo `allowed_mentions`
vazio. Tirando o `--dry-run`, a mensagem vai para o canal `testes` e
funciona como mostruário de tudo que um webhook consegue desenhar. Use um
canal de testes para isso, porque a mensagem é longa e chama atenção.

## Tópicos e posts de fórum

O webhook posta no canal onde foi criado. Dois recursos levam a mensagem
para dentro de uma conversa específica.

O `--thread-id` posta dentro de um tópico que já existe no canal. O id do
tópico aparece ao clicar com o botão direito sobre ele e escolher
**Copiar ID**, opção visível depois de ligar o **Modo desenvolvedor** em
**Configurações do usuário**, **Avançado**. O uso típico é concentrar num
único tópico todas as mensagens de uma release ou de um incidente:

```bash
discordfy send deploys "Rollback concluído" --thread-id 1309876543210987654
```

O `--thread-name` cria um post novo num canal de fórum, com o título
informado. A mensagem vira a primeira do post. Ele só funciona com webhook
criado num canal de fórum. Num canal de fórum, toda mensagem precisa de
`--thread-name` para abrir um post ou de `--thread-id` para responder num
post existente:

```bash
discordfy send incidentes --thread-name "Lentidão na API em 24/11" \
  --title "Incidente aberto" --color red \
  --description "Tempo de resposta acima de 3s desde 14h10."
```

No payload, o título do post vai em `thread_name`. O id do tópico vai
pelo `--thread-id`, porque ele é parâmetro da URL do webhook e não campo do
corpo. Com `--dry-run --json`, o id aparece em `data.threadId`, separado do
`payload`.
