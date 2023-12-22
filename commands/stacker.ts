/**
 *
 * A node script that uses metadata from assets to find ones that can be stacked
 *
 */

import {ApiConfiguration, ImmichApi} from "../client";
import {groupBy} from "../utils/groupBy";

class Options {

}

export class StackerAction {
    constructor(private options: Options) {
    }

    async run() {
        const config = await ApiConfiguration.readFromFile()

        const client = new ImmichApi(config);
        await client.ping()
        const currentUser = (await client.userApi.getMyUserInfo()).data
        const supportedTypes = (await client.serverInfoApi.getSupportedMediaTypes()).data

        const stats = (await client.assetApi.getAssetStatistics()).data
        const bulkSize = 100
        let allAssets = []

        for (let i = 0; i < stats.total; i += bulkSize) {
            const assets = (await client.assetApi.getAllAssets({skip: i, take: bulkSize})).data
            allAssets.push(...assets);
        }

        const groupedAssets = groupBy(allAssets, (a) => {
            return `${a.type}_${a.originalFileName}_${Object.values(a.exifInfo).filter(a => a).join('_')}`
        })

        const toBeStacked = new Map(Object.entries(groupedAssets).filter(([k, v]) => v.length > 2))

        for (let value of toBeStacked.values()) {
            const parent = value[0].id
            const childs = value.slice(1).map(e => e.id)

            // Stack into ID, assets A and B
            await client.assetApi.updateAssets({
                assetBulkUpdateDto: {
                    ids: childs,
                    stackParentId: parent
                }
            })
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






