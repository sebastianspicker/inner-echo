export function advancePastJsonString(text: string, start: number): number {
  for (let index = start + 1; index < text.length; index++) {
    if (text[index] === '\\') index++
    else if (text[index] === '"') return index
  }
  return text.length
}
