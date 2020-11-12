const axios = require("axios");

const AVAILABLE_OPERATORS = {
    "Keyword Filter": KeywordFilter,
    "Useless Filter": UselessFilter,
    "Region Filter": RegionFilter,
    "Regex Filter": RegexFilter,
    "Type Filter": TypeFilter,
    "Script Filter": ScriptFilter,

    "Set Property Operator": SetPropertyOperator,
    "Flag Operator": FlagOperator,
    "Sort Operator": SortOperator,
    "Keyword Sort Operator": KeywordSortOperator,
    "Keyword Rename Operator": KeywordRenameOperator,
    "Keyword Delete Operator": KeywordDeleteOperator,
    "Regex Rename Operator": RegexRenameOperator,
    "Regex Delete Operator": RegexDeleteOperator,
    "Script Operator": ScriptOperator,
}

async function $process(proxies, operators = []) {
    for (const item of operators) {
        // process script
        let script;
        if (item.type.indexOf("Script") !== -1) {
            const {mode, content} = item.args;
            if (mode === "link") {
                // if this is remote script, download it
                script = await axios
                    .get(content)
                    .then((resp) => resp.data)
                    .catch((err) => {
                        throw new Error(
                            `Error when downloading remote script: ${item.args.content}.\n Reason: ${err}`
                        );
                    });
            } else {
                script = content;
            }
        }

        const op = AVAILABLE_OPERATORS[item.type];
        if (!op) {
            console.error(`Unknown operator: "${item.type}"`);
            continue;
        }
        if (item.type.indexOf("Filter") !== -1) {
            console.log(
                `Applying filter "${item.type}" with arguments:\n >>> ${
                    JSON.stringify(item.args) || "None"
                }`
            );

            try {
                if (item.type.indexOf("Script") !== -1) {
                    proxies = processFilter(op(script), proxies);
                } else {
                    proxies = processFilter(op(item.args), proxies);
                }
            } catch (err) {
                console.error(`Failed to apply filter "${item.type}"!\n REASON: ${err}`);
            }
        } else if (item.type.indexOf("Operator") !== -1) {
            console.log(
                `Applying operator "${item.type}" with arguments: \n >>> ${
                    JSON.stringify(item.args) || "None"
                }`
            );
            try {
                if (item.type.indexOf("Script") !== -1) {
                    proxies = processOperator(op(script), proxies);
                } else {
                    proxies = processOperator(op(item.args), proxies);
                }
            } catch (err) {
                console.error(`Failed to apply operator "${item.type}"!\n REASON: ${err}`);
            }
        }
    }
    return proxies;
}

/**************************** Operators ***************************************/
// force to set some properties (e.g., scert, udp, tfo, etc.)
function SetPropertyOperator({key, value}) {
    return {
        name: "Set Property Operator",
        func: (proxies) => {
            return proxies.map((p) => {
                p[key] = value;
                return p;
            });
        },
    };
}

// add or remove flag for proxies
function FlagOperator(add = true) {
    return {
        name: "Flag Operator",
        func: (proxies) => {
            return proxies.map((proxy) => {
                if (!add) {
                    // no flag
                    proxy.name = removeFlag(proxy.name);
                } else {
                    // get flag
                    const newFlag = getFlag(proxy.name);
                    // remove old flag
                    proxy.name = removeFlag(proxy.name);
                    proxy.name = newFlag + " " + proxy.name;
                    proxy.name = proxy.name.replace(/🇹🇼/g, "🇨🇳");
                }
                return proxy;
            });
        },
    };
}

// sort proxies according to their names
function SortOperator(order = "asc") {
    return {
        name: "Sort Operator",
        func: (proxies) => {
            switch (order) {
                case "asc":
                case "desc":
                    return proxies.sort((a, b) => {
                        let res = a.name > b.name ? 1 : -1;
                        res *= order === "desc" ? -1 : 1;
                        return res;
                    });
                case "random":
                    return shuffle(proxies);
                default:
                    throw new Error("Unknown sort option: " + order);
            }
        },
    };
}

// sort by keywords
function KeywordSortOperator(keywords) {
    return {
        name: "Keyword Sort Operator",
        func: (proxies) =>
            proxies.sort((a, b) => {
                const oA = getKeywordOrder(keywords, a.name);
                const oB = getKeywordOrder(keywords, b.name);
                if (oA && !oB) return -1;
                if (oB && !oA) return 1;
                if (oA && oB) return oA < oB ? -1 : 1;
                if ((!oA && !oB) || (oA && oB && oA === oB))
                    return a.name < b.name ? -1 : 1; // fallback to normal sort
            }),
    };
}

function getKeywordOrder(keywords, str) {
    let order = null;
    for (let i = 0; i < keywords.length; i++) {
        if (str.indexOf(keywords[i]) !== -1) {
            order = i + 1; // plus 1 is important! 0 will be treated as false!!!
            break;
        }
    }
    return order;
}

// rename by keywords
// keywords: [{old: "old", now: "now"}]
function KeywordRenameOperator(keywords) {
    return {
        name: "Keyword Rename Operator",
        func: (proxies) => {
            return proxies.map((proxy) => {
                for (const {old, now} of keywords) {
                    proxy.name = proxy.name.replaceAll(old, now).trim();
                }
                return proxy;
            });
        },
    };
}

// rename by regex
// keywords: [{expr: "string format regex", now: "now"}]
function RegexRenameOperator(regex) {
    return {
        name: "Regex Rename Operator",
        func: (proxies) => {
            return proxies.map((proxy) => {
                for (const {expr, now} of regex) {
                    proxy.name = proxy.name.replace(new RegExp(expr, "g"), now).trim();
                }
                return proxy;
            });
        },
    };
}

// delete keywords operator
// keywords: ['a', 'b', 'c']
function KeywordDeleteOperator(keywords) {
    const keywords_ = keywords.map((k) => {
        return {
            old: k,
            now: "",
        };
    });
    return {
        name: "Keyword Delete Operator",
        func: KeywordRenameOperator(keywords_).func,
    };
}

// delete regex operator
// regex: ['a', 'b', 'c']
function RegexDeleteOperator(regex) {
    const regex_ = regex.map((r) => {
        return {
            expr: r,
            now: "",
        };
    });
    return {
        name: "Regex Delete Operator",
        func: RegexRenameOperator(regex_).func,
    };
}

// use base64 encoded script to rename
/** Example script
 function operator(proxies) {
    // do something
    return proxies;
 }

 WARNING:
 1. This function name should be `operator`!
 2. Always declare variables before using them!
 */
function ScriptOperator(script) {
    return {
        name: "Script Operator",
        func: (proxies) => {
            let output = proxies;
            (function () {
                // interface to get internal operators
                const $get = (name, args) => {
                    const item = AVAILABLE_OPERATORS[name];
                    return item(args);
                };
                const $process = (item, proxies) => {
                    if (item.name.indexOf("Filter") !== -1) {
                        return processOperator(item, proxies);
                    } else if (item.name.indexOf("Operator") !== -1) {
                        return processFilter(item, proxies);
                    }
                };
                eval(script);
                output = operator(proxies);
            })();
            return output;
        },
    };
}

/**************************** Filters ***************************************/
// filter by keywords
function KeywordFilter({keywords = [], keep = true}) {
    return {
        name: "Keyword Filter",
        func: (proxies) => {
            return proxies.map((proxy) => {
                const selected = keywords.some((k) => proxy.name.indexOf(k) !== -1);
                return keep ? selected : !selected;
            });
        },
    };
}

// filter useless proxies
function UselessFilter() {
    const KEYWORDS = [
        "网址",
        "流量",
        "时间",
        "应急",
        "过期",
        "Bandwidth",
        "expire",
    ];
    return {
        name: "Useless Filter",
        func: KeywordFilter({
            keywords: KEYWORDS,
            keep: false,
        }).func,
    };
}

// filter by regions
function RegionFilter(regions) {
    const REGION_MAP = {
        HK: "🇭🇰",
        TW: "🇹🇼",
        US: "🇺🇸",
        SG: "🇸🇬",
        JP: "🇯🇵",
        UK: "🇬🇧",
    };
    return {
        name: "Region Filter",
        func: (proxies) => {
            // this would be high memory usage
            return proxies.map((proxy) => {
                const flag = getFlag(proxy.name);
                return regions.some((r) => REGION_MAP[r] === flag);
            });
        },
    };
}

// filter by regex
function RegexFilter({regex = [], keep = true}) {
    return {
        name: "Regex Filter",
        func: (proxies) => {
            return proxies.map((proxy) => {
                const selected = regex.some((r) => {
                    r = new RegExp(r);
                    return r.test(proxy.name);
                });
                return keep ? selected : !selected;
            });
        },
    };
}

// filter by proxy types
function TypeFilter(types) {
    return {
        name: "Type Filter",
        func: (proxies) => {
            return proxies.map((proxy) => types.some((t) => proxy.type === t));
        },
    };
}

// use base64 encoded script to filter proxies
/** Script Example
 function func(proxies) {
    const selected = FULL(proxies.length, true);
    // do something
    return selected;
 }
 WARNING:
 1. This function name should be `func`!
 2. Always declare variables before using them!
 */
function ScriptFilter(script) {
    return {
        name: "Script Filter",
        func: (proxies) => {
            let output = FULL(proxies.length, true);
            !(function () {
                eval(script);
                output = filter(proxies);
            })();
            return output;
        },
    };
}

/******************************** Utility Functions *********************************************/
// get proxy flag according to its name
function getFlag(name) {
    // flags from @KOP-XIAO: https://github.com/KOP-XIAO/QuantumultX/blob/master/Scripts/resource-parser.js
    const flags = {
        "🇦🇨": ["AC"],
        "🇦🇹": ["奥地利", "维也纳"],
        "🇦🇺": ["AU", "Australia", "Sydney", "澳大利亚", "澳洲", "墨尔本", "悉尼"],
        "🇧🇪": ["BE", "比利时"],
        "🇧🇬": ["保加利亚", "Bulgaria"],
        "🇧🇷": ["BR", "Brazil", "巴西", "圣保罗"],
        "🇨🇦": [
            "CA",
            "Canada",
            "Waterloo",
            "加拿大",
            "蒙特利尔",
            "温哥华",
            "楓葉",
            "枫叶",
            "滑铁卢",
            "多伦多",
        ],
        "🇨🇭": ["瑞士", "苏黎世", "Switzerland"],
        "🇩🇪": ["DE", "German", "GERMAN", "德国", "德國", "法兰克福"],
        "🇩🇰": ["丹麦"],
        "🇪🇸": ["ES", "西班牙", "Spain"],
        "🇪🇺": ["EU", "欧盟", "欧罗巴"],
        "🇫🇮": ["Finland", "芬兰", "赫尔辛基"],
        "🇫🇷": ["FR", "France", "法国", "法國", "巴黎"],
        "🇬🇧": ["UK", "GB", "England", "United Kingdom", "英国", "伦敦", "英"],
        "🇲🇴": ["MO", "Macao", "澳门", "CTM"],
        "🇭🇺": ["匈牙利", "Hungary"],
        "🇭🇰": [
            "HK",
            "Hongkong",
            "Hong Kong",
            "香港",
            "深港",
            "沪港",
            "呼港",
            "HKT",
            "HKBN",
            "HGC",
            "WTT",
            "CMI",
            "穗港",
            "京港",
            "港",
        ],
        "🇮🇩": ["Indonesia", "印尼", "印度尼西亚", "雅加达"],
        "🇮🇪": ["Ireland", "爱尔兰", "都柏林"],
        "🇮🇳": ["India", "印度", "孟买", "Mumbai"],
        "🇰🇵": ["KP", "朝鲜"],
        "🇰🇷": ["KR", "Korea", "KOR", "韩国", "首尔", "韩", "韓"],
        "🇱🇻": ["Latvia", "Latvija", "拉脱维亚"],
        "🇲🇽️": ["MEX", "MX", "墨西哥"],
        "🇲🇾": ["MY", "Malaysia", "马来西亚", "吉隆坡"],
        "🇳🇱": ["NL", "Netherlands", "荷兰", "荷蘭", "尼德蘭", "阿姆斯特丹"],
        "🇵🇭": ["PH", "Philippines", "菲律宾"],
        "🇷🇴": ["RO", "罗马尼亚"],
        "🇷🇺": [
            "RU",
            "Russia",
            "俄罗斯",
            "俄羅斯",
            "伯力",
            "莫斯科",
            "圣彼得堡",
            "西伯利亚",
            "新西伯利亚",
            "京俄",
            "杭俄",
        ],
        "🇸🇦": ["沙特", "迪拜"],
        "🇸🇪": ["SE", "Sweden"],
        "🇸🇬": [
            "SG",
            "Singapore",
            "新加坡",
            "狮城",
            "沪新",
            "京新",
            "泉新",
            "穗新",
            "深新",
            "杭新",
            "广新",
        ],
        "🇹🇭": ["TH", "Thailand", "泰国", "泰國", "曼谷"],
        "🇹🇷": ["TR", "Turkey", "土耳其", "伊斯坦布尔"],
        "🇹🇼": [
            "TW",
            "Taiwan",
            "台湾",
            "台北",
            "台中",
            "新北",
            "彰化",
            "CHT",
            "台",
            "HINET",
        ],
        "🇺🇸": [
            "US",
            "USA",
            "America",
            "United States",
            "美国",
            "美",
            "京美",
            "波特兰",
            "达拉斯",
            "俄勒冈",
            "凤凰城",
            "费利蒙",
            "硅谷",
            "矽谷",
            "拉斯维加斯",
            "洛杉矶",
            "圣何塞",
            "圣克拉拉",
            "西雅图",
            "芝加哥",
            "沪美",
            "哥伦布",
            "纽约",
        ],
        "🇻🇳": ["VN", "越南", "胡志明市"],
        "🇮🇹": ["Italy", "IT", "Nachash", "意大利", "米兰", "義大利"],
        "🇿🇦": ["South Africa", "南非"],
        "🇦🇪": ["United Arab Emirates", "阿联酋"],
        "🇯🇵": [
            "JP",
            "Japan",
            "日",
            "日本",
            "东京",
            "大阪",
            "埼玉",
            "沪日",
            "穗日",
            "川日",
            "中日",
            "泉日",
            "杭日",
            "深日",
            "辽日",
            "广日",
        ],
        "🇦🇷": ["AR", "阿根廷"],
        "🇳🇴": ["Norway", "挪威", "NO"],
        "🇨🇳": [
            "CN",
            "China",
            "回国",
            "中国",
            "江苏",
            "北京",
            "上海",
            "广州",
            "深圳",
            "杭州",
            "徐州",
            "青岛",
            "宁波",
            "镇江",
            "back",
        ],
        "🏳️‍🌈": ["流量", "时间", "应急", "过期", "Bandwidth", "expire"],
    };
    for (let k of Object.keys(flags)) {
        if (flags[k].some((item) => name.indexOf(item) !== -1)) {
            return k;
        }
    }
    // no flag found
    const oldFlag = (name.match(
        /[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/
    ) || [])[0];
    return oldFlag || "🏴‍☠️";
}

// remove flag
function removeFlag(str) {
    return str
        .replace(/[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g, "")
        .trim();
}

// shuffle array
function shuffle(array) {
    let currentIndex = array.length,
        temporaryValue,
        randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

// some logical functions for proxy filters
function AND(...args) {
    return args.reduce((a, b) => a.map((c, i) => b[i] && c));
}

function OR(...args) {
    return args.reduce((a, b) => a.map((c, i) => b[i] || c));
}

function NOT(array) {
    return array.map((c) => !c);
}

function FULL(length, bool) {
    return [...Array(length).keys()].map(() => bool);
}

function clone(object) {
    return JSON.parse(JSON.stringify(object));
}

function processFilter(filter, proxies) {
    // select proxies
    let selected = FULL(proxies.length, true);
    try {
        selected = AND(selected, filter.func(proxies));
    } catch (err) {
        console.log(`Cannot apply filter ${filter.name}\n Reason: ${err}`);
    }
    return proxies.filter((_, i) => selected[i]);
}

function processOperator(operator, proxies) {
    let output = clone(proxies);
    try {
        const output_ = operator.func(output);
        if (output_) output = output_;
    } catch (err) {
        // print log and skip this operator
        console.log(`ERROR: cannot apply operator ${op.name}! Reason: ${err}`);
    }
    return output;
}

module.exports = $process;