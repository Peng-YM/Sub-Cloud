const SUPPORTED_TARGET_PLATFORMS = {
    "QX": QX_Producer(),
    "Surge": Surge_Producer(),
    "Loon": Loon_Producer(),
    "Clash": Clash_Producer()
}

function QX_Producer() {
    const targetPlatform = "QX";
    const produce = (proxy) => {
        let obfs_opts;
        let tls_opts;
        switch (proxy.type) {
            case "ss":
                obfs_opts = "";
                if (proxy.plugin === "obfs") {
                    const {host, mode} = proxy['plugin-opts'];
                    obfs_opts = `,obfs=${mode}${
                        host ? ",obfs-host=" + host : ""
                    }`;
                }
                if (proxy.plugin === "v2ray-plugin") {
                    const {tls, host, path} = proxy["plugin-opts"];
                    obfs_opts = `,obfs=${tls ? "wss" : "ws"}${
                        host ? ",obfs-host=" + host : ""
                    }${
                        path ? ",obfs-uri=" + path : ""
                    }`;
                }
                return `shadowsocks=${proxy.server}:${proxy.port},method=${
                    proxy.cipher
                },password=${proxy.password}${obfs_opts}${
                    proxy.tfo ? ",fast-open=true" : ",fast-open=false"
                }${proxy.udp ? ",udp-relay=true" : ",udp-relay=false"},tag=${
                    proxy.name
                }`;
            case "ssr":
                return `shadowsocks=${proxy.server}:${proxy.port},method=${
                    proxy.cipher
                },password=${proxy.password},ssr-protocol=${proxy.protocol}${
                    proxy["protocol-param"]
                        ? ",ssr-protocol-param=" + proxy["protocol-param"]
                        : ""
                }${proxy.obfs ? ",obfs=" + proxy.obfs : ""}${
                    proxy["obfs-param"] ? ",obfs-host=" + proxy["obfs-param"] : ""
                }${proxy.tfo ? ",fast-open=true" : ",fast-open=false"}${
                    proxy.udp ? ",udp-relay=true" : ",udp-relay=false"
                },tag=${proxy.name}`;
            case "vmess":
                obfs_opts = "";
                if (proxy.network === "ws") {
                    // websocket
                    if (proxy.tls) {
                        // ws-tls
                        obfs_opts = `,obfs=wss${
                            proxy.sni ? ",obfs-host=" + proxy.sni : ""
                        }${
                            proxy["ws-path"] ? ",obfs-uri=" + proxy["ws-path"] : ""
                        },tls-verification=${proxy['skip-cert-verify'] ? "false" : "true"}`;
                    } else {
                        // ws
                        obfs_opts = `,obfs=ws${
                            proxy["ws-headers"].Host ? ",obfs-host=" + proxy["ws-headers"].Host : ""
                        }${
                            proxy["ws-path"] ? ",obfs-uri=" + proxy["ws-path"] : ""
                        }`;
                    }
                } else {
                    // tcp
                    if (proxy.tls) {
                        obfs_opts = `,obfs=over-tls${
                            proxy.sni ? ",obfs-host=" + proxy.sni : ""
                        },tls-verification=${proxy['skip-cert-verify'] ? "false" : "true"}`;
                    }
                }
                return `vmess=${proxy.server}:${proxy.port},method=${
                    proxy.cipher === "auto" ? "none" : proxy.cipher
                },password=${proxy.uuid}${obfs_opts}${
                    proxy.tfo ? ",fast-open=true" : ",fast-open=false"
                }${proxy.udp ? ",udp-relay=true" : ",udp-relay=false"},tag=${
                    proxy.name
                }`;
            case "trojan":
                return `trojan=${proxy.server}:${proxy.port},password=${
                    proxy.password
                }${proxy.sni ? ",tls-host=" + proxy.sni : ""},over-tls=true,tls-verification=${
                    proxy['skip-cert-verify'] ? "false" : "true"
                }${proxy.tfo ? ",fast-open=true" : ",fast-open=false"}${
                    proxy.udp ? ",udp-relay=true" : ",udp-relay=false"
                },tag=${proxy.name}`;
            case "http":
                tls_opts = "";
                if (proxy.tls) {
                    tls_opts = `,over-tls=true,tls-verification=${
                        proxy['skip-cert-verify'] ? "false" : "true"
                    }${
                        proxy.sni ? ",tls-host=" + proxy.sni : ""
                    }`;
                }
                return `http=${proxy.server}:${proxy.port},username=${
                    proxy.username
                },password=${proxy.password}${tls_opts}${
                    proxy.tfo ? ",fast-open=true" : ",fast-open=false"
                },tag=${proxy.name}`;
        }
        throw new Error(
            `Platform ${targetPlatform} does not support proxy type: ${proxy.type}`
        );
    };
    return {produce};
}

function Loon_Producer() {
    const targetPlatform = "Loon";
    const produce = (proxy) => {
        let obfs_opts, tls_opts;
        switch (proxy.type) {
            case "ss":
                obfs_opts = ",,";
                if (proxy.plugin) {
                    if (proxy.plugin === "obfs") {
                        const {mode, host} = proxy["plugin-opts"];
                        obfs_opts = `,${mode},${host || ""}`;
                    } else {
                        throw new Error(
                            `Platform ${targetPlatform} does not support obfs option: ${proxy.obfs}`
                        );
                    }
                }

                return `${proxy.name}=shadowsocks,${proxy.server},${proxy.port},${proxy.cipher},"${proxy.password}"${obfs_opts}`;
            case "ssr":
                return `${proxy.name}=shadowsocksr,${proxy.server},${proxy.port},${proxy.cipher},"${proxy.password}",${proxy.protocol},{${proxy["protocol-param"] || ""}},${proxy.obfs},{${proxy["obfs-param"] || ""}}`;
            case "vmess":
                obfs_opts = "";
                if (proxy.network === "ws") {
                    const host = proxy["ws-headers"].Host || proxy.server;
                    obfs_opts = `,transport:ws,host:${host},path:${
                        proxy["ws-path"] || "/"
                    }`;
                } else {
                    obfs_opts = `,transport:tcp`;
                }
                if (proxy.tls) {
                    obfs_opts += `${
                        proxy.sni ? ",tls-name:" + proxy.sni : ""
                    },skip-cert-verify:${proxy['skip-cert-verify'] || "false"}`;
                }
                return `${proxy.name}=vmess,${proxy.server},${proxy.port},${
                    proxy.cipher === "auto" ? "none" : proxy.cipher
                },"${proxy.uuid}",over-tls:${proxy.tls || "false"}${obfs_opts}`;
            case "trojan":
                return `${proxy.name}=trojan,${proxy.server},${proxy.port},"${
                    proxy.password
                }"${
                    proxy.sni ? ",tls-name:" + proxy.sni : ""
                },skip-cert-verify:${
                    proxy['skip-cert-verify'] || "false"
                }`;
            case "http":
                tls_opts = "";
                const base = `${proxy.name}=${proxy.tls ? "http" : "https"},${
                    proxy.server
                },${proxy.port},${proxy.username || ""},${proxy.password || ""}`;
                if (proxy.tls) {
                    // https
                    tls_opts = `${
                        proxy.sni ? ",tls-name:" + proxy.sni : ""
                    },skip-cert-verify:${proxy['skip-cert-verify']}`;
                    return base + tls_opts;
                } else return base;
        }
        throw new Error(
            `Platform ${targetPlatform} does not support proxy type: ${proxy.type}`
        );
    };
    return {produce};
}

function Surge_Producer() {
    const targetPlatform = "Surge";
    const produce = (proxy) => {
        let obfs_opts, tls_opts;
        switch (proxy.type) {
            case "ss":
                obfs_opts = "";
                if (proxy.plugin) {
                    const {host, mode} = proxy['plugin-opts'];
                    if (proxy.plugin === "obfs") {
                        obfs_opts = `,obfs=${mode}${
                            host ? ",obfs-host=" + host : ""
                        }`;
                    } else {
                        throw new Error(
                            `Platform ${targetPlatform} does not support obfs option: ${proxy.obfs}`
                        );
                    }
                }
                return `${proxy.name}=ss,${proxy.server}, ${proxy.port},encrypt-method=${
                    proxy.cipher
                },password=${proxy.password}${obfs_opts},tfo=${
                    proxy.tfo || "false"
                },udp-relay=${proxy.udp || "false"}`;
            case "vmess":
                tls_opts = "";
                let config = `${proxy.name}=vmess,${proxy.server},${
                    proxy.port
                },username=${proxy.uuid},tls=${proxy.tls || "false"},tfo=${proxy.tfo || "false"}`;
                if (proxy.network === "ws") {
                    const path = proxy["ws-path"] || "/";
                    const host = proxy["ws-headers"].Host;
                    config += `,ws=true${path ? ",ws-path=" + path : ""}${
                        host ? ",ws-headers=HOST:" + host : ""
                    }`;
                }
                if (proxy.tls) {
                    config += `${
                        typeof proxy['skip-cert-verify'] !== "undefined"
                            ? ",skip-cert-verify=" + proxy['skip-cert-verify']
                            : ""
                    }`;
                    config += proxy.sni ? `,sni=${proxy.sni}` : "";
                }
                return config;
            case "trojan":
                return `${proxy.name}=trojan,${proxy.server},${proxy.port},password=${
                    proxy.password
                }${
                    typeof proxy['skip-cert-verify'] !== "undefined"
                        ? ",skip-cert-verify=" + proxy['skip-cert-verify']
                        : ""
                }${proxy.sni ? ",sni=" + proxy.sni : ""},tfo=${proxy.tfo || "false"}`;
            case "http":
                tls_opts = ", tls=false";
                if (proxy.tls) {
                    tls_opts = `,tls=true,skip-cert-verify=${proxy['skip-cert-verify']},sni=${proxy.sni}`;
                }
                return `${proxy.name}=http, ${proxy.server}, ${proxy.port}${
                    proxy.username ? ",username=" + proxy.username : ""
                }${
                    proxy.password ? ",password=" + proxy.password : ""
                }${tls_opts},tfo=${proxy.tfo || "false"}`;
        }
        throw new Error(
            `Platform ${targetPlatform} does not support proxy type: ${proxy.type}`
        );
    };
    return {produce};
}

function Clash_Producer() {
    const type = "ALL";
    const produce = (proxies) => {
        return "proxies:\n" + proxies.map(proxy => {
            delete proxy.supported;
            return "  - " + JSON.stringify(proxy) + "\n";
        }).join("");
    };
    return {type, produce};
}

function produce(proxies, targetPlatform) {
    const producer = SUPPORTED_TARGET_PLATFORMS[targetPlatform];
    if (!producer) {
        throw new Error(`Target platform: ${targetPlatform} is not supported!`);
    }
    if (typeof producer.type === "undefined" || producer.type === 'SINGLE') {
        return proxies
            .map(proxy => {
                if (proxy.supported && proxy.supported[targetPlatform] === false) {
                    console.log(`Skipped unsupported proxy: ${JSON.stringify(proxy)}`);
                    return "";
                }
                try {
                    return producer.produce(proxy);
                } catch (err) {
                    console.log(
                        `ERROR: cannot produce proxy: ${JSON.stringify(
                            proxy
                        )}\nReason: ${err}`
                    );
                    return "";
                }
            })
            .filter(line => line.length > 0)
            .join("\n");
    } else if (producer.type === "ALL") {
        return producer.produce(proxies);
    }
}

module.exports = produce;