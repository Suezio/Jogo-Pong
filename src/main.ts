import './style.css'
import { PongApp } from './pong/PongApp.ts'

const rootElement = document.querySelector<HTMLDivElement>('#root')

if (!rootElement) {
  throw new Error('Elemento raiz não encontrado. Verifique o index.html.')
}

const app = new PongApp(rootElement)
app.bootstrap()

if (import.meta.env.DEV) {
  // Expor para inspeção manual durante o desenvolvimento.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).__HYPERPONG__ = app
}
