# Instalação, MCP e skill

## Conferir se já está instalado

```bash
discordfy --version
```

Resposta esperada: `discordfy <versão>`. Comando ausente significa que o
binário não está no `PATH`.

## Instalar o binário

Pelo npm (Node 18.17 ou superior). O pacote é um wrapper: o binário da
plataforma vem da GitHub Release da mesma versão, com o hash conferido no
`SHA256SUMS`, e fica em `~/.discordfy/bin/v<versão>/`. O download
acontece em dois momentos: no `postinstall` do npm e, se ainda faltar, na
primeira execução do comando.

```bash
npm i -g @promovaweb/discordfy
discordfy --version
```

Quando o npm não roda os scripts de instalação (`--ignore-scripts`) ou o
`postinstall` não consegue baixar, nada precisa ser feito: a primeira
execução baixa o binário e mostra o progresso no stderr.

Sem npm, baixe o executável em
<https://github.com/promovaweb/discordfy/releases/latest>:
`discordfy-linux-x64`, `discordfy-linux-arm64`, `discordfy-darwin-x64`,
`discordfy-darwin-arm64` ou `discordfy-windows-x64.exe`. Confira o hash no
`SHA256SUMS`, dê permissão de execução e coloque no `PATH`:

```bash
curl -fsSLO https://github.com/promovaweb/discordfy/releases/latest/download/discordfy-linux-x64
curl -fsSLO https://github.com/promovaweb/discordfy/releases/latest/download/SHA256SUMS
grep discordfy-linux-x64 SHA256SUMS | sha256sum -c -
mkdir -p ~/.local/bin
chmod +x discordfy-linux-x64 && mv discordfy-linux-x64 ~/.local/bin/discordfy
```

Instalar software na máquina da pessoa pede a autorização dela. Ofereça os
comandos e rode só com o aceite.

## Configurar o servidor MCP

O servidor roda com `discordfy mcp`, via stdio, e lê o mesmo cofre do CLI.

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

OpenCode (`opencode.json` do projeto ou global):

```json
{
  "mcp": {
    "discordfy": { "type": "local", "command": ["discordfy", "mcp"], "enabled": true }
  }
}
```

Cursor, Gemini CLI e outros clientes com `mcpServers`:

```json
{ "mcpServers": { "discordfy": { "command": "discordfy", "args": ["mcp"] } } }
```

A aba Overview da TUI mostra esse bloco e copia com a tecla `c`.

Para conferir o que o servidor expõe sem abrir um cliente:

```bash
discordfy mcp --list
```

A lista traz as tools `webhooks_list`, `webhook_test`, `webhook_edit`,
`discord_send`, as tools de base (`about`, `exit_codes`, `skill`,
`config_list`, `config_get`, `credentials_status`, `doctor`), os resources
`discordfy://about`, `discordfy://exit-codes`, `discordfy://skill` e o
template `discordfy://skill/{topic}` (topics `cli`, `tui`, `mcp`,
`config`, `exit-codes`, `reference`), e o prompt `operate(task)`, que
devolve instruções para executar a tarefa pelo CLI (ver `mcp.md`). Depois de mudar a configuração, o cliente precisa ser
reiniciado ou recarregar os servidores.

## Instalar esta skill

```bash
npx skills add promovaweb/discordfy
```

Para escolher os agentes, acrescente `-a claude-code -a codex -a opencode`;
para instalar no usuário em vez do projeto, acrescente `-g`.

## Conferir o ambiente

```bash
discordfy doctor
```

O `doctor` confere runtime, terminal, pasta `~/.discordfy/`, settings, chave
mestra e cofre. Pelo MCP, a tool `doctor` devolve os mesmos checks.

## Onde ficam os dados

| Caminho | Conteúdo |
| --- | --- |
| `~/.discordfy/credentials.json` | cofre AES-256-GCM com os webhooks (`webhook.<canal>`) |
| `~/.discordfy/master.key` | chave mestra, criada na primeira gravação, modo 0600 |
| `~/.discordfy/settings.json` | preferências (`send.*`, `output.*`, `tui.*`, `telemetry.enabled`) |

A variável `DISCORDFY_HOME` troca a pasta. `DISCORDFY_MASTER_KEY` (64
caracteres hexadecimais) fornece a chave mestra sem arquivo, útil em CI.

## Configurações

`discordfy config list --json` mostra toda key com o valor efetivo (a tool
`config_list` faz o mesmo). As keys atuais:

| Key | Padrão | Efeito |
| --- | --- | --- |
| `send.username` | vazio | nome padrão das notificações |
| `send.avatarUrl` | vazio | avatar padrão das notificações |
| `output.format` | `text` | `json` faz toda saída sair no envelope JSON, sem repetir `--json` |
| `output.colors` | `true` | cores ANSI na saída de texto |
| `telemetry.enabled` | `false` | telemetria |
| `tui.theme`, `tui.icons`, `tui.initialTab`, `tui.motion`, `tui.mouse` | variados | aparência e comportamento da TUI |

```bash
discordfy config set output.format json
discordfy config get output.format --json
```

Para descobrir a árvore completa de commands e options da versão
instalada, use `discordfy --opencli` (JSON) ou `discordfy <command> --help`.
