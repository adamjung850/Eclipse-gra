export class SoundSynthesizer {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  play(type) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;

      switch (type) {
        case 'dirt':
          this.playNoise(t, 0.06, 180, 40, 'lowpass');
          break;

        case 'stone':
          this.playTone(t, 0.05, 520, 260, 'triangle', 0.15);
          this.playNoise(t, 0.04, 800, 300, 'bandpass');
          break;

        case 'wood':
          this.playTone(t, 0.08, 220, 90, 'square', 0.12);
          break;

        case 'glass':
          this.playTone(t, 0.12, 1200, 1600, 'sine', 0.15);
          break;

        case 'break':
          this.playNoise(t, 0.15, 600, 80, 'lowpass');
          this.playTone(t, 0.12, 160, 40, 'sawtooth', 0.2);
          break;

        case 'place':
          this.playTone(t, 0.05, 340, 180, 'triangle', 0.18);
          break;

        case 'jump':
          this.playTone(t, 0.14, 150, 380, 'sine', 0.12);
          break;

        case 'pickup':
          this.playTone(t, 0.08, 587, 880, 'sine', 0.12);
          this.playTone(t + 0.06, 0.12, 880, 1174, 'sine', 0.14);
          break;
      }
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  playTone(startTime, duration, startFreq, endFreq, wave, volume) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = wave;
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), startTime + duration);

    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  playNoise(startTime, duration, freq, endFreq, filterType) {
    if (!this.ctx) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(freq, startTime);
    filter.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), startTime + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(startTime);
    noise.stop(startTime + duration);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }
}
