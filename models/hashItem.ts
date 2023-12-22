import {ProcessItem} from "./processItem";

export interface HashItem extends ProcessItem {
    checksum: string
}