import StreamZip from "node-stream-zip";
import path from "path";
import {HashItem} from "../models/hashItem";
import {hash} from "../utils/stream-hash";

export class ZipRead {
    private zip: StreamZip.StreamZipAsync;
    private entries: { [p: string]: StreamZip.ZipEntry };

    constructor(private readonly zipFile: string, private readonly includedExt: string[]) {
        this.zip = new StreamZip.async({file: zipFile});
    }

    async init() {
        this.entries = Object.fromEntries(Object.entries(await this.zip.entries())
            .filter(([k, v]) => v.isFile)
            .filter(([k, v]) => this.includedExt.includes(path.extname(k))))
    }

    getEntryCount() {
        return Object.keys(this.entries).length
    }


    async* processFiles(
        newFileCb: (name: string, size: number) => void = () => {
        },
        onReadUpdate: (progress: number) => void = () => {
        }): AsyncGenerator<HashItem> {
        for (const entry of Object.values(this.entries)) {
            newFileCb(entry.name, entry.size)
            const stream = await this.zip.stream(entry)
            yield {id: entry.name, checksum: await hash(stream, onReadUpdate), source: this.zipFile}
        }
    }
}
