import { createContext, useContext } from 'react'
import type { SqlEngine } from './sqlEngine'

export type EngineState =
  | { status: 'starting' }
  | { status: 'ready'; engine: SqlEngine }
  | { status: 'failed'; message: string }

export const EngineContext = createContext<EngineState>({ status: 'starting' })

export function useEngineState(): EngineState {
  return useContext(EngineContext)
}
