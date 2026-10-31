import CryptoKit
import Foundation
import Security

enum Vault {
    private static let service = "com.primalux.caregiver"
    private static let account = "vault-key"

    private static let gate = NSLock()
    private static var storedKey: SymmetricKey?
    private static var storedCircle: SymmetricKey?
    private static var opened: [Data: String] = [:]

    static func seal(_ text: String) -> Data {
        let key = symmetricKey()
        guard let sealed = try? AES.GCM.seal(Data(text.utf8), using: key), let combined = sealed.combined else {
            return Data()
        }
        return combined
    }

    static func open(_ data: Data) -> String {
        gate.lock()
        if let hit = opened[data] {
            gate.unlock()
            return hit
        }
        gate.unlock()
        guard !data.isEmpty, let box = try? AES.GCM.SealedBox(combined: data), let clear = try? AES.GCM.open(box, using: symmetricKey()) else {
            return ""
        }
        let text = String(decoding: clear, as: UTF8.self)
        gate.lock()
        opened[data] = text
        gate.unlock()
        return text
    }

    static func symmetricKey() -> SymmetricKey {
        gate.lock()
        defer { gate.unlock() }
        if let storedKey { return storedKey }
        if let stored = keychainRead(account) {
            let key = SymmetricKey(data: stored)
            storedKey = key
            return key
        }
        let key = SymmetricKey(size: .bits256)
        let raw = key.withUnsafeBytes { Data($0) }
        keychainWrite(account, raw)
        storedKey = key
        return key
    }

    static func circleKey() -> SymmetricKey {
        gate.lock()
        defer { gate.unlock() }
        if let storedCircle { return storedCircle }
        if let stored = keychainRead("circle-key") {
            let key = SymmetricKey(data: stored)
            storedCircle = key
            return key
        }
        let key = SymmetricKey(size: .bits256)
        let raw = key.withUnsafeBytes { Data($0) }
        keychainWrite("circle-key", raw)
        storedCircle = key
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
