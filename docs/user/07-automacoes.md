# Capítulo 7: Automações

O mesmo `send` que você roda no terminal funciona dentro de um pipeline, de
um hook do Git ou de uma tarefa agendada. A diferença está na origem da URL:
na sua máquina, ela já está no cofre. Num runner de CI, que começa vazio a
cada execução, a URL chega de um secret do provedor e vai para um cofre
temporário que some junto com o runner.

## GitHub Actions com secret e stdin

O fluxo usa dois secrets do repositório. O `DISCORD_WEBHOOK_DEPLOYS` guarda a
URL do webhook. O `DISCORDFY_MASTER_KEY` guarda a master key do cofre, gerada
uma vez com:

```bash
openssl rand -hex 32
```

Cadastre os dois em **Settings**, **Secrets and variables**, **Actions** do
repositório. O passo do workflow instala o binário, salva a URL pelo stdin e
envia o aviso:

```yaml
- name: Avisar o time no Discord
  if: success()
  env:
    DISCORDFY_MASTER_KEY: ${{ secrets.DISCORDFY_MASTER_KEY }}
    DISCORD_WEBHOOK: ${{ secrets.DISCORD_WEBHOOK_DEPLOYS }}
  run: |
    npm i -g @promovaweb/discordfy
    printf '%s' "$DISCORD_WEBHOOK" | discordfy webhooks add deploys --stdin --no-verify
    discordfy send deploys \
      --title "Deploy ${{ github.ref_name }} concluído" \
      --url "${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}" \
      --color green \
      --inline-field "Commit=${GITHUB_SHA::7}" \
      --inline-field "Autor=${{ github.actor }}" \
      --footer "GitHub Actions" --timestamp
```

A URL passa pelo stdin e não aparece em argumento de comando, então ela fica
fora da lista de processos e do log do job. O GitHub também mascara o valor
dos secrets no log. Com a master key na variável, o binário não grava
`master.key` em disco. O cofre do runner só abre com o secret.

O `--no-verify` economiza uma requisição ao Discord no cadastro. A conferência
acontece no próprio `send`: se o webhook tiver sido apagado, o passo falha com
exit code 5 e o job fica vermelho. Para avisar também quando o deploy falhar,
repita o passo com `if: failure()`, cor `red` e um título que diga o que
quebrou.

Num runner sem Node.js, troque o `npm i -g` pelo download do binário da
plataforma na página de releases, com a conferência do `SHA256SUMS` do
capítulo 1.

## Aviso de deploy em qualquer script

Fora do GitHub Actions, o mesmo arranjo funciona em qualquer script de
deploy. O trecho abaixo envia verde ou vermelho conforme o resultado e usa a
saída do próprio deploy na descrição:

```bash
#!/bin/sh
if saida=$(./deploy.sh 2>&1); then
  discordfy send deploys --title "Deploy concluído" --color green \
    --description "$(printf '%s' "$saida" | tail -n 5)" --timestamp
else
  discordfy send alertas --title "Deploy falhou" --color red \
    --description "$(printf '%s' "$saida" | tail -n 15)" --timestamp \
    --allow-mentions --silent
fi
```

O `tail` corta a saída para caber no limite de 4096 caracteres da descrição.
Uma saída inteira de build ultrapassa esse limite com facilidade. Nesse caso,
o `send` para com exit code 2 e não corta o texto sozinho.

## Hook do Git

Um hook `post-commit` avisa cada commit local num canal de acompanhamento.
Crie o arquivo `.git/hooks/post-commit`, dê permissão de execução com
`chmod +x` e escreva:

```bash
#!/bin/sh
git log -1 --format='%h %s' | discordfy send commits --stdin --silent
```

O `--silent` evita notificação push a cada commit. Hooks ficam na pasta
`.git/` e não são versionados, então cada pessoa do time decide se quer
ativar o aviso na própria máquina. Um hook `pre-push` funciona da mesma forma
para avisar antes de o código chegar ao remoto.

## Cron

Uma tarefa agendada pode publicar um relatório diário. O crontab interpreta
`%` como quebra de linha, então a forma mais segura é colocar o comando num
script e agendar o script:

```bash
#!/bin/sh
# /usr/local/bin/relatorio-diario
discordfy send time-dev --title "Relatório das 9h" --color info \
  --description "$(cat /srv/relatorio.md)" --silent --timestamp
```

```text
0 9 * * 1-5 /usr/local/bin/relatorio-diario
```

O cron roda com o usuário dono do crontab e encontra o cofre em
`~/.discordfy/` desse usuário. Um crontab do `root` procura o cofre em
`/root/.discordfy/`, que fica vazio se os webhooks foram salvos com outro
usuário. Nesse caso, defina `DISCORDFY_HOME` no script apontando para a pasta
certa, ou salve os webhooks com o usuário que vai rodar a tarefa.

## Limite de envio e o 429

O Discord aceita cerca de 30 mensagens por minuto em cada webhook. Acima
disso, ele responde HTTP 429 com o tempo de espera em `retry_after`. O
Discordfy trata essa resposta uma vez: quando a espera é de até 10 segundos,
ele aguarda e repete o envio. Quando a espera é maior, ou o segundo envio
também volta com 429, o comando para com exit code 5 e a mensagem informa
quantos segundos esperar.

Para enviar muitas mensagens seguidas, espace os envios no próprio script,
com um `sleep 2` entre eles, ou junte o conteúdo em menos mensagens. Um
relatório com dez itens cabe num único embed com dez campos. O canal fica
mais legível do que com dez mensagens soltas.

## Ler o resultado no script

Com `--json`, o `send` devolve um envelope que o script consegue ler com o
`jq`:

```bash
id=$(discordfy send deploys "Deploy iniciado" --json | jq -r '.data.message.id')
```

Em caso de erro, o envelope traz `ok` igual a `false` e o exit code do
processo é igual ao `error.code`. Um script que usa `set -e` para no primeiro
envio que falhar. O exit code indica a causa, conforme a tabela do
capítulo 8.
