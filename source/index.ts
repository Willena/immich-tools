import {FilesystemSource} from "./filesystem";
import {Source} from "./types";
import {ZipSource} from "./ZipSource";


export class Sources {

    public static findFor(path: string): Source {
        if (!path) {
            throw new Error("Source is unknown")
        }

        if (path.toLowerCase().endsWith(".zip")) {
            return new ZipSource(path)
        } else {
            return new FilesystemSource(path)
        }
    }

}