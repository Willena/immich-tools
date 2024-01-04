/**
 *
 * A node script that uses metadata from assets to find ones that can be stacked
 *
 */

import {SingleBar} from "cli-progress";
import path from "path";
import {ApiConfiguration, ImmichApi} from "../client";
import {AssetResponseDto, ExifResponseDto} from "../client/open-api";
import {MultiMap} from "../models/checksumMap";
import {groupBy} from "../utils/groupBy";

class Options {
    progress: boolean = false
}

interface AssetKey extends Pick<AssetResponseDto, 'type' | 'originalFileName' | 'duration'>, Pick<ExifResponseDto,
    "make" |
    "model" |
    "orientation" |
    "dateTimeOriginal" |
    "lensModel" |
    "fNumber" |
    "focalLength" |
    "iso" |
    "exposureTime" |
    "latitude" |
    "longitude" |
    "city" |
    "state" |
    "country"> {

}

// interface AssetKey extends Pick<AssetResponseDto, 'type'> {
//
// }

export class StackerAction {
    constructor(private options: Options) {
    }

    async run() {
        const config = await ApiConfiguration.readFromFile()

        const client = new ImmichApi(config);
        await client.ping()

        const stats = (await client.assetApi.getAssetStatistics()).data
        const bulkSize = 1000
        let allAssets: AssetResponseDto[] = []

        console.log("Loading all assets....")
        for (let i = 0; i < stats.total; i += bulkSize) {
            const assets = (await client.assetApi.getAllAssets({skip: i, take: bulkSize})).data
            allAssets.push(...assets);
        }

        console.log("Grouping same images based on exif attributes...")
        const groupedAssets: MultiMap<AssetKey, AssetResponseDto> = groupBy(allAssets, (a) =>
            ({
                type: a.type,
                originalFileName: a.originalFileName,
                country: a.exifInfo?.country,
                dateTimeOriginal: a.exifInfo?.dateTimeOriginal,
                exposureTime: a.exifInfo?.exposureTime,
                fNumber: a.exifInfo?.fNumber,
                duration: a.duration,
                iso: a.exifInfo?.iso,
                city: a.exifInfo?.city,
                latitude: a.exifInfo?.latitude,
                lensModel: a.exifInfo?.lensModel,
                longitude: a.exifInfo?.longitude,
                model: a.exifInfo?.model,
                focalLength: a.exifInfo?.focalLength,
                state: a.exifInfo?.state,
                orientation: a.exifInfo?.orientation,
                make: a.exifInfo?.make
            }))

        const toBeStacked = [...groupedAssets.entries()]
            .filter(([k, v]) => v.length > 1)
            .filter(([k, v]) => new Set(v.map(dto => path.extname(dto.originalPath))).size > 1)

        console.log("Ready to stack...")

        let progress: SingleBar;
        if (this.options.progress) {
            progress = new SingleBar({})
            progress.start(toBeStacked.length, 0);
        }

        for (let [key, value] of toBeStacked.values()) {
            if (this.options.progress) {
                progress.increment()
            }

            const assetIds = new Set(value.map(v => v.id))
            const existingStackParents = value.filter(v => v.stackParentId)

            let parent: string;

            if (existingStackParents.length === 1) {
                // Easy ! We have the parent for all !
                parent = existingStackParents[0].id
            } else if (existingStackParents.length === 0) {
                // Easy, we can choose whatever we want (the first) !
                parent = value[0].id
            } else {
                // Mmm let's think: we have multiple parent for the same group, what should we do ?
                // existingStackParents.filter(v => !assetIds.has(v.id))
                // Let be a bourin => unstack then stack :)
                await client.assetApi.updateAssets({
                    assetBulkUpdateDto: {
                        ids: value.map(v => v.id),
                        removeParent: true
                    }
                })
                //Take the first :)
                parent = value[0].id
            }

            const childs = value.filter(v => v.id !== parent).map(e => e.id)


            // Stack into ID, assets A and B
            await client.assetApi.updateAssets({
                assetBulkUpdateDto: {
                    ids: childs,
                    stackParentId: parent
                }
            })
        }
        
        if (this.options.progress) {
            progress.stop()
        }
    }
}






