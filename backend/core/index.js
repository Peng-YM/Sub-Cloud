const axios = require("axios");
const $parse = require('./proxy/parsers');
const $process = require("./proxy/operators");
const $produce = require("./proxy/producers");


const operators = [
    {
        type: "Type Filter",
        args: ["ss", "ssr", "trojan"]
    },
    {
        type: "Set Property Operator",
        args: {
            key: "skip-cert-verify",
            value: true
        }
    }
];

;(async function () {
    const resp = await axios.get("https://api.dler.io/sub?target=quanx&url=https%3A%2F%2Fraw.githubusercontent.com%2Fcrossutility%2FQuantumult-X%2Fmaster%2Fserver-complete.txt&emoji=true&list=false&udp=false&tfo=false&scv=false&fdn=false&sort=false&list=true")
    let proxies = $parse(resp.data);
    proxies = await $process(proxies, operators);
    const output = $produce(proxies, "Surge");
    console.log(output)
}())