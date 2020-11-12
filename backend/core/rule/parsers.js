const YAML = require("yaml");


const AVAILABLE_PARSERS = [
    SurgeRuleSet(), QX(), ClashRuleProvider()
];

// convert all rules to Surge format
function parse(raw) {
    for (const parser of AVAILABLE_PARSERS) {
        let matched;
        try {
            matched = parser.test(raw);
        } catch {
            matched = false;
        }
        if (matched) {
            console.log(`Rule parser [${parser.name}] is activated!`);
            return parser.parse(raw);
        }
    }
}

// Rule set format for Surge
function SurgeRuleSet() {
    const name = "Surge Rule Set Parser"

    const SURGE_RULE_TYPES = [
        // Domain-based rules
        "DOMAIN", "DOMAIN-SUFFIX", "DOMAIN-KEYWORD",
        // IP based rules
        "IP-CIDR", "IP-CIDR6",
        // HTTP rules
        "USER-AGENT", "URL-REGEX",
        // Misc rules
        "DEST-PORT", "SRC-IP", "IN-PORT", "PROTOCOL"
    ];

    const test = (raw) => (
        raw.indexOf("payload:") !== 0 &&
        SURGE_RULE_TYPES.some(k => raw.indexOf(k) !== -1)
    );

    const parse = (raw) => {
        const lines = raw.split("\n");
        const result = [];
        for (let line of lines) {
            line = line.trim();
            // skip comments
            if (/\s*#/.test(line)) continue;
            if (!SURGE_RULE_TYPES.some(k => line.indexOf(k) === 0)) continue;
            try {
                const params = line.split(",").map(w => w.trim());
                const rule = {
                    type: params[0],
                    content: params[1],
                };
                if (rule.type === "IP-CIDR" || rule.type === "IP-CIDR6") {
                    rule.options = params.slice(2)
                }
                result.push(rule);
            } catch (e) {
                console.error(`Failed to parse line: ${line}\n Reason: ${e}`);
            }
        }
        return result;
    };

    return {name, test, parse};
}

function ClashRuleProvider() {
    const name = "Clash Rule Provider";
    const CLASH_RULE_TYPES = [
        // Domain-based rules
        "DOMAIN", "DOMAIN-SUFFIX", "DOMAIN-KEYWORD",
        // IP based rules
        "IP-CIDR", "IP-CIDR6",
        // HTTP rules
        "USER-AGENT", "URL-REGEX",
        // Process rules
        "PROCESS-NAME",
        // Misc rules
        "DST-PORT", "SRC-IP-CIDR", "SRC-PORT"
    ];

    const test = (raw) => (
        raw.indexOf("payload:") === 0 &&
        CLASH_RULE_TYPES.some(k => raw.indexOf(k) !== -1)
    );
    const parse = (raw) => {
        const result = [];
        try {
            const conf = YAML.parse(raw);
            const payload = conf["payload"]
                .map(
                    rule => rule.replace("DST-PORT", "DEST-PORT")
                        .replace("SRC-IP-CIDR", "SRC-IP")
                        .replace("SRC-PORT", "IN-PORT")
                )
                .join("\n");
            return SurgeRuleSet().parse(payload);
        } catch (e) {
            console.error(`Cannot parse rules: ${e}`);
        }
        return result;
    };
    return {name, test, parse};
}

function QX() {
    const name = "QX Filter";
    const QX_RULE_TYPES = [
        "host", "host-suffix", "host-keyword",
        "ip-cidr", "ip6-cidr",
        "user-agent"
    ];
    const test = (raw) => (
        QX_RULE_TYPES.some(k => raw.indexOf(k.toLowerCase()) === 0)
    )
    const parse = (raw) => {
        const lines = raw.split("\n");
        for (let i = 0; i < lines.length; i++) {
            lines[i] = lines[i]
                .replace(/host-suffix/i, "DOMAIN-SUFFIX")
                .replace(/host-keyword/i, "DOMAIN-KEYWORD")
                .replace(/host/i, "DOMAIN")
                .replace("ip-cidr", "IP-CIDR")
                .replace(/ip6-cidr/i, "IP-CIDR6")
                .replace("user-agent", "USER-AGENT");
        }
        return SurgeRuleSet().parse(lines.join("\n"));
    };
    return {name, test, parse};
}

module.exports = parse;