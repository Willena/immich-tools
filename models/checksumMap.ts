import fs from "fs/promises";
import {HashItem} from "./hashItem";

export class MultiMap<K, V> extends Map<K, V[]> {

    set(key: K, value: V[]): this {
        return super.set(this.getHash(key), value)
    }

    get(key: K): V[] | undefined {
        return super.get(this.getHash(key))
    }

    private getHash(key: K): K {
        let realKey;
        if ((key as any).hashCode) {
            realKey = (key as any).hashCode()
        } else {
            realKey = JSON.stringify(key)
        }
        return realKey
    }


    push(key: K, ...values: V[]) {
        const content = this.get(key)
        if (content) {
            console.log("Already exists", key)
        }
        this.set(key, content ? [...content, ...values] : [...values])
    }

    merge(map: MultiMap<K, V>) {
        for (let [k, v] of map.entries()) {
            this.push(k, ...v)
        }
    }
}

export class ChecksumMap extends MultiMap<string, HashItem> {
    constructor(entries?: [string, HashItem[]][]) {
        super(entries);
    }

    static async fromFile(configFile: string) {
        const checkpoint: [string, HashItem[]][] = Object.entries(JSON.parse((await fs.readFile(configFile)).toString()))
        return new ChecksumMap(checkpoint)
    }
}

