/// <reference types="dom-mediacapture-record" />
import { WebPlugin } from '@capacitor/core';
import { VideoRecorderPlugin, VideoRecorderOptions, VideoRecorderPreviewFrame, VideoRecorderCamera, VideoRecorderQuality } from './definitions';
declare class DropShadow {
    opacity?: number;
    radius?: number;
    color?: string | null;
    constructor(options?: DropShadow);
}
declare class FrameConfig {
    id: string;
    stackPosition?: 'front' | 'back';
    x?: number;
    y?: number;
    width?: number | 'fill';
    height?: number | 'fill';
    borderRadius?: number;
    dropShadow?: DropShadow;
    constructor(options?: FrameConfig);
}
export declare class VideoRecorderWeb extends WebPlugin implements VideoRecorderPlugin {
    videoElement: HTMLVideoElement | null;
    stream: MediaStream | null;
    recorder: MediaRecorder | null;
    camera: VideoRecorderCamera;
    quality: VideoRecorderQuality;
    mimeType?: string;
    startedAt: Date | null;
    endedAt: Date | null;
    previewFrameConfigs: FrameConfig[];
    currentFrameConfig: FrameConfig | undefined;
    constructor();
    private _initializeCameraView;
    private _mediaStreamConstraints;
    private _updateCameraView;
    private _decideMimeType;
    initialize(options?: VideoRecorderOptions): Promise<void>;
    destroy(): Promise<void>;
    flipCamera(): Promise<void>;
    addPreviewFrameConfig(config: VideoRecorderPreviewFrame): Promise<void>;
    editPreviewFrameConfig(config: VideoRecorderPreviewFrame): Promise<void>;
    switchToPreviewFrame(options: {
        id: string;
    }): Promise<void>;
    showPreviewFrame(): Promise<void>;
    hidePreviewFrame(): Promise<void>;
    startRecording(): Promise<void>;
    stopRecording(): Promise<{
        videoUrl: string;
        mimeType?: string;
    }>;
    getDuration(): Promise<{
        value: number;
    }>;
    addListener(): any;
}
declare const VideoRecorder: VideoRecorderWeb;
export { VideoRecorder };
