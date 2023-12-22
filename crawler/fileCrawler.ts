import {glob} from 'glob';

export class CrawlOptionsDto {
    pathsToCrawl!: string[];
    recursive? = false;
    includeHidden? = false;
    exclusionPatterns?: string[];
}

export class CrawlService {
    private readonly extensions!: string[];

    constructor(extensions: string[]) {
        this.extensions = extensions.map((e) => e.replace('.', ''));
    }

    crawl(crawlOptions: CrawlOptionsDto): Promise<string[]> {
        const {pathsToCrawl, exclusionPatterns, includeHidden} = crawlOptions;
        if (!pathsToCrawl) {
            return Promise.resolve([]);
        }

        const base = pathsToCrawl.length === 1 ? pathsToCrawl[0] : `{${pathsToCrawl.join(',')}}`;
        const extensions = `*{${this.extensions}}`;

        return glob(`${base}/**/${extensions}`, {
            absolute: true,
            nocase: true,
            nodir: true,
            dot: includeHidden,
            ignore: exclusionPatterns,
        });
    }
}
