# Guia rápido: configurar o MCP no seu agente

Com o MCP configurado, o seu agente de IA também envia notificações para os
canais do Discord, por exemplo ao terminar uma tarefa. Ele usa os canais que
você cadastrou e nunca vê a URL do webhook.

## Antes de começar

1. Instale o Discordfy e confira a versão:

   ```bash
   npm i -g @promovaweb/discordfy
   discordfy --version
   ```

2. Cadastre pelo menos um canal, como no
   [guia do webhook](09-guia-obter-o-webhook.md):

   ```bash
   discordfy webhooks add time-dev
   ```

## Escolha o seu agente

### Claude Code

```bash
claude mcp add discordfy -- discordfy mcp
```

Reabra a sessão e confira com `/mcp` que o `discordfy` aparece conectado.

### Codex

Acrescente ao `~/.codex/config.toml`:

```toml
[mcp_servers.discordfy]
command = "discordfy"
args = ["mcp"]
```

### OpenCode

Acrescente ao `opencode.json` do projeto ou à configuração global:

```json
{
  "mcp": {
    "discordfy": {
      "type": "local",
      "command": ["discordfy", "mcp"],
      "enabled": true
    }
  }
}
```

### Outros clientes

Editores e clientes que usam `mcpServers` recebem este bloco:

```json
{
  "mcpServers": {
    "discordfy": { "command": "discordfy", "args": ["mcp"] }
  }
}
```

Na TUI, a aba **Overview** mostra esse bloco e copia o texto com a tecla `c`.

## Instale a skill

A skill ensina o agente a escolher o canal, montar a notificação e conferir
o resultado:

```bash
npx skills add promovaweb/discordfy
```

## Teste com um pedido

Peça ao agente, em linguagem natural:

> Liste os canais do Discordfy e envie uma notificação de teste no canal
> time-dev com o título "MCP configurado" e a cor verde.

Depois, use no dia a dia:

> Quando terminar, envie uma notificação no canal time-dev com o que mudou,
> o resultado dos testes e o link do PR.

## O que o agente pode fazer

| Tool | Para quê |
| --- | --- |
| `webhooks_list` | ver os canais cadastrados, sem o token |
| `discord_send` | enviar texto, embeds ou um payload completo para um canal |
| `webhook_test` | conferir se um webhook ainda funciona, sem publicar |
| `webhook_edit` | trocar o nome e o avatar padrão do webhook |

Cadastrar, trocar e remover webhooks continuam com você, no terminal ou na
TUI.

## Se algo der errado

| O que aparece | O que fazer |
| --- | --- |
| o agente não encontra o `discordfy` | confira `discordfy --version` no mesmo terminal e reinicie o agente |
| `No webhook saved for channel` | cadastre o canal com `discordfy webhooks add <canal>` |
| servidor não aparece na lista | rode `discordfy mcp --list` para ver se o binário responde |

A referência completa das tools e dos argumentos está no
[capítulo 6](06-seu-agente-no-discord.md).
