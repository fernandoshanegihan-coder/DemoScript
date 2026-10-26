import {
  ALL_FORMATS, BlobSource, BufferTarget, Conversion, Input, Mp4OutputFormat,
  Output, Quality, WebMOutputFormat, canEncodeAudio, canEncodeVideo,
  type AudioCodec, type VideoCodec,
} from "mediabunny";

export type CombinedVideo = { blob: Blob; extension: "mp4" | "webm" };

/** Mux validated narration at zero; discard any audio in the source recording. */
export async function combineVideoAndNarration(video: Blob, narration: Blob, duration: number, options: {
  signal?: AbortSignal; onProgress?: (fraction: number) => void;
} = {}): Promise<CombinedVideo> {
  if (!Number.isFinite(duration) || duration <= 0 || !video.size || !narration.size) throw new Error("The video or narration is empty.");
  options.signal?.throwIfAborted();
  const input = new Input({ source: new BlobSource(video), formats: ALL_FORMATS });
  const audioInput = new Input({ source: new BlobSource(narration), formats: ALL_FORMATS });
  let output: Output | undefined;
  const conversions: Conversion[] = [];
  const abort = () => { void Promise.allSettled(conversions.map(conversion => conversion.cancel())).then(() => output?.cancel()).catch(() => undefined); };
  options.signal?.addEventListener("abort", abort, { once: true });
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new Error("The recording has no readable video track.");
    const sourceCodec = await track.getCodec();
    const width = await track.getCodedWidth();
    const height = await track.getCodedHeight();
    let extension: CombinedVideo["extension"];
    let audioCodec: AudioCodec;
    let videoCodec: VideoCodec;
    const audioOptions = { numberOfChannels: 1, sampleRate: 48000 };
    if (await canEncodeAudio("aac", audioOptions) && (sourceCodec === "avc" || await canEncodeVideo("avc", { width, height }))) {
      extension = "mp4"; audioCodec = "aac"; videoCodec = "avc";
    } else {
      if (!await canEncodeAudio("opus", audioOptions)) throw new Error("This browser cannot create a video with narration. Try Chrome or Edge; your recordings are kept.");
      extension = "webm"; audioCodec = "opus";
      if (sourceCodec === "vp8" || sourceCodec === "vp9" || sourceCodec === "av1") videoCodec = sourceCodec;
      else if (await canEncodeVideo("vp9", { width, height })) videoCodec = "vp9";
      else if (await canEncodeVideo("vp8", { width, height })) videoCodec = "vp8";
      else throw new Error("This browser cannot encode the video. Try Chrome or Edge; your recordings are kept.");
    }
    options.signal?.throwIfAborted();
    const target = new BufferTarget();
    output = new Output({ format: extension === "mp4" ? new Mp4OutputFormat() : new WebMOutputFormat(), target });
    const videoConversion = await Conversion.init({ input, output, tracks: "primary", audio: { discard: true },
      video: { codec: videoCodec }, trim: { start: 0, end: duration }, copy: { shiftTolerance: 0 }, composable: true,
    });
    conversions.push(videoConversion);
    const audioConversion = await Conversion.init({ input: audioInput, output, tracks: "primary", video: { discard: true },
      audio: { codec: audioCodec, numberOfChannels: 1, sampleRate: 48000, quality: new Quality({ bitrate: 128000 }) },
      trim: { start: 0, end: duration }, composable: true,
    });
    conversions.push(audioConversion);
    if (!videoConversion.utilizedTracks.some(item => item.type === "video") || !audioConversion.utilizedTracks.some(item => item.type === "audio")) {
      throw new Error("The video and narration could not both be included. Your original recordings are kept.");
    }
    options.signal?.throwIfAborted();
    await output.start();
    // Advance both tracks together so long recordings do not queue all audio or video in memory.
    for (let until = 1; ; until++) {
      options.signal?.throwIfAborted();
      await Promise.all(conversions.map(conversion => conversion.execute({ until })));
      options.onProgress?.(Math.min(0.98, until / duration));
      if (conversions.every(conversion => conversion.state === "done")) break;
    }
    await output.finalize();
    options.signal?.throwIfAborted();
    if (!target.buffer?.byteLength) throw new Error("The combined video was empty. Please try again.");
    const blob = new Blob([target.buffer], { type: extension === "mp4" ? "video/mp4" : "video/webm" });
    // A successful file must have both tracks; never offer another silent-video download.
    const check = new Input({ source: new BlobSource(blob), formats: ALL_FORMATS });
    try {
      if (!await check.getPrimaryVideoTrack() || (await check.getAudioTracks()).length === 0) throw new Error("The exported file is missing video or narration. Please try again.");
    } finally { check.dispose(); }
    options.onProgress?.(1);
    return { blob, extension };
  } catch (error) {
    await Promise.allSettled(conversions.map(conversion => conversion.cancel()));
    await output?.cancel().catch(() => undefined);
    throw error;
  } finally {
    options.signal?.removeEventListener("abort", abort);
    input.dispose(); audioInput.dispose();
  }
}
