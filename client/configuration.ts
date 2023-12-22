import fs from "fs";
import os from "os";
import path from "path";
import yaml from "yaml";

const userHomeDir = os.homedir();
const configDir = path.join(userHomeDir, '.config/immich/');
const defaultAuthPath = path.join(configDir, '/auth.yml');

export class ApiConfiguration {
    public readonly instanceUrl!: string;
    public readonly apiKey!: string;

    constructor(instanceUrl: string, apiKey: string) {
        this.instanceUrl = instanceUrl;
        this.apiKey = apiKey;
    }

    static async readFromFile(authPath = defaultAuthPath): Promise<ApiConfiguration> {

        let instanceUrl = process.env.IMMICH_INSTANCE_URL;
        let apiKey = process.env.IMMICH_API_KEY;

        if (!instanceUrl || !apiKey) {
            await fs.promises.access(authPath, fs.constants.F_OK).catch((error) => {
                if (error.code === 'ENOENT') {
                    throw new Error('No auth file exist. Please login first');
                }
            });

            const data: string = await fs.promises.readFile(authPath, 'utf8');
            const parsedConfig = yaml.parse(data);

            instanceUrl = parsedConfig.instanceUrl;
            apiKey = parsedConfig.apiKey;

            if (!instanceUrl) {
                throw new Error(`Instance URL missing in auth config file ${authPath}`);
            }

            if (!apiKey) {
                throw new Error(`API key missing in auth config file ${authPath}`);
            }
        }

        return new ApiConfiguration(instanceUrl, apiKey)
    }
}
