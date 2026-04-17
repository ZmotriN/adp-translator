import "./libraries/helpers";

import AngineTranslator from "./libraries/translator";
import AngineSpeaker from "./libraries/speaker";
import Smoother from "./libraries/smoother";


({ // ==>>> Angine de Poitrine Universal Translator

	speaker: null,
	translator: null,

	input: null,
	output: null,
	listen: null,


	init: async function () {
		documentReady(() => this.initUI());
		this.translator = new AngineTranslator;
		let lastVolume = 0, lastTreble = 0, lastBass = 0;
		const slideVolume = new Smoother({up: 0.8, down: 0.4});
		const slideTreble = new Smoother({up: 0.8, down: 0.4});
		const slideBass = new Smoother({up: 0.8, down: 0.4});
		this.speaker = new AngineSpeaker((data) => {
			const volume = slideVolume(data.volume / 255 * 0.75).toFixed(3);
			if(volume != lastVolume){
				lastVolume = volume;
				document.documentElement.style.setProperty('--volume', volume);
			}
			const treble = slideTreble(data.treble / 255 * 1.5).toFixed(3);
			if(treble != lastTreble){
				lastTreble = treble;
				document.documentElement.style.setProperty('--treble', treble);
			}
			const bass = slideTreble(data.bass / 255 * 0.75).toFixed(3);
			if(bass != lastBass){
				lastBass = bass;
				document.documentElement.style.setProperty('--bass', bass);
			}
		});
	},


	initUI: function() {
		this.input = document.querySelector(".input > :nth-child(1)");
		this.output = document.querySelector(".input > :nth-child(2)");
		this.listen = document.querySelector(".input > :nth-child(3)");
		this.input.addEventListener("input", e => this.inputChanged(e.target.value.trim()));
		this.listen.addEventListener("click", async () => { await this.speaker.speak(this.output.value); });
		this.input.focus();
	},


	inputChanged: function(text) {
		this.output.value = text ? this.translator.generate(text) : "";
	}

}).init();