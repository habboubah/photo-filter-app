import Foundation
import StoreKit
import UIKit
import Capacitor

/// The iPhone's side of src/native/purchases.ts: StoreKit 2, one
/// non-consumable product (the unlock). No purchase server and no SDK: StoreKit
/// verifies the transaction on the device, and `Transaction.currentEntitlements`
/// says what is owned — Family Sharing and refunds included.
@objc(PurchasesPlugin)
public class PurchasesPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PurchasesPlugin"
    public let jsName = "Purchases"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProduct", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isOwned", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
    ]

    private var updates: Task<Void, Never>?

    override public func load() {
        // Purchases that finish outside a purchase() call: an approved "Ask to Buy", a purchase on another device, a refund.
        updates = Task.detached { [weak self] in
            for await result in Transaction.updates {
                guard case .verified(let transaction) = result else { continue }
                await transaction.finish()
                let owned = transaction.revocationDate == nil
                await MainActor.run { self?.notifyListeners("ownedChanged", data: ["owned": owned]) }
            }
        }
    }

    deinit { updates?.cancel() }

    @objc func getProduct(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else { call.reject("No product id"); return }
        Task {
            if let product = try? await Product.products(for: [id]).first {
                call.resolve(["product": ["id": product.id, "price": product.displayPrice]])
            } else {
                call.resolve(["product": NSNull()])
            }
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else { call.reject("No product id"); return }
        Task { @MainActor in
            do {
                guard let product = try await Product.products(for: [id]).first else { call.resolve(["state": "failed"]); return }
                let result: Product.PurchaseResult
                if #available(iOS 17.0, *), let scene = self.bridge?.viewController?.view.window?.windowScene {
                    result = try await product.purchase(confirmIn: scene)
                } else {
                    result = try await product.purchase()
                }
                switch result {
                case .success(let verification):
                    if case .verified(let transaction) = verification {
                        await transaction.finish()
                        call.resolve(["state": "purchased"])
                    } else {
                        call.resolve(["state": "failed"])
                    }
                case .pending:
                    call.resolve(["state": "pending"])
                case .userCancelled:
                    call.resolve(["state": "cancelled"])
                @unknown default:
                    call.resolve(["state": "failed"])
                }
            } catch {
                call.resolve(["state": "failed"])
            }
        }
    }

    private func owned(_ id: String) async -> Bool {
        for await result in Transaction.currentEntitlements {
            if case .verified(let t) = result, t.productID == id, t.revocationDate == nil { return true }
        }
        return false
    }

    @objc func isOwned(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else { call.reject("No product id"); return }
        Task { call.resolve(["owned": await owned(id)]) }
    }

    /// AppStore.sync asks the App Store again (it may ask for the Apple Account password) — Apple's "Restore Purchases".
    @objc func restore(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else { call.reject("No product id"); return }
        Task {
            do { try await AppStore.sync() } catch { /* cancelled, or offline: still answer with what is known */ }
            call.resolve(["owned": await owned(id)])
        }
    }
}
