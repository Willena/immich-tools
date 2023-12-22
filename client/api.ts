import {ApiConfiguration} from "./configuration";
import {
    AlbumApi,
    APIKeyApi,
    AssetApi,
    AuthenticationApi,
    Configuration,
    JobApi,
    OAuthApi,
    ServerInfoApi,
    SystemConfigApi,
    UserApi
} from "./open-api";

export class ImmichApi {
    public userApi: UserApi;
    public albumApi: AlbumApi;
    public assetApi: AssetApi;
    public authenticationApi: AuthenticationApi;
    public oauthApi: OAuthApi;
    public serverInfoApi: ServerInfoApi;
    public jobApi: JobApi;
    public keyApi: APIKeyApi;
    public systemConfigApi: SystemConfigApi;

    private readonly config;
    public readonly apiConfiguration: ApiConfiguration;

    constructor(apiConfig: ApiConfiguration) {
        this.apiConfiguration = apiConfig
        this.config = new Configuration({
            basePath: apiConfig.instanceUrl,
            baseOptions: {
                headers: {
                    'x-api-key': apiConfig.apiKey,
                },
            },
            formDataCtor: FormData,
        });

        this.userApi = new UserApi(this.config);
        this.albumApi = new AlbumApi(this.config);
        this.assetApi = new AssetApi(this.config);
        this.authenticationApi = new AuthenticationApi(this.config);
        this.oauthApi = new OAuthApi(this.config);
        this.serverInfoApi = new ServerInfoApi(this.config);
        this.jobApi = new JobApi(this.config);
        this.keyApi = new APIKeyApi(this.config);
        this.systemConfigApi = new SystemConfigApi(this.config);
    }

    public async ping(): Promise<void> {
        const {data: pingResponse} = await this.serverInfoApi.pingServer().catch((error) => {
            throw new Error(`Failed to connect to server ${this.apiConfiguration.instanceUrl}: ${error.message}`);
        });

        if (pingResponse.res !== 'pong') {
            throw new Error(`Could not parse response. Is Immich listening on ${this.apiConfiguration.instanceUrl}?`);
        }
    }
}