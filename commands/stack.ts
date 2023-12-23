/**
 *
 * A node script that uses metadata from assets to find ones that can be stacked
 *
 */

import {ApiConfiguration, ImmichApi} from "../client";
import {AssetResponseDto, ExifResponseDto} from "../client/open-api";
import {MultiMap} from "../models/checksumMap";
import {groupBy} from "../utils/groupBy";

class Options {

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

        for (let i = 0; i < stats.total; i += bulkSize) {
            const assets = (await client.assetApi.getAllAssets({skip: i, take: bulkSize})).data
            allAssets.push(...assets);
        }

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

        const toBeStacked = [...groupedAssets.entries()].filter(([k, v]) => v.length > 1)

        for (let [key, value] of toBeStacked.values()) {
            const parent = value[0].id
            const childs = value.slice(1).map(e => e.id)

            // Stack into ID, assets A and B
            // await client.assetApi.updateAssets({
            //     assetBulkUpdateDto: {
            //         ids: childs,
            //         stackParentId: parent
            //     }
            // })
        }

        // Remove stack information
        // client.assetApi.updateAssets({
        //     assetBulkUpdateDto: {
        //         ids: [
        //             "A",
        //             "B",
        //             "ID"
        //         ],
        //         removeParent: true
        //     }
        // })
    }
}






