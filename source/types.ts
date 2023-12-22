import stream from "stream";
import {BaseAsset} from "../models/asset";
import {ProcessItem} from "../models/processItem";


export interface Source {

    getAsset(id: string): Promise<BaseAsset>;

    findAll(includedExt: string[]): Promise<string[]>

    doProcessEach<T extends ProcessItem>(
        job: (source: string, entry: string, iStream: stream.Readable, progress: (value: number) => void) => Promise<T>,
        onNewFile?: (entry: string, size: number) => void,
        onProgress?: (progress: number) => void
    ): AsyncGenerator<T>

    close(): Promise<void>;
}