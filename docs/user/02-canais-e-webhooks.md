# Capítulo 2: Canais e webhooks

Cada canal que vai receber mensagens precisa de um webhook criado no próprio
Discord. O Discordfy não cria webhooks: ele guarda a URL que o Discord gera e
dá a ela um nome curto. Essa separação é proposital, porque a criação exige
permissão de administração no servidor, enquanto o envio só precisa da URL.

## Criar o webhook no Discord

A criação acontece nas configurações do servidor ou do canal. Você precisa da
permissão **Gerenciar Webhooks** no servidor. O caminho pelo canal é o mais
direto:

1. Passe o mouse sobre o canal de texto e clique na engrenagem de
   **Editar canal**. Pelo servidor, o caminho equivalente é
   **Configurações do servidor**, depois **Integrações**.
2. Abra **Integrações** e clique em **Webhooks**.
3. Clique em **Novo webhook**. O Discord cria um webhook com nome e avatar
   padrão.
4. Ajuste o nome que vai aparecer nas mensagens e confira se o canal
   selecionado é o certo.
5. Clique em **Copiar URL do webhook**.

Na interface em inglês, os rótulos são **Server Settings** ou
**Edit Channel**, depois **Integrations**, **Webhooks**, **New Webhook** e
**Copy Webhook URL**. A URL copiada tem este formato:

```text
https://discord.com/api/webhooks/123456789012345678/AbCdEfGhIjKlMnOpQrStUvWxYz0123456789
```

O número do meio é o id do webhook. A sequência final é o token. Qualquer
pessoa com a URL inteira posta no canal com o nome do webhook, então trate a
URL como uma senha desde o momento da cópia. Evite colar em chat, issue ou
arquivo versionado.

## Salvar a URL com webhooks add

O `webhooks add` recebe o nome do canal como argumento. A URL não entra como
argumento, porque ela ficaria no histórico do shell e na lista de processos.
Num terminal interativo, o binário pede a URL sem eco:

```bash
discordfy webhooks add deploys
```

O nome é seu e pode diferir do nome real do canal no Discord. Ele aceita
letras minúsculas, dígitos, hífen e sublinhado, com até 48 caracteres. Um
`#` inicial e as letras maiúsculas são normalizados, então `#Deploys` vira
`deploys`.

Antes de gravar, o binário faz um `GET` no webhook para conferir que a URL
responde. Essa consulta lê o nome do webhook e o id do canal sem postar nada.
A resposta mostra o nome que o Discord devolveu:

```text
✓ #deploys saved · Discord webhook "Deploy bot" (channel 987654321098765432)
```

Em script, a URL chega pelo stdin com `--stdin`. O binário lê a primeira linha
recebida e ignora as demais:

```bash
printf '%s' "$DISCORD_WEBHOOK" | discordfy webhooks add alertas --stdin
```

Duas options mudam o comportamento padrão. O `--force` substitui a URL de um
canal que já existe. Sem ela, o comando para com exit code 2 para não apagar
um webhook por engano. O `--no-verify` grava sem consultar o Discord, útil
numa máquina sem rede. Nesse caso, a saída termina com `not verified`. A
primeira conferência real acontece no `webhooks test` ou no primeiro envio.

O binário aceita URLs de `discord.com`, `discordapp.com`,
`ptb.discord.com` e `canary.discord.com`, com ou sem versão da API no
caminho. Em todos os casos, ele grava a forma canônica
`https://discord.com/api/webhooks/<id>/<token>`. Uma URL de outro domínio é
recusada com exit code 2.

## Listar, conferir e testar

O `webhooks list` mostra os canais salvos em ordem alfabética, com o token
mascarado:

```bash
discordfy webhooks list
```

```text
  CHANNEL   ADDRESS
  #deploys  https://discord.com/api/webhooks/123456789012345678/AbCd••••••••89
```

A máscara mantém o id e os quatro primeiros e os dois últimos caracteres do
token. Isso basta para distinguir dois webhooks na tela sem expor a parte que
dá acesso ao canal. O `webhooks show deploys` mostra o endereço de um canal
só, também mascarado.

As duas listagens aceitam `--reveal` para imprimir a URL completa. Use essa
option quando precisar copiar a URL para outro sistema e limpe o terminal em
seguida. Com `--json`, o `list` sem `--reveal` devolve `channel`, `id` e
`masked` para cada canal. O `--reveal` acrescenta o campo `url`.

O `webhooks test deploys` repete a consulta do `add` e confirma que o webhook
continua ativo, sem postar mensagem. Ele é o primeiro comando para rodar
quando um envio falha, porque separa o webhook apagado no Discord de um
problema na mensagem.

## Editar, renomear e remover

O `webhooks edit` altera o webhook dentro do Discord. O novo nome e o novo
avatar passam a valer para toda mensagem que não traga `--username` ou
`--avatar-url`:

```bash
discordfy webhooks edit deploys --name "Bot de deploy" --avatar ./bot.png
discordfy webhooks edit alertas --remove-avatar
```

O `--avatar` aceita um arquivo PNG, JPEG ou GIF de até 8 MB ou uma URL
http(s). O `--name` aceita de 1 a 80 caracteres. O Discord recusa nomes que
contenham `discord` ou `clyde`. O `--avatar` e o `--remove-avatar` não podem
aparecer juntos.

O `webhooks rename alertas alertas-prod` troca só o nome local e preserva a
URL. Scripts e agentes que usavam o nome antigo passam a receber exit code 6
até serem atualizados. Antes de renomear, localize os scripts, workflows e
instruções de agente que usam o nome atual.

O `webhooks remove deploys` apaga a URL do cofre. Num terminal, ele pede
confirmação. Em scripts, o `--yes` dispensa a pergunta. O webhook continua
existindo no Discord depois do `remove`. Para desativar o endereço de fato,
apague o webhook na mesma tela de **Integrações** do canal.

## O cofre e a master key

As URLs ficam em `~/.discordfy/credentials.json`, cifradas com AES-256-GCM.
Cada canal vira uma credencial com o nome `webhook.<canal>`, como
`webhook.deploys`. O comando `discordfy credentials list` mostra esses nomes.
O `discordfy credentials status` mostra o arquivo, a cifra, a origem da
master key e o total de credenciais, sem nenhum valor.

A master key tem 32 bytes. Ela vem da variável `DISCORDFY_MASTER_KEY`, com
64 caracteres hexadecimais, ou do arquivo `~/.discordfy/master.key`, criado
na primeira gravação com permissão 0600. Quando a variável existe, o arquivo
é ignorado. A pasta `~/.discordfy/` é criada com permissão 0700. A variável
`DISCORDFY_HOME` troca essa pasta por outra, recurso útil em testes e na CI.

A cifra protege a URL contra leitura casual, cópia em backup e varredura do
disco. Um processo que roda com o seu usuário consegue ler `master.key` e
abrir o cofre. Para subir esse nível, guarde a chave num gerenciador de
segredos e injete pela variável, sem gravar `master.key` em disco. O capítulo
7 usa esse arranjo na CI.

## A aba Webhooks da TUI

Sem argumentos, o `discordfy` abre a TUI na aba Webhooks, a primeira da
barra. A tabela mostra cada canal com o endereço mascarado. As teclas
executam as mesmas operações do CLI:

| Tecla | Ação |
| --- | --- |
| `a` | adicionar um canal: nome primeiro, depois a URL num campo que mostra bolinhas |
| `s` ou `Enter` | enviar uma mensagem de texto ao canal selecionado |
| `t` | testar o webhook sem postar |
| `v` | revelar ou mascarar as URLs da tabela |
| `d` ou `Delete` | remover o canal do cofre, com confirmação |
| `r` | recarregar a lista |
| `↑` `↓` ou `k` `j` | mudar o canal selecionado |

O `v` alterna o estado. Enquanto as URLs estão visíveis, a barra inferior
mostra `URLs revealed`. Pressione `v` de novo antes de compartilhar a tela ou
gravar um vídeo. A aba recarrega sozinha quando o cofre muda, então um
`webhooks add` feito em outro terminal aparece na tabela sem reiniciar a TUI.

Com um canal salvo e testado, você já pode mandar a primeira mensagem.
