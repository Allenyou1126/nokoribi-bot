import type { Generated, Insertable, Selectable, Updateable } from "kysely";

export interface FurryTable {
    id: Generated<number>;
    name: string;
}

export interface AliasTable {
    alias: string;
    furry_id: number;
}

export interface ImageTable {
    id: Generated<number>;
    furry_id: number;
    path: string;
}

export type Furry = Selectable<FurryTable>;
export type NewFurry = Insertable<FurryTable>;
export type FurryUpdate = Updateable<FurryTable>;

export type Alias = Selectable<AliasTable>;
export type NewAlias = Insertable<AliasTable>;
export type AliasUpdate = Updateable<AliasTable>;

export type Image = Selectable<ImageTable>;
export type NewImage = Insertable<ImageTable>;
export type ImageUpdate = Updateable<ImageTable>;

declare module "@fraqjs/plugin-kysely" {
    interface FraqDatabase {
        furimg_furries: FurryTable;
        furimg_aliases: AliasTable;
        furimg_images: ImageTable;
    }
}
