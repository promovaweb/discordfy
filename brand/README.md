# Marca Discordfy

O Discordfy envia mensagens com embeds para canais do Discord por webhook, pela CLI, TUI ou MCP.

## Conceito visual

O contorno branco do Discord envolve um sino amarelo no lugar do rosto. Dois arcos sugerem a vibração do sino. Um badge vermelho com ponto branco marca a notificação. A placa Blurple identifica o serviço de destino, e o sino representa a notificação que chega ao canal. As assinaturas trazem o nome Discordfy em curvas de Manrope 750.

O glifo do Discord é marca da Discord Inc. O SVG usa o path do [Simple Icons 16.38.1](https://cdn.jsdelivr.net/npm/simple-icons@16.38.1/icons/discord.svg), com escala uniforme, traço sem preenchimento e máscara sobre os olhos.

## Arquivos oficiais

| Arquivo | Uso |
| --- | --- |
| `logo/icon.svg` | ícone principal com placa Blurple |
| `logo/icon-light.svg` | ícone transparente sobre fundo claro |
| `logo/icon-dark.svg` | ícone transparente sobre fundo escuro |
| `logo/logo-light.svg` | assinatura horizontal sobre fundo claro |
| `logo/logo-dark.svg` | assinatura horizontal sobre fundo escuro |
| `logo/icon.png` | fallback raster de 512 × 512 px |
| `logo/icon-light.png`, `logo/icon-dark.png` | fallbacks raster de 512 × 512 px |
| `logo/logo-light.png`, `logo/logo-dark.png` | fallbacks raster de 1300 × 339 px |
| `logo/icon-16w.png` a `logo/icon-512w.png` | favicons e ícones de aplicativo |

Use a variante correspondente ao fundo. Preserve 12,5% de área livre ao redor
do ativo. O tamanho mínimo é 16 px para o favicon, 24 px para os demais usos do ícone e 140 px para a assinatura.
O nome da assinatura está convertido em curvas (Manrope 750) e não depende da
fonte instalada.

## Sistema digital

- `colors/palette.json`: fonte editável da paleta;
- `tokens.json`: tokens agnósticos;
- `global.css`: webfontes, variáveis CSS e troca de tema;
- `tailwind-theme.js`: extensão para Tailwind CSS;
- `accessibility.md`: relatório de contraste;
- `typography/README.md`: hierarquia tipográfica;
- `manifest.json`: dimensão, função e hash de cada arquivo de logo;
- `style-guide.html`: guia visual com logo e paleta.

Para recompilar os tokens depois de editar a paleta, rode o gerador do
[Brandfy](https://github.com/promovaweb/brandfy):

```bash
node <brandfy>/skills/brandfy-design-tokens/scripts/generate-tokens.mjs \
  --input brand/colors/palette.json --output brand
```

## Regras para agentes

1. Use os ativos desta pasta sem redesenhá-los.
2. Use contorno branco e sino amarelo (#FEE75C) na placa Blurple.
3. Estado nunca depende apenas de cor: inclua texto, ícone ou posição.
4. Use tokens semânticos e a variante correta para light ou dark mode.
5. Sobre fundo claro, use o glifo em Blurple e a borda do sino em petróleo (#00161E). Sobre fundo escuro, use o glifo em branco. O sino mantém o amarelo nas duas variantes.
6. Não aplique filtros, gradientes, sombras, rotações ou deformações.
