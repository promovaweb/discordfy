# Changelog

Formato baseado em Keep a Changelog. Versões seguem SemVer.

## [0.1.1] - 2026-11-24

### Alterado

- Posicionamento: o Discordfy se apresenta como sistema de notificações
  ricas para o Discord, não como bot. README, guia, ebook, descrição dos
  pacotes e capa trocam "Seu agente fala com o time" por "Notificações
  ricas no Discord, no canal certo".
- Os links do site apontam para o portal `https://promovaweb.com/discordfy/`
  e a documentação aponta para o Guia do Usuário no repositório.

### Corrigido

- `send --payload -` lê o stdin: o parser aceita o `-` isolado como valor
  de option.

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
- Options repetíveis no parser (`--field`, `--inline-field`, `--embed`).
- Identidade visual própria em `brand/`, wrapper npm `@promovaweb/discordfy`
  e Guia do Usuário em PDF e EPUB.
- Licença GNU AGPL 3.0.
