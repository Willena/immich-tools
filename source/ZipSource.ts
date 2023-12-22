import StreamZip from "node-stream-zip";
import path from "path";

import stream from "stream";
import {BaseAsset} from "../models/asset";
import {ProcessItem} from "../models/processItem";
import {Source} from "./types";

class ZipAsset extends BaseAsset {
    constructor(path: string, private zipEntry: StreamZip.ZipEntry, private readableStream: stream.Readable) {
        super(path);
    }

    getFileCreatedAt(): string {
        return new Date(this.zipEntry.time).toISOString();
    }

    getFileModifiedAt(): string {
        return new Date(this.zipEntry.time).toISOString();
    }

    getReadStream(): stream.Readable {
        return this.readableStream;
    }

    getSize(): number {
        return this.zipEntry.size;
    }

}

export class ZipSource implements Source {

    private readonly zip: StreamZip.StreamZipAsync;
    private entries: { [p: string]: StreamZip.ZipEntry } = {};

    constructor(private readonly path: string) {
        this.zip = new StreamZip.async({file: this.path});
    }

    async getAsset(id: string): Promise<BaseAsset> {
        return new ZipAsset(id, await this.zip.entry(id), await this.zip.stream(id) as stream.Readable)
    }

    async close() {
        await this.zip.close();
    }

    async* doProcessEach<T extends ProcessItem>(
        job: (source: string, entry: string, stream: stream.Readable, progress: (value: number) => void) => Promise<T>,
        onNewFile: (entry: string, size: number) => void = () => {
        },
        onProgress: (progress: number) => void = () => {
        }
    ): AsyncGenerator<T> {
        for (const entry of Object.values(this.entries)) {
            onNewFile(entry.name, entry.size)
            const stream = await this.zip.stream(entry)
            yield await job(this.path, entry.name, stream as stream.Readable, onProgress)
        }
    }

    private async init(includedExt: string[]) {
        this.entries = Object.fromEntries(Object.entries(await this.zip.entries())
            .filter(([k, v]) => v.isFile)
            .filter(([k, v]) => includedExt.includes(path.extname(k))))

    }

    async findAll(includedExt: string[]): Promise<string[]> {
        await this.init(includedExt)
        return Object.values(this.entries).map(e => e.name)
    }

}