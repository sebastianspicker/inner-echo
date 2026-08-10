# Architecture decisions

These records capture safety and ownership boundaries that are already implemented and tested. They
are not a feature roadmap. A later change must update the affected record, its linked documentation,
and the listed verification contract in the same candidate.

| Record | Decision |
| --- | --- |
| [ADR-0001](0001-direct-user-media-activation.md) | Keep camera, microphone, and audio activation behind separate direct user actions. |
| [ADR-0002](0002-runtime-orchestration-boundaries.md) | Keep React state orchestration separate from long-lived media and rendering resources. |
| [ADR-0003](0003-production-diagnostics-boundary.md) | Keep non-error diagnostics and deliberate stress load out of production behavior. |
