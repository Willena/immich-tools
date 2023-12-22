import {MultiBar, Presets, SingleBar} from "cli-progress";
import fs from "fs";
import {ApiConfiguration, ImmichApi} from "../client";
import {ChecksumMap} from "../models/checksumMap";
import {HashItem} from "../models/hashItem";
import {Sources} from "../source";
import {hash} from "../utils/stream-hash";

class Options {
    progress: boolean = false
    save: string
}

export class HashAction {
    private progressBars: MultiBar;
    private globalBar: SingleBar;
    private perContainerBar: SingleBar;
    private perEntryBar: SingleBar;
    private allChecksumMap: ChecksumMap;

    constructor(private readonly paths: string[], private readonly options: Options) {
        if (options.progress) {
            this.progressBars = new MultiBar({
                format: '{bar} | {percentage}% | ETA: {eta_formatted} | {value}/{total}: {filename}',
            }, Presets.shades_classic);
            this.globalBar = this.progressBars.create(this.paths.length, 0)
            this.perContainerBar = this.progressBars.create(0, 0)
            this.perEntryBar = this.progressBars.create(0, 0)
        }

        this.allChecksumMap = new ChecksumMap()
    }

    private onNewFileProcessed(file: string, size: number) {
        if (this.options.progress) {
            this.perContainerBar.increment({filename: file})
            this.perEntryBar.start(size, 0, {filename: file})
        }
    }

    private notifyContainerProgress(file: string) {
        if (this.options.progress) {
            this.globalBar.increment()
            this.globalBar.update({filename: file})
        }
    }

    private onHashingProgress(progress: number) {
        if (this.options.progress) {
            this.perEntryBar.update(progress)
        }
    }

    private onFinish() {
        if (this.options.progress) {
            this.progressBars.stop()
        }

        if (this.options.save) {
            fs.writeFileSync(this.options.save, JSON.stringify(Object.fromEntries(this.getHashes())))
        }

    }

    public getHashes() {
        return this.allChecksumMap
    }

    public async run() {
        const config = await ApiConfiguration.readFromFile()

        const client = new ImmichApi(config);
        await client.ping()
        const supportedTypes = (await client.serverInfoApi.getSupportedMediaTypes()).data
        const formatToFind = [...supportedTypes.video, ...supportedTypes.image]

        console.log(`Trying to find files matching: ${formatToFind.join(',')}`)

        for (let i = 0; i < this.paths.length; i++) {
            const file = this.paths[i]
            this.notifyContainerProgress(file)

            const assetsSource = Sources.findFor(file)

            const assetNumber = (await assetsSource.findAll(formatToFind)).length

            if (this.options.progress) {
                this.perContainerBar.start(assetNumber, 0)
            }

            const generator = assetsSource.doProcessEach(
                async (source, id, stream, onProgress) => ({id, source, checksum: await hash(stream, onProgress)} as HashItem),
                (f, s) => this.onNewFileProcessed(f, s),
                (v) => this.onHashingProgress(v)
            )

            for await (const val of generator) {
                if (!this.options.progress) {
                    console.log(val.checksum, val.id)
                }
                this.allChecksumMap.set(val.checksum, this.allChecksumMap.has(val.checksum) ? [...this.allChecksumMap.get(val.checksum), val] : [val])
            }
        }

        this.onFinish()
    }
}

