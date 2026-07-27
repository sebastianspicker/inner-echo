import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const BRAND_ASSETS = ['inner-echo-mark.svg', 'inner-echo-favicon.svg']

describe('public brand assets', () => {
  it.each(BRAND_ASSETS)('%s is a self-contained, safe SVG', (fileName) => {
    const svg = readFileSync(resolve(process.cwd(), 'assets/brand', fileName), 'utf8')

    expect(svg).toMatch(/<svg[^>]+viewBox="[^"]+"/)
    expect(svg).not.toMatch(/<script|<foreignObject|\son\w+=/i)
    expect(svg).not.toMatch(/(?:href|src)="(?:https?:|data:|javascript:)/i)
  })

  it('connects the shared assets to browser and application entry points', () => {
    const index = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
    const welcome = readFileSync(resolve(process.cwd(), 'src/ui/WelcomeStep.tsx'), 'utf8')

    expect(index).toContain('/assets/brand/inner-echo-favicon.svg')
    expect(index).toContain('name="theme-color" content="#080A0E"')
    expect(index).toContain('name="description"')
    expect(welcome).toContain('assets/brand/inner-echo-mark.svg')
  })
})
