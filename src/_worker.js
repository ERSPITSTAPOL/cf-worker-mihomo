import { getmihomo_config } from './mihomo.js';
import { getsingbox_config } from './singbox.js';
import { getv2ray_config } from './v2ray.js';
import { getFakePage } from './page.js';
import * as utils from './utils.js';
import YAML from 'yaml';

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        const originalUA = request.headers.get('User-Agent');
        let overrideUA;
        const mihomo = url.searchParams.get('mihomo') === 'true';
        const singbox = url.searchParams.get('singbox') === 'true';
        const v2ray = url.searchParams.get('v2ray') === 'true';
        if (mihomo) overrideUA = 'clash.meta';
        else if (singbox) overrideUA = '1.12.11';
        else if (v2ray) overrideUA = originalUA;
        else overrideUA = originalUA;

        const yamlParam = url.searchParams.get('yaml') === 'true';
        const e = {
            url,
            urls: url.searchParams.getAll('url'),
            userAgent: overrideUA,
            rule: url.searchParams.get('template'),
            singbox,
            mihomo,
            v2ray,
            udp: url.searchParams.get('udp') === 'true',
            udp_fragment: url.searchParams.get('udp_frag') === 'true',
            tls_fragment: url.searchParams.get('tls_frag') === 'true',
            exclude_package: url.searchParams.get('ep') === 'true',
            exclude_address: url.searchParams.get('ea') === 'true',
            tailscale: url.searchParams.get('tailscale') === 'true',
            tun: url.searchParams.get('tun') === 'true',
            adgdns: url.searchParams.get('adgdns') === 'true',
            IMG: env.IMG || utils.backimg,
            sub: env.SUB || utils.subapi,
            Mihomo_default: env.MIHOMOTOP || utils.mihomo_top,
            singbox_1_11: env.SINGBOX_1_11 || utils.singbox_1_11,
            singbox_1_12: env.SINGBOX_1_12 || utils.singbox_1_12,
            singbox_1_12_alpha: env.SINGBOX_1_12_ALPHA || utils.singbox_1_12_alpha,
            singbox_1_13: env.SINGBOX_1_13 || utils.singbox_1_13,
            beian: env.BEIAN || utils.beiantext,
            beianurl: env.BEIANURL || utils.beiandizi,
            configs: utils.configs(env.MIHOMO, env.SINGBOX),
        };

        e.modes = utils.modes(e.sub, e.userAgent);

        if (e.urls.length === 1 && e.urls[0].includes(',')) {
            e.urls = e.urls[0].split(',').map(u => u.trim());
        }
        if (e.urls.length === 0 || e.urls[0] === '') {
            return new Response(await getFakePage(e), {
                status: 200,
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
            });
        }

        try {
            let res;

            if (e.singbox) res = await getsingbox_config(e);
            else if (e.mihomo) res = await getmihomo_config(e);
            else if (e.v2ray) res = await getv2ray_config(e);
            const responseHeaders = res.headers;
            const headers = new Headers(responseHeaders);
            const status = res.status;

            let body = res.data;

            if (yamlParam) {
                const obj = JSON.parse(res.data);
                body = YAML.stringify(obj);
                headers.set('Content-Type', 'text/yaml; charset=utf-8');
            } else {
                headers.set('Content-Type', 'application/json; charset=utf-8');
            }

            headers.set('Profile-web-page-url', url.origin);
            return new Response(body, { status, headers });
        } catch (err) {
            return new Response(err.message, {
                status: 400,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
            });
        }
    },
};