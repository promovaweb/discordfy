# Capítulo 6: Seu agente no Discord

O agente de IA trabalha no seu terminal durante minutos ou horas: roda a
suíte de testes, aplica uma migração, revisa um pull request. Quando ele
termina, o resultado fica na janela do agente. O time só descobre quando uma
pessoa pergunta no canal. Com o Discordfy ligado por MCP, o agente posta o resumo no
canal do time ao concluir a tarefa, com o mesmo embed que você montaria à mão.

## Ligar o servidor MCP

O `discordfy mcp` inicia um servidor Model Context Protocol sobre stdio. O
cliente do agente abre o processo, conversa por JSON-RPC na entrada e na
saída padrão e encerra o processo ao fechar a sessão. Você registra o
comando uma vez em cada agente.

No Claude Code, um comando registra o servidor:

```bash
claude mcp add discordfy -- discordfy mcp
```

No Codex, o servidor entra em `~/.codex/config.toml`:

```toml
[mcp_servers.discordfy]
command = "discordfy"
args = ["mcp"]
```

No OpenCode, o servidor entra no `opencode.json` do projeto ou na
configuração global, na seção `mcp`:

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

Clientes que usam o formato `mcpServers`, comum em editores, recebem o mesmo
comando:

```json
{
  "mcpServers": {
    "discordfy": { "command": "discordfy", "args": ["mcp"] }
  }
}
```

A aba Overview da TUI mostra esse bloco pronto e copia o texto para a área de
transferência com a tecla `c`. Para conferir o que o servidor expõe sem abrir
um agente, rode
`discordfy mcp --list`. A saída mostra as tools, os resources e o prompt da
versão instalada.

## As tools de Discord

Quatro tools cuidam dos canais e das mensagens. Nenhuma delas devolve a URL
do webhook ou o token. Adicionar, substituir e remover webhooks continua
restrito ao CLI e à TUI, onde uma pessoa cola a URL. O agente usa os canais
que você salvou. Para mandar mensagens a um webhook novo, ele depende de você
salvar o canal antes.

| Tool | Entrada | Resultado |
| --- | --- | --- |
| `webhooks_list` | nenhuma | canais salvos, com id do webhook e endereço mascarado |
| `webhook_test` | `channel` | nome do webhook, id do canal e id do servidor, sem postar |
| `webhook_edit` | `channel`, `name`, `avatar_url`, `remove_avatar` | novo nome ou avatar padrão do webhook no Discord |
| `discord_send` | `channel` e os campos da mensagem | id, canal e data da mensagem criada |

O `webhooks_list` é a primeira chamada quando o agente não sabe qual canal
usar. O `webhook_test` diagnostica um envio que falhou, da mesma forma que o
`webhooks test` do CLI. O `webhook_edit` aceita avatar só por URL http(s) de
uma imagem PNG, JPEG ou GIF, porque o agente não deve ler arquivos locais
para isso.

## Os argumentos do discord_send

O `discord_send` exige `channel` e aceita os mesmos elementos do `send` do
CLI, com os nomes do JSON:

| Argumento | Equivale a |
| --- | --- |
| `content` | texto da mensagem |
| `title`, `url`, `description`, `color` | `--title`, `--url`, `--description`, `--color` |
| `fields` | lista de `{ name, value, inline }` |
| `author` | `{ name, url, icon_url }` |
| `footer` | `{ text, icon_url }` |
| `image`, `thumbnail`, `timestamp` | `--image`, `--thumbnail`, `--timestamp` |
| `embeds` | embeds extras, como o `--embed` |
| `username`, `avatar_url`, `tts` | `--username`, `--avatar-url`, `--tts` |
| `thread_id`, `thread_name` | `--thread-id`, `--thread-name` |
| `silent`, `suppress_embeds`, `allow_mentions` | `--silent`, `--suppress-embeds`, `--allow-mentions` |
| `payload` | corpo completo, como o `--payload` |
| `dry_run` | `--dry-run` |

Uma chamada típica, ao fim de um deploy, chega ao servidor com estes
argumentos:

```json
{
  "channel": "deploys",
  "title": "Deploy v1.4.0 em produção",
  "description": "Migração 0042 aplicada. Testes de fumaça passaram.",
  "color": "green",
  "fields": [
    { "name": "Branch", "value": "main", "inline": true },
    { "name": "Tempo", "value": "42s", "inline": true }
  ],
  "footer": { "text": "Claude Code" },
  "timestamp": "now"
}
```

O argumento `payload` recebe um corpo inteiro, inclusive a exportação do
Embed Visualizer do capítulo 5. Os demais argumentos se combinam com ele
pelas mesmas regras do CLI. Os padrões `send.username` e `send.avatarUrl`
também valem para o agente. As menções ficam desligadas, a não ser que o
agente envie `allow_mentions` como `true`.

Peça ao agente que use `dry_run` na primeira mensagem de um formato novo. Ele
recebe o JSON montado, confere o resultado com você e só então envia de
verdade. Uma falha volta com `isError` e o objeto `error` com `code`, `name` e
`message`, os mesmos exit codes do CLI.

## Como pedir ao agente

O agente decide usar a tool a partir do que você escreve. Um pedido com
canal, momento e conteúdo produz mensagens previsíveis:

```text
Rode a suíte de testes e aplique a migração 0042. Ao terminar, avise no canal
deploys com um embed: verde se tudo passou, vermelho se algo falhou, com a
branch e o tempo total em campos lado a lado. Em caso de falha, coloque as
três primeiras linhas do erro na descrição.
```

Para uma rotina que se repete, registre a instrução no arquivo de
instruções do projeto, como `AGENTS.md` ou `CLAUDE.md`. Uma linha dizendo
quais canais existem e o que vai para cada um evita que o agente poste um
relatório de testes no canal de incidentes.

## A skill do Discordfy

A skill é um pacote de instruções que o agente carrega quando o pedido
envolve avisar, notificar ou postar algo no Discord. Ela ensina a preferir as
tools quando o MCP está configurado e o CLI com `--json` nos demais casos, a
confirmar o canal quando houver mais de um candidato e a montar o embed com
cor de sucesso, pendência ou falha. Ela também orienta o agente a não pedir a
URL do webhook no chat: quando o canal não existe, ele pede que você rode
`discordfy webhooks add <canal>` no seu terminal. Instale nos agentes da
máquina com:

```bash
npx skills add promovaweb/discordfy
```

A skill é uma só, `discordfy`, com um arquivo principal e oito referências
que o agente abre conforme a tarefa:

| Referência | Assunto |
| --- | --- |
| `instalacao.md` | binário, MCP nos clientes e a própria skill |
| `webhooks.md` | criar o webhook no Discord, cadastrar, testar, editar e trocar uma URL vazada |
| `mensagens.md` | cada elemento da notificação e os limites do Discord |
| `payload.md` | JSON pronto, vários embeds, tópicos e fóruns |
| `mcp.md` | argumentos e respostas de cada tool |
| `receitas.md` | modelos de deploy, falha, release, PR, incidente, relatório e tarefa concluída |
| `automacoes.md` | GitHub Actions, GitLab CI, hooks do Git, cron e scripts |
| `erros.md` | exit codes, mensagens de erro e diagnóstico |

A skill complementa o servidor MCP. Sem MCP configurado, o agente ainda
consegue usar o Discordfy pelo terminal, chamando `discordfy send` com
`--json` e lendo o envelope de resposta. Com os dois instalados, ele tem as
tools e as instruções de uso no mesmo lugar.

## As demais tools, resources e prompt

O servidor também expõe tools de diagnóstico e documentação, todas apenas de
leitura. O `doctor` confere runtime, permissões, `settings.json`, origem da
chave e leitura do cofre. O `credentials_status` mostra os nomes salvos e a
origem da master key, sem valores. O `config_list` e o `config_get` leem as
preferências, o `about` informa versão e plataforma, o `exit_codes` devolve a
tabela de códigos e o `skill` devolve a documentação embutida, inteira ou por
tópico.

Os resources `discordfy://about`, `discordfy://exit-codes`,
`discordfy://skill` e `discordfy://skill/{topic}` oferecem as mesmas
informações para clientes que leem resources. O prompt `operate` recebe uma
tarefa e orienta o agente a ler a documentação do CLI e executar o trabalho
pelo terminal com `--json`.

Para inspecionar o servidor sem um agente, o MCP Inspector abre uma página
local com as tools e as mensagens JSON-RPC:

```bash
npx @modelcontextprotocol/inspector discordfy mcp
```
