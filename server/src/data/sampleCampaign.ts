import type { Campaign } from '@gmcr/shared'

/**
 * Campanha de exemplo (Fase 1). Cenário de horror cósmico nos anos 1920 — por
 * isso o tratamento CRT fica BLOQUEADO pela regra de anacronismo (ver
 * isCrtAllowed em @gmcr/shared). A cena "Transmissão (CRT)" existe de propósito
 * para demonstrar o gating no painel de controle.
 *
 * Na Fase 6 a campanha passa a ser carregada de um arquivo JSON.
 */
export const sampleCampaign: Campaign = {
  id: 'arkham-1923',
  title: 'O Chamado em Arkham',
  genre: 'cosmic-horror',
  era: { startYear: 1923, label: 'Anos 1920' },
  scenes: [
    {
      id: 'carta',
      name: 'A carta',
      treatment: {
        kind: 'text',
        text:
          'Boston, outubro de 1923.\n\n' +
          'Uma carta chega de seu tio-avô, o Prof. Armitage. ' +
          'A caligrafia treme:\n\n' +
          '"Venha a Arkham. O que encontrei sob a Universidade ' +
          'nao deveria existir. Confio apenas em voce."',
      },
    },
    {
      id: 'arkham-noite',
      name: 'Arkham à noite',
      treatment: { kind: 'color', color: '#0a0f1a', label: 'Arkham à noite' },
    },
    {
      id: 'mapa',
      name: 'Mapa de Arkham',
      treatment: { kind: 'image', src: '/assets/arkham-map.jpg', alt: 'Mapa de Arkham' },
    },
    {
      id: 'sangue',
      name: 'Tensão (vermelho)',
      treatment: { kind: 'color', color: '#3a0606', label: 'Algo está errado' },
    },
    {
      id: 'transmissao',
      name: 'Transmissão (CRT)',
      treatment: {
        kind: 'crt',
        theme: 'phosphor',
        lines: ['> CONEXAO ESTABELECIDA', '> decodificando sinal...'],
      },
    },
  ],
}
