# assets/

Coloque aqui os arquivos da campanha — mapas, handouts, retratos de NPC,
áudios. O servidor os serve em `/assets/<arquivo>`.

Nas cenas, referencie por caminho absoluto a partir de `/assets`, ex.:

```ts
{ kind: 'image', src: '/assets/arkham-map.svg', alt: 'Mapa de Arkham' }
```

`arkham-map.svg` é um placeholder de exemplo usado pela campanha de demonstração.
