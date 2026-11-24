# MCP

`{{bin}} mcp` transforma o processo em um servidor Model Context Protocol
sobre stdio. Nada mais é escrito em stdout; diagnósticos vão para stderr.

## Configuração no cliente

```json
{
  "mcpServers": {
    "{{bin}}": { "command": "{{bin}}", "args": ["mcp"] }
  }
}
```

Para o Claude Code: `claude mcp add {{bin}} -- {{bin}} mcp`.
Para desenvolvimento, sem compilar: `"command": "bun", "args": ["run", "src/main.ts", "mcp"]`.

## Tools do Discordfy

| Tool | Entrada | Saída |
| --- | --- | --- |
| `webhooks_list` | nenhuma | `{ count, webhooks: [{ channel, id, masked }] }`, sem token |
| `webhook_test` | `channel` | `{ channel, ok, webhook: { id, name, channel_id, guild_id } }`; confere sem postar |
| `webhook_edit` | `channel`, `name?`, `avatar_url?`, `remove_avatar?` | muda o nome e o avatar padrão do webhook no Discord |
| `discord_send` | `channel` e os campos abaixo | `{ channel, sent, message: { id, channel_id, timestamp } }` ou `{ dryRun, payload }` |

`discord_send` exige `channel`, o nome salvo pelo CLI. Os demais campos são
opcionais e espelham as options de `send`: `content`, `title`, `description`,
`url`, `color` (nome, `#RRGGBB` ou decimal), `fields` (`[{ name, value,
inline? }]`), `author` (`{ name, url?, icon_url? }`), `footer` (`{ text,
icon_url? }`), `image`, `thumbnail`, `timestamp` (`now` ou ISO 8601),
`embeds` (objetos de embed crus), `username`, `avatar_url`, `tts`,
`thread_id`, `thread_name`, `silent`, `suppress_embeds`, `allow_mentions`,
`payload` (corpo completo do webhook, aceita `embed` no singular) e
`dry_run`. Os limites do Discord são conferidos antes da chamada; um erro
volta com `isError: true` e `{ error: { code, name, message, details } }`.

Nenhuma tool devolve a URL do webhook nem o token. Cadastrar, trocar,
renomear e remover webhooks ficam no CLI e na TUI, onde a pessoa cola o
segredo.

## Tools do esqueleto

| Tool | Entrada | Saída |
| --- | --- | --- |
| `doctor` | nenhuma | `{ checks, ok }`; `isError: true` se houver `fail` |
| `about` | nenhuma | identity, runtime, platform, data directory e credits |
| `exit_codes` | nenhuma | tabela de exit codes |
| `skill` | `topic?` (`cli`, `tui`, `mcp`, `config`, `exit-codes`, `reference`) | documentação em Markdown |
| `config_list` | nenhuma | keys de settings.json em vigor e o schema |
| `config_get` | `key` | valor da key; `isError` quando não existe |
| `credentials_status` | nenhuma | file, master key source, count e names |

Nenhuma tool devolve o valor de uma credencial. As tools do esqueleto não
gravam; a configuração continua no CLI, onde há confirmação humana.

## Resources

| URI | Conteúdo |
| --- | --- |
| `{{bin}}://about` | identity em JSON |
| `{{bin}}://exit-codes` | exit codes em JSON |
| `{{bin}}://skill` | documentação completa em Markdown |
| `{{bin}}://skill/{topic}` | uma seção; o template lista os topics |

## Prompts

| Prompt | Arguments | Função |
| --- | --- | --- |
| `operate` | `task` | instrui o agente a ler `skill cli` e executar a task pelo CLI com `--json` |

## Listar sem iniciar

```bash
{{bin}} mcp --list
{{bin}} mcp --list --json
```

## Testar

```bash
npx @modelcontextprotocol/inspector {{bin}} mcp
```

O Inspector abre uma página local para chamar tools, ler resources e
inspecionar as mensagens JSON-RPC.

## Como adicionar uma tool

1. Copie `template/tool/example.ts` para `src/mcp/tools/<name>.ts`.
2. Declare `inputSchema` com Zod e descreva cada campo com `.describe()`. A
   description da tool diz quando usar e o que ela devolve.
3. Devolva `content` em texto e, quando a saída for estruturada,
   `structuredContent` com o mesmo objeto.
4. Acrescente a tool ao `catalog.tools` para que `mcp --list` a enxergue.
5. Registre a função em `registerAll` em `src/mcp/server.ts`.
6. Teste com o Inspector e com `bun test`.

Nomes de tools usam `snake_case`. Tools que gravam ou chamam APIs externas
precisam dizer isso na description e nunca devem ecoar segredos na resposta.

A tool `doctor` usa a mesma coleta do command CLI: confere runtime, terminal,
permissões da pasta, settings, origem da chave e leitura do cofre. Não grava
arquivos e não retorna valores de credenciais. Cada check traz `name`,
`status` (`ok`, `warn` ou `fail`) e `detail`.
