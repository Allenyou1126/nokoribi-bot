# AGENTS.md

基于 [Fraq](https://fraq.dev/docs) 框架与 [Milky](https://milky.ntqqrev.org/) 协议的 QQ Bot。技术栈：TypeScript（Node.js 24）、pnpm 11.3.0、tsdown 构建、oxlint / oxfmt、[Kysely](https://fraq.dev/docs/plugins/kysely) + SQLite。

对于库的用法，优先在 AGENTS.md 中的链接里寻找文档，找不到再在项目中寻找已有的写法作为参考，最后再尝试阅读库的源码。

## 命令

只能通过 `pnpm run <script>` 执行 package.json 中定义的脚本，**禁止直接执行 node_modules 下的工具**（如 `./node_modules/.bin/oxlint`）。

- `pnpm typecheck` — `tsc --noEmit`
- `pnpm lint` / `pnpm lint:fix` — oxlint
- `pnpm format` — oxfmt
- `pnpm build` — tsdown 打包 `src/main.ts` → `dist/main.mjs`（minify、无 dts）
- `pnpm dev` — tsdown watch 模式
- `pnpm start` — 通过 prestart 自动构建后运行 `node dist/main.mjs`
- 没有测试框架。

## 结构

- 入口 `src/main.ts`：`Context.fromUrl(config.milky.baseUrl)` 连接 Milky 协议端 → 安装插件 → fork 出 `group` / `private` / `super_user` 子上下文
- `src/config.ts`：用 zod 校验根目录 `nokoribi.config.json`（gitignored，需自行从 `nokoribi.config.json.example` 复制）
- `src/plugins/<name>/index.ts`：用 `definePlugin` 定义插件；**新插件不会生效，除非在 `main.ts` 中 `ctx.install`**
- 路径别名 `@/*` → `src/*`（tsconfig paths + tsdown alias 双配置）

## 约定

- 路由激活规则（`src/main.ts`）：临时会话不响应；好友会话用 `/` 前缀；群会话需要 @机器人 + `/` 前缀
- 插件通常只安装在特定 fork 上（如 `StatusPlugin` 仅安装在 `super_user`，superuser 在配置中按 UIN 数字数组填写）
- tsconfig 开启 `verbatimModuleSyntax` + `isolatedModules`：类型导入必须使用 `import type`
- 每次完成一次完整修改后提交到 Git，使用语义化提交（conventional commits），Commit Message 末尾以 `Assisted-By: [Agent Name]:[Model Name]` 注明所用 Agent
