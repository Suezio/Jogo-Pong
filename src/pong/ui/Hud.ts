import { PlayerSide, ScoreSnapshot } from '../core/GameState'

export interface HudCallbacks {
  onToggleStart: () => void
  onReset: () => void
  onSave: () => void
}

export class Hud {
  private readonly canvasHost: HTMLDivElement
  private readonly playerScoreEl: HTMLElement
  private readonly aiScoreEl: HTMLElement
  private readonly roundsEl: HTMLElement
  private readonly statusChip: HTMLElement
  private readonly toastEl: HTMLElement
  private readonly startButton: HTMLButtonElement
  private readonly resetButton: HTMLButtonElement
  private readonly saveButton: HTMLButtonElement
  private toastTimeout: number | null = null

  constructor(private readonly root: HTMLElement, callbacks: HudCallbacks) {
    this.root.innerHTML = this.createTemplate()

    this.canvasHost = this.query('[data-role="canvas"]') as HTMLDivElement
    this.playerScoreEl = this.query('[data-role="score-player"]')
    this.aiScoreEl = this.query('[data-role="score-ai"]')
    this.roundsEl = this.query('[data-role="rounds"]')
    this.statusChip = this.query('[data-role="status"]')
    this.toastEl = this.query('[data-role="toast"]')
    this.startButton = this.query('[data-action="start"]') as HTMLButtonElement
    this.resetButton = this.query('[data-action="reset"]') as HTMLButtonElement
    this.saveButton = this.query('[data-action="save"]') as HTMLButtonElement

    this.startButton.addEventListener('click', callbacks.onToggleStart)
    this.resetButton.addEventListener('click', callbacks.onReset)
    this.saveButton.addEventListener('click', callbacks.onSave)
  }

  getCanvasHost(): HTMLDivElement {
    return this.canvasHost
  }

  updateScore(snapshot: ScoreSnapshot, context: { lastPoint: PlayerSide | null }): void {
    this.playerScoreEl.textContent = snapshot.player.toString()
    this.aiScoreEl.textContent = snapshot.ai.toString()
    this.roundsEl.textContent = `Rounds: ${snapshot.rounds}`

    if (context.lastPoint) {
      const scorer = context.lastPoint === 'player' ? 'Você pontuou!' : 'IA pontuou'
      this.showToast(scorer)
    }
  }

  updateStatus(status: { isRunning: boolean; isServing: boolean }): void {
    if (status.isRunning) {
      this.startButton.textContent = status.isServing ? 'Servindo...' : 'Pausar'
      this.startButton.disabled = status.isServing
      this.statusChip.textContent = status.isServing ? 'Preparando' : 'Em jogo'
    } else {
      this.startButton.textContent = 'Iniciar'
      this.startButton.disabled = false
      this.statusChip.textContent = 'Em repouso'
    }
  }

  notifySaved(): void {
    this.showToast('Placar salvo com sucesso')
  }

  notifyReset(): void {
    this.showToast('Partida reiniciada')
  }

  private createTemplate(): string {
    return `
      <div class="app-shell">
        <div class="canvas-container" data-role="canvas"></div>
        <div class="overlay">
          <div class="hud">
            <span class="status-chip" data-role="status">Em repouso</span>
            <h1>HyperPong 3D</h1>
            <div class="scoreboard">
              <div>
                <span>Jogador</span>
                <div class="score-value" data-role="score-player">0</div>
              </div>
              <div class="rounds" data-role="rounds">Rounds: 0</div>
              <div>
                <span>IA</span>
                <div class="score-value" data-role="score-ai">0</div>
              </div>
            </div>
            <div class="controls">
              <button data-action="start">Iniciar</button>
              <button data-action="reset">Resetar</button>
              <button data-action="save">Salvar</button>
            </div>
            <div class="legend">
              <strong>Como jogar</strong>
              <p>Use W/S ou ↑/↓ para mover sua raquete. A IA responde com velocidade adaptativa para garantir partidas justas.</p>
              <p>O placar é salvo localmente e pode ser retomado a qualquer momento.</p>
            </div>
          </div>
        </div>
        <div class="toast" data-role="toast"></div>
      </div>
    `
  }

  private query(selector: string): HTMLElement {
    const element = this.root.querySelector<HTMLElement>(selector)
    if (!element) {
      throw new Error(`Elemento ${selector} não encontrado no HUD.`)
    }
    return element
  }

  private showToast(message: string): void {
    this.toastEl.textContent = message
    this.toastEl.classList.add('visible')
    if (this.toastTimeout) {
      window.clearTimeout(this.toastTimeout)
    }
    this.toastTimeout = window.setTimeout(() => {
      this.toastEl.classList.remove('visible')
      this.toastTimeout = null
    }, 2500)
  }
}
