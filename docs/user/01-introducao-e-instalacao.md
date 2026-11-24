# Capítulo 1: Introdução e instalação

O time acompanha o projeto pelo Discord, mas os avisos que importam costumam
ficar no terminal da pessoa que rodou o comando. O deploy terminou às 23h, o build
falhou no meio da revisão, o agente de IA concluiu a migração e ninguém mais
ficou sabendo. O Discordfy existe para levar esse resultado ao canal certo,
com título, cor e campos que a pessoa entende de relance, a partir do
terminal, da CI ou do próprio agente.

## O que o Discordfy faz

O Discord oferece webhooks: cada canal pode ter um endereço que aceita uma
mensagem por HTTP, sem bot e sem login. O endereço carrega um token, então
qualquer pessoa com a URL consegue postar no canal. O Discordfy guarda essas URLs num
cofre cifrado em `~/.discordfy/credentials.json` e associa cada uma a um nome
curto escolhido por você, como `deploys`, `alertas` ou `revisoes`. Daí em
diante, você envia pelo nome:

```bash
discordfy send deploys "Deploy da v1.4.0 concluído"
```

O nome do canal é obrigatório e é o primeiro argumento do `send`. O binário
não tem canal padrão, porque uma mensagem enviada ao destino errado expõe
informação a pessoas de fora daquele assunto. Quando o canal não existe no cofre, o
comando para com exit code 6 e lista os canais conhecidos.

## Três modos no mesmo executável

O `discordfy` é um binário único com três formas de uso. Com argumentos, ele
roda como CLI e responde em texto ou, com `--json`, no envelope
`{ ok, command, data }` que scripts conseguem ler. Sem argumentos, num
terminal interativo, ele abre a TUI com as abas Webhooks, Overview,
Settings, Credentials, Docs e About. Com `discordfy mcp`, ele vira um
servidor Model Context Protocol sobre stdio. O agente de IA passa a enxergar
as tools `webhooks_list`, `webhook_test`, `webhook_edit` e `discord_send`.

Os três modos leem o mesmo cofre. Um canal salvo pelo CLI aparece na TUI e
fica disponível para o agente sem nenhuma configuração extra. Da mesma forma,
uma mudança feita na TUI vale para o próximo `send` no terminal.

## Instalar o binário

A versão 0.1.0 é distribuída de três formas. Escolha a que combina com a
máquina:

| Forma | Comando ou local | Quando usar |
| --- | --- | --- |
| npm | `npm i -g @promovaweb/discordfy` | a máquina já tem Node.js e você quer atualizar pelo npm |
| GitHub Releases | página de releases de `promovaweb/discordfy` | servidor ou CI sem Node.js, com download direto do executável |
| Skill do agente | `npx skills add promovaweb/discordfy` | instalar as instruções de uso no agente de IA, além do binário |

Na página `https://github.com/promovaweb/discordfy/releases`, cada versão traz
um executável por plataforma: `discordfy-linux-x64`, `discordfy-linux-arm64`,
`discordfy-darwin-x64`, `discordfy-darwin-arm64` e
`discordfy-windows-x64.exe`, com o arquivo `SHA256SUMS` para conferir o
download. No Linux, o caminho manual fica assim:

```bash
curl -fsSLO https://github.com/promovaweb/discordfy/releases/download/v0.1.0/discordfy-linux-x64
curl -fsSLO https://github.com/promovaweb/discordfy/releases/download/v0.1.0/SHA256SUMS
sha256sum --check --ignore-missing SHA256SUMS
chmod +x discordfy-linux-x64
sudo mv discordfy-linux-x64 /usr/local/bin/discordfy
```

A linha do `sha256sum` precisa responder `OK` antes de você mover o arquivo.
Uma divergência indica download corrompido ou arquivo trocado no caminho.
Nessa situação, apague o arquivo e baixe de novo, sem colocar o executável no
`PATH`.

## Conferir a instalação

Três comandos confirmam que o binário responde e que a pasta do Discordfy pode
ser criada:

```bash
discordfy --version
discordfy about
discordfy doctor
```

O `--version` imprime `discordfy 0.1.0`. O `about` mostra o executável, o
runtime e a plataforma. O `doctor` confere terminal, permissões de `~/.discordfy/`,
`settings.json`, origem da master key e leitura do cofre, sem gravar nenhum
arquivo. Numa máquina nova, o cofre ainda não existe e o `doctor` informa
isso. O arquivo aparece quando você salva o primeiro webhook, no próximo
capítulo.

## Ajuda embutida

Todo comando aceita `--help`, com a lista de options, exemplos e os exit
codes que ele pode devolver:

```bash
discordfy send --help
discordfy webhooks --help
```

O binário também carrega a documentação completa, escrita para agentes de IA.
O `discordfy --skill` imprime tudo em Markdown. O `discordfy --skill mcp`
imprime só a seção do servidor MCP. Os tópicos aceitos são `cli`, `tui`,
`mcp`, `config`, `exit-codes` e `reference`. Essa documentação viaja dentro do
executável, então um agente consegue ler a versão exata instalada na máquina,
mesmo sem acesso ao repositório.

Com o binário respondendo, o passo seguinte é criar o primeiro webhook no
Discord e guardar a URL no cofre.
