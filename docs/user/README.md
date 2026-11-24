# Discordfy · Guia do Usuário

![Logo do Discordfy](../../brand/logo/icon.png)

O Discordfy é um sistema de notificações ricas para o Discord. Ele guarda os
webhooks dos canais do seu servidor e envia notificações para eles pelo nome
do canal. Não é um bot: não lê nem responde mensagens, só publica. O mesmo binário funciona como CLI no
terminal, como TUI com atalhos de teclado e como servidor MCP para o agente de
IA que trabalha com você. Quando o agente termina um deploy, revisa um pull
request ou encontra uma falha no build, ele envia uma notificação ao canal certo
com um embed legível, sem que você copie e cole nada.

Este guia acompanha a edição 0.1.1. Os exemplos usam comandos reais do
binário. Cada option citada existe no `discordfy --help` da mesma versão.

## Leia online ou como ebook

Os capítulos deste diretório também formam o ebook
**Discordfy · Guia do Usuário**. O PDF preserva a diagramação para leitura e
impressão. O EPUB deixa você ajustar fonte e tamanho no leitor digital.

- [Baixe o PDF](../../ebook/Discordfy-Guia-do-Usuario-v0.1.1.pdf).
- [Baixe o EPUB](../../ebook/Discordfy-Guia-do-Usuario-v0.1.1.epub).
- [Consulte a edição e os hashes](../../ebook/README.md).

## Percurso

Leia na ordem na primeira vez. Depois, cada capítulo funciona como consulta:

1. [Introdução e instalação](01-introducao-e-instalacao.md)
2. [Canais e webhooks](02-canais-e-webhooks.md)
3. [Primeira mensagem](03-primeira-mensagem.md)
4. [Mensagens ricas com embeds](04-mensagens-ricas-com-embeds.md)
5. [Payload completo](05-payload-completo.md)
6. [Seu agente no Discord](06-seu-agente-no-discord.md)
7. [Automações](07-automacoes.md)
8. [Segurança e referência](08-seguranca-e-referencia.md)

Os capítulos 1 a 3 levam você da instalação à primeira mensagem no canal. Os
capítulos 4 e 5 cobrem cada elemento visual que o Discord aceita num webhook.
O capítulo 6 liga o binário ao agente de IA. O 7 coloca o envio na CI, em
hooks do Git e no cron. O 8 reúne segurança, exit codes e solução de
problemas.

## Onde encontrar o projeto

O código, os binários e as notas de cada versão ficam no repositório
`https://github.com/promovaweb/discordfy`, publicado sob a licença GNU AGPL
3.0. A versão online deste guia fica em
`https://github.com/promovaweb/discordfy/tree/main/docs/user`. A apresentação
do produto fica no portal `https://promovaweb.com/discordfy/`.
