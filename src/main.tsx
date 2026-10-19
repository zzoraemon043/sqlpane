import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'
import { createBrowserEngine } from './engine/browserEngine'
import { EngineProvider } from './engine/EngineProvider'
import { LanguageProvider } from './i18n/LanguageProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <EngineProvider create={createBrowserEngine}>
        <App />
      </EngineProvider>
    </LanguageProvider>
  </StrictMode>,
)
