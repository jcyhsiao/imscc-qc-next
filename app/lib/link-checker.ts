import { link } from "fs";

export async function checkLinks(urls: string[]): Promise<{[key: string]: string}> {
    const linkResultsMap: {[key: string]: string} = {};
    urls.forEach(async (url) => {
        if (url in linkResultsMap) return;
        let result = '';
        try {
            const response = await fetch(url, { method: 'HEAD' });
            linkResultsMap[url] = response.status.toString();
        } catch (error) {
            linkResultsMap[url] = 'Link Check Failed';
        }
    });
    return linkResultsMap;
}