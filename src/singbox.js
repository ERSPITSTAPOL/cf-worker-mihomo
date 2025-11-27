import * as utils from './utils.js';
import getSingbox_Outbounds_Data from './outbounds.js';

export async
function getsingbox_config(e) {
    // 分割 URLs
    e.urls = utils.splitUrlsAndProxies(e.urls);

    // 并行获取模板和节点数据  
    const[Singbox_Top_Data, Singbox_Rule_Data, Singbox_Outbounds_Data, Exclude_Package, Exclude_Address] = await Promise.all([utils.Top_Data(e.top || e.singbox_1_13), utils.Rule_Data(e.rule), getSingbox_Outbounds_Data(e), e.exclude_package ? utils.fetchpackExtract() : null, e.exclude_address ? utils.fetchipExtract() : null, ]);

    e.Exclude_Package = Exclude_Package;
    e.Exclude_Address = Exclude_Address;

    if (!Singbox_Outbounds_Data ? .data ? .outbounds || Singbox_Outbounds_Data.data.outbounds.length === 0) throw new Error('节点为空，请使用有效订阅');

    // 处理 outbounds（过滤无效节点等）  
    Singbox_Outbounds_Data.data.outbounds = outboundArrs(Singbox_Outbounds_Data.data);

    // 提取所有 tag 名  
    const ApiUrlname = Singbox_Outbounds_Data.data.outbounds.map(res = >res.tag);

    // 策略组处理  
    Singbox_Rule_Data.data.outbounds = loadAndSetOutbounds(Singbox_Rule_Data.data.outbounds, ApiUrlname);

    // 合并 outbounds  
    Singbox_Rule_Data.data.outbounds.push(...Singbox_Outbounds_Data.data.outbounds);

    // 应用模板  
    applyTemplate(Singbox_Top_Data.data, Singbox_Rule_Data.data, e);

    return {
        status: Singbox_Outbounds_Data.status,
        headers: Singbox_Outbounds_Data.headers,
        data: JSON.stringify(Singbox_Top_Data.data, null, 4),
    };

}

/**

* 处理配置文件中的 outbounds 数组
*/
export
function outboundArrs(data) {
    const excludedTypes = ['direct', 'block', 'dns', 'selector', 'urltest'];
    if (data && Array.isArray(data.outbounds)) {
        return data.outbounds.filter(o = >{
            if (excludedTypes.includes(o.type)) return false;
            if (!o.server || o.server_port < 1) return false;
            if (o.password === '') return false;
            return true;
        });
    }
}

/**

* 策略组处理
*/
export
function loadAndSetOutbounds(Outbounds, ApiUrlname) {
    const parseRegexPattern = (keywords) = >{
        if (!keywords || typeof keywords !== 'string') return {
            pattern: '^$',
            ignoreCase: false
        };
        const ignoreCase = /?i/i.test(keywords);
        const pattern = keywords.replace(/?i/gi, '');
        return {
            pattern,
            ignoreCase
        };
    };

    const applyFilterAction = (items, regex, action) = >{
        switch (action) {
        case 'include':
            return items.filter(name = >regex.test(name));
        case 'exclude':
            return items.filter(name = >!regex.test(name));
        default:
            return [];
        }
    };

    const processOutboundFilters = (outbound) = >{
        let matchedOutbounds = [];
        outbound.filter ? .forEach(filter = >{
            let currentMatched = [];
            if (filter.action === 'all') {
                currentMatched = ApiUrlname;
            } else if (filter.keywords) {
                const {
                    pattern,
                    ignoreCase
                } = parseRegexPattern(filter.keywords);
                const regex = new RegExp(pattern, ignoreCase ? 'i': '');
                currentMatched = applyFilterAction(ApiUrlname, regex, filter.action);
            }
            matchedOutbounds.push(...currentMatched);
        });
        return [...new Set(matchedOutbounds)];
    };

    const updateOutboundsArray = (outbound, matchedOutbounds) = >{
        if (matchedOutbounds.length > 0) {
            outbound.outbounds = outbound.outbounds ? [...new Set([...outbound.outbounds, ...matchedOutbounds])] : matchedOutbounds;
        } else if (!outbound.outbounds || outbound.outbounds.length === 0) {
            delete outbound.outbounds;
        }
        delete outbound.filter;
        return outbound;
    };

    const cleanRemovedTags = (outbounds) = >{
        const removedTags = outbounds.filter(o = >!o.outbounds || o.outbounds.length === 0).map(o = >o.tag);
        const cleanedOutbounds = outbounds.map(o = >{
            if (o.outbounds) o.outbounds = o.outbounds.filter(tag = >!removedTags.includes(tag));
            return o;
        });
        return cleanedOutbounds.filter(o = >o.outbounds && o.outbounds.length > 0);
    };

    const processedOutbounds = Outbounds.map(o = >updateOutboundsArray(o, processOutboundFilters(o)));
    return cleanRemovedTags(processedOutbounds);
}

export
function applyTemplate(top, rule, e) {
    const existingSet = Array.isArray(top.route.rule_set) ? top.route.rule_set: [];
    const newSet = Array.isArray(rule.route.rule_set) ? rule.route.rule_set: [];
    const mergedMap = new Map(); [...existingSet, ...newSet].forEach(item = >item ? .tag && mergedMap.set(item.tag, item));

    top.inbounds = rule ? .inbounds || top.inbounds;
    top.outbounds = [... (top.outbounds || []), ... (rule ? .outbounds || [])];
    top.route.final = rule ? .route ? .final || top.route.final;
    top.route.rules = [... (top.route.rules || []), ... (rule ? .route ? .rules || [])];
    top.route.rule_set = Array.from(mergedMap.values());

    if (e.tun === false) {
        top.inbounds = top.inbounds.filter(p = >p.type !== 'tun');
    } else {
        if (e.exclude_package) addExcludePackage(top, e.Exclude_Package);
        if (e.exclude_address) addExcludeAddress(top, e.Exclude_Address);
    }

    if (e.tailscale) {
        top.dns.servers.push({
            type: 'tailscale',
            endpoint: 'ts-ep',
            accept_default_resolvers: true
        });
        top.endpoints = top.endpoints || [];
        top.endpoints.push({
            type: 'tailscale',
            tag: 'ts-ep',
            auth_key: '',
            hostname: 'singbox-tailscale',
            udp_timeout: '5m'
        });
    }

    if (/ref1nd/i.test(e.userAgent)) {
        top.route.rules.forEach(item = >item.action === 'resolve' && (item.match_only = true));
    }

    top.route.rules = top.route.rules.flatMap(p = >{
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
    singboxTopData.inbounds.forEach(inbound = >{
        if (inbound.type === 'tun') {
            inbound.exclude_package = Array.from(new Set([... (inbound.exclude_package || []), ...newPackages]));
        }
    });
}

export
function addExcludeAddress(singboxTopData, newAddress) {
    singboxTopData.inbounds.forEach(inbound = >{
        if (inbound.type === 'tun') {
            inbound.route_address = ['0.0.0.0/1', '128.0.0.0/1', '::/1', '8000::/1'];
            inbound.route_exclude_address = Array.from(new Set([... (inbound.route_exclude_address || []), ...newAddress]));
        }
    });
}