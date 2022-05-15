"use strict";
/* eslint-disable prettier/prettier */
/*
 * Created with @iobroker/create-adapter v1.34.1
 */
/*
 TODO: Aktualisierungen einbauen
 TODO: Datentypen korrigieren, borderTop ist anders (z.B.)
*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.MiyoConnection = void 0;
const miyoStructureHandler_1 = require("./miyoStructureHandler");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const axios = require("axios").default;
let connInterval;
let reconnectInterval = 30; //seconds
let isConnected = false;
let initialized = false;
let isPolling = false;
let stillPollingCounter = 0;
let skipHttpRequests = false;
let host;
let apiKey;
let adapter;
class MiyoConnection {
    constructor(a) {
        this.a = a;
        adapter = a;
    }
    init(conSkipHttpRequests, conReconnectInterval) {
        if (!adapter.config.host) {
            adapter.log.warn("host is not set");
        }
        if (!adapter.config.apiKey) {
            adapter.log.warn("apiKey is not set");
        }
        else {
            host = adapter.config.host;
            apiKey = adapter.config.apiKey;
            skipHttpRequests = conSkipHttpRequests;
            if (conReconnectInterval < 10) {
                reconnectInterval = 10;
                adapter.log.info("Setting polling intervall to 10 seconds");
            }
            else if (conReconnectInterval > 3600) {
                reconnectInterval = 3600;
                adapter.log.info("Setting polling intervall to one hour");
            }
            initialized = true;
        }
    }
    async connect(skipHttpRequests, conReconnectInterval) {
        if (!initialized) {
            this.init(skipHttpRequests, conReconnectInterval);
        }
        if (initialized) {
            adapter.log.debug("isConnected 1: " + isConnected);
            isConnected = await this.testConnection();
            adapter.log.debug("isConnected 2: " + isConnected);
            if (isConnected) {
                this.initPolling();
            }
            return isConnected;
        }
        else {
            return false;
        }
    }
    async testConnection() {
        let connected = false;
        adapter.log.debug("starting connection test");
        if (!skipHttpRequests) {
            const url = host + "/api/system/status?apiKey=" + apiKey;
            adapter.log.info("Miyo devices URL: " + url);
            connected = await axios
                .get(url)
                .then((response) => {
                // handle success
                adapter.log.debug("Connection test: received a result: " + JSON.stringify(response.data));
                if (response.data.status == "success") {
                    connected = true;
                    adapter.log.info("connected");
                }
                else {
                    connected = false;
                    adapter.log.warn("connection seams not to be ok: " + JSON.stringify(response.data));
                }
            })
                .catch((error) => {
                adapter.log.error("Error in connection test.");
                // handle error
                if (error.response) {
                    // The request was made and the server responded with a status code
                    // that falls out of the range of 2xx
                    adapter.log.error(error.response.data);
                    adapter.log.error(error.response.status);
                    //adapter.log.error(error.response.headers);
                }
                else if (error.request) {
                    // The request was made but no response was received
                    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                    // http.ClientRequest in node.js
                    adapter.log.error(error.request);
                }
                else {
                    // Something happened in setting up the request that triggered an Error
                    adapter.log.error("Error 1: " + error);
                    adapter.log.error("Error 2: " + error.message);
                }
                adapter.log.error(error.config);
                adapter.log.error("error: " + error);
            })
                .then(() => {
                // always executed
                adapter.log.debug("finished connection test.");
                if (connected) {
                    adapter.log.debug("connection test was positive. setting status info.connection to true.");
                    adapter.setState("info.connection", true, true);
                }
                else {
                    adapter.log.debug("connection test was negative. setting status info.connection to false.");
                    adapter.setState("info.connection", false, true);
                }
                return connected;
            });
            return connected;
        }
        else {
            adapter.log.info("Skipping test connection");
            adapter.setState("info.connection", true, true);
            return true;
        }
    }
    initPolling() {
        // Periodically poll data
        if (!connInterval && isConnected) {
            adapter.log.debug("start connecting interval");
            connInterval = setInterval(() => this.pollData(), reconnectInterval * 1000);
        }
    }
    pollData() {
        isPolling = false;
        if (!isPolling) {
            try {
                adapter.log.info("Polling for data");
                this.pollDeviceData();
                this.pollCircuiteData();
            }
            catch (error) {
                adapter.log.error("Catched error while polling for data." + error);
            }
            finally {
                isPolling = false;
                stillPollingCounter = 0;
            }
        }
        else {
            stillPollingCounter++;
            adapter.log.info("still polling (" + stillPollingCounter + " time/s)");
        }
    }
    async pollDeviceData() {
        // The adapters config (in the instance object everything under the attribute "native") is accessible via
        // adapter.config:
        const url = adapter.config.host + "/api/device/all?apiKey=" + adapter.config.apiKey;
        adapter.log.info("Miyo devices URL: " + url);
        if (!skipHttpRequests) {
            axios
                .get(url)
                .then(async (response) => {
                // handle success
                isConnected = true;
                //console.log(response.data);
                //console.log(response.status);
                //console.log(response.statusText);
                //console.log(response.headers);
                //console.log(response.config);
                console.log("common.mode: " + adapter.common.mode);
                adapter.log.debug("All devices data: " + JSON.stringify(response.data, null, "  "));
                const miyoStructureHandler = new miyoStructureHandler_1.MiyoStructureHandler(adapter);
                miyoStructureHandler.handleDeviceData(response.data);
            })
                .catch((error) => {
                // handle error
                console.log("error" + error);
                adapter.setStateAsync("miyo", false);
            })
                .then(function () {
                // always executed
            });
        }
        else {
            adapter.log.info("skipping http requests for devices");
        }
    }
    async pollCircuiteData() {
        const url = adapter.config.host + "/api/circuit/all?apiKey=" + adapter.config.apiKey;
        adapter.log.info("Miyo circuits URL: " + url);
        if (!skipHttpRequests) {
            axios
                .get(url)
                .then(async (response) => {
                // handle success
                isConnected = true;
                adapter.log.info("All circuits data: " + JSON.stringify(response.data, null, "  "));
                adapter.setStateAsync("miyo", response.status);
                const miyoStructureHandler = new miyoStructureHandler_1.MiyoStructureHandler(adapter);
                miyoStructureHandler.handleCircuiteData(response.data);
            })
                .catch((error) => {
                // handle error
                console.log("error" + error);
                adapter.setStateAsync("miyo", false);
            })
                .then(function () {
                // always executed
            });
        }
        else {
            adapter.log.info("skipping http requests for circuits");
        }
    }
    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     */
    onUnload(callback) {
        try {
            // Here you must clear all timeouts or intervals that may still be active
            // clearTimeout(timeout1);
            // clearTimeout(timeout2);
            // ....
            // clearInterval(interval1);
            if (connInterval) {
                adapter.log.info("clearing connection intervall");
                clearInterval(connInterval);
                connInterval = null;
            }
            if (isConnected) {
                adapter.log.info("Disconnected");
                isConnected = false;
                adapter.setState("info.connection", false, true);
            }
            callback();
        }
        catch (e) {
            if (isConnected) {
                adapter.log.info("Disconnected");
                isConnected = false;
                adapter.setState("info.connection", false, true);
            }
            callback();
        }
    }
}
exports.MiyoConnection = MiyoConnection;
//# sourceMappingURL=miyoConnection.js.map