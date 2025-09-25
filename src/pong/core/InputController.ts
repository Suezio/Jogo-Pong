type MoveDirection = -1 | 0 | 1

export class InputController {
  private moveDirection: MoveDirection = 0
  private rafHandle: number | null = null
  private listenersAttached = false

  private readonly pressedKeys = new Set<string>()

  connect(): void {
    if (this.listenersAttached) {
      return
    }
    this.listenersAttached = true
    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('keyup', this.handleKeyUp)
    this.updateLoop()
  }

  disconnect(): void {
    if (this.rafHandle) {
      cancelAnimationFrame(this.rafHandle)
      this.rafHandle = null
    }
    this.moveDirection = 0
    this.listenersAttached = false
    this.pressedKeys.clear()
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('keyup', this.handleKeyUp)
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    this.pressedKeys.add(event.key.toLowerCase())
  }

  private handleKeyUp = (event: KeyboardEvent) => {
    this.pressedKeys.delete(event.key.toLowerCase())
  }

  private updateLoop = () => {
    this.moveDirection = this.computeDirection()
    this.rafHandle = requestAnimationFrame(this.updateLoop)
  }

  private computeDirection(): MoveDirection {
    const upPressed = this.pressedKeys.has('w') || this.pressedKeys.has('arrowup')
    const downPressed = this.pressedKeys.has('s') || this.pressedKeys.has('arrowdown')

    if (upPressed && !downPressed) {
      return -1
    }
    if (downPressed && !upPressed) {
      return 1
    }
    return 0
  }

  getDirection(): MoveDirection {
    return this.moveDirection
  }
}
