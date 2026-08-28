import { createColoredLogHandler } from "@fraqjs/color-log";
import { Context } from "@fraqjs/fraq";
import KyselyPlugin from "@fraqjs/plugin-kysely";
import MessageStorePlugin from "@fraqjs/plugin-message-store";
import RandomPlugin from "@fraqjs/plugin-random";

import config from "./config";
import FurryImagePlugin from "./plugins/furry-image";
import FurryImageAdminPlugin from "./plugins/furry-image/admin";
import FurryImageFurCPCSpecialPlugin from "./plugins/furry-image/furcpc-special";
import StatusPlugin from "./plugins/status";
import VVPicPlugin from "./plugins/vv-pic";

const ctx = Context.fromUrl(config.milky.baseUrl, {
    accessToken: config.milky.accessToken,
    logHandler: createColoredLogHandler({
        minLevel: config.logLevel,
    }),
    routing: {
        activationResolver: (route, session) => {
            if (session.raw.message_scene === "temp") {
                return [];
            }
            if (session.raw.message_scene === "friend") {
                return [{ type: "prefix", prefix: "/" }];
            }
            return [{ type: "mention", prefix: "/" }];
        },
    },
});
ctx.install(KyselyPlugin, {
    sqliteUrl: `file:${config.dbPath}`,
    nodeSqliteOptions: {
        enableForeignKeyConstraints: true,
        readBigInts: false,
    },
});
ctx.install(MessageStorePlugin, {
    autoFlush: {
        enabled: false,
    },
    listenRecall: true,
});
ctx.install(RandomPlugin);
ctx.install(FurryImagePlugin);
ctx.install(VVPicPlugin);

const groupChatCtx = ctx.fork("group", {
    message_receive: ({ data }) => data.message_scene === "group",
    group_nudge: ({ self_id, data }) =>
        data.receiver_id !== data.sender_id && data.receiver_id === self_id,
});
groupChatCtx.on("message_receive", () => {});

const privateChatCtx = ctx.fork("private", {
    message_receive: ({ data }) => data.message_scene === "friend",
    friend_nudge: ({ data }) => data.is_self_receive,
});
privateChatCtx.on("message_receive", () => {});

const superUserCtx = ctx.fork("super_user", {
    message_receive: ({ data }) => config.superuser.includes(data.sender_id),
});
superUserCtx.install(StatusPlugin);
superUserCtx.install(FurryImageAdminPlugin);

const FurCPCCtx = groupChatCtx.fork("fur_cpc", {
    message_receive: ({ data }) =>
        data.message_scene === "group" &&
        config.furcpcId.includes(data.group.group_id),
});
FurCPCCtx.install(FurryImageFurCPCSpecialPlugin);

ctx.start();
