import CryptoKit
import Foundation
import Security

enum Vault {
    private static let service = "com.primalux.caregiver"
    private static let account = "vault-key"

    static func seal(_ text: String) -> Data {
        let key = symmetricKey()
        guard let sealed = try? AES.GCM.seal(Data(text.utf8), using: key), let combined = sealed.combined else {
            return Data()
        }
        return combined
    }

    static func open(_ data: Data) -> String {
        guard !data.isEmpty, let box = try? AES.GCM.SealedBox(combined: data), let clear = try? AES.GCM.open(box, using: symmetricKey()) else {
            return ""
        }
        return String(decoding: clear, as: UTF8.self)
    }

    static func symmetricKey() -> SymmetricKey {
        if let stored = keychainRead(account) {
            return SymmetricKey(data: stored)
        }
        let key = SymmetricKey(size: .bits256)
        let raw = key.withUnsafeBytes { Data($0) }
        keychainWrite(account, raw)
        return key
    }

    static func circleKey() -> SymmetricKey {
        if let stored = keychainRead("circle-key") {
            return SymmetricKey(data: stored)
        }
        let key = SymmetricKey(size: .bits256)
        let raw = key.withUnsafeBytes { Data($0) }
        keychainWrite("circle-key", raw)
        return key
    }

    static func replaceCircleKey(_ raw: Data) {
        keychainWrite("circle-key", raw)
    }

    static func signingKey() -> P256.Signing.PrivateKey {
        if let stored = keychainRead("device-signing"), let key = try? P256.Signing.PrivateKey(rawRepresentation: stored) {
            return key
        }
        let key = P256.Signing.PrivateKey()
        keychainWrite("device-signing", key.rawRepresentation)
        return key
    }

    static func keychainRead(_ account: String) -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
        ]
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess else { return nil }
        return item as? Data
    }

    static func keychainWrite(_ account: String, _ data: Data) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        SecItemDelete(query as CFDictionary)
        var add = query
        add[kSecValueData as String] = data
        add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        SecItemAdd(add as CFDictionary, nil)
    }
}
