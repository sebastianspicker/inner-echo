import type { Profile } from '../../../domain/experience/schema'

export function ExperienceFraming({
  profile,
  isLoading,
}: {
  profile: Pick<Profile, 'summary'> | null
  isLoading: boolean
}) {
  return (
    <section className="ie-experienceFraming" aria-label="About this interpretation">
      {!isLoading && (
        <p className="ie-gloss">
          {profile?.summary.trim() || 'No experience description is available.'}
        </p>
      )}
      <p className="composer__hint">
        Visual and sound choices are artistic interpretations. Experiences vary from person to
        person.
      </p>
      <details className="composer__advanced">
        <summary>What the evidence supports</summary>
        <p className="composer__hint">
          Sources describe reported experiences and research findings. Evidence ratings concern
          those descriptions, not validation of these effects. This is not a reproduction of
          anyone’s experience or a diagnostic tool.
        </p>
      </details>
    </section>
  )
}
