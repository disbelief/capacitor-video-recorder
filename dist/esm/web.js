var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { WebPlugin, registerWebPlugin } from '@capacitor/core';
class DropShadow {
    constructor(options = {}) {
        this.opacity = options.opacity || 0;
        this.radius = options.radius || 0;
        this.color = hexToRgb(options.color || '#000000');
        function hexToRgb(hex) {
            let shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
            let fullHex = hex = hex.replace(shorthandRegex, function (_m, r, g, b) {
                return r + r + g + g + b + b;
            });
            let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
            return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
        }
    }
}
class FrameConfig {
    constructor(options = {}) {
        this.id = options.id;
        this.stackPosition = options.stackPosition || 'back';
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.width = options.width || 'fill';
        this.height = options.height || 'fill';
        this.borderRadius = options.borderRadius || 0;
        this.dropShadow = new DropShadow(options.dropShadow);
    }
}
export class VideoRecorderWeb extends WebPlugin {
    constructor() {
        super({
            name: 'VideoRecorder',
            platforms: ['web']
        });
        this.previewFrameConfigs = [];
        this.currentFrameConfig = new FrameConfig({ id: 'default' });
        this.videoElement = null;
        this.stream = null;
    }
    _initializeCameraView() {
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
    _updateCameraView(config) {
        var _a, _b, _c;
        if (this.videoElement !== null) {
            this.videoElement.style.width = config.width === 'fill' ? '100vw' : `${config.width}px`;
            this.videoElement.style.height = config.height === 'fill' ? '100vh' : `${config.height}px`;
            this.videoElement.style.left = `${config.x}px`;
            this.videoElement.style.top = `${config.y}px`;
            this.videoElement.style.zIndex = config.stackPosition === 'back' ? '-1' : '99999';
            this.videoElement.style.borderRadius = `${config.borderRadius}px`;
            this.videoElement.style.boxShadow = `0 0 ${((_a = config.dropShadow) === null || _a === void 0 ? void 0 : _a.radius) || 0}px 0 rgba(${(_b = config.dropShadow) === null || _b === void 0 ? void 0 : _b.color}, ${(_c = config.dropShadow) === null || _c === void 0 ? void 0 : _c.opacity})`;
        }
    }
    async initialize(options) {
        var _a;
        console.warn('VideoRecorder: Web implementation is currently for mock purposes only, recording is not available');
        if (options === null || options === void 0 ? void 0 : options.previewFrames) {
            let framesNumber = options.previewFrames.length;
            let previewFrames = framesNumber > 0 ? options.previewFrames : [{ id: 'default' }];
            this.previewFrameConfigs = previewFrames.map(config => new FrameConfig(config));
            this.currentFrameConfig = this.previewFrameConfigs[0];
        }
        this.videoElement = this._initializeCameraView();
        if (this.currentFrameConfig) {
            this._updateCameraView(this.currentFrameConfig);
        }
        if ((options === null || options === void 0 ? void 0 : options.autoShow) !== false && this.videoElement) {
            this.videoElement.hidden = false;
        }
        if ((_a = navigator.mediaDevices) === null || _a === void 0 ? void 0 : _a.getUserMedia) {
            this.stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (this.videoElement) {
                this.videoElement.srcObject = this.stream;
            }
        }
        return Promise.resolve();
    }
    destroy() {
        var _a, _b;
        (_a = this.videoElement) === null || _a === void 0 ? void 0 : _a.remove();
        this.previewFrameConfigs = [];
        this.currentFrameConfig = undefined;
        (_b = this.stream) === null || _b === void 0 ? void 0 : _b.getTracks().forEach(track => track.stop());
        return Promise.resolve();
    }
    flipCamera() {
        console.warn('VideoRecorder: No web mock available for flipCamera');
        return Promise.resolve();
    }
    addPreviewFrameConfig(config) {
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
    editPreviewFrameConfig(config) {
        var _a;
        if (this.videoElement) {
            if (!config.id) {
                return Promise.reject('id required');
            }
            let updatedFrame = new FrameConfig(config);
            let existingIndex = this.previewFrameConfigs.map(config => config.id).indexOf(updatedFrame.id);
            if (existingIndex !== -1) {
                this.previewFrameConfigs[existingIndex] = updatedFrame;
            }
            else {
                this.addPreviewFrameConfig(config);
            }
            if (((_a = this.currentFrameConfig) === null || _a === void 0 ? void 0 : _a.id) == config.id) {
                this.currentFrameConfig = updatedFrame;
                this._updateCameraView(this.currentFrameConfig);
            }
        }
        return Promise.resolve();
    }
    switchToPreviewFrame(options) {
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
    showPreviewFrame() {
        if (this.videoElement) {
            this.videoElement.hidden = false;
        }
        return Promise.resolve();
    }
    hidePreviewFrame() {
        if (this.videoElement) {
            this.videoElement.hidden = true;
        }
        return Promise.resolve();
    }
    startRecording() {
        console.warn('VideoRecorder: No web mock available for startRecording');
        return Promise.resolve();
    }
    stopRecording() {
        console.warn('VideoRecorder: No web mock available for stopRecording');
        return Promise.resolve({ videoUrl: 'some/file/path' });
    }
    getDuration() {
        return Promise.resolve({ value: 0 });
    }
    addListener() {
        console.warn('VideoRecorder: No web mock available for addListener');
    }
}
const VideoRecorder = new VideoRecorderWeb();
export { VideoRecorder };
registerWebPlugin(VideoRecorder);
//# sourceMappingURL=web.js.map