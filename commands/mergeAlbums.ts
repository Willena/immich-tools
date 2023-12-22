import uuid from 'uuid'
import {ApiConfiguration, ImmichApi} from "../client";
import {AlbumResponseDto} from "../client/open-api";

class Options {
    create: boolean = true
    delete: boolean = false
    from: string[]
    to: string
}

export class MergeAlbumAction {
    private immichConfig: ApiConfiguration;
    private client: ImmichApi;

    constructor(private options: Options) {

    }

    public async run() {
        this.immichConfig = await ApiConfiguration.readFromFile()
        this.client = new ImmichApi(this.immichConfig);
        await this.client.ping()

        const albums = (await this.client.albumApi.getAllAlbums()).data
        const idToAlbum = new Map<string, AlbumResponseDto>(albums.map(a => [a.id, a]))
        const nameToAlbum = new Map<string, AlbumResponseDto>(albums.map(a => [a.albumName, a]))

        const sourceAlbums = this.options.from.map(a => this.findAlbum(a, idToAlbum, nameToAlbum, true))
        const destinationAlbum = await this.getDestinationAlbum(this.options.to, idToAlbum, nameToAlbum)

        for (let sourceAlbum of sourceAlbums) {
            const errorCount = await this.addAssets(sourceAlbum, destinationAlbum)
            if (errorCount > 0 && this.options.delete) {
                console.warn(`Source album ${sourceAlbum.albumName}, will not be deleted: ${errorCount} errors found when adding to the destination`)
            } else {
                await this.client.albumApi.deleteAlbum({id: sourceAlbum.id})
                console.log(`Source album ${sourceAlbum.albumName} has been deleted`)
            }
        }

    }


    private findAlbum(nameOrId: string, idMap: Map<string, AlbumResponseDto>, nameMap: Map<string, AlbumResponseDto>, throwError = false): AlbumResponseDto | undefined {
        if (idMap.has(nameOrId)) {
            return idMap.get(nameOrId)
        }

        if (nameMap.has(nameOrId)) {
            return nameMap.get(nameOrId)
        }
        if (throwError) {
            throw new Error(`Could not find album '${nameOrId}' in immich instance`)
        }
        return undefined;
    }

    private async getDestinationAlbum(nameOrId: string, idMap: Map<string, AlbumResponseDto>, nameMap: Map<string, AlbumResponseDto>): Promise<AlbumResponseDto> {

        const findExisting = this.findAlbum(nameOrId, idMap, nameMap, !this.options.create)
        if (findExisting) {
            return findExisting;
        }

        if (uuid.validate(nameOrId)) {
            throw new Error(`Could not create an album with name '${nameOrId}'`)
        }

        return (await this.client.albumApi.createAlbum({
            createAlbumDto: {
                albumName: nameOrId
            }
        })).data
    }

    private async addAssets(sourceAlbum: AlbumResponseDto, destinationAlbum: AlbumResponseDto) {
        const assets = (await this.client.albumApi.getAlbumInfo({id: sourceAlbum.id, withoutAssets: false})).data.assets
        const addResult = (await this.client.albumApi.addAssetsToAlbum({id: destinationAlbum.id, bulkIdsDto: {ids: assets.map(a => a.id)}})).data

        const error = addResult.filter(r => r.error === 'duplicate')
            .filter(r => !r.success);

        error.forEach(r => console.warn(`Could not add asset '${r.id}' to album '${destinationAlbum.albumName}' : ${r.error}`))

        return error.length
    }
}