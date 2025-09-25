import { beforeEach, describe, expect, it } from 'vitest'
import { GameStorage } from '../core/GameStorage'
import { STORAGE_KEY } from '../core/constants'

const createState = () => ({
  playerScore: 3,
  aiScore: 2,
  rounds: 5,
  serveDirection: 1 as 1,
})

describe('GameStorage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('persiste e recupera o estado', () => {
    const storage = new GameStorage(window.localStorage)
    storage.save(createState())

    const data = storage.load()
    expect(data).not.toBeNull()
    expect(data?.playerScore).toBe(3)
    expect(data?.aiScore).toBe(2)
    expect(data?.rounds).toBe(5)
    expect(data?.serveDirection).toBe(1)
  })

  it('retorna nulo quando os dados são inválidos', () => {
    window.localStorage.setItem(STORAGE_KEY, 'invalid-json')
    const storage = new GameStorage(window.localStorage)

    expect(storage.load()).toBeNull()
  })

  it('remove dados ao limpar', () => {
    const storage = new GameStorage(window.localStorage)
    storage.save(createState())
    storage.clear()

    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})
