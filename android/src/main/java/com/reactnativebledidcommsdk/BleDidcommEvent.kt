package com.reactnativebledidcommsdk

enum class BleDidcommEvent(val token: String) {
    OnDiscoverPeripheral("onDiscoverPeripheral"),
    OnConnectedPeripheral("onConnectedPeripheral"),
    OnReceivedWriteWithoutResponse("onReceivedWriteWithoutResponse"),
    OnReceivedNotification("onReceivedNotification")
}