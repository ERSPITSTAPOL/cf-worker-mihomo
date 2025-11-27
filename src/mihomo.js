import * as utils from './utils.js';
import getMihomo_Proxies_Data from './proxies.js';

export async function getmihomo_config(e) {
    e.urls = utils.splitUrlsAndProxies(e.urls);

    const [
        Mihomo_Rule_Data,
        Mihomo_Proxies_Data,
        Exclude_Package,
        Exclude_Address
    ] = await Promise.all([
        utils.Rule_Data(e.rule),
        getMihomo_Proxies_Data(e),
        e.exclude_package ? utils.fetchpackExtract() : null,
        e.exclude_address ? utils.fetchipExtract() : null,
    ]);

    e.Exclude_Package = Exclude_Package;
    e.Exclude_Address = Exclude_Address;

    if (!Mihomo_Proxies_Data?.data?.proxies || Mihomo_Proxies_Data?.data?.proxies.length === 0)
        throw new Error('节点为空');

    // 合并 proxies
    Mihomo_Rule_Data.data.proxies = [
        ...(Mihomo_Rule_Data?.data?.proxies || []),
        ...Mihomo_Proxies_Data?.data?.proxies
    ];

    // 分组
    let groups = getMihomo_Proxies_Grouping(
        Mihomo_Proxies_Data.data,
        Mihomo_Rule_Data.data
    );

    const emptyGroupNames = new Set(
        groups.filter(g => Array.isArray(g.proxies) && g.proxies.length === 0).map(g => g.name)
    );

    // 删除空组及引用
    groups = groups.filter(g => !emptyGroupNames.has(g.name));
    groups.forEach(g => {
        if (Array.isArray(g.proxies)) {
            g.proxies = g.proxies.filter(name => !emptyGroupNames.has(name));
        }
        if (Array.isArray(g.use)) {
            g.use = g.use.filter(name => !emptyGroupNames.has(name));
        }
    });

    Mihomo_Rule_Data.data["proxy-groups"] = groups;
    Mihomo_Rule_Data.data["proxy-providers"] = Mihomo_Proxies_Data?.data?.providers;

    applyTemplate(Mihomo_Rule_Data.data, e);

    return {
        status: Mihomo_Proxies_Data.status,
        headers: Mihomo_Proxies_Data.headers,
        data: JSON.stringify(Mihomo_Rule_Data.data, null, 4),
    };
}

/**
 * 将自身的 proxies、proxy-groups、rules 等字段处理（不再区分 top/rule）
 * @param {Object} rule - 配置对象（原 Mihomo_Rule_Data.data）
 */
export function applyTemplate(rule, e) {
    if (e.tun && rule.tun) {
        rule.tun.enable = false;
    } else if (rule.tun) {
        if (e.exclude_address && e.Exclude_Address) {
            rule.tun['route-address'] = ['0.0.0.0/1', '128.0.0.0/1', '::/1', '8000::/1'];
            rule.tun['route-exclude-address'] = e.Exclude_Address || [];
        }
        if (e.exclude_package && e.Exclude_Package) {
            rule.tun['include-package'] = [];
            rule.tun['exclude-package'] = e.Exclude_Package || [];
        }
    }

    if (rule['proxy-providers'] && Object.keys(rule['proxy-providers']).length === 0) {
        delete rule['proxy-providers'];
    }
    if (rule['sub-rules'] && Object.keys(rule['sub-rules']).length === 0) {
        delete rule['sub-rules'];
    }
}

/**
 * 获取 Mihomo 代理分组信息
 */
export function getMihomo_Proxies_Grouping(proxies, groups) {
    const deletedGroups = [];
    const updatedGroups = groups['proxy-groups'].filter((group) => {
        let matchFound = false;
        let filter = group.filter;
        if (typeof filter !== 'string') return true;

        const hasIgnoreCase = /\(\?i\)/i.test(filter);
        const cleanedFilter = filter.replace(/\(\?i\)/gi, '');

        let regex;
        try {
            regex = new RegExp(cleanedFilter, hasIgnoreCase ? 'i' : '');
        } catch (e) {
            console.warn(`无效的正则表达式: ${filter}`, e);
            return true;
        }

        for (let proxy of proxies.proxies) {
            if (regex.test(proxy.name)) {
                matchFound = true;
                break;
            }
        }

        if (!matchFound && (!group.proxies || group.proxies.length === 0)) {
            deletedGroups.push(group.name);
            return false;
        }

        return true;
    });

    updatedGroups.forEach((group) => {
        if (group.proxies) {
            group.proxies = group.proxies.filter((proxyName) => {
                return !deletedGroups.some((deletedGroup) => deletedGroup.includes(proxyName));
            });
        }
    });

    return updatedGroups;
}