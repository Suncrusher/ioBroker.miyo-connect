abstract class AbstractService {
	host: string;
	readonly apiPath = "/api/";
	constructor(host: string) {
		this.host = host;
	}
}
export = AbstractService;
