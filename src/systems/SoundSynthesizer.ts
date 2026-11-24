export class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  // Background Music (BGM)
  private musicGainNode: GainNode | null = null;
  private isMusicMuted: boolean = false;
  private isMusicRunning: boolean = false;
  private musicInterval: any = null;
  private nextStepTime: number = 0;
  private musicStep: number = 0;
  public musicMode: 'ambient' | 'boss' = 'ambient';

  constructor() {
    // AudioContext will be lazily initialized on first user interaction
  }

  private initContext(): void {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.musicGainNode = this.ctx.createGain();
        this.musicGainNode.gain.setValueAtTime(0.075, this.ctx.currentTime);
        this.musicGainNode.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public play(type: string): void {
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
          // Sparkly 2-tone chime
          this.playTone(t, 0.08, 587, 880, 'sine', 0.12);
          this.playTone(t + 0.06, 0.12, 880, 1174, 'sine', 0.14);
          break;

        case 'sword_swing':
          // Authentic acoustic blade whoosh (bandpassed pink/brown air slice)
          this.playNoise(t, 0.12, 1400, 240, 'bandpass', 0.28);
          this.playTone(t, 0.09, 220, 95, 'sine', 0.12);
          break;

        case 'hit_enemy':
          // Realistic visceral weapon strike (transient snap + mid flesh/armor crunch + low punch)
          this.playNoise(t, 0.022, 2800, 1600, 'highpass', 0.42); // Sharp blade/edge contact snap
          this.playNoise(t, 0.085, 520, 75, 'bandpass', 0.40);    // Organic body crunch
          this.playTone(t, 0.075, 145, 38, 'triangle', 0.38);    // Dense physical body mass punch
          break;

        case 'hit_crit':
          // Brutal heavy critical strike (metallic bite + dense shatter + sub-bass concussion)
          this.playNoise(t, 0.035, 2200, 1100, 'bandpass', 0.48); // Sharp metallic bite
          this.playNoise(t, 0.13, 850, 45, 'lowpass', 0.50);      // Crushing bone/armor fracture
          this.playTone(t, 0.14, 95, 20, 'triangle', 0.58);      // Deep physical sub-bass concussion
          break;

        case 'hit_stone':
          // Realistic physical impact on ancient mossy granite / Vormak stone carapace
          this.playNoise(t, 0.025, 3400, 2100, 'highpass', 0.45); // Steel-on-granite spark transient
          this.playNoise(t, 0.10, 1100, 160, 'bandpass', 0.48);   // Chisel fracture rock crunch
          this.playTone(t, 0.11, 120, 32, 'triangle', 0.45);     // Deep subterranean granite mass thud
          break;

        case 'player_hurt':
          // Realistic blunt force physical impact to the player
          this.playNoise(t, 0.11, 420, 50, 'lowpass', 0.42);
          this.playTone(t, 0.12, 125, 28, 'triangle', 0.45);
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

        case 'boss_emerge':
          // Tremendous earthquake rupture & stone shattering (Deep sub-bass quake)
          this.playTone(t, 0.80, 52, 16, 'triangle', 0.62);
          this.playTone(t, 0.75, 110, 24, 'sawtooth', 0.55);
          this.playNoise(t, 0.70, 380, 25, 'lowpass', 0.55);
          this.playNoise(t + 0.05, 0.55, 1400, 160, 'bandpass', 0.46);
          break;

        case 'boss_burrow':
          // Deep seismic ground crush & cavern resonance
          this.playTone(t, 0.65, 120, 20, 'triangle', 0.58);
          this.playNoise(t, 0.60, 320, 30, 'lowpass', 0.52);
          this.playNoise(t + 0.04, 0.45, 800, 90, 'bandpass', 0.42);
          break;

        case 'boss_roar':
          // Apocalyptic beast roar: dual detuned sawtooth + sub-harmonic growl + guttural noise
          this.playTone(t, 1.15, 160, 36, 'sawtooth', 0.55);
          this.playTone(t + 0.02, 1.10, 168, 40, 'sawtooth', 0.50);
          this.playTone(t, 1.20, 58, 20, 'triangle', 0.58);
          this.playNoise(t + 0.04, 0.95, 880, 80, 'bandpass', 0.45);
          break;

        case 'boss_warn':
          // Ominous seismic heartbeat thuds and low dread pulse
          this.playTone(t, 0.18, 52, 24, 'triangle', 0.55);
          this.playTone(t + 0.14, 0.20, 46, 22, 'triangle', 0.58);
          this.playTone(t, 0.35, 146.8, 138.6, 'sawtooth', 0.28); // D3 -> C#3 sinister tritone tension
          break;
      }
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  private playTone(
    startTime: number,
    duration: number,
    startFreq: number,
    endFreq: number,
    wave: OscillatorType,
    volume: number
  ): void {
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

  private playNoise(
    startTime: number,
    duration: number,
    freq: number,
    endFreq: number,
    filterType: BiquadFilterType,
    volume: number = 0.18
  ): void {
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
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(startTime);
    noise.stop(startTime + duration);
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  // =========================================================================
  // ATMOSPHERIC RETRO CHIPTUNE / AMBIENT BACKGROUND MUSIC
  // =========================================================================

  public startMusic(): void {
    if (this.isMusicRunning) return;
    this.initContext();
    if (!this.ctx) return;

    this.isMusicRunning = true;
    this.nextStepTime = this.ctx.currentTime + 0.1;
    this.musicStep = 0;

    // Run scheduler loop every 120ms
    this.musicInterval = setInterval(() => {
      this.schedulerTick();
    }, 120);
  }

  public stopMusic(): void {
    this.isMusicRunning = false;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  public toggleMusic(): boolean {
    this.isMusicMuted = !this.isMusicMuted;
    if (this.musicGainNode && this.ctx) {
      const targetVolume = this.isMusicMuted ? 0 : (this.musicMode === 'boss' ? 0.28 : 0.08);
      this.musicGainNode.gain.setTargetAtTime(targetVolume, this.ctx.currentTime, 0.05);
    }
    return !this.isMusicMuted;
  }

  public setMusicMode(mode: 'ambient' | 'boss'): void {
    if (this.musicMode === mode) return;
    this.musicMode = mode;
    this.musicStep = 0;
    if (this.ctx) {
      this.nextStepTime = this.ctx.currentTime + 0.05;
      if (this.musicGainNode && !this.isMusicMuted) {
        // High volume for loud, imposing cinematic dark boss score
        const targetVol = mode === 'boss' ? 0.32 : 0.08;
        this.musicGainNode.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.05);
      }
    }
  }

  private schedulerTick(): void {
    if (!this.ctx || !this.isMusicRunning) return;

    const isBoss = this.musicMode === 'boss';
    const stepDuration = isBoss ? 0.35 : 0.35; // 0.35s per beat for dark cinematic march
    const scheduleAheadTime = 0.6;

    while (this.nextStepTime < this.ctx.currentTime + scheduleAheadTime) {
      if (isBoss) {
        this.playBossStepNotes(this.musicStep, this.nextStepTime);
      } else {
        this.playStepNotes(this.musicStep, this.nextStepTime);
      }
      this.nextStepTime += stepDuration;
      this.musicStep = (this.musicStep + 1) % (isBoss ? 32 : 64);
    }
  }

  private playStepNotes(step: number, time: number): void {
    // 64-step peaceful ambient loop (C Major / A Minor)
    // Warm chords, soft bass, and chiptune/celesta arpeggio melody
    switch (step) {
      // --- MEASURE 0 (Am) ---
      case 0:
        this.playMusicNote(110.0, time, 1.4, 0.08, 'triangle'); // Bass A2
        this.playMusicNote(220.0, time, 0.9, 0.04, 'sine');     // A3
        this.playMusicNote(261.6, time + 0.02, 0.8, 0.04, 'sine'); // C4
        this.playMusicNote(329.6, time + 0.04, 0.8, 0.04, 'sine'); // E4
        break;
      case 2:
        this.playMusicNote(523.3, time, 0.5, 0.045, 'sine'); // C5 chime
        break;
      case 4:
        this.playMusicNote(440.0, time, 0.6, 0.04, 'sine');  // A4
        break;
      case 6:
        this.playMusicNote(493.9, time, 0.5, 0.04, 'sine');  // B4

      // --- MEASURE 1 (F) ---
      case 8:
        this.playMusicNote(87.3, time, 1.4, 0.08, 'triangle'); // Bass F2
        this.playMusicNote(174.6, time, 0.9, 0.04, 'sine');    // F3
        this.playMusicNote(261.6, time + 0.02, 0.8, 0.04, 'sine'); // C4
        break;
      case 10:
        this.playMusicNote(440.0, time, 0.5, 0.045, 'sine'); // A4
        break;
      case 12:
        this.playMusicNote(523.3, time, 0.5, 0.05, 'sine');  // C5
        break;
      case 14:
        this.playMusicNote(587.3, time, 0.6, 0.045, 'sine'); // D5

      // --- MEASURE 2 (C) ---
      case 16:
        this.playMusicNote(130.8, time, 1.4, 0.08, 'triangle'); // Bass C3
        this.playMusicNote(261.6, time, 0.9, 0.04, 'sine');     // C4
        this.playMusicNote(329.6, time + 0.02, 0.8, 0.04, 'sine'); // E4
        this.playMusicNote(392.0, time + 0.04, 0.8, 0.04, 'sine'); // G4
        break;
      case 18:
        this.playMusicNote(659.3, time, 0.6, 0.05, 'sine');  // E5
        break;
      case 20:
        this.playMusicNote(587.3, time, 0.5, 0.045, 'sine'); // D5
        break;
      case 22:
        this.playMusicNote(523.3, time, 0.7, 0.05, 'sine');  // C5

      // --- MEASURE 3 (G) ---
      case 24:
        this.playMusicNote(98.0, time, 1.4, 0.08, 'triangle');  // Bass G2
        this.playMusicNote(196.0, time, 0.9, 0.04, 'sine');     // G3
        this.playMusicNote(246.9, time + 0.02, 0.8, 0.04, 'sine'); // B3
        this.playMusicNote(293.7, time + 0.04, 0.8, 0.04, 'sine'); // D4
        break;
      case 26:
        this.playMusicNote(493.9, time, 0.5, 0.045, 'sine'); // B4
        break;
      case 28:
        this.playMusicNote(392.0, time, 0.6, 0.04, 'sine');  // G4
        break;
      case 30:
        this.playMusicNote(440.0, time, 0.7, 0.045, 'sine'); // A4

      // --- MEASURE 4 (Am Lead Melody) ---
      case 32:
        this.playMusicNote(110.0, time, 1.4, 0.08, 'triangle'); // Bass A2
        this.playMusicNote(329.6, time, 0.9, 0.04, 'sine');     // E4
        this.playMusicNote(659.3, time, 0.7, 0.055, 'sine');    // High E5
        break;
      case 34:
        this.playMusicNote(587.3, time, 0.5, 0.045, 'sine'); // D5
        break;
      case 36:
        this.playMusicNote(523.3, time, 0.7, 0.05, 'sine');  // C5
        break;
      case 38:
        this.playMusicNote(440.0, time, 0.8, 0.045, 'sine'); // A4

      // --- MEASURE 5 (Em Melody) ---
      case 40:
        this.playMusicNote(82.4, time, 1.4, 0.08, 'triangle');  // Bass E2
        this.playMusicNote(246.9, time, 0.8, 0.04, 'sine');     // B3
        this.playMusicNote(392.0, time, 0.8, 0.045, 'sine');    // G4
        break;
      case 42:
        this.playMusicNote(493.9, time, 0.5, 0.045, 'sine'); // B4
        break;
      case 44:
        this.playMusicNote(587.3, time, 0.6, 0.05, 'sine');  // D5
        break;
      case 46:
        this.playMusicNote(659.3, time, 0.8, 0.055, 'sine'); // E5

      // --- MEASURE 6 (F Calm Descending) ---
      case 48:
        this.playMusicNote(87.3, time, 1.4, 0.08, 'triangle'); // Bass F2
        this.playMusicNote(261.6, time, 0.8, 0.04, 'sine');    // C4
        this.playMusicNote(587.3, time, 0.6, 0.05, 'sine');    // D5
        break;
      case 50:
        this.playMusicNote(523.3, time, 0.6, 0.045, 'sine'); // C5
        break;
      case 52:
        this.playMusicNote(440.0, time, 0.7, 0.045, 'sine'); // A4
        break;
      case 54:
        this.playMusicNote(392.0, time, 0.6, 0.04, 'sine');  // G4

      // --- MEASURE 7 (G Peaceful Resolution) ---
      case 56:
        this.playMusicNote(98.0, time, 1.8, 0.08, 'triangle');  // Bass G2
        this.playMusicNote(196.0, time, 1.2, 0.04, 'sine');     // G3
        this.playMusicNote(293.7, time, 1.0, 0.04, 'sine');     // D4
        this.playMusicNote(440.0, time, 0.6, 0.045, 'sine');    // A4
        break;
      case 58:
        this.playMusicNote(493.9, time, 0.7, 0.045, 'sine'); // B4
        break;
      case 60:
        this.playMusicNote(523.3, time, 1.2, 0.055, 'sine'); // C5 long warm resolve
        break;
      // Steps 61-63: Peaceful ambient breathing pause
    }
  }

  private playBossStepNotes(step: number, time: number): void {
    // 32-step Atmospheric Dark Horror / Cinematic Doom Orchestral Boss Score
    // NON-PIXELART, pure cinematic sound design: Massive BRAAMs, War Drums & Dark Strings
    switch (step) {
      // --- BAR 0: APOCALYPTIC D MINOR SWELL ---
      case 0:
        this.playCinematicBraam(time, 36.7); // Low D1 Cinematic Braam Horn
        this.playWarDrum(time, true);        // Heavy sub-bass war drum impact
        this.playAbyssAtmosphere(time, 3.8); // Sweeping cavern subterranean wind
        this.playCinematicPad([36.7, 73.4, 87.3, 110.0], time, 3.4, 0.24); // Dark Cello Dm Drone
        this.playHorrorTension(time);
        break;

      case 4:
        this.playWarDrum(time, false); // Heartbeat pulse
        break;

      case 6:
        this.playWarDrum(time, false);
        break;

      // --- BAR 1: EVIL MINOR-SECOND DISSONANCE ---
      case 8:
        this.playWarDrum(time, true); // Accent war drum
        this.playCinematicPad([38.9, 77.8, 92.5, 116.5], time, 3.2, 0.22); // Evil Eb minor pad
        this.playAbyssAtmosphere(time, 3.2);
        break;

      case 12:
        this.playWarDrum(time, false);
        break;

      case 14:
        this.playWarDrum(time, false);
        this.playHorrorTension(time);
        break;

      // --- BAR 2: G# DIMINISHED TRITONE OF DOOM ---
      case 16:
        this.playCinematicBraam(time, 51.9); // G#1 Dark Tritone Braam
        this.playWarDrum(time, true);        // Thunderous war drum
        this.playAbyssAtmosphere(time, 3.8);
        this.playCinematicPad([51.9, 73.4, 87.3, 123.5], time, 3.4, 0.25); // G# diminished dread
        break;

      case 20:
        this.playWarDrum(time, false);
        break;

      case 22:
        this.playWarDrum(time, false);
        break;

      // --- BAR 3: A7 PHRYGIAN DOMINANT CATACLYSM ---
      case 24:
        this.playWarDrum(time, true);
        this.playCinematicPad([55.0, 69.3, 98.0, 116.5], time, 3.2, 0.26); // Swelling A7b9 choir/strings
        this.playAbyssAtmosphere(time, 3.2);
        this.playHorrorTension(time);
        break;

      case 28:
        this.playWarDrum(time, false);
        break;

      case 30:
        this.playWarDrum(time, false);
        break;
    }
  }

  /**
   * Massive Cinematic "BRAAM" Trailer Horn (Inception / Hans Zimmer / DOOM).
   * Dual detuned sawtooths swept through a resonant 24dB low-pass filter into sub-sine.
   */
  private playCinematicBraam(startTime: number, baseFreq: number): void {
    if (!this.ctx || !this.musicGainNode) return;

    const duration = 1.6;

    // 1. Dual detuned sawtooth oscillators
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(baseFreq, startTime);
    osc2.frequency.setValueAtTime(baseFreq + 0.5, startTime);

    // 2. Resonant biquad lowpass filter (sweeps down from bright brass to deep subterranean growl)
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(4.0, startTime);
    filter.frequency.setValueAtTime(540, startTime);
    filter.frequency.exponentialRampToValueAtTime(70, startTime + duration);

    // 3. Sub-bass sine core for physical chest impact
    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(baseFreq, startTime);

    // 4. Gain envelope
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(0.42, startTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    subOsc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGainNode);

    osc1.start(startTime);
    osc2.start(startTime);
    subOsc.start(startTime);

    osc1.stop(startTime + duration + 0.05);
    osc2.stop(startTime + duration + 0.05);
    subOsc.stop(startTime + duration + 0.05);
  }

  /**
   * Deep acoustic orchestral war drum / taiko strike.
   */
  private playWarDrum(startTime: number, isAccent: boolean): void {
    if (!this.ctx || !this.musicGainNode) return;

    const duration = isAccent ? 0.55 : 0.38;
    const vol = isAccent ? 0.48 : 0.32;

    // Sub-bass pitch drop
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isAccent ? 58 : 50, startTime);
    osc.frequency.exponentialRampToValueAtTime(16, startTime + duration);

    // Resonant shell rumble noise
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isAccent ? 260 : 180, startTime);
    filter.frequency.exponentialRampToValueAtTime(20, startTime + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGainNode);

    osc.start(startTime);
    noise.start(startTime);
    osc.stop(startTime + duration);
    noise.stop(startTime + duration);
  }

  /**
   * Warm, dark cinematic string cluster (Cello/Contrabass dark pad).
   * Filtered through a resonant 180Hz lowpass filter to remove all electronic buzzy harmonics.
   */
  private playCinematicPad(freqs: number[], startTime: number, duration: number, volume: number): void {
    if (!this.ctx || !this.musicGainNode) return;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, startTime);
    filter.Q.setValueAtTime(2.0, startTime);

    const padGain = this.ctx.createGain();
    padGain.gain.setValueAtTime(0.0001, startTime);
    padGain.gain.linearRampToValueAtTime(volume, startTime + 0.35); // Slow majestic swell
    padGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    filter.connect(padGain);
    padGain.connect(this.musicGainNode);

    freqs.forEach(freq => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'triangle'; // Smooth acoustic-like warmth
      osc.frequency.setValueAtTime(freq, startTime);
      osc.connect(filter);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.1);
    });
  }

  /**
   * Subterranean cavern wind / atmospheric abyss breathing.
   */
  private playAbyssAtmosphere(startTime: number, duration: number): void {
    if (!this.ctx || !this.musicGainNode) return;

    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(2.2, startTime);
    filter.frequency.setValueAtTime(140, startTime);
    filter.frequency.linearRampToValueAtTime(320, startTime + duration * 0.5);
    filter.frequency.linearRampToValueAtTime(120, startTime + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(0.18, startTime + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGainNode);

    noise.start(startTime);
    noise.stop(startTime + duration);
  }

  /**
   * Subtle microtonal psychological horror tension drone.
   */
  private playHorrorTension(startTime: number): void {
    if (!this.ctx || !this.musicGainNode) return;

    const duration = 2.4;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(587.3, startTime); // D5
    osc2.frequency.setValueAtTime(593.0, startTime); // Microtonal beat frequency

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(0.026, startTime + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.musicGainNode);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration);
    osc2.stop(startTime + duration);
  }

  private playMusicNote(
    freq: number,
    startTime: number,
    duration: number,
    volume: number = 0.05,
    type: OscillatorType = 'sine'
  ): void {
    if (!this.ctx || !this.musicGainNode) return;

    const osc = this.ctx.createOscillator();
    const noteGain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    // Warm, gentle attack & decay envelope
    noteGain.gain.setValueAtTime(0.0001, startTime);
    noteGain.gain.linearRampToValueAtTime(volume, startTime + 0.035);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(noteGain);
    noteGain.connect(this.musicGainNode);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }
}
