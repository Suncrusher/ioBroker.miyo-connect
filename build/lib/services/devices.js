"use strict";
const AbstractService = require("./abstractService");
class Devices extends AbstractService {
    constructor(host) {
        super(host);
        this.data = {};
    }
}
module.exports = Devices;
//# sourceMappingURL=devices.js.map