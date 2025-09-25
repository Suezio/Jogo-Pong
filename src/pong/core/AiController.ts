export class AiController {
  private readonly maxSpeed: number
  private readonly reactionDelay: number
  private timeAccumulator = 0
  private targetZ = 0

  constructor(maxSpeed: number, reactionDelay = 0.12) {
    this.maxSpeed = maxSpeed
    this.reactionDelay = reactionDelay
  }

  updateTarget(ballZ: number, dt: number): void {
    this.timeAccumulator += dt
    if (this.timeAccumulator >= this.reactionDelay) {
      this.targetZ = ballZ
      this.timeAccumulator = 0
    }
  }

  move(currentZ: number, dt: number): number {
    const diff = this.targetZ - currentZ
    const direction = Math.sign(diff)
    const moveAmount = direction * this.maxSpeed * dt

    if (Math.abs(moveAmount) >= Math.abs(diff)) {
      return this.targetZ
    }

    return currentZ + moveAmount
  }
}
