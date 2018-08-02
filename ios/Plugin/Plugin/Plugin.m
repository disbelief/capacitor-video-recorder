#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Define the plugin using the CAP_PLUGIN Macro, and
// each method the plugin supports using the CAP_PLUGIN_METHOD macro.
CAP_PLUGIN(CapacitorVideoRecorderPlugin, "CapacitorVideoRecorderPlugin",
           CAP_PLUGIN_METHOD(initialize, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(destroy, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(show, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(hide, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(togglePip, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(toggleCamera, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(setQuality, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(setPosition, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(stopRecording, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(startRecording, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(getDuration, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(getPath, CAPPluginReturnPromise);
)