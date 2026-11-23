export class SoundSynthesizer {
    ctx = null;
    isMuted = false;
    constructor() {
        // AudioContext will be lazily initialized on first user interaction
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
        if (this.isMuted)
            return;
        this.initContext();
        if (!this.ctx)
            return;
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
                    // Sparkly 2-tone chime
                    this.playTone(t, 0.08, 587, 880, 'sine', 0.12);
                    this.playTone(t + 0.06, 0.12, 880, 1174, 'sine', 0.14);
                    break;
                case 'sword_swing':
                    this.playNoise(t, 0.09, 900, 200, 'bandpass');
                    this.playTone(t, 0.08, 320, 120, 'sine', 0.1);
                    break;
                case 'hit_enemy':
                    this.playNoise(t, 0.08, 350, 60, 'lowpass');
                    this.playTone(t, 0.1, 180, 50, 'triangle', 0.22);
                    break;
                case 'hit_crit':
                    // High piercing impact + chime
                    this.playTone(t, 0.12, 750, 950, 'sawtooth', 0.18);
                    this.playTone(t + 0.03, 0.15, 1200, 1500, 'sine', 0.2);
                    this.playNoise(t, 0.1, 500, 80, 'lowpass');
                    break;
                case 'player_hurt':
                    this.playTone(t, 0.18, 140, 45, 'sawtooth', 0.25);
                    this.playNoise(t, 0.12, 280, 50, 'lowpass');
                    break;
                case 'enemy_die':
                    this.playNoise(t, 0.22, 450, 40, 'lowpass');
                    this.playTone(t, 0.2, 220, 40, 'triangle', 0.18);
                    break;
                case 'bow_shoot':
                    this.playTone(t, 0.08, 380, 140, 'triangle', 0.15);
                    this.playNoise(t, 0.05, 1200, 600, 'bandpass');
                    break;
                case 'magic_cast':
                    this.playTone(t, 0.14, 440, 880, 'sine', 0.15);
                    this.playTone(t + 0.05, 0.18, 660, 1320, 'sine', 0.12);
                    break;
                case 'level_up':
                    // Victorious arpeggio
                    this.playTone(t, 0.1, 440, 554, 'triangle', 0.18);
                    this.playTone(t + 0.09, 0.1, 554, 659, 'triangle', 0.18);
                    this.playTone(t + 0.18, 0.22, 659, 880, 'sine', 0.22);
                    break;
            }
        }
        catch (e) {
            // Audio autoplay policy fallback
        }
    }
    playTone(startTime, duration, startFreq, endFreq, wave, volume) {
        if (!this.ctx)
            return;
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
        if (!this.ctx)
            return;
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
