import crypto from "crypto";

export async function hash(stream: NodeJS.ReadableStream, onChunkProgress: (bytes: number) => void = () => {
}): Promise<string> {
    const hash = crypto.createHash('sha1');
    return new Promise<string>((resolve, reject) => {
        let current = 0;
        stream.on('error', reject);
        stream.on('data', (chunk) => {
            hash.update(chunk);
            onChunkProgress((current += chunk.length));
        });
        stream.on('end', () => resolve(hash.digest('base64')));
    });
}