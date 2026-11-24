# Automações: CI, hooks do Git, cron e scripts

## Princípio

O ambiente automatizado não tem o cofre da pessoa. Ele recebe a URL de um
secret do provedor, cadastra num cofre temporário com uma chave mestra
também guardada como secret e envia. A URL entra pelo stdin, nunca como
argumento, e não aparece no log.

O cofre temporário é um diretório criado com `mktemp -d` e apontado por
`DISCORDFY_HOME` antes do cadastro. Ele vale até o envio, no mesmo job, e
é removido ao terminar (`trap ... EXIT` remove mesmo quando um passo
falha). Sem isso, o Discordfy usa `~/.discordfy/`; num runner persistente, o cofre sobrevive entre jobs e o segundo cadastro com
o mesmo nome falha com `Channel "<canal>" already has a webhook`.

Gere a chave mestra uma vez e guarde como secret (`DISCORDFY_MASTER_KEY`,
64 caracteres hexadecimais):

```bash
openssl rand -hex 32
```

Dados do evento (branch, autor, título de PR, mensagem de commit) entram no
comando por variáveis de ambiente entre aspas, nunca por expressão do
provedor escrita dentro do script. A expressão é substituída no texto antes
de o shell ler o script, então um nome de branch com aspas ou `$(...)` vira
código executado num passo que tem acesso ao webhook e à chave do cofre.

## GitHub Actions

```yaml
- name: Notificar o Discord
  if: always()
  env:
    DISCORDFY_MASTER_KEY: ${{ secrets.DISCORDFY_MASTER_KEY }}
    DISCORD_WEBHOOK: ${{ secrets.DISCORD_WEBHOOK_DEPLOYS }}
    JOB_STATUS: ${{ job.status }}
  run: |
    npm i -g @promovaweb/discordfy
    export DISCORDFY_HOME="$(mktemp -d)"
    trap 'rm -rf "$DISCORDFY_HOME"' EXIT
    printf '%s\n' "$DISCORD_WEBHOOK" | discordfy webhooks add deploys --stdin --no-verify
    if [ "$JOB_STATUS" = "success" ]; then cor=green; titulo="Deploy concluído"; else cor=red; titulo="Deploy falhou"; fi
    discordfy send deploys --title "$titulo: $GITHUB_REF_NAME" \
      --url "$GITHUB_SERVER_URL/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID" \
      --color "$cor" --inline-field "Commit=${GITHUB_SHA::7}" --inline-field "Autor=$GITHUB_ACTOR" --timestamp
```

`if: always()` faz o passo rodar também quando o job falha. Os secrets e
`job.status` entram por `env`; `GITHUB_REF_NAME`, `GITHUB_ACTOR`,
`GITHUB_SERVER_URL`, `GITHUB_REPOSITORY`, `GITHUB_RUN_ID` e `GITHUB_SHA`
já são variáveis de ambiente do runner. Para outros dados do evento (título
do PR, mensagem do commit), declare em `env` (`PR_TITLE:
${{ github.event.pull_request.title }}`) e use `"$PR_TITLE"` no script.

## GitLab CI

`CI_JOB_STATUS` descreve o próprio job que o lê. Num job de notificação, ele
fala da própria notificação, não do deploy anterior. Para avisar o
resultado do pipeline, use um job por resultado no estágio `.post`, com
`when: on_success` e `when: on_failure`:

```yaml
.notificar:
  stage: .post
  script:
    - |
      npm i -g @promovaweb/discordfy
      export DISCORDFY_HOME="$(mktemp -d)"
      trap 'rm -rf "$DISCORDFY_HOME"' EXIT
      printf '%s\n' "$DISCORD_WEBHOOK" | discordfy webhooks add deploys --stdin --no-verify
      discordfy send deploys --title "Pipeline $CI_PIPELINE_ID: $RESULTADO" --url "$CI_PIPELINE_URL" \
        --color "$COR" --inline-field "Branch=$CI_COMMIT_REF_NAME" --timestamp

notificar-sucesso:
  extends: .notificar
  when: on_success
  variables:
    RESULTADO: "sucesso"
    COR: "green"

notificar-falha:
  extends: .notificar
  when: on_failure
  variables:
    RESULTADO: "falha"
    COR: "red"
```

O item `- |` mantém o script como texto: sem ele, uma linha com dois-pontos
seguido de espaço vira um mapa YAML. Defina `DISCORDFY_MASTER_KEY` e
`DISCORD_WEBHOOK` como variáveis mascaradas e protegidas do projeto.

## Hook do Git

`.git/hooks/post-commit`, com permissão de execução:

```bash
#!/bin/sh
git log -1 --format='%s' | discordfy send commits --stdin --silent
```

Hooks rodam na máquina da pessoa e usam o cofre dela.

## Cron

```cron
0 9 * * 1-5 /home/<usuario>/.npm-global/bin/discordfy send time-dev --title "Bom dia" --description "$(cat /srv/relatorio.md)" --color info --silent
```

No cron, use o caminho absoluto do binário e confira se a variável `HOME`
aponta para o usuário dono do cofre.

## Scripts

Use `--json`, leia o exit code e propague a falha:

```bash
if out=$(discordfy send alertas --title "Disco acima de 90%" --color yellow --json); then
  echo "ok: $(printf '%s' "$out" | jq -r .data.message.id)"
else
  rc=$?
  echo "falhou: $(printf '%s' "$out" | jq -r .error.message)" >&2
  exit "$rc"
fi
```

Cor sem título nem descrição não forma embed (exit 2): o texto posicional
fica fora do embed. Use `--title` junto de `--color`, ou envie só o texto.
Com exit 5 e mensagem `Could not reach Discord`, a entrega é incerta:
não repita automaticamente (ver `erros.md`).

Defina `output.format` como `json` (`discordfy config set output.format
json`) para que a saída padrão seja JSON sem repetir `--json`.

## Limite de envio

O Discord orienta cerca de 30 mensagens por minuto por webhook. O
Discordfy não conta envios: ele reage ao HTTP 429. Com espera pedida de até
10 segundos, repete uma vez; acima disso, sai com 5 e
`error.details.retryAfter`. Respeite essa espera antes de tentar de novo.
Para muitos eventos seguidos, agrupe em uma notificação com campos ou em
vários embeds (até 10 por mensagem).
