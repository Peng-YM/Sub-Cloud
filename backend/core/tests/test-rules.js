const axios = require("axios");

const {$parse, $process, $produce} = require("../rule");
const operators = [
    {
        type: "Remove Duplicate"
    },
];

;(async function () {
    const resp = await axios.get("https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/BanEasyList.yaml")
    let rules = $parse(resp.data);
    const double = rules.concat(rules);
    rules = $process(double, operators);
    const output = $produce(rules, "Surge");
    console.log(output.length)
}())