export async function checkLinks(urls: string[]): Promise<{[key: string]: string}> {
    const linkResultsMap: {[key: string]: string} = {};
    urls.forEach(async (url) => {
        if (url in linkResultsMap) return;
        try {
            const response = await fetch(url, { method: 'HEAD' });
            linkResultsMap[url] = response.status.toString();
        } catch {
            linkResultsMap[url] = 'Link Check Failed';
        }
    });
    return linkResultsMap;
}