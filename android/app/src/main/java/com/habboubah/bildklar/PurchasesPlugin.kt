package com.habboubah.bildklar

import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Android's side of src/native/purchases.ts: Google Play Billing, one one-time
 * product (the unlock), acknowledged after the purchase so Play doesn't refund
 * it after three days. No purchase server and no SDK of anyone else: the
 * Billing Library talks to the Play Store app on the phone.
 */
@CapacitorPlugin(name = "Purchases")
class PurchasesPlugin : Plugin(), PurchasesUpdatedListener {

    private lateinit var client: BillingClient
    private var purchaseCall: PluginCall? = null
    private var productId: String = ""
    private val waiting = ArrayList<() -> Unit>()
    private var connecting = false

    override fun load() {
        client = BillingClient.newBuilder(context)
            .setListener(this)
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .enableAutoServiceReconnection()
            .build()
    }

    override fun handleOnDestroy() {
        if (::client.isInitialized) client.endConnection()
        super.handleOnDestroy()
    }

    /** Runs `then` once the client is connected; `failed` when Play can't be reached (no Play Store, offline). */
    private fun connected(failed: (BillingResult?) -> Unit, then: () -> Unit) {
        if (client.isReady) { then(); return }
        waiting.add(then)
        if (connecting) return
        connecting = true
        client.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                connecting = false
                val queued = ArrayList(waiting)
                waiting.clear()
                if (result.responseCode == BillingClient.BillingResponseCode.OK) queued.forEach { it() }
                else failed(result)
            }

            override fun onBillingServiceDisconnected() {
                connecting = false
            }
        })
    }

    private fun details(id: String, done: (ProductDetails?) -> Unit) {
        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(listOf(
                QueryProductDetailsParams.Product.newBuilder().setProductId(id).setProductType(BillingClient.ProductType.INAPP).build(),
            ))
            .build()
        client.queryProductDetailsAsync(params) { result, found ->
            done(if (result.responseCode == BillingClient.BillingResponseCode.OK) found.productDetailsList.firstOrNull() else null)
        }
    }

    @PluginMethod
    fun getProduct(call: PluginCall) {
        val id = call.getString("id") ?: return call.reject("No product id")
        connected({ call.resolve(JSObject().put("product", null)) }) {
            details(id) { d ->
                val price = d?.oneTimePurchaseOfferDetails?.formattedPrice
                call.resolve(JSObject().put("product", if (d != null && price != null) JSObject().put("id", id).put("price", price) else null))
            }
        }
    }

    @PluginMethod
    fun purchase(call: PluginCall) {
        val id = call.getString("id") ?: return call.reject("No product id")
        connected({ call.resolve(JSObject().put("state", "failed")) }) {
            details(id) { d ->
                if (d == null) { call.resolve(JSObject().put("state", "failed")); return@details }
                productId = id
                purchaseCall = call
                val flow = BillingFlowParams.newBuilder()
                    .setProductDetailsParamsList(listOf(BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(d).build()))
                    .build()
                activity.runOnUiThread {
                    val result = client.launchBillingFlow(activity, flow)
                    if (result.responseCode == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) finish("purchased")
                    else if (result.responseCode != BillingClient.BillingResponseCode.OK) finish("failed")
                }
            }
        }
    }

    private fun finish(state: String) {
        val call = purchaseCall
        purchaseCall = null
        call?.resolve(JSObject().put("state", state))
    }

    override fun onPurchasesUpdated(result: BillingResult, purchases: MutableList<Purchase>?) {
        when (result.responseCode) {
            BillingClient.BillingResponseCode.OK -> {
                val mine = purchases.orEmpty().filter { productId.isEmpty() || it.products.contains(productId) }
                mine.forEach(::acknowledge)
                val state = when {
                    mine.any { it.purchaseState == Purchase.PurchaseState.PURCHASED } -> "purchased"
                    mine.any { it.purchaseState == Purchase.PurchaseState.PENDING } -> "pending"
                    else -> "failed"
                }
                if (purchaseCall != null) finish(state)
                else if (state == "purchased") notifyListeners("ownedChanged", JSObject().put("owned", true))
            }
            BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED -> finish("purchased")
            BillingClient.BillingResponseCode.USER_CANCELED -> finish("cancelled")
            else -> finish("failed")
        }
    }

    /** A purchase not acknowledged within three days is refunded by Play. */
    private fun acknowledge(p: Purchase) {
        if (p.purchaseState != Purchase.PurchaseState.PURCHASED || p.isAcknowledged) return
        client.acknowledgePurchase(AcknowledgePurchaseParams.newBuilder().setPurchaseToken(p.purchaseToken).build()) { }
    }

    private fun owned(id: String, done: (Boolean?) -> Unit) {
        connected({ done(null) }) {
            client.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build()) { result, purchases ->
                if (result.responseCode != BillingClient.BillingResponseCode.OK) { done(null); return@queryPurchasesAsync }
                val mine = purchases.filter { it.products.contains(id) && it.purchaseState == Purchase.PurchaseState.PURCHASED }
                mine.forEach(::acknowledge)
                done(mine.isNotEmpty())
            }
        }
    }

    @PluginMethod
    fun isOwned(call: PluginCall) {
        val id = call.getString("id") ?: return call.reject("No product id")
        owned(id) { o -> if (o == null) call.reject("Google Play is not reachable") else call.resolve(JSObject().put("owned", o)) }
    }

    /** Play keeps purchases with the Google account: "restore" is asking it again. */
    @PluginMethod
    fun restore(call: PluginCall) {
        val id = call.getString("id") ?: return call.reject("No product id")
        owned(id) { o -> if (o == null) call.reject("Google Play is not reachable") else call.resolve(JSObject().put("owned", o)) }
    }
}
