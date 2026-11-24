# Guia rápido: como obter o webhook do Discord

O webhook é o endereço que deixa o Discordfy publicar notificações num canal.
Ele é criado no próprio Discord, uma vez por canal, e leva menos de um minuto.

## Antes de começar

- Você precisa da permissão **Gerenciar Webhooks** no servidor. Donos e
  administradores já têm. Se a engrenagem do canal não mostrar
  **Integrações**, peça essa permissão a quem administra o servidor.
- Funciona no Discord do navegador, do desktop e do celular. Os passos abaixo
  seguem o desktop.

## Passo a passo

1. Abra o servidor e passe o mouse sobre o canal de texto que vai receber as
   notificações, por exemplo `# deploys`.
2. Clique na engrenagem **Editar canal**.
3. No menu da esquerda, clique em **Integrações**.
4. Clique em **Webhooks** e depois em **Novo webhook**.
5. Clique no webhook criado. Troque o nome pelo que deve aparecer nas
   notificações (por exemplo, `Deploys`) e, se quiser, envie um avatar.
6. Confira se o campo **Canal** mostra o canal certo.
7. Clique em **Copiar URL do webhook**.

Na interface em inglês, o caminho é **Edit Channel**, **Integrations**,
**Webhooks**, **New Webhook** e **Copy Webhook URL**.

## Salvar no Discordfy

No terminal, cadastre o canal com um nome curto e cole a URL quando o
Discordfy pedir. A digitação fica escondida e o webhook é conferido no
Discord antes de salvar:

```bash
discordfy webhooks add deploys
```

Pela TUI, abra `discordfy`, fique na aba **Webhooks**, aperte `a`, digite o
nome do canal e cole a URL.

Teste sem publicar nada:

```bash
discordfy webhooks test deploys
```

E envie a primeira notificação:

```bash
discordfy send deploys "Discordfy configurado"
```

## Cuide da URL como de uma senha

Quem tiver a URL completa consegue publicar no canal. Não cole a URL em
chat, issue, commit ou arquivo do projeto. Se ela vazar:

1. No Discord, volte a **Editar canal**, **Integrações**, **Webhooks** e
   exclua o webhook, ou crie um novo.
2. Copie a URL nova e substitua no Discordfy:

   ```bash
   discordfy webhooks add deploys --force
   ```

## Se algo der errado

| O que aparece | O que fazer |
| --- | --- |
| Não existe **Integrações** no canal | peça a permissão **Gerenciar Webhooks** |
| `This is not a Discord webhook URL` | copie de novo pelo botão **Copiar URL do webhook** |
| `Discord rejected the webhook (HTTP 404...)` | o webhook foi excluído; crie outro e use `--force` |
| `already has a webhook` | o canal já existe; use `--force` para trocar |

Os detalhes de listar, editar, renomear e remover estão no
[capítulo 2](02-canais-e-webhooks.md).
