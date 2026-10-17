import assert from 'node:assert/strict'
import { mock } from 'node:test'
import { createPulseTone } from '../../src/runtime/audio/fx'
import type { AudioModule } from '../../src/runtime/audio'
import { FakeAudioContext, type FakeAudioParam } from '../shared/fakeWebAudio'

interface Tick {
  peak: number
  param: FakeAudioParam
}

interface TickHarness {
  tone: AudioModule
  ticks: Tick[]
}

function withTickTone(check: (harness: TickHarness) => void): void {
  mock.timers.enable({ apis: ['setTimeout'] })
  mock.method(Math, 'random', () => 0.5)
  const context = new FakeAudioContext()
  let tone: AudioModule | undefined
  try {
    tone = createPulseTone(context as unknown as BaseAudioContext, {
      shape: 'tick',
      rate: 1,
      mix: 0.06,
    })
    const ticks: Tick[] = []
    // Observe emitted envelopes without depending on gain-node allocation order.
    for (const { gain } of context.gains) {
      mock.method(gain, 'linearRampToValueAtTime', (peak: number) => {
        ticks.push({ peak, param: gain })
      })
    }
    check({ tone, ticks })
  } finally {
    tone?.dispose()
    mock.restoreAll()
    mock.timers.reset()
  }
}

function verifyUnchangedUpdates({ tone, ticks }: TickHarness): void {
  for (let step = 0; step < 20; step++) {
    tone.setParams({ rate: 1, mix: 0.06 })
    mock.timers.tick(100)
  }
  assert.deepEqual(
    ticks.map((tick) => tick.peak),
    [0.06, 0.06],
    'updates must not starve ticks',
  )
}

function verifyMixUpdates({ tone, ticks }: TickHarness): void {
  for (let step = 0; step < 5; step++) {
    tone.setParams({ mix: 0.02 * (step + 1) })
    mock.timers.tick(100)
  }
  assert.equal(ticks.length, 1, 'mix changes must preserve the initial tick deadline')
  assert.equal(ticks[0].peak, 0.1, 'the pending tick must use the latest mix')
  tone.setParams({ mix: 0.04 })
  mock.timers.tick(999)
  assert.equal(ticks.length, 1)
  mock.timers.tick(1)
  assert.equal(ticks.length, 2, 'mix changes must preserve subsequent deadlines too')
  assert.equal(ticks[1].peak, 0.04)
}

function verifyRateUpdates({ tone, ticks }: TickHarness): void {
  mock.timers.tick(200)
  tone.setParams({ rate: 0.2 })
  mock.timers.tick(300)
  assert.equal(ticks.length, 1, 'rate changes must preserve the pending tick')
  mock.timers.tick(4999)
  assert.equal(ticks.length, 1, 'the next interval must use the new rate')
  mock.timers.tick(1)
  assert.equal(ticks.length, 2)
}

function verifyStopAndResume({ tone, ticks }: TickHarness): void {
  mock.timers.tick(500)
  assert.equal(ticks.length, 1)
  const param = ticks[0].param
  const cancel = mock.method(param, 'cancelScheduledValues')
  tone.setParams({ mix: 0 })
  assert.equal(cancel.mock.callCount(), 1, 'muting must cancel the in-flight envelope')
  assert.equal(param.value, 0)
  mock.timers.tick(10000)
  assert.equal(ticks.length, 1, 'muting must cancel the pending tick')
  tone.setParams({ mix: 0.08 })
  mock.timers.tick(500)
  assert.equal(ticks.length, 2, 'unmuting must restart ticking')
  assert.equal(ticks[1].peak, 0.08)
  const beforeSwitch = cancel.mock.callCount()
  tone.setParams({ shape: 'sine' })
  assert.equal(cancel.mock.callCount(), beforeSwitch + 1)
  mock.timers.tick(10000)
  assert.equal(ticks.length, 2, 'sine mode must not emit ticks')
  tone.setParams({ shape: 'tick' })
  mock.timers.tick(500)
  assert.equal(ticks.length, 3, 'switching back must restart ticking')
}

function verifyDisposal({ tone, ticks }: TickHarness): void {
  mock.timers.tick(500)
  assert.equal(ticks.length, 1)
  const cancel = mock.method(ticks[0].param, 'cancelScheduledValues')
  tone.dispose()
  assert.equal(cancel.mock.callCount(), 1, 'disposal must cancel the in-flight envelope')
  mock.timers.tick(10000)
  assert.equal(ticks.length, 1, 'disposal must prevent future ticks')
}

for (const check of [
  verifyUnchangedUpdates,
  verifyMixUpdates,
  verifyRateUpdates,
  verifyStopAndResume,
  verifyDisposal,
]) {
  withTickTone(check)
}
withTickTone(({ tone, ticks }) => {
  tone.dispose()
  mock.timers.tick(10000)
  assert.equal(ticks.length, 0, 'disposal before the first tick must cancel it')
})
console.log('[audio:verify] Tick cadence, live controls, mute, mode changes and disposal passed.')
