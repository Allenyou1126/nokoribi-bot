import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { definePlugin, param, seg } from "@fraqjs/fraq";
import { KyselyService } from "@fraqjs/plugin-kysely";
import { RandomService } from "@fraqjs/plugin-random";

import config from "@/config";

import { FurryImageStoreService } from "./service";

const IMG_PATH = path.join(config.storagePath, "furimg");

const FurryImagePlugin = definePlugin({
    name: "FurryImage",
    inject: { kysely: KyselyService, random: RandomService },
    provides: [FurryImageStoreService],

    apply: (ctx) => {
        const store = new FurryImageStoreService(ctx.kysely);
        ctx.provide(FurryImageStoreService, store);
        if (!fs.existsSync(IMG_PATH)) {
            fs.mkdirSync(IMG_PATH);
        }
        ctx.router
            .command("furimg")
            .describe("来只毛 —— 随机毛毛图片")
            .arg("name", param.str().describe("毛毛的名称或别名"))
            .execute(async (session, { name }) => {
                const furry =
                    (await store.getFurryByName(name)) ??
                    (await store.findFurryByAlias(name));
                if (!furry) {
                    await session.reply(`未找到毛毛「${name}」`);
                    return;
                }
                const images = (
                    await store.listImages(furry.id)
                ).filter((image) => {
                    const fullPath = path.resolve(IMG_PATH, image.path);
                    return (
                        fullPath.startsWith(path.resolve(IMG_PATH) + path.sep) &&
                        fs.existsSync(fullPath)
                    );
                });
                if (images.length === 0) {
                    await session.reply(
                        `毛毛「${furry.name}」暂时没有可用的图片`
                    );
                    return;
                }
                await session.reply(`#${furry.id} ${furry.name}`);
                const image = ctx.random.pick(images);
                await session.reply([
                    seg.image(pathToFileURL(path.resolve(IMG_PATH, image.path)).href),
                ]);
            });
    },
});

export { FurryImagePlugin, FurryImagePlugin as default, FurryImageStoreService };
