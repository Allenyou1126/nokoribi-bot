import { definePlugin } from "@fraqjs/fraq";

const StatusPlugin = definePlugin({
    name: "Status",
    apply: (ctx) => {
        ctx.router
            .command("status")
            .describe("获取机器人状态")
            .execute(async (session) => {
                const loginInfo = await ctx.client.get_login_info();
                const implInfo = await ctx.client.get_impl_info();
                await session.reply(
                    `余烬 | Nokoribi-Bot\n\n当前昵称：${loginInfo.nickname}\n当前 UIN：${loginInfo.uin}\n\n协议端：${implInfo.impl_name} ${implInfo.impl_version}\nMilky 协议版本：${implInfo.milky_version}\n登录协议：${implInfo.qq_protocol_type} ${implInfo.qq_protocol_version}`
                );
            });
    },
});

export { StatusPlugin, StatusPlugin as default };
