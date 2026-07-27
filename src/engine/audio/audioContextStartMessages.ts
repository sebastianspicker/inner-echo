export function getAudioStartErrorMessage(error: unknown): string {
  const rawMessage = error instanceof Error ? error.message : String(error)
  if (rawMessage.includes('hardware') || rawMessage.includes('device')) {
    return 'Audio hardware error. Please check your output device and try again.'
  }
  return `Audio initialization failed: ${rawMessage}`
}
