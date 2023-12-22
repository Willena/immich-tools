import FormData from "form-data";
import mime from "mime";
import path from 'path'
import {Readable} from "stream";


export abstract class BaseAsset {
    protected readonly path: string;

    protected constructor(path: string) {
        this.path = path;
    }

    async getUploadFormData(): Promise<FormData> {

        const data: any = {
            // assetData: fs.createReadStream("C:\\Users\\guill\\Pictures\\Capture1.PNG"),
            deviceAssetId: this.getDeviceAssetId(),
            deviceId: 'WillenaCLI',
            fileCreatedAt: this.getFileCreatedAt(),
            fileModifiedAt: this.getFileModifiedAt(),
            isFavorite: String(false),
        };
        const formData = new FormData();

        const stm = this.getReadStream();
        // const stm = fs.createReadStream("C:\\Users\\guill\\Pictures\\Capture1.PNG")
        // const dataStream: Buffer = await new Promise((resolve, reject) => {
        //     const data = [];
        //     stm.on('data', (chunk) => data.push(chunk));
        //     stm.on('end', () => {
        //         resolve(Buffer.concat(data));
        //     });
        //     stm.on('error', (err) => {
        //         stm.removeAllListeners('end');
        //         reject(err);
        //     });
        // });

        const type = mime.getType(this.path)
        if (!type) {
            throw new Error("Could not find content type")
        }

        formData.append("assetData", stm, {
            contentType: type,
            filepath: this.path,
            knownLength: this.getSize()
        })

        for (const prop in data) {
            formData.append(prop, data[prop]);
        }

        return formData;
    }


    private getDeviceAssetId(): string {
        return `${path.basename(this.path)}-${this.getSize()}`.replace(/\s+/g, '');
    }

    abstract getSize(): number

    abstract getReadStream(): Readable

    abstract getFileCreatedAt(): string

    abstract getFileModifiedAt(): string
}
