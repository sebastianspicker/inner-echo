# Architecture decisions

These records capture safety and ownership boundaries that are already implemented and tested. They
are not a roadmap. If a later change affects one, update the record, its linked docs, and the
verification contract in the same candidate.

| Record | Decision |
| --- | --- |
| [ADR-0001](0001-direct-user-media-activation.md) | Keep camera, microphone, and audio activation behind separate direct user actions. |
| [ADR-0002](0002-runtime-orchestration-boundaries.md) | Superseded by ADR-0004. React hooks drove long-lived resources through mutable refs. |
| [ADR-0003](0003-production-diagnostics-boundary.md) | Keep non-error diagnostics and deliberate stress load out of production behavior. |
| [ADR-0004](0004-media-session-ownership.md) | One per-workspace runtime session owns camera, sound, microphone, and overlay resources. |
