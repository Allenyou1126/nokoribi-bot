import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { definePlugin, param, seg } from "@fraqjs/fraq";
import type { Session } from "@fraqjs/fraq";

import config from "@/config";

import { FurryImageStoreService } from "./service";
import type { Furry, Image } from "./types";

const IMG_PATH = path.join(config.storagePath, "furimg");

const FurryImageAdminPlugin = definePlugin({
    name: "FurryImageAdmin",
    inject: { store: FurryImageStoreService },

    apply: (ctx) => {
        const resolveFurry = async (
            name: string
        ): Promise<Furry | undefined> => {
            return (
                (await ctx.store.getFurryByName(name)) ??
                (await ctx.store.findFurryByAlias(name))
            );
        };

        const replyImageIds = async (
            session: Session,
            images: Image[]
        ): Promise<void> => {
            if (images.length === 0) {
                await session.reply("还没有任何图片");
                return;
            }
            await session.reply(
                `图片 ID 列表（${images.length}）：` +
                    images.map((image) => ` #${image.id}`).join("")
            );
        };

        const furries = ctx.router.group("furimg").group("furry");
        furries
            .command("add")
            .describe("添加一只毛毛")
            .arg("name", param.str().describe("毛毛的显示名称"))
            .execute(async (session, { name }) => {
                if (await ctx.store.getFurryByName(name)) {
                    await session.reply(`毛毛「${name}」已存在`);
                    return;
                }
                const id = await ctx.store.addFurry(name);
                await session.reply(`已添加毛毛「${name}」（ID: ${id}）`);
            });

        furries
            .command("rename")
            .describe("重命名毛毛")
            .arg("name", param.str().describe("毛毛的名称或别名"))
            .arg("newName", param.str().describe("新的显示名称"))
            .execute(async (session, { name, newName }) => {
                const furry = await resolveFurry(name);
                if (!furry) {
                    await session.reply(`未找到毛毛「${name}」`);
                    return;
                }
                try {
                    await ctx.store.renameFurry(furry.id, newName);
                } catch {
                    await session.reply(`毛毛「${newName}」已存在`);
                    return;
                }
                await session.reply(
                    `已将毛毛「${furry.name}」重命名为「${newName}」`
                );
            });

        furries
            .command("remove")
            .describe("删除毛毛及其别名和图片")
            .arg("name", param.str().describe("毛毛的名称或别名"))
            .execute(async (session, { name }) => {
                const furry = await resolveFurry(name);
                if (!furry) {
                    await session.reply(`未找到毛毛「${name}」`);
                    return;
                }
                const [aliases, images] = await Promise.all([
                    ctx.store.listAliases(furry.id),
                    ctx.store.listImages(furry.id),
                ]);
                await ctx.store.removeFurry(furry.id);
                await session.reply(
                    `已删除毛毛「${furry.name}」及其 ${aliases.length} 个别名、${images.length} 张图片`
                );
            });

        furries
            .command("list")
            .describe("列出所有毛毛")
            .execute(async (session) => {
                const list = await ctx.store.listFurries();
                if (list.length === 0) {
                    await session.reply(
                        "还没有任何毛毛，可以使用 /furimg furry add <名称> 添加"
                    );
                    return;
                }
                await session.reply(
                    `毛毛列表（${list.length}）：\n` +
                        list
                            .map((furry) => `#${furry.id} ${furry.name}`)
                            .join("\n")
                );
            });

        const aliases = ctx.router.group("furimg").group("alias");
        aliases
            .command("add")
            .describe("为毛毛添加或更新别名")
            .arg("alias", param.str().describe("要绑定的别名"))
            .arg("name", param.str().describe("毛毛的名称或别名"))
            .execute(async (session, { alias, name }) => {
                const furry = await resolveFurry(name);
                if (!furry) {
                    await session.reply(`未找到毛毛「${name}」`);
                    return;
                }
                await ctx.store.setAlias(alias, furry.id);
                await session.reply(
                    `已将别名「${alias}」绑定到毛毛「${furry.name}」`
                );
            });

        aliases
            .command("remove")
            .describe("删除别名")
            .arg("alias", param.str().describe("要删除的别名"))
            .execute(async (session, { alias }) => {
                const furry = await ctx.store.findFurryByAlias(alias);
                if (!furry) {
                    await session.reply(`别名「${alias}」不存在`);
                    return;
                }
                await ctx.store.deleteAlias(alias);
                await session.reply(`已删除别名「${alias}」`);
            });

        aliases
            .command("list")
            .describe("列出所有别名")
            .execute(async (session) => {
                const list = await ctx.store.listAliases();
                if (list.length === 0) {
                    await session.reply("还没有任何别名");
                    return;
                }
                const names = new Map(
                    (await ctx.store.listFurries()).map((furry) => [
                        furry.id,
                        furry.name,
                    ])
                );
                await session.reply(
                    `别名列表（${list.length}）：\n` +
                        list
                            .map(
                                (alias) =>
                                    `#${names.get(alias.furry_id) ?? alias.furry_id} <- ${alias.alias}`
                            )
                            .join("\n")
                );
            });

        const images = ctx.router.group("furimg").group("image");
        images
            .command("add")
            .describe("为毛毛添加图片")
            .arg("name", param.str().describe("毛毛的名称或别名"))
            .arg(
                "relPath",
                param.str().describe("图片相对 furimg 数据目录的路径")
            )
            .execute(async (session, { name, relPath }) => {
                const furry = await resolveFurry(name);
                if (!furry) {
                    await session.reply(`未找到毛毛「${name}」`);
                    return;
                }
                const fullPath = path.resolve(IMG_PATH, relPath);
                if (!fullPath.startsWith(path.resolve(IMG_PATH) + path.sep)) {
                    await session.reply(
                        `图片路径必须位于数据目录内：${relPath}`
                    );
                    return;
                }
                if (!fs.existsSync(fullPath)) {
                    await session.reply(`文件不存在：${relPath}`);
                    return;
                }
                if (await ctx.store.getImageByPath(relPath)) {
                    await session.reply(`图片已存在：${relPath}`);
                    return;
                }
                const id = await ctx.store.addImage(furry.id, relPath);
                await session.reply(
                    `已为毛毛「${furry.name}」添加图片 #${id}：${relPath}`
                );
            });

        images
            .command("remove")
            .describe("按 ID 删除图片")
            .arg("id", param.num().describe("图片 ID"))
            .execute(async (session, { id }) => {
                const image = await ctx.store.getImageById(id);
                if (!image) {
                    await session.reply(`图片 #${id} 不存在`);
                    return;
                }
                await ctx.store.removeImage(id);
                await session.reply(`已删除图片 #${id}`);
            });

        images
            .command("get")
            .describe("按 ID 获取图片")
            .arg("id", param.num().describe("图片 ID"))
            .execute(async (session, { id }) => {
                const image = await ctx.store.getImageById(id);
                if (!image) {
                    await session.reply(`图片 #${id} 不存在`);
                    return;
                }
                const fullPath = path.resolve(IMG_PATH, image.path);
                if (!fs.existsSync(fullPath)) {
                    await session.reply(`图片文件不存在：${image.path}`);
                    return;
                }
                await session.reply([seg.image(pathToFileURL(fullPath).href)]);
            });

        images
            .command("list")
            .describe("列出一只毛毛的图片 ID")
            .arg("name", param.str().describe("毛毛的名称或别名"))
            .execute(async (session, { name }) => {
                const furry = await resolveFurry(name);
                if (!furry) {
                    await session.reply(`未找到毛毛「${name}」`);
                    return;
                }
                await replyImageIds(
                    session,
                    await ctx.store.listImages(furry.id)
                );
            });

        images
            .command("list")
            .describe("列出所有图片的 ID")
            .execute(async (session) => {
                await replyImageIds(session, await ctx.store.listImages());
            });
    },
});

export { FurryImageAdminPlugin, FurryImageAdminPlugin as default };
