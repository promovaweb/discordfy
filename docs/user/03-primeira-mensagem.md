# Capítulo 3: Primeira mensagem

O `send` recebe o nome do canal e o texto. Todo o restante da linha depois
do canal vira o conteúdo da mensagem, então as aspas servem para proteger
caracteres que o shell interpretaria, como `!`, `$` e `*`:

```bash
discordfy send deploys "Deploy da v1.4.0 concluído em produção"
```

A resposta confirma o canal e mostra o id da mensagem criada:

```text
✓ sent to #deploys · message 1309876543210987654
```

O binário envia com `?wait=true`. Por isso, o Discord responde com a
mensagem criada em vez de uma resposta vazia. Esse id ajuda a localizar a
mensagem depois. Com `--json`, ele vem em `data.message.id`, junto com
`channel_id` e `timestamp`.

## Ver o que vai sair com `--dry-run`

O `--dry-run` monta o corpo JSON da requisição e para antes de chamar o
Discord. Ele não precisa nem de webhook salvo, porque não consulta o cofre:

```bash
discordfy send deploys "Deploy da v1.4.0 concluído" --dry-run
```

```json
{
  "content": "Deploy da v1.4.0 concluído",
  "allowed_mentions": {
    "parse": []
  }
}
```

Rode o `--dry-run` ao montar uma mensagem nova num script. Ele valida os
limites do Discord, confere cores, URLs e datas e mostra o JSON exato que o
webhook receberia. Um erro de formato aparece com exit code 2 antes de
qualquer mensagem chegar ao canal. Assim, o time não recebe três tentativas
quebradas enquanto você ajusta o comando.

## Quebras de linha e Markdown

O texto aceita o Markdown do Discord: `**negrito**`, `*itálico*`,
`~~riscado~~`, `__sublinhado__`, `` `código` `` e blocos de código entre
três crases. Para quebrar linha dentro de um argumento do shell, escreva
`\n`, que o binário converte em quebra real:

```bash
discordfy send deploys "**Deploy concluído**\nVersão: v1.4.0\nAmbiente: produção"
```

O conteúdo aceita até 2000 caracteres. Acima disso, o `send` para com exit
code 2 e informa quantos caracteres a mensagem tem. Para textos longos, o
caminho é o embed, com descrição de até 4096 caracteres, assunto do próximo
capítulo.

## Texto vindo de outro comando

O `--stdin` lê o texto da entrada padrão. É o jeito de enviar a saída de um
comando sem montar a string à mão:

```bash
git log -1 --format=%s | discordfy send commits --stdin
```

Os espaços e quebras de linha no fim do texto são removidos. As quebras do
meio são preservadas, então a saída de vários comandos chega ao canal com a
mesma divisão de linhas que tinha no terminal.

## Menções desligadas por padrão

Toda mensagem sai com `allowed_mentions.parse` vazio. Com isso, um
`@everyone`, um `@here`, uma menção de cargo ou de usuário aparecem no texto,
mas não notificam ninguém. A proteção vale para o caso comum de um log ou de
uma mensagem de commit que contém `@` por acidente e acordaria o servidor
inteiro às três da manhã.

Para notificar de verdade, acrescente `--allow-mentions`:

```bash
discordfy send alertas "@here o build da main falhou" --allow-mentions
```

Reserve essa option para alertas que pedem ação imediata. Um canal que
notifica todo mundo a cada deploy ensina o time a silenciar o canal. Quando o
alerta importante chega, ele passa despercebido junto com os outros.

## Mensagem pela TUI

Na aba Webhooks, selecione o canal com as setas e pressione `s` ou `Enter`.
A TUI abre um campo de texto, envia a mensagem com os padrões de
`send.username` e `send.avatarUrl` e mostra um aviso no canto da tela com o
id da mensagem. O campo aceita só texto simples. Embeds, campos e cores ficam
com o CLI e com o agente.

## Quando o envio falha

Três respostas cobrem quase todos os casos da primeira mensagem. O exit code
6 indica um nome de canal que não está no cofre. Nesse caso, a mensagem de
erro lista os canais conhecidos. O exit code 5 com HTTP 401 ou 404 indica que
o webhook foi apagado ou teve o token trocado no Discord. O caminho é gerar
uma URL nova e salvar com `webhooks add <canal> --force`. O exit code 2
indica mensagem vazia, limite estourado ou option inválida, com o nome do
campo e o limite na mensagem de erro.

Com `--json`, o erro também vem estruturado, no envelope
`{ ok: false, command, error }`. O exit code do processo é igual a
`error.code`. Um script consegue tratar cada caso pelo número, sem analisar
o texto da mensagem.
