import { BadRequestException, Injectable, Logger, OnModuleInit, UnprocessableEntityException } from '@nestjs/common';
import { existsSync } from 'fs';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { FFMPEG, FFPROBE, run } from './ffmpeg';

export interface VideoInfo {
    durationSec: number;
    width: number;
    height: number;
    hasAudio: boolean;
}

interface ProbeOutput {
    format?: { duration?: string };
    streams?: { codec_type: string; width?: number; height?: number }[];
}

/** Longest side after encoding: 720p, so 1280×720 landscape or 720×1280 portrait. */
const MAX_SIDE = 1280;

/** Shrinks uploaded ad videos to an MP4 every phone plays smoothly, before they go to MinIO. */
@Injectable()
export class VideoOptimizerService implements OnModuleInit {
    private readonly logger = new Logger(VideoOptimizerService.name);
    /** One encode at a time, so uploads can't take all the CPU from the API. */
    private queue: Promise<unknown> = Promise.resolve();

    onModuleInit() {
        if (!FFMPEG || !existsSync(FFMPEG) || !FFPROBE || !existsSync(FFPROBE)) {
            this.logger.warn('FFmpeg from npm is missing, so video uploads will fail. Run npm install on this machine with install scripts allowed.');
        }
    }

    async probe(path: string): Promise<VideoInfo> {
        let data: ProbeOutput;
        try {
            data = JSON.parse(await run(FFPROBE, ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', path], 30_000)) as ProbeOutput;
        } catch {
            throw new BadRequestException("This file isn't a video we can read");
        }
        const video = data.streams?.find((s) => s.codec_type === 'video');
        if (!video?.width || !video.height) throw new BadRequestException("This file isn't a video we can read");
        return {
            durationSec: Number(data.format?.duration ?? 0),
            width: video.width,
            height: video.height,
            hasAudio: !!data.streams?.some((s) => s.codec_type === 'audio'),
        };
    }

    /** Re-encodes to H.264 MP4, at most 720p and 30 fps, that starts playing before it has fully downloaded. */
    optimize(file: Express.Multer.File): Promise<{ file: Express.Multer.File; info: VideoInfo }> {
        const job = this.queue.then(() => this.encode(file));
        this.queue = job.catch(() => undefined);
        return job;
    }

    /** Videos are optimized; anything else is returned as it is. */
    async prepareUpload(file: Express.Multer.File): Promise<Express.Multer.File> {
        return file.mimetype.startsWith('video/') ? (await this.optimize(file)).file : file;
    }

    private async encode(file: Express.Multer.File) {
        const dir = await mkdtemp(join(tmpdir(), 'ad-video-'));
        const input = join(dir, 'input');
        const output = join(dir, 'output.mp4');
        try {
            await writeFile(input, file.buffer);
            const info = await this.probe(input);
            const started = Date.now();

            await run(FFMPEG, [
                '-y', '-i', input,
                '-map', '0:v:0', '-map', '0:a:0?',            // first video track, and the first audio track if there is one
                '-vf', `scale=${MAX_SIDE}:${MAX_SIDE}:force_original_aspect_ratio=decrease:force_divisible_by=2`,
                '-fpsmax', '30',
                '-c:v', 'libx264', '-preset', 'medium', '-crf', '24',
                '-profile:v', 'high', '-pix_fmt', 'yuv420p',   // plays on every phone
                '-maxrate', '2500k', '-bufsize', '5000k',     // no bitrate spikes on mobile data
                '-c:a', 'aac', '-b:a', '128k', '-ac', '2',
                '-movflags', '+faststart',                    // starts playing before the whole file has downloaded
                output,
            ]);

            const buffer = await readFile(output);
            const name = file.originalname.replace(/\.[^.]+$/, '') + '.mp4';
            this.logger.log(`Video "${name}" ${info.width}×${info.height}, ${info.durationSec.toFixed(1)}s: `
                + `${(file.size / 1e6).toFixed(1)} MB → ${(buffer.length / 1e6).toFixed(1)} MB in ${((Date.now() - started) / 1000).toFixed(1)}s`);
            return {
                file: { ...file, buffer, size: buffer.length, mimetype: 'video/mp4', originalname: name },
                info,
            };
        } catch (e) {
            if (e instanceof BadRequestException) throw e;
            this.logger.error(`Video encode failed: ${(e as Error).message}`);
            throw new UnprocessableEntityException("We couldn't process this video. Try another file, or export it as MP4.");
        } finally {
            await rm(dir, { recursive: true, force: true });
        }
    }
}
