# Automações e clientes MCP

## Configurar o MCP

O servidor roda com `discordfy mcp`, via stdio. Ele lê o mesmo cofre do CLI.

Claude Code:

```bash
claude mcp add discordfy -- discordfy mcp
```

Codex (`~/.codex/config.toml`):

```toml
[mcp_servers.discordfy]
command = "discordfy"
args = ["mcp"]
```

OpenCode (`opencode.json`):

```json
{ "mcp": { "discordfy": { "type": "local", "command": ["discordfy", "mcp"] } } }
```

Outros clientes usam o bloco `{ "command": "discordfy", "args": ["mcp"] }`.
A aba Overview da TUI copia esse bloco com a tecla `c`.

## GitHub Actions

O runner não tem cofre. Cadastre a URL a partir de um secret, com uma chave
mestra também guardada como secret, e envie:

```yaml
- name: Avisar o time no Discord
  env:
    DISCORDFY_MASTER_KEY: ${{ secrets.DISCORDFY_MASTER_KEY }}
    DISCORD_WEBHOOK: ${{ secrets.DISCORD_WEBHOOK_DEPLOYS }}
  run: |
    npm i -g @promovaweb/discordfy
    printf '%s' "$DISCORD_WEBHOOK" | discordfy webhooks add deploys --stdin --no-verify
    discordfy send deploys --title "Deploy ${{ github.ref_name }}" \
      --url "${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}" \
      --color green --inline-field "Commit=${GITHUB_SHA::7}" --timestamp
```

Gere a chave mestra com `openssl rand -hex 32`. O secret nunca aparece em
argumento de comando nem no log.

## Hook de Git

Um `post-commit` local avisa cada commit sem notificação push (`.git/hooks/post-commit`, com permissão de execução):

```bash
#!/bin/sh
git log -1 --format='%s' | discordfy send commits --stdin --silent
```

## Cron

```cron
0 9 * * 1-5 discordfy send time-dev --title "Bom dia" --description "$(cat /srv/relatorio.md)" --color info
```

## Agente notificando o fim de uma tarefa

Ao fim de uma tarefa longa, o agente chama `discord_send` com:

- `title`: o que foi feito, em uma linha;
- `description`: o resultado e o próximo passo;
- `fields`: testes, arquivos alterados, commit ou PR, com `inline: true`;
- `color`: `green` para sucesso, `yellow` para pendência, `red` para falha;
- `url`: o PR, o deploy ou o relatório.

Antes de notificar falhas que envolvam dados sensíveis, confirme com a pessoa
o que pode ir para o canal.
