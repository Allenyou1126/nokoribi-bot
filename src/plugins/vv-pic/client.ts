import zlib from "node:zlib";

const SEARCH_API_URL = "https://vvapi.cicada000.work/search";
const IMAGE_BASE_URL = "https://vv.noxylva.org";

const REQUEST_HEADERS = {
    "Accept-Encoding": "identity",
};

const REQUEST_TIMEOUT_MS = 30_000;

export type VVSearchItem = {
    filename: string;
    timestamp: string;
    similarity: number;
};

export async function searchImages(
    query: string,
    options: {
        minRatio?: number;
        minSimilarity?: number;
        maxResults?: number;
    } = {}
): Promise<VVSearchItem[]> {
    const params = new URLSearchParams({
        query,
        min_ratio: String(options.minRatio ?? 50),
        min_similarity: String(options.minSimilarity ?? 0.5),
        max_results: String(options.maxResults ?? 1),
    });
    const response = await fetch(`${SEARCH_API_URL}?${params}`, {
        headers: REQUEST_HEADERS,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
        throw new Error(`搜索接口返回 ${response.status}`);
    }
    const results: VVSearchItem[] = [];
    for (const line of (await response.text()).split(/\r?\n/)) {
        if (!line.trim()) {
            continue;
        }
        try {
            const item = JSON.parse(line) as Record<string, unknown>;
            if (
                typeof item.filename === "string" &&
                typeof item.timestamp === "string" &&
                typeof item.similarity === "number"
            ) {
                results.push({
                    filename: item.filename,
                    timestamp: item.timestamp,
                    similarity: item.similarity,
                });
            }
        } catch {
            // 忽略无法解析的行
        }
    }
    return results;
}

export function parseTimestamp(timestamp: string): number {
    const match = /^(\d+)m(\d+)s$/.exec(timestamp);
    return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
}

const decodeAwsChunked = (data: Buffer): Buffer => {
    const decoded = Buffer.alloc(data.length);
    let pos = 0;
    let written = 0;
    while (pos < data.length) {
        const chunkEnd = data.indexOf("\r\n", pos, "ascii");
        if (chunkEnd === -1) {
            break;
        }
        const chunkSize = Number.parseInt(
            data.toString("ascii", pos, chunkEnd),
            16
        );
        if (chunkSize <= 0) {
            break;
        }
        const chunkStart = chunkEnd + 2;
        const chunkDataEnd = chunkStart + chunkSize;
        if (chunkDataEnd > data.length) {
            break;
        }
        data.copy(decoded, written, chunkStart, chunkDataEnd);
        written += chunkSize;
        pos = chunkDataEnd + 2;
    }
    return decoded.subarray(0, written);
};

const fetchIndex = async (groupIndex: number): Promise<Buffer> => {
    const response = await fetch(`${IMAGE_BASE_URL}/${groupIndex}.index`, {
        headers: REQUEST_HEADERS,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
        throw new Error(
            `索引下载失败 ${groupIndex}.index，HTTP ${response.status}`
        );
    }
    let data: Buffer = Buffer.from(await response.arrayBuffer());
    const contentEncoding = response.headers.get("content-encoding") ?? "";
    if (contentEncoding.includes("aws-chunked")) {
        data = decodeAwsChunked(data);
    }
    if (contentEncoding.includes("gzip")) {
        try {
            data = zlib.gunzipSync(data);
        } catch {
            // 数据可能已被自动解压
        }
    }
    return data;
};

const parseIndex = (
    indexData: Buffer,
    folderId: number,
    frameNum: number
): { startOffset: bigint; endOffset: bigint | null } | undefined => {
    const folderCount = indexData.readUInt32LE(8);
    let offset = 12 + folderCount * 4;
    const fileCount = indexData.readUInt32LE(offset);
    offset += 4;

    let left = 0;
    let right = fileCount - 1;
    while (left <= right) {
        const mid = (left + right) >> 1;
        const recordOffset = offset + mid * 16;
        const currFolder = indexData.readUInt32LE(recordOffset);
        const currFrame = indexData.readUInt32LE(recordOffset + 4);
        if (currFolder === folderId && currFrame === frameNum) {
            const startOffset = indexData.readBigUInt64LE(recordOffset + 8);
            const endOffset =
                mid < fileCount - 1
                    ? indexData.readBigUInt64LE(recordOffset + 24)
                    : null;
            return { startOffset, endOffset };
        }
        if (
            currFolder < folderId ||
            (currFolder === folderId && currFrame < frameNum)
        ) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    return undefined;
};

export const extractFrame = async (
    folderId: number,
    frameNum: number
): Promise<Buffer | null> => {
    const groupIndex = Math.floor((folderId - 1) / 10);
    const indexData = await fetchIndex(groupIndex);
    const offsetInfo = parseIndex(indexData, folderId, frameNum);
    if (!offsetInfo) {
        return null;
    }
    const headers: Record<string, string> = {};
    if (offsetInfo.endOffset !== null) {
        headers.Range = `bytes=${offsetInfo.startOffset}-${offsetInfo.endOffset - 1n}`;
    }
    const response = await fetch(`${IMAGE_BASE_URL}/${groupIndex}.webp`, {
        headers,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
        throw new Error(
            `图片下载失败 P${folderId}-${frameNum}s，HTTP ${response.status}`
        );
    }
    return Buffer.from(await response.arrayBuffer());
};

export const downloadFrame = async (query: string): Promise<Buffer | null> => {
    const results = await searchImages(query);
    if (results.length === 0) {
        return null;
    }
    const item = results[0];
    const folderMatch = /\[P(\d+)\]/.exec(item.filename);
    if (!folderMatch) {
        return null;
    }
    const folderId = Number(folderMatch[1]);
    const frameNum = parseTimestamp(item.timestamp);
    return extractFrame(folderId, frameNum);
};
