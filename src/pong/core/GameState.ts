export type PlayerSide = 'player' | 'ai'

export interface ScoreSnapshot {
  player: number
  ai: number
  rounds: number
  serveDirection: 1 | -1
}

export interface SerializedGameState {
  playerScore: number
  aiScore: number
  rounds: number
  serveDirection: 1 | -1
}

export class GameState {
  private _playerScore = 0
  private _aiScore = 0
  private _rounds = 0
  private _serveDirection: 1 | -1 = 1
  isRunning = false

  snapshot(): ScoreSnapshot {
    return {
      player: this._playerScore,
      ai: this._aiScore,
      rounds: this._rounds,
      serveDirection: this._serveDirection,
    }
  }

  recordPoint(winner: PlayerSide): ScoreSnapshot {
    if (winner === 'player') {
      this._playerScore += 1
      this._serveDirection = 1
    } else {
      this._aiScore += 1
      this._serveDirection = -1
    }
    this._rounds += 1
    return this.snapshot()
  }

  resetScores(): ScoreSnapshot {
    this._playerScore = 0
    this._aiScore = 0
    this._rounds = 0
    this._serveDirection = 1
    return this.snapshot()
  }

  applySerialized(data: Partial<SerializedGameState> | null | undefined): ScoreSnapshot {
    if (!data) {
      return this.snapshot()
    }

    const safeNumber = (value: unknown, fallback = 0) =>
      typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.round(value)) : fallback

    const serve = data.serveDirection === -1 ? -1 : 1

    this._playerScore = safeNumber(data.playerScore)
    this._aiScore = safeNumber(data.aiScore)
    this._rounds = Math.max(0, safeNumber(data.rounds))
    this._serveDirection = serve

    return this.snapshot()
  }

  toJSON(): SerializedGameState {
    return {
      playerScore: this._playerScore,
      aiScore: this._aiScore,
      rounds: this._rounds,
      serveDirection: this._serveDirection,
    }
  }
}
