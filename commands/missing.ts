import axios, {AxiosProgressEvent, AxiosRequestConfig, AxiosResponse} from "axios";
import {MultiBar, Presets, SingleBar} from "cli-progress";

import FormData from "form-data";
import {ApiConfiguration, ImmichApi} from "../client";
import {AssetBulkUploadCheckItem} from "../client/open-api";
import {ChecksumMap, MultiMap} from "../models/checksumMap";
import {HashItem} from "../models/hashItem";
import {Sources} from "../source";
import {Source} from "../source/types";
import {groupBy} from "../utils/groupBy";


class Options {
    upload: boolean = false;
    progress: boolean = false
    list: boolean = false;
}


interface HashAsset {
    checksum: string
    assetId: string
}

export class MissingAction {
    private hashes: ChecksumMap;
    private immichConfig: ApiConfiguration;
    private progressBars: MultiBar;
    private globalBar: SingleBar;
    private perFileBar: SingleBar;
    private client: ImmichApi;

    constructor(private readonly hashFiles: string[], private readonly options: Options) {
        this.hashes = new ChecksumMap()
        if (this.options.progress) {
            if (options.progress) {
                this.progressBars = new MultiBar({
                    format: '{bar} | {percentage}% | ETA: {eta_formatted} | {value}/{total}: {filename}',
                }, Presets.shades_classic);
            }
        }
    }

    public async run() {
        for (let hashFile of this.hashFiles) {
            this.hashes.merge(await ChecksumMap.fromFile(hashFile))
        }

        this.immichConfig = await ApiConfiguration.readFromFile()
        this.client = new ImmichApi(this.immichConfig);
        await this.client.ping()


        const simplified: AssetBulkUploadCheckItem[] = [...this.hashes.values()]
            .map(e => e[0])
            .map(({id, checksum}) => ({
                id, checksum
            }))

        const idToHash = new Map(simplified.map(({id, checksum}) => [id, checksum]))

        const result = (await this.client.assetApi.checkBulkUpload({assetBulkUploadCheckDto: {assets: simplified}})).data

        // let hashToAssetId = new Map(result.results.filter(s => s.action == 'reject' && s.reason == 'duplicate').map(d => [idToHash.get(d.id), d.assetId]))
        const missing = result.results.filter(s => s.action == "accept").map(d => this.hashes.get(idToHash.get(d.id))[0])

        if (this.options.list) {
            console.log(missing.length + "files are missing")
            missing.forEach((m) => {
                console.log("in", m.source, m.checksum, "; Candidate files:", this.hashes.get(m.checksum).map(e => e.id).join(","))
            })
        }


        if (this.options.upload) {
            const uploadedHashes = new MultiMap<string, HashAsset>()
            for await (let hashAsset of this.uploadMissing(missing)) {
                uploadedHashes.push(hashAsset.checksum, hashAsset)
            }

            this.progressBars.stop()
        }
    }

    private async* uploadMissing(missing: HashItem[]): AsyncGenerator<HashAsset> {
        console.log(missing.length, " items needs to be uploaded")

        const bySource = groupBy(missing, (i) => i.source)

        if (this.options.progress) {
            this.globalBar = this.progressBars.create(missing.length, 0)
            this.perFileBar = this.progressBars.create(0, 0)
        }

        for (let [source, items] of Object.entries(bySource)) {
            const assetSource: Source = Sources.findFor(source);
            for (let item of items) {

                const asset = await assetSource.getAsset(item.id)


                let updateProgress: (e: AxiosProgressEvent) => void
                if (this.options.progress) {
                    this.globalBar.increment({filename: item.id})
                    this.perFileBar.start(100, 0, {filename: item.id})
                    updateProgress = (e: AxiosProgressEvent) => this.perFileBar.update(e.progress * 100)
                }

                const formData = await asset.getUploadFormData();

                try {
                    const response = await (await this.uploadAsset(formData, updateProgress)).data
                    yield {checksum: item.checksum, assetId: response.id}
                } catch (e) {
                    throw new Error("Could not upload file: " + e.response.status + " " + e.response.statusText + ": " + e.response.data)
                }
            }

            await assetSource.close()
        }

        if (this.options.progress) {
            this.progressBars.stop()
        }
    }

    private async uploadAsset(
        data: FormData,
        onUploadProgress: (e: AxiosProgressEvent) => void = () => {
        },
    ): Promise<AxiosResponse> {
        const url = this.immichConfig.instanceUrl + '/asset/upload';
        // const url = 'https://certificate-test.svc.villena.me/asset/upload';

        // return fetch(url, {
        //     method: 'POST',
        //     body: data,
        // })

        const config: AxiosRequestConfig = {
            method: 'post',
            maxRedirects: 0,
            url,
            headers: {
                'x-api-key': this.immichConfig.apiKey,
                ...data.getHeaders()
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            data,
            onUploadProgress,
        };

        return axios(config);
    }
}