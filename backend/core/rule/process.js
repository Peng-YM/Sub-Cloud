const AVAILABLE_OPERATORS = {
    "Remove Duplicate": removeDuplicate
}

function process(rules, operators) {
    for (const item of operators) {
        if (!AVAILABLE_OPERATORS[item.type]) {
            console.error(`Unknown operator: ${item.type}!`);
            continue;
        }
        const op = AVAILABLE_OPERATORS[item.type](item.args);
        try {
            console.log(
                `Applying operator "${item.type}" with arguments: \n >>> ${
                    JSON.stringify(item.args) || "None"
                }`
            );
            rules = op.func(rules);
        } catch (err) {
            console.error(`Failed to apply operator "${item.type}"!\n REASON: ${err}`);
        }
    }
    return rules;
}

function removeDuplicate() {
    return {
        func: rules => {
            const seen = new Set();
            const result = [];
            rules.forEach(rule => {
                const options = rule.options || [];
                options.sort();
                const key = `${rule.type},${rule.content},${JSON.stringify(options)}`;
                if (!seen.has(key)) {
                    result.push(rule)
                    seen.add(key);
                }
            });
            return result;
        }
    }
}

module.exports = process;