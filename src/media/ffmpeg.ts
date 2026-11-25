import { spawn } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

/**
 * FFmpeg and FFprobe come from npm, so nothing is installed on the server. ffmpeg-static downloads the build for
 * the machine it is installed on: run `npm install` on the server itself, with install scripts allowed.
 */
export const FFMPEG = ffmpegStatic as unknown as string;
export const FFPROBE = ffprobeStatic.path;

/** Runs a command and returns its output. Rejects on a non-zero exit, or kills it after the timeout. */
export function run(bin: string, args: string[], timeoutMs = 5 * 60_000): Promise<string> {
    return new Promise((resolve, reject) => {
        const child = spawn(bin, args, { windowsHide: true });
        let out = '';
        let err = '';
        const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
        child.stdout.on('data', (d: Buffer) => (out += d.toString()));
        // Keep only the end of the log; FFmpeg is chatty.
        child.stderr.on('data', (d: Buffer) => (err = (err + d.toString()).slice(-4000)));
        child.on('error', (e) => {
            clearTimeout(timer);
            reject(e);
        });
        child.on('close', (code) => {
            clearTimeout(timer);
            if (code === 0) resolve(out);
            else reject(new Error(`${bin} exited with ${code}: ${err.slice(-500)}`));
        });
    });
}
