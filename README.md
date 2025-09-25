# HyperPong 3D

HyperPong 3D é um jogo de Pong realista construído com Three.js e TypeScript sobre Vite. O projeto simula uma partida competitiva com IA adaptativa, placar persistente e HUD profissional.

## ✨ Recursos principais

- **Motor 3D realista** com Three.js, mesa completa, iluminação dinâmica e sombras.
- **IA balanceada** com reação adaptativa e limites de velocidade para garantir partidas justas.
- **Placar persistente** salvo automaticamente em `localStorage` com suporte a salvar manualmente.
- **Controles completos**: iniciar/pausar, resetar partida, salvar progresso e indicadores visuais de status.
- **HUD responsivo** com design premium e feedback visual instantâneo.
- **Testes automatizados**: suíte de unidade com Vitest e teste end-to-end com Playwright.

## 🕹️ Controles

- `W` ou `↑` — move a raquete para cima.
- `S` ou `↓` — move a raquete para baixo.
- `Iniciar/Pausar` — alterna o estado da partida (aguarde o saque quando em "Servindo...").
- `Resetar` — reposiciona a bola e zera o placar.
- `Salvar` — grava o placar atual imediatamente (também ocorre ao sair da página).

## 🛠️ Scripts disponíveis

```bash
npm install         # instala dependências
npm run dev         # inicia o servidor de desenvolvimento
npm run build       # gera build de produção
npm run preview     # pré-visualiza o bundle gerado
npm run test        # executa testes de unidade (Vitest)
npm run test:watch  # roda testes de unidade em watch mode
npm run test:e2e    # executa testes end-to-end (Playwright)
```

> **Observação:** para rodar os testes E2E é necessário ter instalado os navegadores do Playwright (`npx playwright install`).

## ✅ Qualidade e cobertura de testes

- `npm run test` — cobre lógica de placar e persistência.
- `npm run test:e2e` — valida fluxo de HUD (iniciar/pausar/resetar/salvar).
- `npm run build` — garante que o projeto gera artefatos de produção sem erros.

## 📁 Estrutura relevante

- `src/main.ts` — ponto de entrada do aplicativo.
- `src/pong/PongApp.ts` — orquestra HUD, motor de jogo e persistência.
- `src/pong/core/` — motor de jogo, física e estado.
- `src/pong/ui/Hud.ts` — gerenciamento da interface e notificações.
- `e2e/` — testes Playwright.

## 🚀 Como iniciar

```bash
npm install
npm run dev
```

Acesse `http://localhost:5173` e pressione **Iniciar** para começar o duelo.

---

Desenvolvido como experiência profissional de Pong 3D em Three.js/TypeScript.
