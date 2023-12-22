import {ApiConfiguration, ImmichApi} from "../client";
import {AlbumResponseDto} from "../client/open-api";
import {ChecksumMap} from "../models/checksumMap";

class Options {
    orphans: boolean = false;
    save: string;
    hashfile: string[] = []
    apply: string[] = []
}

export class GroupAction {
    private hashes: ChecksumMap;
    private hashFiles: string[];
    private immichConfig: ApiConfiguration;
    private client: ImmichApi;

    constructor(private readonly options: Options) {
        this.hashFiles = options.hashfile || []
    }

    public async run() {
        this.hashes = new ChecksumMap();

        for (let hashFile of this.hashFiles) {
            this.hashes.merge(await ChecksumMap.fromFile(hashFile))
        }

        this.immichConfig = await ApiConfiguration.readFromFile()
        this.client = new ImmichApi(this.immichConfig);
        const userInfo = (await this.client.userApi.getMyUserInfo()).data
        await this.client.ping()

        // Get all existing album with their assets
        const albumMap = new Map<string, AlbumResponseDto>()
        const allAlbums = (await this.client.albumApi.getAllAlbums()).data
        for (let album of allAlbums) {
            const albumInfo = (await this.client.albumApi.getAlbumInfo({
                id: album.id,
                withoutAssets: false
            })).data

            albumMap.set(albumInfo.albumName, albumInfo)
        }

        // Get all assets
        const allAssets = (await this.client.assetApi.getAllAssets({
            userId: userInfo.id
        })).data


    }
}