import "./libraries/helpers";
import AngineTranslator from "./libraries/translator";
import AngineSpeaker from "./libraries/speaker";




({

	speaker: null,
	translator: null,


	input: null,
	output: null,
	listen: null,


	init: async function () {
		this.translator = new AngineTranslator;
		
		this.speaker = new AngineSpeaker((data) => {
			document.documentElement.style.setProperty('--volume', data.volume / 255 * 0.75);
			document.documentElement.style.setProperty('--bass', data.bass / 255 * 0.75);
			document.documentElement.style.setProperty('--treble', data.treble / 255 * 1.5);
		});

		await documentReady(() => this.initUI());
	},



	initUI: function() {
		this.input = document.querySelector(".input > :nth-child(1)");
		this.output = document.querySelector(".input > :nth-child(2)");
		this.listen = document.querySelector(".input > :nth-child(3)");


		this.input.addEventListener("input", e => this.inputChanged(e.target.value.trim()));
		this.listen.addEventListener("click", async () => {
			await this.speaker.speak(this.output.value);
		});

	},


	inputChanged: function(text) {
		if(text) {
			this.output.value = this.translator.generate(text);
		}
	}



}).init();