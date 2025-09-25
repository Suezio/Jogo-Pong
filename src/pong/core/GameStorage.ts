import { SerializedGameState } from './GameState'
import { STORAGE_KEY } from './constants'

export class GameStorage {
  constructor(private readonly storage: Storage | undefined = globalThis.localStorage) {}

  load(): SerializedGameState | null {
    try {
      if (!this.storage) {
        return null
      }
      const raw = this.storage.getItem(STORAGE_KEY)
      if (!raw) {
        return null
      }
      const parsed = JSON.parse(raw)
      if (typeof parsed !== 'object' || parsed === null) {
        return null
      }
      return parsed as SerializedGameState
    } catch (error) {
      console.warn('Falha ao carregar jogo salvo', error)
      return null
    }
  }

  save(state: SerializedGameState): void {
    try {
      if (!this.storage) {
        return
      }
      this.storage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (error) {
      console.warn('Falha ao salvar progresso do jogo', error)
    }
  }

  clear(): void {
    try {
      if (!this.storage) {
        return
      }
      this.storage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.warn('Falha ao limpar progresso salvo', error)
    }
  }
}
