import { GameEngine } from './core/GameEngine'
import { GameStorage } from './core/GameStorage'
import { Hud } from './ui/Hud'

export class PongApp {
  private readonly storage = new GameStorage()
  private hud!: Hud
  private engine!: GameEngine

  constructor(private readonly root: HTMLElement) {}

  bootstrap(): void {
    this.hud = new Hud(this.root, {
      onToggleStart: () => this.handleToggleStart(),
      onReset: () => this.handleReset(),
      onSave: () => this.handleSave(),
    })

    this.engine = new GameEngine({
      storage: this.storage,
      onScore: (snapshot, context) => this.hud.updateScore(snapshot, context),
      onStatusChange: (status) => this.hud.updateStatus(status),
      seed: 1337,
    })

    const canvasHost = this.hud.getCanvasHost()
    this.engine.init(canvasHost)

    window.addEventListener('beforeunload', this.handleBeforeUnload)
  }

  destroy(): void {
    window.removeEventListener('beforeunload', this.handleBeforeUnload)
    if (this.engine) {
      this.engine.dispose()
    }
  }

  private handleToggleStart(): void {
    this.engine.toggleStart()
  }

  private handleReset(): void {
    this.engine.resetMatch(true)
    this.engine.saveProgress()
    this.hud.notifyReset()
  }

  private handleSave(): void {
    this.engine.saveProgress()
    this.hud.notifySaved()
  }

  private handleBeforeUnload = (): void => {
    this.engine.saveProgress()
  }
}
