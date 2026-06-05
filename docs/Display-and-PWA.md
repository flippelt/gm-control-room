# Display and PWA

Rota `/display` — tela dedicada para a TV/projetor/tablet apontado pros jogadores.

## Funcionalidades

- **Cena ativa** renderizada em fullscreen (text/color/image/CRT).
- **Lighting overlay** sobreposta (washes, alerta, vinheta).
- **TrackerPanel** lateral durante combate (combatentes + iniciativa).
- **DiceFeed** na borda inferior com últimas rolagens (substitui o antigo popup).
- **Áudio** das camadas tocando aqui (não no painel do mestre).
- **AudioToggle** 🔊 fixo no canto pra ligar/desligar áudio (lembra preferência).
- **HistoryButton** pra abrir histórico completo de rolagens em overlay.

## PWA (Progressive Web App)

`vite-plugin-pwa` gera o service worker e o manifest. O `/display` é instalável como app nativo no iOS/Android/desktop.

### Como instalar

- **iPad/iPhone**: abrir no Safari → Compartilhar → "Adicionar à Tela Inicial".
- **Android Chrome**: aparece banner "Adicionar ao início". Ou: menu → "Instalar app".
- **Desktop**: ícone de install na barra de endereço.

Quando instalado:
- Roda fullscreen, sem chrome do browser.
- Splash screen com ícone d20 (favicon do projeto).
- Funciona offline (assets em cache do SW), mas o estado da sessão precisa do servidor — sem conexão, ele só mostra o último estado em cache.

## Dice Feed

Barra de chat na borda inferior com as **últimas 8 rolagens** (do `rollHistory`). Cada linha:

```
23  | 1d20+5 [18] +5     vantagem · acertou
```

A rolagem **mais recente** ganha pulso de destaque (anel verde-azulado) por ~6s. Sem cobrir a cena, sem bloquear pointer events.

Auto-scroll: lista rola pra mostrar a nova rolagem embaixo.

Mais detalhes em [Dice and Roll History](Dice-and-Roll-History.md).

## Tracker Panel

Lateral direita, visível quando combate está **ativo**. Lista:
- Combatentes em ordem de iniciativa.
- Turno atual destacado.
- Round + número de combatentes.

Não mostra HP/status detalhado pra evitar revelar mecanismo aos jogadores (decisão de design — o painel do mestre tem tudo, o display tem só o que o grupo precisa enxergar).

## Áudio (autoplay policy)

Browsers exigem gesto pra liberar áudio. Primeira visita ao `/display` → estado é "off". Botão 🔊 no canto liga.

Pref salva em `localStorage`. Quando ligado: AudioContext destrava, samples iniciam, layers marcadas como `playing` tocam.

## Modo Idle

Se não há cena ativa (`activeSceneId === null`), o display mostra `scene--idle` (placeholder discreto). Útil pro mestre limpar a tela entre cenas.

## Cores e temas

Cada cena tem seu próprio look. Display não tem tema global — é controlado pela cena ativa + lighting.

Fontes (self-hosted, sem Google Fonts):
- **Special Elite** — typewriter
- **IM Fell English** — scroll/pergaminho
- **Caveat** — handwritten (notas/cards)
- **Monospace** — terminal CRT

## QR code no boot

Quando o servidor sobe, ele printa no console um QR code apontando pra `http://<lan-ip>:4000/display`. Cole o tablet/iPad em qualquer dispositivo → escaneia → instala como PWA.
