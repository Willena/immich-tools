import fs from "fs/promises";
import {HashItem} from "./hashItem";

export class MultiMap<K, V> extends Map<K, V[]> {
    push(key: K, ...values: V[]) {
        this.set(key, this.has(key) ? [...this.get(key), ...values] : [...values])
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

