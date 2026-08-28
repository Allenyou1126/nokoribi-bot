import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { definePlugin, param, seg } from "@fraqjs/fraq";

import config from "@/config";

import { downloadFrame } from "./client";

const CACHE_DIR = path.join(config.storagePath, "vvpic");

const CACHE_FILE_TTL_MS = 60_000;

const ALLOWED_QUERY_PATTERN = /^[\w\s\u4e00-\u9fff\u3400-\u4dbf\-_.]+$/;

const VVPicPlugin = definePlugin({
    name: "VVPic",
    apply: (ctx) => {
        fs.mkdirSync(CACHE_DIR, { recursive: true });

        ctx.router
            .command("vv")
            .describe("检索 VV 表情包")
            .arg("query", param.greedy().describe("搜索关键词"))
            .execute(async (session, { query }) => {
                const trimmed = query.trim();
                if (!trimmed) {
                    await session.reply("输入 /vv 关键词 进行检索");
                    return;
                }
                if (!ALLOWED_QUERY_PATTERN.test(trimmed)) {
                    await session.reply(
                        "关键词包含非法字符，只允许字母、数字、空格、中文、-、_和."
                    );
                    return;
                }
                let imageData: Buffer | null;
                try {
                    imageData = await downloadFrame(trimmed);
                } catch (error) {
                    await session.reply(
                        `执行失败：${error instanceof Error ? error.message : String(error)}`
                    );
                    return;
                }
                if (!imageData) {
                    await session.reply(
                        `未找到与「${trimmed}」相匹配的结果\n建议尝试使用更简短的关键词`
                    );
                    return;
                }
                const filePath = path.join(
                    CACHE_DIR,
                    `vv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.webp`
                );
                await fs.promises.writeFile(filePath, imageData);
                await session.reply([seg.image(pathToFileURL(filePath).href)]);
                setTimeout(() => {
                    fs.promises.rm(filePath, { force: true }).catch(() => {});
                }, CACHE_FILE_TTL_MS);
            });
    },
});

export { VVPicPlugin, VVPicPlugin as default };
