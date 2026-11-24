# Changelog

Formato baseado em Keep a Changelog. Versões seguem SemVer.

## [0.1.4] - 2026-11-24

### Alterado

- Skill `discordfy` reescrita: um arquivo principal com o fluxo (leitura
  prévia, regras, passos, marcos e saída) e oito referências (instalação,
  webhooks, mensagens, payload, MCP, receitas, automações e erros), revisada
  contra o binário por uma auditoria independente.
- Composição única para `--payload` e para o `payload` do MCP: nome e
  avatar da option, depois do arquivo e por último dos padrões locais;
  flags somadas; embeds acrescentados; opção de embed sem conteúdo próprio
  passa a ser recusada em vez de ignorada.

### Corrigido

- Um payload não liga mais menções sem `--allow-mentions`; com a flag, o
  `allowed_mentions` do payload prevalece e pode restringir a cargos.
- O argumento `embeds` do MCP passa pela mesma normalização do CLI.
- O `dry_run` do MCP confere o nome do canal e devolve `threadId`.
- `webhook_edit` recusa `avatar_url` junto com `remove_avatar`, e o erro de
  download do avatar não repete a URL.
- `webhooks rename` informa os canais conhecidos quando o canal não existe.
- Mensagens específicas para payload com JSON inválido, que não seja objeto
  ou com `embeds` fora de lista.

## [0.1.3] - 2026-11-24

### Alterado

- Ícone com composição mais rica: sino amarelo maior, ondas de vibração e
  selo vermelho de notificação dentro do contorno do logo do Discord, em
  todas as variantes, assinaturas e no ebook.

## [0.1.2] - 2026-11-24

### Alterado

- Identidade visual nova: contorno do logo do Discord sobre placa Blurple com
  um sino de notificação amarelo no centro, em todos os ícones, assinaturas,
  tokens e no ebook.
- README com o selo "Feito para Discord".

### Adicionado

- Guias rápidos no Guia do Usuário: "Como obter o webhook do Discord" e
  "Configurar o MCP no seu agente", também no ebook.

## [0.1.1] - 2026-11-24

### Alterado

- Posicionamento: o Discordfy se apresenta como sistema de notificações
  ricas para o Discord, não como bot. README, guia, ebook, descrição dos
  pacotes e capa trocam "Seu agente fala com o time" por "Notificações
  ricas no Discord, no canal certo".
- Os links do site apontam para o portal `https://promovaweb.com/discordfy/`
  e a documentação aponta para o Guia do Usuário no repositório.

## [0.1.0] - 2026-11-24

Primeira versão do Discordfy, criada a partir do Termfy Starter Kit 0.13.4.

### Adicionado

- Webhooks por canal: `webhooks add|list|show|test|edit|rename|remove`, com a
  URL cifrada no cofre (`webhook.<channel>`), lida sem eco ou por stdin,
  conferida no Discord antes de salvar e mascarada nas listagens.
- `send <channel>`: o canal é sempre obrigatório. Texto, embed completo
  (título e link, descrição, cor por nome, hex ou decimal, autor com link e
  ícone, campos empilhados e lado a lado, imagem, miniatura, rodapé com
  ícone e horário), embeds extras com `--embed`, nome e avatar da mensagem,
  `--tts`, `--silent`, `--suppress-embeds`, tópico, post de fórum,
  `--payload` completo (aceita o formato antigo `embed` do Embed Visualizer),
  `--dry-run` e menções desligadas por padrão. Limites do Discord conferidos
  antes do envio; HTTP 429 curto repetido uma vez.
- `webhooks edit`: muda o nome e o avatar padrão do webhook no Discord.
- TUI com a aba Webhooks (canal e endereço, `v` revela, `a` cadastra, `s`
  envia, `t` testa, `d` remove) e o design system da TUI do Specsfy.
- Servidor MCP com as tools `webhooks_list`, `webhook_test`, `webhook_edit`
  e `discord_send`, que aceita o payload completo. Nenhuma devolve o token.
- Skill `discordfy` com referências de mensagens e automações.
- Keys `send.username` e `send.avatarUrl`; `tui.initialTab` passa a abrir em
  `webhooks`.
- Options repetíveis no parser (`--field`, `--inline-field`, `--embed`) e
  `-` isolado aceito como valor (`--payload -` lê o stdin).
- Identidade visual própria em `brand/`, wrapper npm `@promovaweb/discordfy`
  e Guia do Usuário em PDF e EPUB.
- Licença GNU AGPL 3.0.
