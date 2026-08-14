process.env.BASE_PATH ??= '/inner-echo/'
process.env.DEMO_PATH ??= 'demo/'
process.env.PREVIEW_SCRIPT ??= 'pages:preview'

await import('./preview.e2e.mjs')
