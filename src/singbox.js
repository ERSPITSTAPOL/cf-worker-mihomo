import * as utils from './utils.js';
import getSingbox_Outbounds_Data from './outbounds.js';

export async
function getsingbox_config(e) {
    const top = utils.singbox_1_13; // 固定使用 1.13 模板
    e.urls = utils.splitUrlsAndProxies(e.urls);

    const[Singbox_Top_Data, Singbox_Rule_Data, Singbox_Outbounds_Data, Exclude_Package, Exclude_Address] = await Promise.all([utils.Top_Data(top), utils.Rule_Data(e.rule), getSingbox_Outbounds_Data(e), e.exclude_package ? utils.fetchpackExtract() : null, e.exclude_address ? utils.fetchipExtract() : null]);

    e.Exclude_Package = Exclude_Package;
    e.Exclude_Address = Exclude_Address;

    if (!Singbox_Outbounds_Data ? .data ? .outbounds || Singbox_Outbounds_Data ? .data ? .outbounds.length === 0) {
        throw new Error(`节点为空，请使用有效订阅`);
    }

    Singbox_Outbounds_Data.data.outbounds = outboundArrs(Singbox_Outbounds_Data.data);

    const ApiUrlname = [];
    Singbox_Outbounds_Data.data.outbounds.forEach((res) = >{
        ApiUrlname.push(res.tag);
    });

    Singbox_Rule_Data.data.outbounds = loadAndSetOutbounds(Singbox_Rule_Data.data.outbounds, ApiUrlname);
    Singbox_Rule_Data.data.outbounds.push(...Singbox_Outbounds_Data.data.outbounds);

    applyTemplate(Singbox_Top_Data.data, Singbox_Rule_Data.data, e);

    return {
        status: Singbox_Outbounds_Data.status,
        headers: Singbox_Outbounds_Data.headers,
        data: JSON.stringify(Singbox_Top_Data.data, null, 4),
    };

}

// 处理配置文件中的 outbounds 数组
export
function outboundArrs(data) {
    const excludedTypes = ['direct', 'block', 'dns', 'selector', 'urltest'];
    if (data && Array.isArray(data.outbounds)) {
        return data.outbounds.filter((outbound) = >{
            if (excludedTypes.includes(outbound.type)) return false;
            if (outbound ? .server === '') return false;
            if (outbound ? .server_port < 1) return false;
            if (outbound ? .password === '') return false;
            return true;
        });
    }
}

// 策略组处理
export
function loadAndSetOutbounds(Outbounds, ApiUrlname) {
    const processOutboundFilters = (outbound) = >{
        let matchedOutbounds = [];
        let hasValidAction = false;

        outbound.filter ? .forEach((filter) = >{
            if (filter.action !== 'all') {
                if (!filter.keywords || typeof filter.keywords !== 'string') return;
            }

            let currentMatched = [];
            if (filter.action === 'all') {
                currentMatched = ApiUrlname;
                hasValidAction = true;
            } else {
                const {
                    pattern,
                    ignoreCase
                } = parseRegexPattern(filter.keywords);
                const regex = new RegExp(pattern, ignoreCase ? 'i': '');
                currentMatched = applyFilterAction(ApiUrlname, regex, filter.action);
                hasValidAction = true;
            }

            if (currentMatched.length > 0) matchedOutbounds = [...matchedOutbounds, ...currentMatched];
        });

        return {
            matchedOutbounds: [...new Set(matchedOutbounds)],
            hasValidAction
        };
    };

    const parseRegexPattern = (keywords) = >{
        if (!keywords || typeof keywords !== 'string') return {
            pattern: '^$',
            ignoreCase: false
        };
        const ignoreCase = /\?i/i.test(keywords);
        const pattern = keywords.replace(/\?i/gi, '');
        return {
            pattern,
            ignoreCase
        };
    };

    const applyFilterAction = (items, regex, action) = >{
        switch (action) {
        case 'include':
            return items.filter((name) = >regex.test(name));
        case 'exclude':
            return items.filter((name) = >!regex.test(name));
        default:
            return [];
        }
    };

    const updateOutboundsArray = (outbound, matchedOutbounds) = >{
        if (matchedOutbounds.length > 0) {
            outbound.outbounds = outbound.outbounds ? [...new Set([...outbound.outbounds, ...matchedOutbounds])] : matchedOutbounds;
        }
        delete outbound.filter;
        return outbound;
    };

    const cleanRemovedTags = (outbounds) = >{
        const removedTags = outbounds.filter((item) = >!item.outbounds || (Array.isArray(item.outbounds) && item.outbounds.length === 0)).map((item) = >item.tag).filter((tag) = >tag !== undefined);

        return outbounds.map((item) = >{
            if (item.outbounds && Array.isArray(item.outbounds)) item.outbounds = item.outbounds.filter((tag) = >!removedTags.includes(tag));
            return item;
        }).filter((item) = >item.outbounds && Array.isArray(item.outbounds) && item.outbounds.length > 0);
    };

    const processedOutbounds = Outbounds.map((outbound) = >{
        const {
            matchedOutbounds
        } = processOutboundFilters(outbound);
        return updateOutboundsArray(outbound, matchedOutbounds);
    });

    return cleanRemovedTags(processedOutbounds);

}

export
function applyTemplate(top, rule, e) {
    const existingSet = Array.isArray(top.route.rule_set) ? top.route.rule_set: [];
    const newSet = Array.isArray(rule.route.rule_set) ? rule.route.rule_set: [];
    const mergedMap = new Map();
    for (const item of existingSet) if (item ? .tag) mergedMap.set(item.tag, item);
    for (const item of newSet) if (item ? .tag) mergedMap.set(item.tag, item);

    top.inbounds = rule ? .inbounds || top.inbounds;
    top.outbounds = [... (Array.isArray(top.outbounds) ? top.outbounds: []), ... (Array.isArray(rule ? .outbounds) ? rule.outbounds: [])];
    top.route.final = rule ? .route ? .final || top.route.final;
    top.route.rules = [... (Array.isArray(top.route.rules) ? top.route.rules: []), ... (Array.isArray(rule ? .route ? .rules) ? rule.route.rules: [])];
    top.route.rule_set = Array.from(mergedMap.values());

    if (!e.tun) {
        if (e.exclude_package) addExcludePackage(top, e.Exclude_Package);
        if (e.exclude_address) addExcludeAddress(top, e.Exclude_Address);
    }

    if (e.tailscale) {
        top.dns.servers.push({
            type: 'tailscale',
            endpoint: 'ts-ep',
            accept_default_resolvers: true,
        });
        top.endpoints = top.endpoints || [];
        top.endpoints.push({
            type: 'tailscale',
            tag: 'ts-ep',
            auth_key: '',
            hostname: 'singbox-tailscale',
            udp_timeout: '5m',
        });
    }

    top.route.rules = top.route.rules.flatMap((p) = >{
        if (p.action === 'route-options') {
            if (e.udp) {
                p.udp_disable_domain_unmapping = true;
                p.udp_connect = true;
                p.udp_timeout = '5m';
            }
            if (e.tls_fragment) {
                p.tls_fragment = true;
                p.tls_fragment_fallback_delay = '5m';
            }
            return e.udp || e.tls_fragment ? p: [];
        }
        return p;
    });

}

export
function addExcludePackage(singboxTopData, newPackages) {
    for (const inbound of singboxTopData.inbounds) {
        if (inbound.type === 'tun') {
            if (!Array.isArray(inbound.exclude_package)) inbound.exclude_package = [];
            inbound.exclude_package = Array.from(new Set([... (inbound.exclude_package || []), ...newPackages]));
        }
    }
}

export
function addExcludeAddress(singboxTopData, newddress) {
    for (const inbound of singboxTopData.inbounds) {
        if (inbound.type === 'tun') {
            inbound.route_address = ['0.0.0.0/1', '128.0.0.0/1', '::/1', '8000::/1'];
            if (!Array.isArray(inbound.route_exclude_address)) inbound.route_exclude_address = [];
            inbound.route_exclude_address = Array.from(new Set([... (inbound.route_exclude_address || []), ...newddress]));
        }
    }
}