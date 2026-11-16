package com.habboubah.bildklar

import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // The app's own plugins (src/native/), before the bridge starts.
        registerPlugin(PhotoLibraryPlugin::class.java)
        registerPlugin(PurchasesPlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
