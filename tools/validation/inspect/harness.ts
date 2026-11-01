import { withSeededRandom } from '../../contracts/probes/utils'
import { loadProfileContracts } from '../../contracts/profiles'
import { inspectAudioPipeline } from './audio-scenario'
import { buildInspectReport } from './report'
import type { IssueSink, IssuesByProfile, LoadedProfile } from './shared-validation'
import { inspectVideoScenario } from './video-scenario'
import type {
  InspectHarnessOptions,
  InspectHarnessReport,
  InspectIssue,
  ProfileInspectResult,
} from './types'

function inspectProfile(
  profile: LoadedProfile,
  frames: number,
  sink: IssueSink,
  countsByProfile: Map<string, IssuesByProfile>,
  seed: number,
): ProfileInspectResult {
  const video: ProfileInspectResult['video'] = []
  withSeededRandom(seed, () =>
    video.push(inspectVideoScenario(profile, false, false, frames, sink, countsByProfile)),
  )
  withSeededRandom(seed + 1, () =>
    video.push(inspectVideoScenario(profile, true, true, frames, sink, countsByProfile)),
  )
  let audio: ProfileInspectResult['audio'] = {
    enabled: false,
    frames,
    activeNodes: [],
    nonFiniteReadings: 0,
  }
  withSeededRandom(seed + 2, () => {
    audio = inspectAudioPipeline(profile, frames, sink, countsByProfile)
  })
  const counts = countsByProfile.get(profile.profileId) ?? { warnings: 0, errors: 0 }
  return {
    profileId: profile.profileId,
    sourceFile: profile.sourceFile,
    video,
    audio,
    warnings: counts.warnings,
    errors: counts.errors,
  }
}

export function runInspectHarness(
  rootDir: string,
  options: InspectHarnessOptions = {},
): InspectHarnessReport {
  const frames =
    typeof options.frames === 'number' && Number.isFinite(options.frames)
      ? Math.max(1, Math.floor(options.frames))
      : 120

  const issues: InspectIssue[] = []
  const perProfileIssueCounts = new Map<string, IssuesByProfile>()
  const sink: IssueSink = {
    push(issue) {
      issues.push(issue)
    },
  }

  const loaded = loadProfileContracts(rootDir)
  issues.push(...loaded.issues)

  const profileResults: ProfileInspectResult[] = []
  let seed = 11

  for (const profile of loaded.profiles) {
    profileResults.push(inspectProfile(profile, frames, sink, perProfileIssueCounts, seed))
    seed += 3
  }

  return buildInspectReport(profileResults, issues)
}
