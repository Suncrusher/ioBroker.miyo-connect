import AbstractService = require("./abstractService");

class Circuits extends AbstractService {
	data = {};

	constructor(host: string) {
		super(host);
	}
}
export = Circuits;
