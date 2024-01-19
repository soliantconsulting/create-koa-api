import { randomUUID } from "crypto";
import { Entity, PrimaryKey, t } from "@mikro-orm/core";

@Entity()
export class World {
    @PrimaryKey({ type: t.uuid })
    public readonly id: string = randomUUID();

    @PrimaryKey({ type: t.text })
    public name: string;

    public constructor(name: string) {
        this.name = name;
    }
}
