# Capítulo 8: Segurança e referência

A URL de um webhook dá a qualquer pessoa o poder de postar no canal com o
nome e o avatar do webhook. Não há senha adicional nem confirmação do lado do
Discord. Uma pessoa que encontra a URL num print, num commit ou num log
consegue publicar avisos falsos de deploy, links maliciosos ou mensagens em nome do
seu projeto. O Discordfy foi desenhado em volta desse fato. As práticas
deste capítulo completam o que o binário já faz.

## O que o binário protege

A URL entra pelo campo sem eco do `webhooks add`, pelo stdin com `--stdin` ou
pelo campo com bolinhas da TUI. Ela não entra como argumento de comando, então
fica fora do histórico do shell e da lista de processos. No disco, ela fica
cifrada com AES-256-GCM em `~/.discordfy/credentials.json`, com permissão
0600.

Nas saídas, o token aparece mascarado no `webhooks list`, no `webhooks show`
e na tabela da TUI. A URL completa só aparece com `--reveal` no CLI ou com a
tecla `v` na TUI. As tools MCP não devolvem a URL em nenhuma resposta. As
mensagens de erro do cliente HTTP também não incluem a URL nem o token. Com
isso, um agente de IA consegue enviar mensagens para todos os canais salvos
sem receber o segredo que dá acesso a eles.

## O que fica com você

Quatro cuidados completam a proteção. Não cole a URL em chat, issue, pull
request ou arquivo versionado, nem para pedir ajuda. Na CI, mantenha a URL e a
master key em secrets do provedor, como no capítulo 7. Use `--reveal` só
quando precisar copiar a URL para outro sistema. Depois, limpe o terminal.
Antes de compartilhar a tela com a TUI aberta, confira se a barra inferior
não mostra `URLs revealed`.

O cofre protege contra leitura casual e cópia de backup, mas um processo que
roda com o seu usuário consegue ler `master.key` e abrir o arquivo. Num
servidor compartilhado, injete a chave pela variável `DISCORDFY_MASTER_KEY` a
partir de um gerenciador de segredos e não grave `master.key` em disco. Para
trocar a chave do cofre, `discordfy credentials rotate-key` gera uma chave
nova, recifra os webhooks e grava o novo `master.key` com permissão 0600.

## Quando a URL vaza

Uma URL exposta deve ser invalidada no Discord, porque apagar a cópia local
não impede que outra pessoa com a URL continue postando. O caminho é o mesmo da
criação: **Editar canal**, **Integrações**, **Webhooks**, selecione o
webhook e escolha **Excluir webhook**. Em seguida, crie um webhook novo,
copie a URL e substitua a antiga no cofre:

```bash
discordfy webhooks add deploys --force
```

Depois da exclusão no Discord, qualquer envio com a URL antiga volta com HTTP
404, inclusive os seus. Atualize também os secrets da CI que guardavam a URL
anterior, ou o próximo job falha com exit code 5.

O `webhooks remove` faz o caminho inverso e apaga só a cópia local. Use esse
comando quando a máquina deixa de enviar para o canal, mas o webhook continua
em uso por outro sistema.

## Preferências do send

Duas chaves do `~/.discordfy/settings.json` definem a identidade padrão das
mensagens enviadas pelo `send`, pela TUI e pela tool `discord_send`:

| Chave | Padrão | Efeito |
| --- | --- | --- |
| `send.username` | vazio | nome exibido quando a mensagem não traz `--username`. Vazio mantém o nome do webhook |
| `send.avatarUrl` | vazio | avatar usado quando a mensagem não traz `--avatar-url`. Vazio mantém o avatar do webhook |

```bash
discordfy config set send.username "Bot da Promovaweb"
discordfy config set send.avatarUrl "https://cdn.discordapp.com/embed/avatars/2.png"
discordfy config get send.username
discordfy config unset send.username
```

A diferença para o `webhooks edit` está no alcance. A preferência vale só
para as mensagens enviadas desta máquina, enquanto o `webhooks edit` altera o
webhook no Discord para qualquer sistema que use a mesma URL. O nome também
não pode conter `discord` ou `clyde`.

O `config list` mostra todas as chaves com o valor em uso. O `config schema`
mostra tipo, padrão e descrição de cada uma. O `config path` imprime a pasta
do Discordfy e os arquivos. As outras chaves cuidam da saída do CLI
(`output.format`, `output.colors`) e da TUI (`tui.initialTab`, `tui.theme`,
`tui.icons`, `tui.motion`, `tui.mouse`).

## Variáveis de ambiente

| Variável | Efeito |
| --- | --- |
| `DISCORDFY_MASTER_KEY` | master key em 64 caracteres hexadecimais, com prioridade sobre `master.key` |
| `DISCORDFY_HOME` | troca a pasta `~/.discordfy/` por outra |
| `NO_COLOR` | desliga as cores da saída de texto, como `--no-color` |

## Exit codes

Todo comando termina com um destes códigos. Com `--json`, o mesmo número
aparece em `error.code`:

| Código | Nome | Quando aparece no Discordfy |
| --- | --- | --- |
| 0 | `SUCCESS` | operação concluída |
| 1 | `GENERIC_ERROR` | falha inesperada, sem classificação |
| 2 | `USAGE` | option inválida, mensagem vazia, limite do Discord estourado, cor ou URL inválida, canal duplicado sem `--force` |
| 3 | `CONFIG` | `settings.json` inválido ou chave desconhecida |
| 4 | `CREDENTIALS` | cofre ilegível, master key ausente ou inválida |
| 5 | `NETWORK_OR_API` | sem rede, webhook apagado (HTTP 401 ou 404), limite de envio (429) ou outra resposta de erro do Discord |
| 6 | `NOT_FOUND` | canal não salvo no cofre, arquivo de payload, embed ou avatar não encontrado |
| 7 | `PERMISSION` | permissão negada em `~/.discordfy/` |
| 8 | `NO_TTY` | a TUI foi aberta fora de um terminal interativo |
| 9 | `MCP` | o servidor MCP não iniciou ou perdeu o stdio |
| 130 | `INTERRUPTED` | confirmação recusada ou processo interrompido |

## Solução de problemas

| Sintoma | Causa provável | O que fazer |
| --- | --- | --- |
| `No webhook saved for channel` com exit 6 | nome digitado diferente do salvo | rode `discordfy webhooks list` e use o nome exato |
| `Discord rejected the webhook (HTTP 404)` | webhook excluído no Discord | crie outro webhook e rode `webhooks add <canal> --force` |
| `This is not a Discord webhook URL` | URL incompleta ou de outro domínio | copie de novo pelo botão **Copiar URL do webhook** |
| `already has a webhook` com exit 2 | o canal já existe no cofre | acrescente `--force` para substituir |
| `Discord rejects usernames containing "discord" or "clyde"` | nome proibido em `--username`, `send.username` ou `--name` | escolha outro nome |
| `Discord rate limit: try again in Ns` | mais de 30 envios por minuto no mesmo webhook | espere o tempo indicado e espace os envios |
| `has N characters; Discord accepts up to M` | texto acima do limite do campo | resuma ou divida em mais mensagens |
| `An embed needs at least a title, description...` | só cor, rodapé ou miniatura foram informados | acrescente `--title` ou `--description` |
| `Option --payload requires a value` | `--payload` sem o nome do arquivo | informe o arquivo ou `-` para ler o stdin |
| `No master key found` com exit 4 | `master.key` ausente e variável não definida | defina `DISCORDFY_MASTER_KEY` com a chave usada na criação do cofre |
| TUI encerra com exit 8 | comando rodou sem terminal interativo | use o CLI em scripts e a TUI só no terminal |
| Imagem não aparece no embed | URL local, privada ou sem `https` | publique a imagem num endereço acessível pelo Discord |

Quando o sintoma não está na tabela, `discordfy doctor` confere a instalação
sem alterar arquivos. O `discordfy webhooks test <canal>` separa um problema
de webhook de um problema de mensagem. Com os dois verdes, rode o envio com
`--dry-run` e confira o JSON montado.

O código, as notas de versão e as issues ficam em
`https://github.com/promovaweb/discordfy`. Este guia também fica disponível
no repositório, em `https://github.com/promovaweb/discordfy/tree/main/docs/user`.
A apresentação do produto fica no portal `https://promovaweb.com/discordfy/`.
