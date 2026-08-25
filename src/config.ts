import fs from "node:fs";
import path from "node:path";

import z from "zod";

const ConfigSchema = z.object({
    milky: z.object({
        baseUrl: z.url().describe("Milky Protocol Endpoint URL"),
        accessToken: z
            .string()
            .describe("Milky Protocol Access Token")
            .optional(),
    }),
    superuser: z.array(z.number()).describe("Superuser UINs").default([]),
    storagePath: z.string().describe("Data storage path").default("./data/"),
    dbPath: z
        .string()
        .describe("Database storage path")
        .default("./data/nokoribi.db"),
    logLevel: z
        .enum(["error", "warn", "info", "debug"])
        .describe("Minimum log level print to console")
        .default("info"),
});

const configJson = JSON.parse(
    await fs.promises.readFile(
        path.join(process.cwd(), "nokoribi.config.json"),
        "utf-8"
    )
);
const config = ConfigSchema.parse(configJson);

export default config;
