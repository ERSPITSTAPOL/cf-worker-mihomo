import * as utils from './utils.js';
import getMihomo_Proxies_Data from './proxies.js';

export async function getmihomo_config(e) {
	e.urls = utils.splitUrlsAndProxies(e.urls);
	
	const [
		Mihomo_Top_Data,
		Mihomo_Rule_Data,
		Mihomo_Proxies_Data,
		Exclude_Package,
		Exclude_Address
	] = await Promise.all([
		utils.Top_Data(e.Mihomo_default),
		utils.Rule_Data(e.rule),
		getMihomo_Proxies_Data(e),
		e.exclude_package ? utils.fetchpackExtract() : null,
		e.exclude_address ? utils.fetchipExtract() : null,
	]);
	e.Exclude_Package = Exclude_Package;
	e.Exclude_Address = Exclude_Address;
	if (!Mihomo_Proxies_Data?.data?.proxies || Mihomo_Proxies_Data?.data?.proxies?.length === 0)
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

	// 删除空组
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
	applyTemplate(Mihomo_Top_Data.data, Mihomo_Rule_Data.data, e);
	return {
		status: Mihomo_Proxies_Data.status,
		headers: Mihomo_Proxies_Data.headers,
		data: JSON.stringify(Mihomo_Top_Data.data, null, 4),
	};
}

/**
 * 将模板中的 proxies、proxy-groups、rules 等字段合并到目标配置对象
 * @param {Object} target - 目标配置对象（基础配置）
 * @param {Object} template - 模板配置对象
 */
 
export function applyTemplate(top, rule, e) {
    top['proxy-providers'] = rule['proxy-providers'] || {};
    top.proxies = rule.proxies || [];
    top['proxy-groups'] = rule['proxy-groups'] || [];
    top.rules = rule.rules || [];
    top['sub-rules'] = rule['sub-rules'] || {};
    top['rule-providers'] = { ...(top['rule-providers'] || {}), ...(rule['rule-providers'] || {}) };

    if (e.tun && top.tun) {
        top.tun.enable = false;
    } else if (top.tun) {
        if (e.exclude_address && e.Exclude_Address) {
            top.tun['route-address'] = ['0.0.0.0/1', '128.0.0.0/1', '::/1', '8000::/1'];
            top.tun['route-exclude-address'] = e.Exclude_Address || [];
        }
        if (e.exclude_package && e.Exclude_Package) {
            top.tun['include-package'] = [];
            top.tun['exclude-package'] = e.Exclude_Package || [];
        }
    }
    
    if (top['proxy-providers'] && Object.keys(top['proxy-providers']).length === 0) {
        delete top['proxy-providers'];
    }
    if (top['sub-rules'] && Object.keys(top['sub-rules']).length === 0) {
        delete top['sub-rules'];
    }
}
/**
 * 获取 Mihomo 代理分组信息
 * @param {Array} proxies - 代理列表
 * @param {Array} groups - 策略组
 * @returns {Object} 分组信息
 */
export function getMihomo_Proxies_Grouping(proxies, groups) {
    const deletedGroups = []; // 用于记录已删除的组名
    const updatedGroups = groups['proxy-groups'].filter((group) => {
        let matchFound = false;
        // 确保 filter 存在并且是一个字符串
        let filter = group.filter;
        if (typeof filter !== 'string') {
            return true; // 保留没有 filter 的组
        }
        // 移除所有 (?i)，但保留后续内容
        const hasIgnoreCase = /\(\?i\)/i.test(filter);
        const cleanedFilter = filter.replace(/\(\?i\)/gi, '');

        let regex;
        try {
            regex = new RegExp(cleanedFilter, hasIgnoreCase ? 'i' : '');
        } catch (e) {
            console.warn(`无效的正则表达式: ${filter}`, e);
            return true; // 遇到错误时保留该组
        }
        // 遍历每个代理，检查是否与当前组的正则匹配
        for (let proxy of proxies.proxies) {
            if (regex.test(proxy.name)) {
                matchFound = true;
                break;
            }
        }
        // 如果没有匹配，记录删除的组并返回 false (删除该组)
        if (!matchFound && (!group.proxies || group.proxies.length === 0)) {
            deletedGroups.push(group.name);
            return false;
        }

        return true;
    });
    // 遍历所有策略组，删除 deletedGroups 中的代理
    updatedGroups.forEach((group) => {
        if (group.proxies) {
            group.proxies = group.proxies.filter((proxyName) => {
                // 只删除那些在 deletedGroups 中的代理
                return !deletedGroups.some((deletedGroup) => {
                    return deletedGroup.includes(proxyName); // 检查 deletedGroups 中是否包含该代理名称
                });
            });
        }
    });
    return updatedGroups;
}