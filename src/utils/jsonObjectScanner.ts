import { advancePastJsonString } from './jsonStringScanner'

export function extractBalancedObject(text: string, start: number): string | null {
  if (text[start] !== '{') return null
  let depth = 0
  for (let index = start; index < text.length; index++) {
    const character = text[index]
    if (character === '"') index = advancePastJsonString(text, index)
    else if (character === '{') depth++
    else if (character === '}' && --depth === 0) return text.slice(start, index + 1)
  }
  return null
}
