export default class AngineTranslator {

	// -------------------------
	// 🔐 PRNG déterministe
	// -------------------------
	#mulberry32(seed) {
		return function () {
			let t = seed += 0x6D2B79F5;
			t = Math.imul(t ^ (t >>> 15), t | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
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
	// 🧼 utils
	// -------------------------
	#sanitize(input) {
		return input.normalize("NFKC").trim();
	}

	#capitalizeSentences(str) {
		return str.replace(/(^\s*\p{L})|([.!?]\s*\p{L})/gu, m => m.toUpperCase());
	}

	// 🔥 mutation klingon
	#mutate(s, r) {
		if (r() < 0.25) s = s.toUpperCase();
		if (r() < 0.2) s += "'";
		if (r() < 0.1) s = s.replace(/[aeiou]/g, "");
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
		const pick = arr => arr[Math.floor(r() * arr.length)];

		const intensity =
			((input.length % 100) / 100) * 0.7 + r() * 0.3;

		// -------------------------
		// 🔊 PHONEMES BOOSTÉS
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
		// 🔥 PULSE ENGINE
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
		// 🧠 WORD ENGINE V2
		// -------------------------
		const makeWord = (word) => {

			const baseLen = Math.max(1, Math.min(4, Math.ceil(word.length / 2)));

			let parts = [];

			for (let i = 0; i < baseLen; i++) {

				let chunk;

				// mix syllable / roll
				if (r() < 0.25 * intensity) {
					chunk = pick(rolls);
					pushPulse(chunk, "roll", 1.0, 0.18);
				} else {
					chunk = pick(syllables);
					pushPulse(chunk, "syllable", 0.7, 0.12);
				}

				chunk = this.#mutate(chunk, r);

				parts.push(chunk);

				// insertion de stop interne
				if (r() < intensity * 0.4) {
					const stop = pick(stops);
					parts.push(stop);
					pushPulse(stop, "stop", 1.0, 0.07);
				}
			}

			// duplication sauvage
			if (r() < intensity * 0.25) {
				const last = parts[parts.length - 1];
				parts.push(last);
				pushPulse(last, "repeat", 0.6, 0.1);
			}

			return parts.join("");
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

			// spacing = respiration
			if (token === ",") t += 0.15;
			else if (token === ".") t += 0.3;
			else if (token === "?") t += 0.35;
			else if (token === "!") t += 0.35;
			else t += 0.2;

			return token;
		});

		const text = output.join(" ");

		return {
			text: this.#capitalizeSentences(text),
			pulses
		};
	}
}
