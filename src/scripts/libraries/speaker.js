import meSpeak from "mespeak";
import configData from "mespeak/src/mespeak_config.json";
import frVoice from "mespeak/voices/ca.json";

export default class AngineSpeaker {
	#onAnalysisUpdate;
	#audioCtx;
	#currentSource = null;

	#analyser;
	#dataArray;

	// FX
	#disto;

	// FLANGER
	#delay;
	#feedback;
	#wetGain;
	#dryGain;

	// PHASER
	#phaser;

	// LFO
	#lfo;
	#lfoGain;

	constructor(onAnalysisUpdate = null) {
		this.#onAnalysisUpdate = onAnalysisUpdate;

		this.#audioCtx = new (window.AudioContext || window.webkitAudioContext)();

		this.#analyser = this.#audioCtx.createAnalyser();
		this.#analyser.fftSize = 256;
		this.#dataArray = new Uint8Array(this.#analyser.frequencyBinCount);

		// FX init
		this.#disto = this.#audioCtx.createWaveShaper();

		this.#delay = this.#audioCtx.createDelay();
		this.#feedback = this.#audioCtx.createGain();
		this.#wetGain = this.#audioCtx.createGain();
		this.#dryGain = this.#audioCtx.createGain();

		this.#phaser = this.#audioCtx.createBiquadFilter();

		this.#lfo = this.#audioCtx.createOscillator();
		this.#lfoGain = this.#audioCtx.createGain();

		this.#initVoice();
		this.#setupGraph();
		this.#startAnalysisLoop();
	}

	#initVoice() {
		try {
			meSpeak.loadConfig(configData);
			meSpeak.loadVoice(frVoice);
			// meSpeak.config.dict = "";
		} catch (e) {
			console.warn("meSpeak init warning (ignored):", e);
		}
	}

	#setupGraph() {
		// -------------------------
		// 🔥 DISTORTION
		// -------------------------
		this.#disto.curve = this.#makeDistortionCurve(100);

		// -------------------------
		// 🌊 FLANGER
		// -------------------------
		this.#delay.delayTime.value = 0.004; // base 4ms

		this.#feedback.gain.value = 0.6;

		this.#wetGain.gain.value = 0.7;
		this.#dryGain.gain.value = 0.7;

		// -------------------------
		// 🌪 PHASER (optionnel mais nice)
		// -------------------------
		this.#phaser.type = "allpass";
		this.#phaser.frequency.value = 1200;
		this.#phaser.Q.value = 8;

		// -------------------------
		// 🎚 LFO (flanger)
		// -------------------------
		this.#lfo.type = "sine";
		this.#lfo.frequency.value = 1.25; // vitesse

		this.#lfoGain.gain.value = 0.003; // profondeur (~3ms)

		this.#lfo.connect(this.#lfoGain);
		this.#lfoGain.connect(this.#delay.delayTime);

		this.#lfo.start();

		// -------------------------
		// 🔁 ROUTING
		// -------------------------

		// DRY
		this.#disto.connect(this.#dryGain);
		this.#dryGain.connect(this.#phaser);

		// WET (flanger)
		this.#disto.connect(this.#delay);
		this.#delay.connect(this.#wetGain);
		this.#wetGain.connect(this.#phaser);

		// feedback loop
		this.#delay.connect(this.#feedback);
		this.#feedback.connect(this.#delay);

		// sortie
		this.#phaser.connect(this.#analyser);
		this.#analyser.connect(this.#audioCtx.destination);
	}

	#makeDistortionCurve(amount) {
		const n = 44100;
		const curve = new Float32Array(n);

		for (let i = 0; i < n; i++) {
			const x = (i * 2) / n - 1;
			curve[i] = ((3 + amount) * x) / (Math.PI + amount * Math.abs(x));
		}

		return curve;
	}

	stop() {
		if (!this.#currentSource) return;
		try {
			this.#currentSource.stop();
		} catch {}
		this.#currentSource = null;
	}

	async speak(text) {
		this.stop();

		if (this.#audioCtx.state === "suspended") {
			await this.#audioCtx.resume();
		}

		const rawAudio = meSpeak.speak(text, {
			rawdata: "arraybuffer",
			speed: 70,
			pitch: 25,
		});

		if (!rawAudio) {
			console.error("Échec de la synthèse vocale.");
			return;
		}

		const buffer = await this.#audioCtx.decodeAudioData(rawAudio);

		return new Promise((resolve) => {
			const source = this.#audioCtx.createBufferSource();
			source.buffer = buffer;

			this.#currentSource = source;

			source.connect(this.#disto);

			source.onended = () => {
				if (this.#currentSource === source) {
					this.#currentSource = null;
				}
				resolve();
			};

			source.start();
		});
	}

	#startAnalysisLoop() {
		const tick = () => {
			this.#analyser.getByteFrequencyData(this.#dataArray);

			let bass = 0;
			let treble = 0;
			let vol = 0;

			for (let i = 0; i < this.#dataArray.length; i++) {
				const v = this.#dataArray[i];

				vol += v;
				if (i < 12) bass += v;
				if (i > 65) treble += v;
			}

			this.#onAnalysisUpdate?.({
				volume: vol / this.#dataArray.length,
				bass: bass / 12,
				treble: treble / 60
			});

			requestAnimationFrame(tick);
		};

		tick();
	}
}
