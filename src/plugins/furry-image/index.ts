import fs from "node:fs";
import path from "node:path";

import { definePlugin } from "@fraqjs/fraq";
import { KyselyService } from "@fraqjs/plugin-kysely";

import config from "@/config";

import { FurryImageStoreService } from "./service";

const IMG_PATH = path.join(config.storagePath, "furimg");

const FurryImagePlugin = definePlugin({
    name: "FurryImage",
    inject: { kysely: KyselyService },
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
            .execute(async () => {});
    },
});

export { FurryImagePlugin, FurryImagePlugin as default, FurryImageStoreService };
