export class RandomGenerator {
  private seed: number

  constructor(seed: number = Date.now() % 2147483647) {
    if (seed <= 0) {
      seed = 1
    }
    this.seed = seed
  }

  next(): number {
    this.seed = (this.seed * 48271) % 0x7fffffff
    return (this.seed & 0xfffffff) / 0x10000000
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.next()
  }
}
