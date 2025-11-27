import * as utils from './utils.js';
export default async function getSingbox_Outbounds_Data(e) {
    // 处理单个 URL 的情况
    if (e.urls.length === 1) {
        return await processSingleUrl(e.urls[0], e);
    }

    // 处理多个 URL 的情况
    return await processMultipleUrls(e);
}

// 处理单个 URL
async function processSingleUrl(url, options) {
    let response = await fetchWithFallback(url, options, false);

    if (response?.data?.outbounds?.length > 0) {
        processOutbounds(response.data.outbounds, options, 0);
        return formatResponse(response);
    }

    return null;
}

// 处理多个 URL
async function processMultipleUrls(options) {
    const outboundsList = [];
    const responseList = [];

    for (let i = 0; i < options.urls.length; i++) {
        const response = await fetchWithFallback(options.urls[i], options, true, i + 1);

        if (response?.data?.outbounds?.length > 0) {
            processOutbounds(response.data.outbounds, options, i + 1);
            responseList.push(response);
            outboundsList.push(response.data.outbounds);
        }
    }

    if (responseList.length === 0) {
        throw new Error('No valid outbounds found from any URL');
    }

    const randomResponse = responseList[Math.floor(Math.random() * responseList.length)];

    return {
        status: randomResponse.status,
        headers: randomResponse.headers,
        data: { outbounds: outboundsList.flat() },
    };
}

// 带回退机制的请求
async function fetchWithFallback(url, options, addIndex, index = null) {
    let response = await utils.fetchResponse(url, options.userAgent);
    
    if (hasValidOutbounds(response)) {
        return response;
    }
    const isClashData = response?.data?.proxies && Array.isArray(response.data.proxies);

    if (isClashData || response?.status !== 200 || !response?.data) {
        
        const apiUrl = utils.buildApiUrl(url, options.sub, 'singbox'); 
        response = await utils.fetchResponse(apiUrl, options.userAgent);

        if (hasValidOutbounds(response)) {
            return response;
        }
    }    
    return null;
}
// 检查响应是否包含有效的 outbounds
function hasValidOutbounds(response) {
    return response?.data?.outbounds && Array.isArray(response.data.outbounds);
}

// 处理 outbounds 数组
function processOutbounds(outbounds, options, index) {
    outbounds.forEach((outbound) => {
        if (index > 0) {
            outbound.tag = `${outbound.tag} [${index}]`;
        }
        if (options.udp_fragment) {
            outbound.udp_fragment = true;
        }
    });
}

// 格式化响应
function formatResponse(response) {
    return {
        status: response.status,
        headers: response.headers,
        data: response.data,
    };
}