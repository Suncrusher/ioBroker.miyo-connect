"use strict";
/*
 * Created with @iobroker/create-adapter v1.34.1
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = __importStar(require("@iobroker/adapter-core"));
const Devices = require("./lib/services/devices");
const Circuits = require("./lib/services/circuits");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const axios = require("axios").default;
// Load your modules here, e.g.:
// import * as fs from "fs";
class MiyoConnect extends utils.Adapter {
    constructor(options = {}) {
        super({
            ...options,
            name: "miyo-connect",
        });
        this.on("ready", this.onReady.bind(this));
        this.on("stateChange", this.onStateChange.bind(this));
        // this.on("objectChange", this.onObjectChange.bind(this));
        // this.on("message", this.onMessage.bind(this));
        this.on("unload", this.onUnload.bind(this));
    }
    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        // Initialize your adapter here
        // Reset the connection indicator during startup
        this.setState("info.connection", false, true);
        // The adapters config (in the instance object everything under the attribute "native") is accessible via
        // this.config:
        this.log.info("config host: " + this.config.host);
        this.log.info("config apiKey: " + this.config.apiKey);
        /*
        For every state in the system there has to be also an object of type state
        Here a simple template for a boolean variable named "testVariable"
        Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
        */
        /*await this.setObjectNotExistsAsync("testVariable", {
            type: "state",
            common: {
                name: "testVariable",
                type: "boolean",
                role: "indicator",
                read: true,
                write: true,
            },
            native: {},
        });*/
        await this.setObjectNotExistsAsync("miyo", {
            type: "state",
            common: {
                name: "miyo",
                type: "number",
                role: "indicator",
                read: true,
                write: true,
            },
            native: {},
        });
        await this.setObjectNotExistsAsync("devices", {
            type: "folder",
            common: {
                name: "devices",
                type: "device",
                role: "meta",
                read: true,
                write: true,
            },
            native: {},
        });
        await this.setObjectNotExistsAsync("circuits", {
            type: "folder",
            common: {
                name: "circuits",
                type: "device",
                role: "meta",
                read: true,
                write: true,
            },
            native: {},
        });
        // In order to get state updates, you need to subscribe to them. The following line adds a subscription for our variable we have created above.
        ///this.subscribeStates("testVariable");
        // You can also add a subscription for multiple states. The following line watches all states starting with "lights."
        // this.subscribeStates("lights.*");
        // Or, if you really must, you can also watch all states. Don't do this if you don't need to. Otherwise this will cause a lot of unnecessary load on the system:
        // this.subscribeStates("*");
        /*
            setState examples
            you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
        */
        // the variable testVariable is set to true as command (ack=false)
        await this.setStateAsync("testVariable", true);
        // same thing, but the value is flagged "ack"
        // ack should be always set to true if the value is received from or acknowledged from the target system
        await this.setStateAsync("testVariable", { val: true, ack: true });
        // same thing, but the state is deleted after 30s (getState will return null afterwards)
        //await this.setStateAsync("testVariable", { val: true, ack: true, expire: 30 });
        // examples for the checkPassword/checkGroup functions
        let result = await this.checkPasswordAsync("admin", "iobroker");
        this.log.info("check user admin pw iobroker: " + result);
        result = await this.checkGroupAsync("admin", "admin");
        this.log.info("check group user admin group admin: " + result);
        await this.getDeviceList();
        await this.getCircuitList();
    }
    async getDeviceList() {
        // The adapters config (in the instance object everything under the attribute "native") is accessible via
        // this.config:
        const url = this.config.host + "/api/device/all?apiKey=" + this.config.apiKey;
        this.log.info("Miyo devices URL: " + url);
        axios
            .get(url)
            .then(async (response) => {
            // handle success
            //console.log(response.data);
            //console.log(response.status);
            //console.log(response.statusText);
            //console.log(response.headers);
            //console.log(response.config);
            this.log.info("All devices data: " + JSON.stringify(response.data, null, "  "));
            this.setStateAsync("miyo", response.status);
            const devices = new Devices(this.config.host);
            devices.data = response.data;
            for (const deviceId in response.data.params.devices) {
                const device = response.data.params.devices[deviceId];
                const id = device.id || "unknown";
                this.log.info("Device id = " + id);
                try {
                    await this.setObjectNotExistsAsync("devices." + id, {
                        type: "device",
                        common: {
                            name: device.deviceTypeId + "_" + id,
                        },
                        native: {},
                    });
                    await this.setObjectNotExistsAsync("devices." + id + ".status", {
                        type: "channel",
                        common: {
                            name: "Status info",
                        },
                        native: {},
                    });
                    const keys = Object.keys(device);
                    for (let i = 0; i < keys.length; i++) {
                        const key = keys[i];
                        console.log("Key : " + key + ", Value : " + device[key]);
                        if (key != "stateTypes") {
                            this.setObjectNotExists("devices." + id + "." + key, {
                                type: "state",
                                common: {
                                    name: key,
                                    type: "string",
                                    role: "meta",
                                    write: true,
                                    read: true,
                                },
                                native: {},
                            });
                            try {
                                await this.setStateAsync("devices." + id + "." + key, {
                                    val: device[key],
                                    ack: true,
                                });
                            }
                            catch (error) {
                                console.log("error" + error);
                                this.setStateAsync("miyo", false);
                            }
                        }
                    }
                    for (const stateTypesId in device.stateTypes) {
                        const stateType = device.stateTypes[stateTypesId];
                        this.setObjectNotExists("devices." + id + ".status." + stateType.type, {
                            type: "state",
                            common: {
                                name: stateType.type,
                                type: "string",
                                role: "meta",
                                write: true,
                                read: true,
                            },
                            native: {},
                        });
                        try {
                            await this.setStateAsync("devices." + id + ".status." + stateType.type, {
                                val: stateType.value,
                                ack: true,
                            });
                        }
                        catch (error) {
                            console.log("error" + error);
                            this.setStateAsync("miyo", false);
                        }
                    }
                }
                catch (error) {
                    console.log("error" + error);
                    this.setStateAsync("miyo", false);
                }
            }
        })
            .catch((error) => {
            // handle error
            console.log("error" + error);
            this.setStateAsync("miyo", false);
        })
            .then(function () {
            // always executed
        });
    }
    async getCircuitList() {
        const url = this.config.host + "/api/circuit/all?apiKey=" + this.config.apiKey;
        this.log.info("Miyo circuits URL: " + url);
        axios
            .get(url)
            .then(async (response) => {
            // handle success
            this.log.info("All circuits data: " + JSON.stringify(response.data, null, "  "));
            this.setStateAsync("miyo", response.status);
            const circuits = new Circuits(this.config.host);
            circuits.data = response.data;
            for (const circuitId in response.data.params.circuits) {
                const circuit = response.data.params.circuits[circuitId];
                const id = circuit.id || "unknown";
                this.log.info("Circuit id = " + id);
                try {
                    await this.setObjectNotExistsAsync("circuits." + id, {
                        type: "device",
                        common: {
                            name: circuit.name + "_" + id,
                        },
                        native: {},
                    });
                    const keys = Object.keys(circuit);
                    for (let i = 0; i < keys.length; i++) {
                        const key = keys[i];
                        console.log("Key : " + key + ", Value : " + circuit[key]);
                        if (key == "name" || key == "id" || key == "sensor") {
                            this.setObjectNotExists("circuits." + id + "." + key, {
                                type: "state",
                                common: {
                                    name: key,
                                    type: "string",
                                    role: "meta",
                                    write: true,
                                    read: true,
                                },
                                native: {},
                            });
                            try {
                                await this.setStateAsync("circuits." + id + "." + key, {
                                    val: circuit[key],
                                    ack: true,
                                });
                            }
                            catch (error) {
                                console.log("error" + error);
                                this.setStateAsync("miyo", false);
                            }
                        }
                        if (key == "params" || key == "sensorValve") {
                            const cKeys = Object.keys(circuit[key]);
                            for (let i = 0; i < cKeys.length; i++) {
                                const cKey = cKeys[i];
                                console.log("Key : " + cKey + ", Value : " + circuit[key][cKey]);
                                this.setObjectNotExists("circuits." + id + "." + key + "." + cKey, {
                                    type: "state",
                                    common: {
                                        name: cKey,
                                        type: "string",
                                        role: "meta",
                                        write: true,
                                        read: true,
                                    },
                                    native: {},
                                });
                                try {
                                    await this.setStateAsync("circuits." + id + "." + key + "." + cKey, {
                                        val: circuit[key][cKey],
                                        ack: true,
                                    });
                                }
                                catch (error) {
                                    console.log("error" + error);
                                    this.setStateAsync("miyo", false);
                                }
                            }
                        }
                    }
                }
                catch (error) {
                    console.log("error" + error);
                    this.setStateAsync("miyo", false);
                }
            }
        })
            .catch((error) => {
            // handle error
            console.log("error" + error);
            this.setStateAsync("miyo", false);
        })
            .then(function () {
            // always executed
        });
    }
    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     */
    onUnload(callback) {
        try {
            // Here you must clear all timeouts or intervals that may still be active
            // clearTimeout(timeout1);
            // clearTimeout(timeout2);
            // ...
            // clearInterval(interval1);
            callback();
        }
        catch (e) {
            callback();
        }
    }
    // If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
    // You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
    // /**
    //  * Is called if a subscribed object changes
    //  */
    // private onObjectChange(id: string, obj: ioBroker.Object | null | undefined): void {
    // 	if (obj) {
    // 		// The object was changed
    // 		this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
    // 	} else {
    // 		// The object was deleted
    // 		this.log.info(`object ${id} deleted`);
    // 	}
    // }
    /**
     * Is called if a subscribed state changes
     */
    onStateChange(id, state) {
        if (state) {
            // The state was changed
            this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
        }
        else {
            // The state was deleted
            this.log.info(`state ${id} deleted`);
        }
    }
}
if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options) => new MiyoConnect(options);
}
else {
    // otherwise start the instance directly
    (() => new MiyoConnect())();
}
//# sourceMappingURL=main.js.map