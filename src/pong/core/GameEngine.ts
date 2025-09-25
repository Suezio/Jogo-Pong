import * as THREE from 'three'
import {
  AI_MAX_SPEED,
  BALL_INITIAL_SPEED,
  BALL_MAX_SPEED,
  BALL_RADIUS,
  BALL_SPEED_INCREMENT,
  CAMERA_LOOK_AT,
  CAMERA_POSITION,
  PADDLE_BOUNDARY_PADDING,
  PADDLE_DEPTH,
  PADDLE_HEIGHT,
  PADDLE_SPEED,
  PADDLE_WIDTH,
  TABLE_HEIGHT,
  TABLE_LENGTH,
  TABLE_WIDTH,
} from './constants'
import { GameState, PlayerSide, ScoreSnapshot, SerializedGameState } from './GameState'
import { GameStorage } from './GameStorage'
import { InputController } from './InputController'
import { AiController } from './AiController'
import { RandomGenerator } from './random'

export interface EngineCallbacks {
  onScore?: (snapshot: ScoreSnapshot, context: { lastPoint: PlayerSide | null }) => void
  onStatusChange?: (status: { isRunning: boolean; isServing: boolean }) => void
}

export interface EngineOptions extends EngineCallbacks {
  seed?: number
  storage?: GameStorage
}

const PADDLE_HALF_DEPTH = PADDLE_DEPTH / 2
const PLAYFIELD_HALF_LENGTH = TABLE_LENGTH / 2
const PLAYFIELD_HALF_WIDTH = TABLE_WIDTH / 2
const EFFECTIVE_HALF_WIDTH = PLAYFIELD_HALF_WIDTH - PADDLE_BOUNDARY_PADDING

export class GameEngine {
  private container: HTMLElement | null = null
  private renderer: THREE.WebGLRenderer | null = null
  private scene: THREE.Scene | null = null
  private camera: THREE.PerspectiveCamera | null = null
  private clock: THREE.Clock | null = null

  private ball!: THREE.Mesh
  private playerPaddle!: THREE.Mesh
  private aiPaddle!: THREE.Mesh
  private table!: THREE.Mesh

  private readonly state = new GameState()
  private readonly storage: GameStorage
  private readonly input = new InputController()
  private readonly ai = new AiController(AI_MAX_SPEED)
  private readonly random: RandomGenerator

  private readonly callbacks: EngineCallbacks

  private ballVelocity = new THREE.Vector3(0, 0, 0)
  private ballSpeed = BALL_INITIAL_SPEED

  private isActive = false
  private isServing = true
  private serveTimeout: number | null = null
  private rafHandle: number | null = null

  private readonly playerPaddleX = -PLAYFIELD_HALF_LENGTH + 1.1
  private readonly aiPaddleX = PLAYFIELD_HALF_LENGTH - 1.1

  constructor(options: EngineOptions = {}) {
    this.callbacks = { onScore: options.onScore, onStatusChange: options.onStatusChange }
    this.random = new RandomGenerator(options.seed)
    this.storage = options.storage ?? new GameStorage()
  }

  init(container: HTMLElement): ScoreSnapshot {
    this.container = container

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.shadowMap.enabled = true
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x03070f)

    this.camera = new THREE.PerspectiveCamera(52, container.clientWidth / container.clientHeight, 0.1, 1000)
    this.camera.position.set(CAMERA_POSITION.x, CAMERA_POSITION.y, CAMERA_POSITION.z)
    this.camera.lookAt(new THREE.Vector3(CAMERA_LOOK_AT.x, CAMERA_LOOK_AT.y, CAMERA_LOOK_AT.z))

    this.clock = new THREE.Clock()

    this.createLights()
    this.createEnvironment()
    this.createActors()

    container.innerHTML = ''
    container.appendChild(this.renderer.domElement)
    this.resize()

    window.addEventListener('resize', this.resize)
    document.addEventListener('visibilitychange', this.handleVisibilityChange)

    this.input.connect()

    const snapshot = this.state.resetScores()
    const persisted = this.storage.load()
    if (persisted) {
      this.state.applySerialized(persisted)
      this.ballSpeed = BALL_INITIAL_SPEED + BALL_SPEED_INCREMENT * this.state.snapshot().rounds
      this.callbacks.onScore?.(this.state.snapshot(), { lastPoint: null })
    } else {
      this.callbacks.onScore?.(snapshot, { lastPoint: null })
    }

    this.startLoop()

    return this.state.snapshot()
  }

  dispose(): void {
    this.pause()
    this.clearServeTimeout()
    if (this.rafHandle) {
      cancelAnimationFrame(this.rafHandle)
      this.rafHandle = null
    }
    if (this.renderer) {
      this.renderer.dispose()
    }
    if (this.container && this.renderer) {
      this.container.removeChild(this.renderer.domElement)
    }
    window.removeEventListener('resize', this.resize)
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    this.input.disconnect()
    this.clock = null
    this.scene = null
    this.camera = null
    this.renderer = null
    this.container = null
  }

  start(): void {
    if (this.isActive) {
      return
    }
    this.isActive = true
    this.state.isRunning = true
    this.emitStatus()
    if (this.isServing) {
      this.scheduleServe(350)
    }
  }

  pause(): void {
    if (!this.isActive && !this.state.isRunning) {
      return
    }
    this.isActive = false
    this.state.isRunning = false
    this.ballVelocity.set(0, 0, 0)
    this.emitStatus()
    this.clearServeTimeout()
    this.isServing = true
  }

  toggleStart(): void {
    if (this.isActive) {
      this.pause()
    } else {
      this.start()
    }
  }

  resetMatch(resetScores = true): ScoreSnapshot {
    this.pause()
    this.placeActorsAtOrigin()
    this.ballSpeed = BALL_INITIAL_SPEED

    const snapshot = resetScores ? this.state.resetScores() : this.state.snapshot()
    this.callbacks.onScore?.(snapshot, { lastPoint: null })

    return snapshot
  }

  saveProgress(): void {
    this.storage.save(this.state.toJSON())
  }

  loadProgress(data: SerializedGameState | null): ScoreSnapshot {
    const snapshot = this.state.applySerialized(data ?? this.storage.load())
    this.callbacks.onScore?.(snapshot, { lastPoint: null })
    this.placeActorsAtOrigin()
    return snapshot
  }

  private startLoop(): void {
    const loop = () => {
      if (!this.renderer || !this.scene || !this.camera || !this.clock) {
        return
      }

      const delta = this.clock.getDelta()
      this.update(delta)
      this.renderer.render(this.scene, this.camera)

      this.rafHandle = requestAnimationFrame(loop)
    }

    this.rafHandle = requestAnimationFrame(loop)
  }

  private update(dt: number): void {
    if (!this.playerPaddle || !this.aiPaddle || !this.ball) {
      return
    }

    this.updatePlayerPaddle(dt)
    this.updateAiPaddle(dt)

    if (this.isActive && !this.isServing) {
      this.updateBall(dt)
    }
  }

  private updatePlayerPaddle(dt: number): void {
    const direction = this.input.getDirection()
    const nextZ = this.playerPaddle.position.z + direction * PADDLE_SPEED * dt
    this.playerPaddle.position.z = this.clampPaddle(nextZ)
  }

  private updateAiPaddle(dt: number): void {
    this.ai.updateTarget(this.ball.position.z, dt)
    const next = this.ai.move(this.aiPaddle.position.z, dt)
    this.aiPaddle.position.z = this.clampPaddle(next)
  }

  private updateBall(dt: number): void {
    this.ball.position.addScaledVector(this.ballVelocity, dt)

    this.handleWallBounces()
    this.handlePaddleCollision(this.playerPaddle, 'player')
    this.handlePaddleCollision(this.aiPaddle, 'ai')
    this.handleGoals()
  }

  private handleWallBounces(): void {
    const limitZ = EFFECTIVE_HALF_WIDTH - BALL_RADIUS
    if (this.ball.position.z <= -limitZ || this.ball.position.z >= limitZ) {
      this.ball.position.z = THREE.MathUtils.clamp(this.ball.position.z, -limitZ, limitZ)
      this.ballVelocity.z *= -1
    }
  }

  private handlePaddleCollision(paddle: THREE.Mesh, side: PlayerSide): void {
    const paddleX = paddle.position.x
    const paddleFront = side === 'player'
      ? paddleX + PADDLE_WIDTH / 2 + BALL_RADIUS
      : paddleX - PADDLE_WIDTH / 2 - BALL_RADIUS

    const isApproaching = side === 'player' ? this.ballVelocity.x < 0 : this.ballVelocity.x > 0

    if (!isApproaching) {
      return
    }

    const compare = side === 'player'
      ? this.ball.position.x <= paddleFront
      : this.ball.position.x >= paddleFront

    if (!compare) {
      return
    }

    const withinZ = Math.abs(this.ball.position.z - paddle.position.z) <= PADDLE_HALF_DEPTH + BALL_RADIUS

    if (!withinZ) {
      return
    }

    this.ball.position.x = side === 'player'
      ? paddleFront
      : paddleFront

    const offset = THREE.MathUtils.clamp(this.ball.position.z - paddle.position.z, -PADDLE_HALF_DEPTH, PADDLE_HALF_DEPTH)
    const normalized = offset / PADDLE_HALF_DEPTH

    this.ballSpeed = Math.min(this.ballSpeed + BALL_SPEED_INCREMENT, BALL_MAX_SPEED)
    const angle = normalized * (Math.PI / 4)
    const direction = side === 'player' ? 1 : -1

    const speedVector = new THREE.Vector3(
      Math.cos(angle) * this.ballSpeed * direction,
      0,
      Math.sin(angle) * this.ballSpeed
    )

    const spin = this.random.range(-0.12, 0.12)
    speedVector.z += spin

    this.ballVelocity.copy(speedVector)
  }

  private handleGoals(): void {
    const limitX = PLAYFIELD_HALF_LENGTH + BALL_RADIUS

    if (this.ball.position.x < -limitX) {
      this.registerGoal('ai')
    } else if (this.ball.position.x > limitX) {
      this.registerGoal('player')
    }
  }

  private registerGoal(winner: PlayerSide): void {
    const snapshot = this.state.recordPoint(winner)
    this.callbacks.onScore?.(snapshot, { lastPoint: winner })

    this.isServing = true
    this.emitStatus()
    this.ballVelocity.set(0, 0, 0)
    this.ball.position.set(0, BALL_RADIUS, 0)
    this.playerPaddle.position.z = this.clampPaddle(this.playerPaddle.position.z)
    this.aiPaddle.position.z = this.clampPaddle(this.aiPaddle.position.z)

    if (this.isActive) {
      this.scheduleServe(800)
    }
  }

  private clampPaddle(value: number): number {
    const limit = EFFECTIVE_HALF_WIDTH - PADDLE_HALF_DEPTH
    return THREE.MathUtils.clamp(value, -limit, limit)
  }

  private createLights(): void {
    if (!this.scene) {
      return
    }

    const ambient = new THREE.AmbientLight(0x3f5170, 0.55)
    this.scene.add(ambient)

    const keyLight = new THREE.DirectionalLight(0x6a8bff, 1.1)
    keyLight.position.set(5, 12, 6)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.width = 1024
    keyLight.shadow.mapSize.height = 1024
    this.scene.add(keyLight)

    const backLight = new THREE.SpotLight(0x2a4bff, 0.6, 45, Math.PI / 5)
    backLight.position.set(-6, 10, -12)
    backLight.target.position.set(0, 0, 0)
    backLight.castShadow = true
    this.scene.add(backLight)
    this.scene.add(backLight.target)
  }

  private createEnvironment(): void {
    if (!this.scene) {
      return
    }

    const floorGeometry = new THREE.PlaneGeometry(60, 60)
    const floorMaterial = new THREE.MeshPhongMaterial({ color: 0x050b13, shininess: 12 })
    const floor = new THREE.Mesh(floorGeometry, floorMaterial)
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    this.scene.add(floor)

    const tableGeometry = new THREE.BoxGeometry(TABLE_LENGTH, TABLE_HEIGHT, TABLE_WIDTH)
    const tableMaterial = new THREE.MeshStandardMaterial({
      color: 0x0e2f4f,
      roughness: 0.35,
      metalness: 0.08,
      emissive: new THREE.Color(0x07203a).multiplyScalar(0.25),
    })

    this.table = new THREE.Mesh(tableGeometry, tableMaterial)
    this.table.receiveShadow = true
    this.table.castShadow = true
    this.table.position.set(0, -TABLE_HEIGHT / 2, 0)
    this.scene.add(this.table)

    const centerLine = new THREE.Mesh(
      new THREE.PlaneGeometry(TABLE_LENGTH - 1, 0.05),
      new THREE.MeshBasicMaterial({ color: 0x5ea8ff, transparent: true, opacity: 0.6 })
    )
    centerLine.rotation.x = -Math.PI / 2
    centerLine.position.y = 0.01
    this.scene.add(centerLine)
  }

  private createActors(): void {
    if (!this.scene) {
      return
    }

    const paddleGeometry = new THREE.BoxGeometry(PADDLE_WIDTH, PADDLE_HEIGHT, PADDLE_DEPTH)
    const playerMaterial = new THREE.MeshStandardMaterial({ color: 0x79d7ff, metalness: 0.2, roughness: 0.35 })
    const aiMaterial = new THREE.MeshStandardMaterial({ color: 0xff9b6a, metalness: 0.25, roughness: 0.32 })

    this.playerPaddle = new THREE.Mesh(paddleGeometry, playerMaterial)
    this.playerPaddle.castShadow = true
    this.playerPaddle.receiveShadow = true
    this.playerPaddle.position.set(this.playerPaddleX, PADDLE_HEIGHT / 2 - TABLE_HEIGHT / 2, 0)
    this.scene.add(this.playerPaddle)

    this.aiPaddle = new THREE.Mesh(paddleGeometry, aiMaterial)
    this.aiPaddle.castShadow = true
    this.aiPaddle.receiveShadow = true
    this.aiPaddle.position.set(this.aiPaddleX, PADDLE_HEIGHT / 2 - TABLE_HEIGHT / 2, 0)
    this.scene.add(this.aiPaddle)

    const ballGeometry = new THREE.SphereGeometry(BALL_RADIUS, 32, 32)
    const ballMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.12, roughness: 0.38 })
    this.ball = new THREE.Mesh(ballGeometry, ballMaterial)
    this.ball.castShadow = true
    this.ball.position.set(0, BALL_RADIUS, 0)
    this.scene.add(this.ball)
  }

  private placeActorsAtOrigin(): void {
    this.ball.position.set(0, BALL_RADIUS, 0)
    this.ballVelocity.set(0, 0, 0)
    this.playerPaddle.position.z = 0
    this.aiPaddle.position.z = 0
    this.isServing = true
    this.emitStatus()
  }

  private scheduleServe(delay: number): void {
    this.clearServeTimeout()
    this.isServing = true
    this.emitStatus()

    this.ball.position.set(0, BALL_RADIUS, 0)
    this.ballVelocity.set(0, 0, 0)

    this.serveTimeout = window.setTimeout(() => {
      if (!this.isActive) {
        return
      }
      this.performServe()
    }, delay)
  }

  private performServe(): void {
    this.isServing = false
    const rounds = this.state.snapshot().rounds

    this.ballSpeed = Math.min(BALL_INITIAL_SPEED + BALL_SPEED_INCREMENT * rounds * 0.35, BALL_MAX_SPEED)

    const direction = rounds === 0
      ? (this.random.next() > 0.5 ? 1 : -1)
      : this.state.snapshot().serveDirection

    const angle = this.random.range(-Math.PI / 5, Math.PI / 5)
    this.ballVelocity.set(
      Math.cos(angle) * this.ballSpeed * direction,
      0,
      Math.sin(angle) * this.ballSpeed
    )
    this.emitStatus()
  }

  private clearServeTimeout(): void {
    if (this.serveTimeout !== null) {
      window.clearTimeout(this.serveTimeout)
      this.serveTimeout = null
    }
  }

  private emitStatus(): void {
    this.callbacks.onStatusChange?.({ isRunning: this.isActive, isServing: this.isServing })
  }

  private resize = (): void => {
    if (!this.renderer || !this.camera || !this.container) {
      return
    }
    const { clientWidth, clientHeight } = this.container
    this.renderer.setSize(clientWidth, clientHeight)
    this.camera.aspect = clientWidth / clientHeight
    this.camera.updateProjectionMatrix()
  }

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.pause()
    }
  }
}
