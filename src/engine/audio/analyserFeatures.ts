import { clamp01 } from '../../utils/numeric'

export type F32 = Float32Array<ArrayBuffer>

export const ensureSize = (buffer: F32, size: number): F32 =>
  buffer.length === size ? buffer : new Float32Array(size)

export const computeRms = (analyser: AnalyserNode, scratchTime: F32) => {
  const data = ensureSize(scratchTime, analyser.fftSize)
  analyser.getFloatTimeDomainData(data)
  let sum = 0
  for (let index = 0; index < data.length; index++) sum += data[index] * data[index]
  return { rms: data.length ? Math.sqrt(sum / data.length) : 0, scratch: data }
}

export const computeSpectralFeatures = (
  analyser: AnalyserNode,
  prevMag: F32 | null,
  scratchDb: F32,
) => {
  const count = analyser.frequencyBinCount
  const db = ensureSize(scratchDb, count)
  analyser.getFloatFrequencyData(db)
  const nyquist = analyser.context.sampleRate / 2
  const previous = prevMag?.length === count ? prevMag : new Float32Array(count)
  const values = collectSpectralValues(db, previous, nyquist)
  const ratio = (value: number) => (values.total > 0 ? clamp01(value / values.total) : 0)
  return {
    centroid: clamp01(
      (values.total > 0 ? values.weighted / values.total : 0) / Math.max(1, nyquist),
    ),
    flux: clamp01(values.flux * 0.6),
    low: ratio(values.bands[0]),
    mid: ratio(values.bands[1]),
    high: ratio(values.bands[2]),
    nextPrev: previous,
    scratchDb: db,
  }
}

function collectSpectralValues(db: F32, previous: F32, nyquist: number) {
  const values = { total: 0, weighted: 0, flux: 0, bands: [0, 0, 0] }
  for (let index = 0; index < db.length; index++)
    addSpectralBin(values, db, previous, index, nyquist)
  return values
}

function addSpectralBin(
  values: { total: number; weighted: number; flux: number; bands: number[] },
  db: F32,
  previous: F32,
  index: number,
  nyquist: number,
): void {
  const magnitude = 10 ** ((db[index] ?? -120) / 20)
  const normalized = index / Math.max(1, db.length - 1)
  values.total += magnitude
  values.weighted += normalized * nyquist * magnitude
  values.flux += Math.max(0, magnitude - (previous[index] ?? 0))
  previous[index] = magnitude
  values.bands[normalized < 300 / nyquist ? 0 : normalized < 4000 / nyquist ? 1 : 2] += magnitude
}
