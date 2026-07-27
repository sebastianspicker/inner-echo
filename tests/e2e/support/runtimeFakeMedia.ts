import type { Page } from 'playwright'

const FAKE_MEDIA_SETUP = `
  (() => {
    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices) return;
    const w = window;
    if (!w.__ieOrigGetUserMedia) w.__ieOrigGetUserMedia = mediaDevices.getUserMedia.bind(mediaDevices);
    if (!w.__ieE2eCanvas) {
      const c = document.createElement('canvas');
      c.width = 640; c.height = 480;
      const ctx = c.getContext('2d'); let t = 0;
      const tick = () => {
        if (!ctx) return;
        t += 0.03; ctx.fillStyle = '#101827'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.fillStyle = '#7bc8c0'; const x = (Math.sin(t) * 0.4 + 0.5) * (c.width - 140);
        ctx.fillRect(x, 170, 140, 100); ctx.fillStyle = '#c7d2fe'; ctx.font = '20px sans-serif';
        ctx.fillText('inner-echo runtime matrix cam', 16, 32); w.__ieE2eRaf = requestAnimationFrame(tick);
      };
      tick(); w.__ieE2eCanvas = c;
    }
    if (!w.__ieE2eAudioRoot) {
      const AudioContextCtor = w.AudioContext || w.webkitAudioContext;
      if (AudioContextCtor) {
        const audioCtx = new AudioContextCtor(); const oscillator = audioCtx.createOscillator();
        const gain = audioCtx.createGain(); const destination = audioCtx.createMediaStreamDestination();
        oscillator.type = 'sine'; oscillator.frequency.value = 220; gain.gain.value = 0.0001;
        oscillator.connect(gain); gain.connect(destination); oscillator.start();
        w.__ieE2eAudioRoot = { audioCtx, oscillator, gain, destination };
      } else w.__ieE2eAudioRoot = null;
    }
    mediaDevices.getUserMedia = async (constraints) => {
      if (constraints.video) return w.__ieE2eCanvas.captureStream(30);
      if (constraints.audio) {
        const audioTrack = w.__ieE2eAudioRoot?.destination?.stream?.getAudioTracks?.()[0];
        if (!audioTrack) throw new DOMException('Synthetic microphone unavailable in runtime matrix', 'NotSupportedError');
        return new MediaStream([audioTrack.clone()]);
      }
      return w.__ieOrigGetUserMedia(constraints);
    };
  })()
`

export async function installRuntimeFakeMedia(page: Page): Promise<void> {
  await page.evaluate(FAKE_MEDIA_SETUP)
}
