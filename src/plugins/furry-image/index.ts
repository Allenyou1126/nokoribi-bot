import fs from "node:fs";
import path from "node:path";

import { definePlugin } from "@fraqjs/fraq";

import config from "@/config";

const IMG_PATH = path.join(config.storagePath, "furimg");

const FurryImagePlugin = definePlugin({
    name: "FurryImage",

    apply: (ctx) => {
        if (!fs.existsSync(IMG_PATH)) {
            fs.mkdirSync(IMG_PATH);
        }
        ctx.router
            .command("furimg")
            .describe("来只毛 —— 随机毛毛图片")
            .execute(async () => {});
    },
});

export { FurryImagePlugin, FurryImagePlugin as default };
