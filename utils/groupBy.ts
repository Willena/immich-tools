import {MultiMap} from "../models/checksumMap";

export const groupBy = <T, K>(arr: T[], key: (i: T) => K) =>
    arr.reduce((groups, item) => {
        groups.push(key(item), item)
        return groups;
    }, new MultiMap<K, T>());