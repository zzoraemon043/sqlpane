import { join } from 'node:path'

export const handWrittenFixture = (name: string) => join(import.meta.dirname, 'fixtures', name)
export const generatedFixture = (name: string) => join(import.meta.dirname, '.generated', name)
