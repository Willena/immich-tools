import {createReadStream, statSync} from "fs";
import fs from "fs/promises";
import stream from "stream";
import {CrawlService} from "../crawler";
import {BaseAsset} from "../models/asset";
import {ProcessItem} from "../models/processItem";
import {Source} from "./types";

class FilesystemAsset extends BaseAsset {
    private readonly size: number;
    private readonly creationTime: Date;
    private readonly modificationTime: Date;

    constructor(protected readonly path: string) {
        super(path);
        const stat = statSync(path)
        this.size = stat.size
        this.creationTime = stat.ctime
        this.modificationTime = stat.mtime
    }

    getFileCreatedAt(): string {
        return this.creationTime.toISOString()
    }

    getFileModifiedAt(): string {
        return this.modificationTime.toISOString()
    }

    getReadStream(): stream.Readable {
        return createReadStream(this.path);
    }

    getSize(): number {
        return this.size;
    }

}

export class FilesystemSource implements Source {
    private files: string[]

    constructor(private path: string) {

    }

    async getAsset(id: string): Promise<BaseAsset> {
        return new FilesystemAsset(id)
    }

    close(): Promise<void> {
        return;
    }

    async* doProcessEach<T extends ProcessItem>(job: (source: string, entry: string, iStream: stream.Readable, progress: (value: number) => void) => Promise<T>, onNewFile?: (entry: string, size: number) => void, onProgress?: (progress: number) => void): AsyncGenerator<T> {
        for (const file of this.files) {
            const stats = await fs.stat(file)
            onNewFile(file, stats.size)
            yield await job(this.path, file, createReadStream(file), onProgress)
        }
    }

    private async init(includedExt: string[]) {
        const crawler = new CrawlService(includedExt);
        this.files = await crawler.crawl({pathsToCrawl: [this.path], recursive: true})
    }

    async findAll(includedExt: string[]): Promise<string[]> {
        await this.init(includedExt)
        return this.files
    }
}