import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { definePlugin, seg } from "@fraqjs/fraq";
import { KyselyService } from "@fraqjs/plugin-kysely";
import { RandomService } from "@fraqjs/plugin-random";

import { FurryImageStoreService } from "./service";

const FurryImageFurCPCSpecialPlugin = definePlugin({
    name: "FurryImageFurCPCSpecial",
    inject: {
        kysely: KyselyService,
        store: FurryImageStoreService,
        random: RandomService,
    },

    apply: (ctx) => {
        ctx.router
            .command("来只俊杰")
            .describe("来只俊杰")
            .execute(async (session) => {
                const name = "俊杰";
                const furry =
                    (await ctx.store.getFurryByName(name)) ??
                    (await ctx.store.findFurryByAlias(name));
                if (!furry) {
                    await session.reply(`未找到毛毛「${name}」`);
                    return;
                }
                const images = (await ctx.store.listImages(furry.id)).filter(
                    (image) => {
                        const fullPath = path.resolve(
                            ctx.store.getImagePath(),
                            image.path
                        );
                        return (
                            fullPath.startsWith(
                                path.resolve(ctx.store.getImagePath()) +
                                    path.sep
                            ) && fs.existsSync(fullPath)
                        );
                    }
                );
                if (images.length === 0) {
                    await session.reply(
                        `毛毛「${furry.name}」暂时没有可用的图片`
                    );
                    return;
                }
                const image = ctx.random.pick(images);
                await session.reply([
                    seg.image(
                        pathToFileURL(
                            path.resolve(ctx.store.getImagePath(), image.path)
                        ).href
                    ),
                ]);
            });
    },
});

export {
    FurryImageFurCPCSpecialPlugin,
    FurryImageFurCPCSpecialPlugin as default,
};
