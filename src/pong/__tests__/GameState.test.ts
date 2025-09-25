import { describe, expect, it } from 'vitest'
import { GameState } from '../core/GameState'

describe('GameState', () => {
  it('atualiza o placar de forma independente para cada lado', () => {
    const state = new GameState()
    const afterPlayer = state.recordPoint('player')
    const afterAi = state.recordPoint('ai')

    expect(afterPlayer.player).toBe(1)
    expect(afterPlayer.ai).toBe(0)
    expect(afterAi.ai).toBe(1)
    expect(afterAi.rounds).toBe(2)
    expect(afterAi.serveDirection).toBe(-1)
  })

  it('reinicia o placar mantendo direção padrão de saque', () => {
    const state = new GameState()
    state.recordPoint('player')
    const reset = state.resetScores()

    expect(reset.player).toBe(0)
    expect(reset.ai).toBe(0)
    expect(reset.rounds).toBe(0)
    expect(reset.serveDirection).toBe(1)
  })

  it('aplica estado serializado de forma segura', () => {
    const state = new GameState()
    const snapshot = state.applySerialized({
      playerScore: 4,
      aiScore: 3,
      rounds: 7,
      serveDirection: -1,
    })

    expect(snapshot.player).toBe(4)
    expect(snapshot.ai).toBe(3)
    expect(snapshot.rounds).toBe(7)
    expect(snapshot.serveDirection).toBe(-1)
  })

  it('ignora dados inválidos e mantém limites não negativos', () => {
    const state = new GameState()
    const snapshot = state.applySerialized({
      playerScore: -10,
      aiScore: Number.NaN as unknown as number,
      rounds: Number.NaN,
      serveDirection: 0 as unknown as 1 | -1,
    })

    expect(snapshot.player).toBe(0)
    expect(snapshot.ai).toBe(0)
    expect(snapshot.rounds).toBe(0)
    expect(snapshot.serveDirection).toBe(1)
  })
})
