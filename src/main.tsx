import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { createBrowserEngine } from './engine/browserEngine'
import { EngineProvider } from './engine/EngineProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EngineProvider create={createBrowserEngine}>
      <App />
    </EngineProvider>
  </StrictMode>,
)
