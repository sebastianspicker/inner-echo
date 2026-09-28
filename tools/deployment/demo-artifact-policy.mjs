import { collectChunkClosure } from '../shared/viteManifest.mjs'

export { collectChunkClosure } from '../shared/viteManifest.mjs'

export const demoForbiddenCapabilities = Object.freeze([
  ['mediaDevices', /\bmediaDevices\b/, 'navigator.mediaDevices'],
  ['getUserMedia', /\bgetUserMedia\b/, 'navigator.getUserMedia'],
  ['getDisplayMedia', /\bgetDisplayMedia\b/, 'navigator.getDisplayMedia()'],
  ['MediaRecorder', /\bMediaRecorder\b/, 'new MediaRecorder(stream)'],
  ['RTCPeerConnection', /\bRTCPeerConnection\b/, 'new RTCPeerConnection()'],
  ['AudioContext', /\b(?:AudioContext|webkitAudioContext)\b/, 'new AudioContext()'],
  ['media playback', /\.play\(\)/, 'element.play()'],
  [
    'persistent browser storage',
    /\b(?:localStorage|sessionStorage)\b/,
    'localStorage.getItem("demo")',
  ],
  ['IndexedDB storage', /\bindexedDB\b/, 'indexedDB.open("demo")'],
  ['Cache storage', /\bcaches\b/, 'caches.open("demo")'],
  ['cookie access', /\bdocument\.cookie\b/, 'document.cookie = "demo=true"'],
  ['clipboard access', /\bclipboard\b/, 'navigator.clipboard.writeText("demo")'],
  ['ClipboardItem', /\bClipboardItem\b/, 'new ClipboardItem({})'],
  ['sendBeacon', /\bnavigator\.sendBeacon\b/, 'navigator.sendBeacon("/demo")'],
  ['fetch', /\bfetch\b/, 'fetch("/demo")'],
  ['XMLHttpRequest', /\bXMLHttpRequest\b/, 'new XMLHttpRequest()'],
  ['XHR', /\bXHR\b/, 'new XHR()'],
  ['WebSocket', /\bWebSocket\b/, 'new WebSocket("wss://example.invalid")'],
  ['EventSource', /\bEventSource\b/, 'new EventSource("/events")'],
])

export const demoForbiddenFrameworks = Object.freeze([
  ['React', /\breact(?:-dom)?\b/i, 'import { createRoot } from "react-dom/client"'],
])

export function findForbiddenDemoCapabilities(source) {
  return demoForbiddenCapabilities
    .filter(([, pattern]) => pattern.test(source))
    .map(([capability]) => capability)
}

export function findForbiddenDemoFrameworks(source) {
  return demoForbiddenFrameworks
    .filter(([, pattern]) => pattern.test(source))
    .map(([framework]) => framework)
}

export function findForbiddenCapabilitiesInChunkClosure(manifest, initialKeys, sourcesByChunk) {
  const source = collectChunkClosure(manifest, initialKeys)
    .map((key) => sourcesByChunk.get(key) ?? '')
    .join('\n')

  return findForbiddenDemoCapabilities(source)
}
