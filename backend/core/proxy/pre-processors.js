const YAML = require("yaml");
const Base64Code = require("../../utils/Base64");

function Base64Encoded() {
    const name = "Base64 Pre-processor";

    const keys = ["dm1lc3M", "c3NyOi8v", "dHJvamFu", "c3M6Ly", "c3NkOi8v"];

    const test = function (raw) {
        return keys.some(k => raw.indexOf(k) !== -1);
    }
    const parse = function (raw) {
        const Base64 = new Base64Code();
        raw = Base64.safeDecode(raw);
        return raw;
    }
    return {name, test, parse};
}

function Clash() {
    const name = "Clash Pre-processor";
    const test = function (raw) {
        return /proxies:/.test(raw);
    };
    const parse = function (raw) {
        const conf = YAML.parse(raw);
        return conf.proxies.map(p => JSON.stringify(p)).join("\n");
    };
    return {name, test, parse};
}

function SSD() {
    const name = "SSD Pre-processor";
    const test = function (raw) {
        return raw.indexOf("ssd://") === 0;
    };
    const parse = function (raw) {
        // preprocessing for SSD subscription format
        const output = [];
        const Base64 = new Base64Code();
        let ssdinfo = JSON.parse(Base64.safeDecode(raw.split("ssd://")[1]));
        // options (traffic_used, traffic_total, expiry, url)
        const traffic_used = ssdinfo.traffic_used; // GB
        const traffic_total = ssdinfo.traffic_total; // GB, -1 means unlimited
        const expiry = ssdinfo.expiry; // YYYY-MM-DD HH:mm:ss
        // default setting
        let name = ssdinfo.airport; // name of the airport
        let port = ssdinfo.port;
        let method = ssdinfo.encryption;
        let password = ssdinfo.password;
        // servers config
        let servers = ssdinfo.servers;
        for (let i = 0; i < servers.length; i++) {
            let server = servers[i];
            method = server.encryption ? server.encryption : method;
            password = server.password ? server.password : password;
            let userinfo = Base64.safeEncode(method + ":" + password);
            let hostname = server.server;
            port = server.port ? server.port : port;
            let tag = server.remarks ? server.remarks : i;
            let plugin = server.plugin_options
                ? "/?plugin=" +
                encodeURIComponent(server.plugin + ";" + server.plugin_options)
                : "";
            output[i] =
                "ss://" + userinfo + "@" + hostname + ":" + port + plugin + "#" + tag;
        }
        return output.join("\n");
    };
    return {name, test, parse};
}

const AVAILABLE_PRE_PROCESSORS = [
    Base64Encoded(), Clash(), SSD()
]

// pre-process raw text
function $preprocess(raw) {
    for (const processor of AVAILABLE_PRE_PROCESSORS) {
        try {
            if (processor.test(raw)) {
                console.log(`Pre-processor [${processor.name}] activated`);
                return processor.parse(raw);
            }
        } catch (e) {
            console.error(`Parser [${processor.name}] failed\n Reason: ${e}`);
        }
    }
    return raw;
}

module.exports = $preprocess;