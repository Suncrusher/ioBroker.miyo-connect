import AbstractService = require("./abstractService");

class Devices extends AbstractService {
	data = {};

	constructor(host: string) {
		super(host);
	}
}
export = Devices;
