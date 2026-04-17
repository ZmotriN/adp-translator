import { doubleMetaphone } from "double-metaphone";

export default class AngineTranslator {

	// -------------------------
	// 🔐 PRNG déterministe
	// -------------------------
	#mulberry32(seed) {
		return function () {
			let t = seed += 0x6D2B79F5;
			t = Math.imul(t ^ (t >>> 15), t | 1);
			t = Math.imul(t ^ (t >>> 7), t | 61);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	#simpleHash(str) {
		let h = 1779033703 ^ str.length;
		for (let i = 0; i < str.length; i++) {
			h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
			h = (h << 13) | (h >>> 19);
		}
		return (h >>> 0);
	}

	// -------------------------
	// 🧠 CORE STATE
	// -------------------------
	#lexicon = new Map();

	#sanitize(input) {
		return input.normalize("NFKC").trim();
	}

	#capitalizeSentences(str) {
		return str.replace(/(^\s*\p{L})|([.!?]\s*\p{L})/gu, m => m.toUpperCase());
	}

	#mutate(s, r) {
		if (r() < 0.06) s = s.toUpperCase();
		if (r() < 0.04) s += "'";
		return s;
	}

	// -------------------------
	// 🚀 API
	// -------------------------
	generate(input = "") {
		return this.generateDetailed(input).text;
	}

	generateDetailed(input = "") {

		input = this.#sanitize(input);

		const seed = this.#simpleHash(input);
		const rand = this.#mulberry32(seed);
		const r = () => rand();

		// -------------------------
		// 🔊 VOCABULARY CORE
		// -------------------------
		const syllables = [
			"qa","qe","qi","qo","qu",
			"Qa","Qe","Qi","Qo","Qu",

			"ka","ke","ki","ko","ku",
			"ga","ge","gi","go","gu",

			"ta","te","ti","to","tu",
			"da","de","di","do","du",

			"pa","pe","pi","po","pu",
			"ba","be","bi","bo","bu",

			"kra","kro","kru","kri",
			"qra","qro","qru","qri",

			"tra","tro","tru","tri",
			"dra","dro","dru","dri",

			"pra","pro","pru","pri",
			"bra","bro","bru","bri",

			"kla","klo","klu",
			"gla","glo","glu",

			"ska","sko","sku",
			"zra","zro","zru",

			"qla","qlo","qlu",
			"tqa","tqo","tqu",

			"ak","ek","ik","ok","uk",
			"aq","eq","iq","oq","uq"
		];

		const rolls = [
			"brrr","prrr","krrr","trrr","grrr","qrrr",
			"zzzz","ssss","rrrr",
			"krkr","trtr","prpr","qrqr",
			"bzbz","zgzg",
			"rrak","rruk","rrik"
		];

		const stops = [
			"kt","tk","pt","kp","pk",
			"qk","kq","tq","qt",

			"k","t","p","q",
			"kk","tt","pp","qq",

			"rk","rt","rp",
			"sk","st","sp",

			"q'","k'","t'",
			"'","''"
		];

		// -------------------------
		// 🔊 PULSES
		// -------------------------
		let pulses = [];
		let t = 0;

		const pushPulse = (value, type, energy = 1, duration = 0.1) => {
			pulses.push({
				value,
				type,
				energy,
				tStart: t,
				tEnd: t + duration
			});
			t += duration;
		};

		// -------------------------
		// 🧠 WORD ENGINE (PHONETIC STABLE)
		// -------------------------
		const makeWord = (word) => {

			const clean = word.toLowerCase();

			// 🧠 double metaphone (browser-safe lib)
			const phon = (doubleMetaphone(clean)[0] || clean).toLowerCase();

			// 🔒 stable lexicon
			if (this.#lexicon.has(phon)) {
				return this.#lexicon.get(phon);
			}

			const wordSeed = this.#simpleHash(phon);
			const randLocal = this.#mulberry32(wordSeed);
			const r2 = () => randLocal();

			const pickLocal = (arr) =>
				arr[Math.floor(r2() * arr.length)];

			// 📏 structure stable
			const len = Math.max(1, Math.min(3, Math.ceil(clean.length / 3)));

			let parts = [];

			for (let i = 0; i < len; i++) {

				let chunk;

				if (r2() < 0.18) {
					chunk = pickLocal(rolls);
					pushPulse(chunk, "roll", 0.9, 0.15);
				} else {
					chunk = pickLocal(syllables);
					pushPulse(chunk, "syllable", 0.7, 0.12);
				}

				chunk = this.#mutate(chunk, r2);
				parts.push(chunk);

				if (r2() < 0.14) {
					const stop = pickLocal(stops);
					parts.push(stop);
					pushPulse(stop, "stop", 0.9, 0.06);
				}
			}

			// 🔁 natural repetition effect
			if (r2() < 0.15) {
				const last = parts[parts.length - 1];
				parts.push(last);
				pushPulse(last, "repeat", 0.6, 0.1);
			}

			const result = parts.join("");

			this.#lexicon.set(phon, result);

			return result;
		};

		// -------------------------
		// TOKENIZER
		// -------------------------
		const tokens =
			input.match(/[\p{L}\p{N}]+|[^\p{L}\p{N}\s]+/gu) || [];

		const output = tokens.map(token => {

			if (/^[\p{L}\p{N}]+$/u.test(token)) {
				return makeWord(token);
			}

			// punctuation timing
			if (token === ",") t += 0.15;
			else if (token === ".") t += 0.3;
			else if (token === "?") t += 0.35;
			else if (token === "!") t += 0.35;
			else t += 0.2;

			return token;
		});

		return {
			text: this.#capitalizeSentences(output.join(" ")),
			pulses
		};
	}
}
