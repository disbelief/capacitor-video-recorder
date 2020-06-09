import { WebPlugin, registerWebPlugin } from '@capacitor/core';
import {
	VideoRecorderPlugin,
	VideoRecorderOptions,
	VideoRecorderPreviewFrame,
	VideoRecorderCamera,
	VideoRecorderQuality
} from './definitions';

class DropShadow {
	opacity?: number;
	radius?: number;
	color?: string | null;

	constructor(options: DropShadow = <DropShadow>{}) {
		this.opacity = options.opacity || 0;
		this.radius = options.radius || 0;
		this.color = hexToRgb(options.color || '#000000');

		function hexToRgb(hex: string): string | null {
			let shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
			let fullHex = hex = hex.replace(shorthandRegex, function(_m, r, g, b) {
				return r + r + g + g + b + b;
			});
			let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
			return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
		}
	}
}

class FrameConfig {
	id: string;
	stackPosition?: 'front' | 'back';
	x?: number;
	y?: number;
	width?: number | 'fill';
	height?: number | 'fill';
	borderRadius?: number;
	dropShadow?: DropShadow;

	constructor(options: FrameConfig = <FrameConfig>{}) {
		this.id = options.id;
		this.stackPosition = options.stackPosition || 'back';
		this.x = options.x || 0;
		this.y = options.y || 0;
		this.width = options.width || 'fill';
		this.height = options.height || 'fill';
		this.borderRadius = options.borderRadius || 0;
		this.dropShadow = new DropShadow(options.dropShadow)
	}
}

interface MediaStreamDimensions {
	min?: number,
	max?: number,
	ideal?: number,
	exact?: number
}

interface MediaStreamCamera {
	exact?: 'user' | 'environment';
}

interface MediaStreamConstraints {
	width: number | MediaStreamDimensions,
	height: number | MediaStreamDimensions,
	facingMode: 'user' | 'environment' | MediaStreamCamera
}

export class VideoRecorderWeb extends WebPlugin implements VideoRecorderPlugin {

	videoElement: HTMLVideoElement | null = null;
	stream: MediaStream | null = null;
	recorder: MediaRecorder | null = null;
	camera: VideoRecorderCamera = VideoRecorderCamera.FRONT;
	quality: VideoRecorderQuality = VideoRecorderQuality.HIGHEST;
	mimeType: string = 'video/mp4';
	startedAt: Date | null = null;
	endedAt: Date | null = null;

	previewFrameConfigs: FrameConfig[] = [];
	currentFrameConfig: FrameConfig | undefined = new FrameConfig({id: 'default'});

	constructor() {
		super({
			name: 'VideoRecorder',
			platforms: ['web']
		});
	}

	private _initializeCameraView(): HTMLVideoElement {
		let element = document.createElement('video');
		element.autoplay = true;
		element.hidden = true;
		element.style.cssText = `
			object-fit: cover;
			pointer-events: none;
			position: absolute;
		`;
		document.body.appendChild(element);

		return element;
	}

	private _mediaStreamConstraints(): MediaStreamConstraints {
		const facingMode = this.camera === VideoRecorderCamera.BACK ? 'environment' : 'user';
		switch (this.quality) {
			case VideoRecorderQuality.MAX_480P:
				return { width: 480, height: 720, facingMode };
			case VideoRecorderQuality.MAX_720P:
				return { width: 720, height: 1280, facingMode };
			case VideoRecorderQuality.MAX_1080P:
				return { width: 1920, height: 1080, facingMode };
			case VideoRecorderQuality.MAX_2160P:
				return { width: 2160, height: 3840, facingMode };
			case VideoRecorderQuality.LOWEST:
				return { width: 480, height: 720, facingMode };
			case VideoRecorderQuality.QVGA:
				return { width: 240, height: 320, facingMode };
			default:
				return { width: 2160, height: 3840, facingMode };
		}
	}

	private _updateCameraView(config: FrameConfig): void {
		if (this.videoElement !== null) {
			this.videoElement.style.width = config.width === 'fill' ? '100vw' : `${config.width}px`;
			this.videoElement.style.height = config.height === 'fill' ? '100vh' : `${config.height}px`;
			this.videoElement.style.left = `${config.x}px`;
			this.videoElement.style.top = `${config.y}px`;
			this.videoElement.style.zIndex = config.stackPosition === 'back' ? '-1' : '99999';
			this.videoElement.style.borderRadius = `${config.borderRadius}px`;
			this.videoElement.style.boxShadow = `0 0 ${config.dropShadow?.radius || 0}px 0 rgba(${config.dropShadow?.color}, ${config.dropShadow?.opacity})`;
		}
	}

	async initialize(options?: VideoRecorderOptions): Promise<void> {
		if (options?.previewFrames) {
			let framesNumber = options.previewFrames.length;
			let previewFrames = framesNumber > 0 ? options.previewFrames : [{id: 'default'}];
			this.previewFrameConfigs = previewFrames.map(config => new FrameConfig(config));
			this.currentFrameConfig = this.previewFrameConfigs[0];
		}
		if (options?.camera) {
			this.camera = options?.camera;
		}
		if (options?.quality) {
			this.quality = options?.quality;
		}
		
		this.videoElement = this._initializeCameraView();
		if (this.currentFrameConfig) {
			this._updateCameraView(this.currentFrameConfig);
		}

		if (options?.autoShow !== false && this.videoElement) {
			this.videoElement.hidden = false;
		}

		if (navigator.mediaDevices?.getUserMedia) {
			this.stream = await navigator.mediaDevices.getUserMedia({
				video: this._mediaStreamConstraints(),
				audio: !options?.audio === false
			})
			let isMp4Supported = Boolean(
				!Object.prototype.hasOwnProperty.call(MediaRecorder, 'isTypeSupported') ||
				MediaRecorder.isTypeSupported('video/mp4')
			);
			this.mimeType = isMp4Supported ? 'video/mp4' : 'video/webm;codecs=h264';
			this.recorder = new MediaRecorder(this.stream, { mimeType: this.mimeType });
			if (this.videoElement) {
				this.videoElement.srcObject = this.stream;
			}
		}
    return Promise.resolve();
	}

	destroy(): Promise<void> {
		this.videoElement?.remove();
		this.previewFrameConfigs = [];
		this.currentFrameConfig = undefined;
		this.stream?.getTracks().forEach(track => track.stop());
		this.recorder = null;
		this.stream = null;
		this.startedAt = null;
		this.endedAt = null;
    return Promise.resolve();
	}

	flipCamera(): Promise<void> {
		console.warn('VideoRecorder: No web mock available for flipCamera');
		// TODO implement
		return Promise.resolve();
	}

	addPreviewFrameConfig(config: VideoRecorderPreviewFrame): Promise<void> {
		if (this.videoElement) {
			if (!config.id) {
				return Promise.reject('id required');
			}
			let newFrame = new FrameConfig(config);
			if (this.previewFrameConfigs.map(config => config.id).indexOf(newFrame.id) === -1) {
				this.previewFrameConfigs.push(newFrame);
			}
			else {
				this.editPreviewFrameConfig(config);
			}
		}
		return Promise.resolve();
	}

	editPreviewFrameConfig(config: VideoRecorderPreviewFrame): Promise<void> {
		if (this.videoElement) {
			if (!config.id) {
				return Promise.reject('id required');
			}
			let updatedFrame = new FrameConfig(config);
			let existingIndex = this.previewFrameConfigs.map(config => config.id).indexOf(updatedFrame.id)
			if (existingIndex !== -1) {
				this.previewFrameConfigs[existingIndex] = updatedFrame;
			}
			else {
				this.addPreviewFrameConfig(config);
			}
			if (this.currentFrameConfig?.id == config.id) {
				this.currentFrameConfig = updatedFrame;
				this._updateCameraView(this.currentFrameConfig);
			}
		}
		return Promise.resolve();
	}

	switchToPreviewFrame(options: { id: string }): Promise<void> {
		if (this.videoElement) {
			if (!options.id) {
				return Promise.reject('id required');
			}
			let config = this.previewFrameConfigs.filter(config => config.id === options.id);
			if (config.length > 0) {
				this._updateCameraView(config[0]);
			}
			else {
				return Promise.reject('id not found');
			}
		}
		return Promise.resolve();
	}

	showPreviewFrame(): Promise<void> {
		if (this.videoElement) {	
			this.videoElement.hidden = false;
		}
		return Promise.resolve();
	}

	hidePreviewFrame(): Promise<void> {
		if (this.videoElement) {	
			this.videoElement.hidden = true;
		}
		return Promise.resolve();
	}

	startRecording(): Promise<void> {
		console.log('VideoRecorder.startRecording');
		if (!this.recorder) {
			console.warn('VideoRecorder: No web mock available for startRecording');
			return Promise.resolve();
		}
		if (this.recorder.state === 'inactive' || this.recorder.state === 'paused') {
			this.endedAt = null;
			this.startedAt = new Date();
			this.recorder.start(); // timeslices not supported in Safari yet
		} else {
			console.warn(`VideoRecorder: recorder can not be started in ${this.recorder.state} state`);
		}
		return Promise.resolve();
	}

	// Returns a promise that resolves with { videoUrl: 'some/file/path', mimeType: 'video/whatever' }
	stopRecording(): Promise<{ videoUrl: string, mimeType?: string }> {
		console.log('VideoRecorder.stopRecording');
		return new Promise((resolve, reject) => {
			let mediaRecorder: MediaRecorder | null = this.recorder;
			if (mediaRecorder === null) {
				console.warn('VideoRecorder: No web mock available for stopRecording');
				return resolve({ videoUrl: 'some/file/path' });
			}
			if (mediaRecorder.state !== 'recording') {
				return reject(new Error(`VideoRecorder: recorder state is ${mediaRecorder.state}`));
			}
			let chunks: Blob[] = [];
			mediaRecorder.ondataavailable = (event: BlobEvent) => {
				console.log('VideoRecorder.ondataavailable', event);
				chunks.push(event.data);
			};
			mediaRecorder.onstop = () => {
				let outputBlob = new Blob(chunks, { 'type' : this.mimeType });
				let videoUrl = URL.createObjectURL(outputBlob);
				this.endedAt = new Date();
				resolve({ videoUrl, mimeType: this.mimeType });
			};
			mediaRecorder.stop();
		});
	}

	getDuration(): Promise<{ value: number }> {
		return new Promise((resolve, reject) => {
			if (!this.startedAt) {
				return reject(new Error('VideoRecorder recording has not started'));
			}
			let endTime: Date = this.endedAt || new Date();
			let value: number = (endTime.getTime() - this.startedAt.getTime()) / 1000;
			resolve({ value });
		});
	}

	addListener(): any {
		console.warn('VideoRecorder: No web mock available for addListener');
	}
}

const VideoRecorder = new VideoRecorderWeb();

export { VideoRecorder };

registerWebPlugin(VideoRecorder);
