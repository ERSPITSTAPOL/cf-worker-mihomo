// import fetch from 'node-fetch';
import YAML from 'yaml';
export const backimg = base64DecodeUtf8( '' );
export const subapi = base64DecodeUtf8( '' );
export const mihomo_top = base64DecodeUtf8( 'aHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL0VSU1BJVFNUQVBPTC9jZi13b3JrZXItbWlob21vL3JlZnMvaGVhZHMvbWFpbi9Db25maWcvRmFsbGJhY2sueWFtbA==' );
export const singbox_1_11 = base64DecodeUtf8( 'aHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL0t3aXNtYS9jZi13b3JrZXItbWlob21vL3JlZnMvaGVhZHMvbWFpbi9Db25maWcvc2luZ2JveF8xLjExLlguanNvbg=='
);
export const singbox_1_12 = base64DecodeUtf8( 'aHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL0t3aXNtYS9jZi13b3JrZXItbWlob21vL3JlZnMvaGVhZHMvbWFpbi9Db25maWcvc2luZ2JveC0xLjEyLlguanNvbg=='
);
export const singbox_1_12_alpha = base64DecodeUtf8( '' );
export const singbox_1_13 = base64DecodeUtf8( 'aHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL0t3aXNtYS9jZi13b3JrZXItbWlob21vL3JlZnMvaGVhZHMvbWFpbi9Db25maWcvc2luZ2JveC0xLjEzLlguanNvbg=='
);
export const beiantext = base64DecodeUtf8( '' );
export const beiandizi = base64DecodeUtf8( '' );
// 实现base64解码UTF-8字符串的函数
export function base64DecodeUtf8(str) {
    const binary = atob(str);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
}
// 实现base64编码UTF-8字符串的函数
export function base64EncodeUtf8(str) {
    const bytes = new TextEncoder('utf-8').encode(str);
    const binary = String.fromCharCode.apply(null, bytes);
    return btoa(binary);
}
// 订阅链接
export function buildApiUrl(rawUrl, BASE_API, ua) {
    const params = new URLSearchParams({
        target: ua,
        url: rawUrl,
        emoji: 'true',
        list: 'true',
        new_name: 'true',
    });
    return `${BASE_API}/sub?${params}`;
}
// 处理请求
export async function fetchResponse(url, userAgent) {
    if (!userAgent) userAgent = 'v2rayNG';
    let response;
    try {
        response = await fetch(url, {
            method: 'GET',
            headers: { 'User-Agent': userAgent },
        });
    } catch {
        return true;
    }

    const headersObj = Object.fromEntries(response.headers.entries());
    const sanitizedCD = sanitizeContentDisposition(response.headers);
    if (sanitizedCD) headersObj['content-disposition'] = sanitizedCD;

    const textData = await response.text();
    let jsonData;
    try {
        jsonData = YAML.parse(textData, { maxAliasCount: -1, merge: true });
    } catch {
        try {
            jsonData = JSON.parse(textData);
        } catch {
            jsonData = textData;
        }
    }

    return {
        status: response.status,
        headers: headersObj,
        data: jsonData,
    };
}
// 将订阅链接和代理地址分离
export function splitUrlsAndProxies(urls) {
    const result = [];
    let proxyText = '';

    for (const url of urls) {
        if (url.startsWith('http://') || url.startsWith('https://')) {
            result.push(url);
        } else {
            if (proxyText) {
                proxyText += '|';
            }
            proxyText += url;
        }
    }
    if (proxyText) {
        result.push(proxyText);
    }
    return result;
}
/**
 * 获取模板数据
 * @param {string} top - 模板文件地址
 * @returns {Promise<Object|null>} - 返回模板数据对象，或没有模板时返回 null
 */
export async function Top_Data(top) {
    return await fetchResponse(top);
}
/**
 * 获取基础配置数据，若未提供则使用默认配置地址
 * @param {string} rule - 配置文件地址
 * @returns {Promise<Object>} - 返回配置数据对象
 */
export async function Rule_Data(rule) {
    if (!rule) {
        throw new Error(`缺少规则模板`);
    }
    return await fetchResponse(rule);
}

export function configs(mihomo = '', singbox = '') {
    const data = {
        mihomo: [
            {
                label: '策略组和规则',
                options: [
                    {
                        label: '简易分流Selector&Fallback Noicon',
                        value: 'https://raw.githubusercontent.com/ERSPITSTAPOL/cf-worker-mihomo/refs/heads/main/template/Selector.yaml',
                    },
                    {
                        label: '简易分流Auto&Select Withicon',
                        value: 'https://raw.githubusercontent.com/ERSPITSTAPOL/cf-worker-mihomo/refs/heads/main/template/FL.yaml',
                    },
                    {
                        label: '默认(精简版) (仅国内外分流) (与Github同步) ',
                        value: 'https://raw.githubusercontent.com/Kwisma/cf-worker-mihomo/main/template/Mihomo_default.yaml',
                    },
                    {
                        label: '默认(精简版) (仅国内外分流) (无去广告) (与Github同步) ',
                        value: 'https://raw.githubusercontent.com/Kwisma/cf-worker-mihomo/main/template/Mihomo_default_NoAds.yaml',
                    },
                    {
                        label: '默认(mihomo官方版) (与Github同步) ',
                        value: 'https://raw.githubusercontent.com/Kwisma/cf-worker-mihomo/main/template/Mihomo_official.yaml',
                    },
                    {
                        label: '默认(mihomo官方版) (无去广告) (与Github同步) ',
                        value: 'https://raw.githubusercontent.com/Kwisma/cf-worker-mihomo/main/template/Mihomo_official_NoAds.yaml',
                    },
                    {
                        label: '默认(ACL4SSR_Online_Full) (与Github同步)',
                        value: 'https://raw.githubusercontent.com/Kwisma/cf-worker-mihomo/main/template/Mihomo_ACL4SSR_Online_Full.yaml',
                    },
                    {
                        label: '默认(ACL4SSR_Online_Full) (无去广告Mihomo_ACL4SSR_Online_Full_NoAds.yaml) (与Github同步)',
                        value: 'https://raw.githubusercontent.com/Kwisma/cf-worker-mihomo/main/template/Mihomo_ACL4SSR_Online_Full_NoAds.yaml',
                    },
                    {
                        label: '默认(全分组) (与Github同步) ',
                        value: 'https://raw.githubusercontent.com/Kwisma/cf-worker-mihomo/main/template/Mihomo_default_full.yaml',
                    },
                    {
                        label: '默认(全分组) (无去广告) (与Github同步) ',
                        value: 'https://raw.githubusercontent.com/Kwisma/cf-worker-mihomo/main/template/Mihomo_default_full_NoAds.yaml',
                    },
                ],
            },
        ],
        singbox: [
            {
                label: '策略组和规则',
                options: [
                    {
                        label: '默认(精简版) (与Github同步) ',
                        value: 'https://raw.githubusercontent.com/Kwisma/cf-worker-mihomo/main/template/singbox_default.yaml',
                    },
                    {
                        label: '默认(精简版) (无去广告) (与Github同步) ',
                        value: 'https://raw.githubusercontent.com/Kwisma/cf-worker-mihomo/main/template/singbox_default_NoAds.yaml',
                    },
                    {
                        label: '默认(mini版) (与Github同步) ',
                        value: 'https://raw.githubusercontent.com/Kwisma/cf-worker-mihomo/main/template/singbox_default_mini.yaml',
                    },
                    {
                        label: '默认(mini版) (无去广告) (与Github同步) ',
                        value: 'https://raw.githubusercontent.com/Kwisma/cf-worker-mihomo/main/template/singbox_default_mini_NoAds.yaml',
                    },
                    {
                        label: '默认(全分组) (与Github同步) ',
                        value: 'https://raw.githubusercontent.com/Kwisma/cf-worker-mihomo/main/template/singbox_default_full.yaml',
                    },
                    {
                        label: '默认(全分组) (无去广告) (与Github同步) ',
                        value: 'https://raw.githubusercontent.com/Kwisma/cf-worker-mihomo/main/template/singbox_default_full_NoAds.yaml',
                    },
                    {
                        label: 'DustinWin 全分组版 (与Github同步) ',
                        value: 'https://raw.githubusercontent.com/Kwisma/cf-worker-mihomo/main/template/singbox_DustinWin_full.yaml',
                    },
                    {
                        label: 'DustinWin 全分组版 (无去广告) (与Github同步) ',
                        value: 'https://raw.githubusercontent.com/Kwisma/cf-worker-mihomo/main/template/singbox_DustinWin_full_NoAds.yaml',
                    },
                ],
            },
        ],
    };
    if (mihomo) {
        data.mihomo[0].options.unshift({
            label: '自定义规则',
            value: mihomo,
        });
    }
    if (singbox) {
        data.singbox[0].options.unshift({
            label: '自定义规则',
            value: singbox,
        });
    }
    return JSON.stringify(data);
}

export function modes(sub, userAgent) {
    const modes = {
        mihomo: {
            name: 'Clash (mihomo)',
            placeholder: '请输入clash订阅地址url，支持各种订阅或单节点链接',
            tipText: `
## mihomo 使用提示：

- 支持各种订阅或单节点链接，自动合并生成配置
- mixed(http/socks) 端口: 7890
- 适用于 mihomo 客户端
- 去广告使用 [秋风广告规则](https://github.com/TG-Twilight/AWAvenue-Ads-Rule.git)
- 防止 DNS 泄漏(安全DNS/DoH)
- 关闭所有覆写功能(不是关闭功能，是关闭覆写)以确保配置正常生效

## 附加参数说明

- UDP : 启用 UDP 代理流量 [查看详情](https://wiki.metacubex.one/config/proxies/#udp)
- 分应用代理: 排除 CN 应用(仅包含android应用)不入代理工具 [查看详情](https://wiki.metacubex.one/config/inbound/tun/#exclude-package)
- 分IPCIDR代理: 排除 CN IP 不进入代理工具 [查看详情](https://wiki.metacubex.one/config/inbound/tun/#route-exclude-address)
- 去广告dns: 直连使用 [dns.18bit.cn](https://www.18bit.cn), 代理使用 [dns.adguard-dns.com](https://adguard-dns.io/)
- 仅代理: 关闭 VPN 代理，使用 mixed(http/socks) 端口进行代理。实际就是关闭了 tun 入站
- 输出 YAML: 勾选后生成的订阅链接会自动转换成yaml格式

## 配置信息

**userAgent** ${userAgent}

**转换后端** ${sub}
                `,
            protocolOptions: [
                { value: 'udp', label: '启用 UDP', checked: true },
                { value: 'ep', label: '启用 分应用代理(仅Android)' },
                { value: 'ea', label: '启用 分IPCIDR代理(ios/macOS/windows/linux 推荐)' },
                { value: 'tun', label: '启用 仅代理' },
                { value: 'yaml', label: '输出为YAML文件', checked: true },
            ],
        },
        singbox: {
            name: 'Singbox',
            placeholder: '请输入singbox订阅地址url，支持各种订阅或单节点链接',
            tipText: `
## singbox 使用提示：

- 支持各种订阅或单节点链接，自动合并生成配置
- 面板地址: http://127.0.0.1:20123
- mixed(http/socks) 端口: 20120
- 使用 sub-store 后端转换
- 适用于 sing-box 客户端
- 支持 1.11.x
- 支持 1.12.x
- 支持 1.13.x
- 去广告使用 [秋风广告规则](https://github.com/TG-Twilight/AWAvenue-Ads-Rule.git)
- 防止 DNS 泄漏(安全DNS/DoH)
- 屏蔽 WebRTC 泄漏(防止真实IP暴露)
- 关闭所有覆写功能(不是关闭功能，是关闭覆写)以确保配置正常生效

## 附加参数说明

- UDP: 启用 UDP 代理流量 [查看详情](https://sing-box.sagernet.org/zh/configuration/route/rule_action/#udp_disable_domain_unmapping)
- UDP 分段: [查看详情](https://sing-box.sagernet.org/zh/configuration/shared/dial/#udp_fragment)
- TLS 分段: 绕过被防火墙拦截的域名 [查看详情](https://sing-box.sagernet.org/zh/configuration/route/rule_action/#tls_fragment)
- 分应用代理: 排除 CN 应用(仅包含android应用)不入代理工具 [查看详情](https://sing-box.sagernet.org/zh/configuration/inbound/tun/#exclude_package)
- 分IPCIDR代理: 排除 CN IP 不进入代理工具 [查看详情](https://sing-box.sagernet.org/zh/configuration/inbound/tun/#route_exclude_address)
- tailscale: [查看详情](https://sing-box.sagernet.org/zh/configuration/endpoint/tailscale)
- 去广告dns: 直连使用 [dns.18bit.cn](https://www.18bit.cn), 代理使用 [dns.adguard-dns.com](https://adguard-dns.io/)
- 仅代理: 关闭 VPN 代理，使用 mixed(http/socks) 端口进行代理。实际就是关闭了 tun 入站

## 配置信息

**userAgent** ${userAgent}

**转换后端** ${sub}
                `,
            protocolOptions: [
                { value: 'udp', label: '启用 UDP', checked: true },
                { value: 'udp_frag', label: '启用 UDP 分段' },
                { value: 'tls_frag', label: '启用 TLS 分段' },
                { value: 'ep', label: '启用 分应用代理(仅Android)' },
                { value: 'ea', label: '启用 分IPCIDR代理(ios/macOS/windows/linux 推荐)' },
                { value: 'tailscale', label: '启用 tailscale' },
                { value: 'tun', label: '启用 仅代理' },
            ],
        },
        v2ray: {
            name: 'V2Ray',
            placeholder: '请输入V2Ray订阅地址url, 支持各种订阅或单节点链接',
            tipText: `
**转换后端** ${sub}
                `,
            protocolOptions: [],
            noTemplate: true, // 添加此标志表示不需要 protocolOptions 和 模板
        },
    };
    return JSON.stringify(modes);
}

export function sanitizeContentDisposition(headers) {
    const contentDisposition = headers.get('Content-Disposition') || headers.get('content-disposition');

    if (!contentDisposition) return null;

    const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);

    if (!filenameMatch) return null;

    const originalFilename = filenameMatch[1];

    // 检查是否含中文(或非 ASCII)
    const isNonAscii = /[^\x00-\x7F]/.test(originalFilename);
    if (!isNonAscii) return contentDisposition; // 不含中文，保持原样

    // 使用 fallback ASCII 名 + filename*=UTF-8''xxx 形式替换
    const fallback = 'download.json';
    const encoded = encodeURIComponent(originalFilename);

    return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
/**
 * 获取应用包名列表
 * @returns {Promise<Object>} - 返回配置数据对象
 */
export async function fetchpackExtract(userAgent) {
    if (!userAgent) userAgent = 'v2rayNG';
    const processNames = new Set();
    const urls = [
        'https://github.com/mnixry/direct-android-ruleset/raw/refs/heads/rules/@Merged/GAME.mutated.yaml',
        'https://github.com/mnixry/direct-android-ruleset/raw/refs/heads/rules/@Merged/APP.mutated.yaml',
    ];
    const excludeCommentKeywords = ['浏览器'];
    const excludeNames = new Set(['com.android.chrome']);
    for (const url of urls) {
        const res = await fetch(url, { headers: { 'User-Agent': userAgent } });
        if (!res.ok) continue;
        const text = await res.text();
        for (const line of text.split('\n')) {
            const match = line.match(/PROCESS-NAME\s*,\s*([^\s,]+)/);
            if (match) {
                const processName = match[1];
                const hasExcludedComment = excludeCommentKeywords.some(k => line.includes(k));
                if (!hasExcludedComment && !excludeNames.has(processName)) processNames.add(processName);
            }
        }
    }
    return [...processNames];
}
/**
 * 获取IPCIDR列表
 * @returns {Promise<Object>} - 返回配置数据对象
 */
export async function fetchipExtract(userAgent) {
    if (!userAgent) userAgent = 'v2rayNG';
    const urls = ['https://raw.githubusercontent.com/Kwisma/clash-rules/release/cncidr.yaml'];
    const ipcidrs = [];
    for (const url of urls) {
        const res = await fetch(url, { headers: { 'User-Agent': userAgent } });
        if (!res.ok) continue;
        const data = await res.text();
        const jsondata = YAML.parse(data, { maxAliasCount: -1, merge: true });
        if (Array.isArray(jsondata.payload)) ipcidrs.push(...jsondata.payload);
    }
    return ipcidrs;
}