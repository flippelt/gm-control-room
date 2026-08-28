# Política de segurança

## Reportar vulnerabilidade

Use o canal privado do GitHub:
[**abrir um security advisory**](https://github.com/flippelt/gm-control-room/security/advisories/new).

Não abra *issue pública* para problemas de segurança — vulnerabilidades são
tratadas em advisory privado até haver patch.

Você receberá uma resposta em até **7 dias corridos**.

## Escopo

O GM Control Room é um app **self-hosted** (Node + React + Socket.io). Vetores
relevantes:

- **XSS nas cenas / notas / nomes** renderizados no `/display` (TV dos jogadores).
  Trate texto de campanha como não-confiável: não use `dangerouslySetInnerHTML`
  com conteúdo do JSON da campanha.
- **Socket.io**: qualquer cliente na LAN que conheça a URL fala com o servidor.
  Não exponha a porta na internet sem um reverse proxy e autenticação sua.
- **Spotify OAuth**: tokens ficam no servidor (`.env` / sessão). Não commite
  `.env`. Rotacione o client secret se vazar.
- **Pasta de assets local**: o atalho "abrir pasta" lê o disco da máquina do
  mestre. Isso é intencional e só existe no host.

Sistemas RPG vêm de [`@lippelt/srd-*`](https://github.com/flippelt/gmcr-srd-systems).
Bug de regra/rolagem num pacote SRD: reporte **naquele** repositório.

## Fora de escopo

- Ataques que exigem a máquina do mestre já comprometida.
- Campanhas/conteúdo de mesa versionados em forks privados.

## Dependências

Dependabot abre PRs de segurança. Não force override de transitives sem checar
se o `npm audit` da própria `main` já está vermelho (armadilha do gate
`--audit-level=high`).
