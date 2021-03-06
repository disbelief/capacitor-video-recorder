package com.github.sbannigan.capacitor;

import android.graphics.Color;
import android.net.Uri;
import androidx.coordinatorlayout.widget.CoordinatorLayout;
import androidx.appcompat.app.AppCompatActivity;
import android.util.DisplayMetrics;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.util.Log;

import com.getcapacitor.FileUtils;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.NativePlugin;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.Timer;
import java.util.TimerTask;

import co.fitcom.fancycamera.CameraEventListenerUI;
import co.fitcom.fancycamera.EventType;
import co.fitcom.fancycamera.FancyCamera;
import co.fitcom.fancycamera.PhotoEvent;
import co.fitcom.fancycamera.VideoEvent;

@NativePlugin(
        requestCodes = {
                VideoRecorder.REQUEST_CODE
        }
)
public class VideoRecorder extends Plugin {
    static final int REQUEST_CODE = 868;
    static final String LOG_TAG = "CapVR";
    private FancyCamera fancyCamera;
    private PluginCall call;
    private HashMap<String, FrameConfig> previewFrameConfigs;
    private FrameConfig currentFrameConfig;
    private FancyCamera.CameraPosition cameraPosition = FancyCamera.CameraPosition.FRONT;
    private Timer audioFeedbackTimer;
    private boolean timerStarted;
    private boolean audio = true;

    PluginCall getCall() {
        return call;
    }

    @Override
    protected void handleRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.handleRequestPermissionsResult(requestCode, permissions, grantResults);
        if (fancyCamera.hasPermission()) {
            if (getCall() != null) {
                getCall().success();
            } else if (savedLastCall != null) {
                savedLastCall.success();
            }
            startCamera();
        } else {
            if (getCall() != null) {
                getCall().reject("");
            } else if (savedLastCall != null) {
                savedLastCall.reject("");
            }
        }
    }

    private void startCamera() {
        Log.i(LOG_TAG, "startCamera");
        if (fancyCamera == null || fancyCamera.cameraStarted()) return;
        fancyCamera.start();
    }

    private void startTimer() {
        if (!this.audio) {
            return;
        }
        if (timerStarted) {
            return;
        }

        if (audioFeedbackTimer != null) {
            audioFeedbackTimer.cancel();
            audioFeedbackTimer = null;
        }

        audioFeedbackTimer = new Timer();
        audioFeedbackTimer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                timerStarted = true;
                getActivity().runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        JSObject object = new JSObject();
                        double db = fancyCamera != null ? fancyCamera.getDB() : 0;
                        object.put("value", db);
                        notifyListeners("onVolumeInput", object);
                    }
                });
            }
        }, 0, 100);
    }

    private void stopTimer() {
        if (audioFeedbackTimer != null) {
            audioFeedbackTimer.cancel();
            audioFeedbackTimer = null;
        }
        timerStarted = false;
    }

    @Override
    public void load() {
        super.load();
    }

    @PluginMethod()
    public void initialize(final PluginCall call) {
        Log.i(LOG_TAG, "initialize");
        JSObject defaultFrame = new JSObject();
        defaultFrame.put("id", "default");
        currentFrameConfig = new FrameConfig(defaultFrame);
        previewFrameConfigs = new HashMap<>();
        this.audio = call.getBoolean("audio", this.audio);

        fancyCamera = new FancyCamera(this.getContext());
        fancyCamera.setListener(new CameraEventListenerUI() {
            public void onCameraOpenUI() {
                Log.i(LOG_TAG, "onCameraOpenUI");
                if (getCall() != null) {
                    getCall().success();
                }
                startTimer();
                updateCameraView(currentFrameConfig);
            }

            public void onCameraCloseUI() {
                Log.i(LOG_TAG, "onCameraCloseUI");
                if (getCall() != null) {
                    getCall().success();
                }
                stopTimer();
            }

            @Override
            public void onPhotoEventUI(PhotoEvent event) {

            }

            @Override
            public void onVideoEventUI(VideoEvent event) {
                Log.i(LOG_TAG, String.format("onVideoEventUI type: %s message: %s", event.getType().name(), event.getMessage()));
                if (event.getType() == EventType.INFO &&
                        event
                                .getMessage().contains(VideoEvent.EventInfo.RECORDING_FINISHED.toString())) {
                    Log.i(LOG_TAG, "onVideoEventUI RECORDING_FINISHED");
                    if (getCall() != null) {
                        JSObject object = new JSObject();
                        String path = FileUtils.getPortablePath(getContext(), bridge.getLocalUrl(), Uri.fromFile(event.getFile()));
                        object.put("videoUrl", path);
                        getCall().resolve(object);
                    } else {
                        if (event.getType() == co.fitcom.fancycamera.EventType.ERROR) {
                            getCall().reject(event.getMessage());
                        }
                    }

                } else if (event.getType() == EventType.INFO &&
                        event
                                .getMessage().contains(VideoEvent.EventInfo.RECORDING_STARTED.toString())) {
                    Log.i(LOG_TAG, "onVideoEventUI RECORDING_STARTED");
                    if (getCall() != null) {
                        getCall().success();
                    }

                }
            }
        });
        final FrameLayout.LayoutParams cameraPreviewParams = new FrameLayout.LayoutParams(FrameLayout.LayoutParams.WRAP_CONTENT, FrameLayout.LayoutParams.WRAP_CONTENT);
        getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                ((CoordinatorLayout) bridge.getWebView().getParent()).addView(fancyCamera, cameraPreviewParams);
                bridge.getWebView().bringToFront();
                bridge.getWebView().getParent().requestLayout();
                ((CoordinatorLayout) bridge.getWebView().getParent()).invalidate();
            }
        });


        defaultFrame = new JSObject();
        defaultFrame.put("id", "default");
        JSArray defaultArray = new JSArray();
        defaultArray.put(defaultFrame);
        JSArray array = call.getArray("previewFrames", defaultArray);
        int size = array.length();
        for (int i = 0; i < size; i++) {
            try {
                JSONObject obj = (JSONObject) array.get(i);
                FrameConfig config = new FrameConfig(JSObject.fromJSONObject(obj));
                previewFrameConfigs.put(config.id, config);
            } catch (JSONException ignored) {

            }
        }

        fancyCamera.setCameraPosition(1);
        if (fancyCamera.hasPermission()) {
            // Swapping these around since it is the other way for iOS and the plugin interface needs to stay consistent
            if (call.getInt("camera") == 1) {
                fancyCamera.setCameraPosition(0);
            } else if (call.getInt("camera") == 0) {
                fancyCamera.setCameraPosition(1);
            } else {
                fancyCamera.setCameraPosition(1);
            }

            if (!fancyCamera.cameraStarted()) {
                Log.i(LOG_TAG, "camera not started yet, starting");
                startCamera();
            }
        } else {
            Log.i(LOG_TAG, "permissions required first...");
            fancyCamera.requestPermission();
        }

        this.call = call;
    }

    @PluginMethod()
    public void destroy(PluginCall call) {
        makeOpaque();
        getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                ((ViewGroup) bridge.getWebView().getParent()).removeView(fancyCamera);
            }
        });
        fancyCamera.release();
        call.success();
    }

    private void makeOpaque() {
        this.bridge.getWebView().setBackgroundColor(Color.WHITE);
    }

    @PluginMethod()
    public void showPreviewFrame(PluginCall call) {
        Log.i(LOG_TAG, "showPreviewFrame");
        int position = call.getInt("position");
        int quality = call.getInt("quality");
        this.audio = call.getBoolean("audio", this.audio);
        fancyCamera.setCameraPosition(position);
        fancyCamera.setQuality(quality);
        fancyCamera.setEnableAudioLevels(this.audio);
        bridge.getWebView().setBackgroundColor(Color.argb(0, 0, 0, 0));
        if (!fancyCamera.cameraStarted()) {
            Log.i(LOG_TAG, "showPreviewFrame not started yet, starting");
            startCamera();
            this.call = call;
        } else {
            Log.i(LOG_TAG, "showPreviewFrame camera already started");
            call.success();
        }
    }

    @PluginMethod()
    public void hidePreviewFrame(PluginCall call) {
        makeOpaque();
        fancyCamera.stop();
        this.call = call;
    }

    @PluginMethod()
    public void togglePip(PluginCall call) {

    }

    @PluginMethod()
    public void startRecording(PluginCall call) {
        Log.i(LOG_TAG, "startRecording");
        this.call = call;
        try {
            fancyCamera.startRecording();
            // call.success();
        } catch (Exception e) {
            String msg = String.format("startRecording failed %s", e.toString());
            Log.e(LOG_TAG, msg, e);
            call.error(msg, e);
        }
    }

    @PluginMethod()
    public void stopRecording(PluginCall call) {
        Log.i(LOG_TAG, "stopRecording");
        this.call = call;
        fancyCamera.stopRecording();
    }

    @PluginMethod()
    public void flipCamera(PluginCall call) {
        fancyCamera.toggleCamera();
        call.success();
    }

    @PluginMethod()
    public void getDuration(PluginCall call) {
        JSObject object = new JSObject();
        object.put("value", fancyCamera.getDuration());
        call.resolve(object);
    }

    @PluginMethod()
    public void setPosition(PluginCall call) {
        Log.i(LOG_TAG, "setPosition");
        int position = call.getInt("position");
        fancyCamera.setCameraPosition(position);
    }

    @PluginMethod()
    public void setQuality(PluginCall call) {
        Log.i(LOG_TAG, "setQuality");
        int quality = call.getInt("quality");
        fancyCamera.setQuality(quality);
    }

    @PluginMethod()
    public void addPreviewFrameConfig(PluginCall call) {
        Log.i(LOG_TAG, "addPreviewFrameConfig");
        if (fancyCamera.cameraStarted()) {
            String layerId = call.getString("id");
            if (layerId.isEmpty()) {
                call.error("Must provide layer id");
                return;
            }

            FrameConfig config = new FrameConfig(call.getData());

            if (previewFrameConfigs.containsKey(layerId)) {
                editPreviewFrameConfig(call);
                return;
            } else {
                previewFrameConfigs.put(layerId, config);
            }
            call.success();
        }
    }

    @PluginMethod()
    public void editPreviewFrameConfig(PluginCall call) {
        Log.i(LOG_TAG, "editPreviewFrameConfig");
        if (fancyCamera.cameraStarted()) {
            String layerId = call.getString("id");
            if (layerId.isEmpty()) {
                call.error("Must provide layer id");
                return;
            }

            FrameConfig updatedConfig = new FrameConfig(call.getData());
            previewFrameConfigs.put(layerId, updatedConfig);

            if (currentFrameConfig.id.equals(layerId)) {
                currentFrameConfig = updatedConfig;
                updateCameraView(currentFrameConfig);
            }

            call.success();
        }
    }


    @PluginMethod()
    public void switchToPreviewFrame(PluginCall call) {
        Log.i(LOG_TAG, "switchToPreviewFrame");
        if (fancyCamera.cameraStarted()) {
            String layerId = call.getString("id");
            if (layerId.isEmpty()) {
                call.error("Must provide layer id");
                return;
            }
            FrameConfig existingConfig = previewFrameConfigs.get(layerId);
            if (existingConfig != null) {
                if (!existingConfig.id.equals(currentFrameConfig.id)) {
                    currentFrameConfig = existingConfig;
                    updateCameraView(currentFrameConfig);
                }

            } else {
                call.error("Frame config does not exist");
                return;
            }
            call.success();
        }
    }

    private int getPixels(int value) {
        return (int) (value * getContext().getResources().getDisplayMetrics().density + 0.5f);
    }

    private void updateCameraView(final FrameConfig frameConfig) {
        Log.i(LOG_TAG, "updateCameraView");
        DisplayMetrics displayMetrics = new DisplayMetrics();
        getActivity().getWindowManager().getDefaultDisplay().getMetrics(displayMetrics);
        int deviceHeight = displayMetrics.heightPixels;
        int deviceWidth = displayMetrics.widthPixels;
        int width;
        int height;
        if (fancyCamera.getLayoutParams() == null) {
            fancyCamera.setLayoutParams(new ViewGroup.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        }

        ViewGroup.LayoutParams oldParams = fancyCamera.getLayoutParams();

        if (frameConfig.width == -1) {
            width = deviceWidth;
        } else {
            width = getPixels(frameConfig.width);
        }

        if (frameConfig.height == -1) {
            height = deviceHeight;
        } else {
            height = getPixels(frameConfig.height);
        }

        oldParams.width = width;
        oldParams.height = height;
        fancyCamera.setY(frameConfig.y);
        fancyCamera.setX(frameConfig.x);
        fancyCamera.setElevation(9);
        bridge.getWebView().setElevation(9);
        bridge.getWebView().setBackgroundColor(Color.argb(0, 0, 0, 0));
        if (frameConfig.stackPosition.equals("front")) {
            getActivity().runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    fancyCamera.bringToFront();
                    bridge.getWebView().getParent().requestLayout();
                    ((CoordinatorLayout) bridge.getWebView().getParent()).invalidate();
                }
            });

        } else if (frameConfig.stackPosition.equals("back")) {
            getActivity().runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (frameConfig.stackPosition.equals("back")) {
                        getBridge().getWebView().bringToFront();
                    }
                    bridge.getWebView().getParent().requestLayout();
                    ((CoordinatorLayout) bridge.getWebView().getParent()).invalidate();
                }
            });
        }

    }


    class FrameConfig {
        String id;
        String stackPosition;
        float x;
        float y;
        int width;
        int height;
        float borderRadius;
        DropShadow dropShadow;

        FrameConfig(JSObject object) {
            id = object.getString("id");
            stackPosition = object.getString("stackPosition", "back");
            x = object.getInteger("x", 0).floatValue();
            y = object.getInteger("y", 0).floatValue();
            width = object.getInteger("width", -1);
            height = object.getInteger("height", -1);
            borderRadius = object.getInteger("borderRadius", 0);
            JSObject ds = object.getJSObject("dropShadow");
            dropShadow = new DropShadow(ds != null ? ds : new JSObject());
        }

        class DropShadow {
            float opacity;
            float radius;
            Color color;

            DropShadow(JSObject object) {
                opacity = object.getInteger("opacity", 0).floatValue();
                radius = object.getInteger("radius", 0).floatValue();
            }
        }
    }
}
