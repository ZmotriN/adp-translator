export default class Smoother extends Function {
	#up;
	#down;
	#value;

	constructor({
		up = 0.2,
		down = 0.05,
		initial = 0
	} = {}) {
		super("value", "return this._call(value)");

		this.#up = up;
		this.#down = down;
		this.#value = initial;

		return this.bind(this);
	}

	_call(input) {
		const delta = input - this.#value;
		this.#value += delta * (delta > 0 ? this.#up : this.#down);
		return this.#value;
	}

	reset(v = 0) {
		this.#value = v;
	}
}
