import { serviceToken } from "@fraqjs/fraq";
import type { KyselyService } from "@fraqjs/plugin-kysely";

import type { Alias, Furry, Image } from "./types";

const TABLE_FURRIES = "furimg_furries" as const;
const TABLE_ALIASES = "furimg_aliases" as const;
const TABLE_IMAGES = "furimg_images" as const;

class FurryImageStoreService {
    static readonly token = serviceToken<FurryImageStoreService>(
        "nokoribi/furry-image/FurryImageStoreService"
    );

    constructor(private readonly kysely: KyselyService) {
        this.kysely.schemas.register({
            name: "furimg",
            migrations: {
                "001_create_furimg_tables": {
                    async up(db) {
                        await db.schema
                            .createTable(TABLE_FURRIES)
                            .addColumn("id", "integer", (col) =>
                                col.primaryKey().autoIncrement()
                            )
                            .addColumn("name", "text", (col) =>
                                col.notNull().unique()
                            )
                            .execute();
                        await db.schema
                            .createTable(TABLE_ALIASES)
                            .addColumn("alias", "text", (col) =>
                                col.primaryKey()
                            )
                            .addColumn("furry_id", "integer", (col) =>
                                col
                                    .notNull()
                                    .references("furimg_furries.id")
                                    .onDelete("cascade")
                            )
                            .execute();
                        await db.schema
                            .createTable(TABLE_IMAGES)
                            .addColumn("id", "integer", (col) =>
                                col.primaryKey().autoIncrement()
                            )
                            .addColumn("furry_id", "integer", (col) =>
                                col
                                    .notNull()
                                    .references("furimg_furries.id")
                                    .onDelete("cascade")
                            )
                            .addColumn("path", "text", (col) =>
                                col.notNull().unique()
                            )
                            .execute();
                    },
                },
            },
        });
    }

    async addFurry(name: string): Promise<number> {
        const result = await this.kysely.db
            .insertInto(TABLE_FURRIES)
            .values({ name })
            .executeTakeFirst();
        return Number(result.insertId);
    }

    async getFurryById(id: number): Promise<Furry | undefined> {
        return this.kysely.db
            .selectFrom(TABLE_FURRIES)
            .select(["id", "name"])
            .where("id", "=", id)
            .executeTakeFirst();
    }

    async getFurryByName(name: string): Promise<Furry | undefined> {
        return this.kysely.db
            .selectFrom(TABLE_FURRIES)
            .select(["id", "name"])
            .where("name", "=", name)
            .executeTakeFirst();
    }

    async listFurries(): Promise<Furry[]> {
        return this.kysely.db
            .selectFrom(TABLE_FURRIES)
            .select(["id", "name"])
            .orderBy("id")
            .execute();
    }

    async setAlias(alias: string, furryId: number): Promise<void> {
        await this.kysely.db
            .insertInto(TABLE_ALIASES)
            .values({ alias, furry_id: furryId })
            .onConflict((conflict) =>
                conflict.column("alias").doUpdateSet({ furry_id: furryId })
            )
            .executeTakeFirst();
    }

    async deleteAlias(alias: string): Promise<void> {
        await this.kysely.db
            .deleteFrom(TABLE_ALIASES)
            .where("alias", "=", alias)
            .executeTakeFirst();
    }

    async findFurryByAlias(alias: string): Promise<Furry | undefined> {
        return this.kysely.db
            .selectFrom(TABLE_ALIASES)
            .innerJoin(TABLE_FURRIES, "furimg_furries.id", "furimg_aliases.furry_id")
            .select(["furimg_furries.id", "furimg_furries.name"])
            .where("furimg_aliases.alias", "=", alias)
            .executeTakeFirst();
    }

    async listAliases(): Promise<Alias[]> {
        return this.kysely.db
            .selectFrom(TABLE_ALIASES)
            .select(["alias", "furry_id"])
            .orderBy("alias")
            .execute();
    }

    async addImage(furryId: number, path: string): Promise<number> {
        const result = await this.kysely.db
            .insertInto(TABLE_IMAGES)
            .values({ furry_id: furryId, path })
            .executeTakeFirst();
        return Number(result.insertId);
    }

    async getImageById(id: number): Promise<Image | undefined> {
        return this.kysely.db
            .selectFrom(TABLE_IMAGES)
            .select(["id", "furry_id", "path"])
            .where("id", "=", id)
            .executeTakeFirst();
    }

    async listImages(furryId?: number): Promise<Image[]> {
        let query = this.kysely.db
            .selectFrom(TABLE_IMAGES)
            .select(["id", "furry_id", "path"])
            .orderBy("id");
        if (furryId !== undefined) {
            query = query.where("furry_id", "=", furryId);
        }
        return query.execute();
    }
}

export { FurryImageStoreService, FurryImageStoreService as default };
