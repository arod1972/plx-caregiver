import CoreImage.CIFilterBuiltins
import CryptoKit
import Foundation
import SwiftData
import UIKit

struct CareInvite: Codable {
    var circleID: UUID
    var circleName: String
    var role: String
    var token: UUID
    var hostPublicKey: String
    var circleKey: String
}

struct CarePackage: Codable {
    var author: String
    var sealed: String
    var signature: String
}

private struct PackageBody: Codable {
    var events: [EventDTO]
    var doses: [DoseDTO]
    var errands: [ErrandDTO]
    var notes: [NoteDTO]
    var grants: [GrantDTO]
    var members: [MemberDTO]
    var circleName: String
    var circleID: UUID
}

private struct EventDTO: Codable {
    var uid: UUID
    var title: String
    var kind: String
    var startsAt: Date
    var repeatRule: String
    var notes: String
    var updatedAt: Date
}

private struct DoseDTO: Codable {
    var uid: UUID
    var name: String
    var dosage: String
    var timeMinutes: Int
    var refillOn: Date?
    var takenLog: [Date]
    var updatedAt: Date
    var instructions: String?
    var rxNumber: String?
    var quantity: String?
    var refills: String?
    var pharmacy: String?
}

private struct ErrandDTO: Codable {
    var uid: UUID
    var title: String
    var notes: String
    var assignee: String
    var dueOn: Date?
    var isDone: Bool
    var completedAt: Date?
    var updatedAt: Date
}

private struct NoteDTO: Codable {
    var uid: UUID
    var author: String
    var body: String
    var sentAt: Date
    var updatedAt: Date
}

private struct GrantDTO: Codable {
    var role: String
    var area: String
    var access: String
}

private struct MemberDTO: Codable {
    var uid: UUID
    var name: String
    var role: String
    var publicKey: String
    var isThisPhone: Bool
}

enum CircleSync {
    private static let encoder: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.sortedKeys]
        return encoder
    }()

    private static let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }()

    @MainActor
    static func invite(role: String, context: ModelContext) throws -> String {
        let circle = try oneCircle(context)
        let me = try thisPhone(context)
        let raw = Vault.circleKey().withUnsafeBytes { Data($0) }
        let invite = CareInvite(
            circleID: circle.uid,
            circleName: circle.name,
            role: role,
            token: UUID(),
            hostPublicKey: me.publicKey.base64EncodedString(),
            circleKey: raw.base64EncodedString()
        )
        context.insert(Member(name: "Invited \(role)", role: role, publicKey: Data(), isThisPhone: false))
        AuditLog.record(context, action: "invite.create", resource: role)
        try context.save()
        return String(decoding: try encoder.encode(invite), as: UTF8.self)
    }

    @MainActor
    static func join(json: String, context: ModelContext) throws {
        guard let data = json.data(using: .utf8), let invite = try? decoder.decode(CareInvite.self, from: data) else {
            throw CircleError.message("That invite could not be read.")
        }
        guard let keyData = Data(base64Encoded: invite.circleKey), keyData.count == 32 else {
            throw CircleError.message("That invite is missing the circle key.")
        }
        guard let hostKey = Data(base64Encoded: invite.hostPublicKey) else {
            throw CircleError.message("That invite is missing the host key.")
        }
        let circles = (try? context.fetch(FetchDescriptor<CareCircle>())) ?? []
        if let current = circles.first, current.uid == invite.circleID {
            throw CircleError.message("That invite is from this phone.")
        }
        Vault.replaceCircleKey(keyData)
        if let current = circles.first {
            current.uid = invite.circleID
            current.name = invite.circleName
        } else {
            let created = CareCircle(name: invite.circleName)
            created.uid = invite.circleID
            context.insert(created)
        }
        let me = try thisPhone(context)
        me.role = invite.role
        if !((try? context.fetch(FetchDescriptor<Member>())) ?? []).contains(where: { $0.publicKey == hostKey }) {
            context.insert(Member(name: "Host", role: "parent", publicKey: hostKey, isThisPhone: false))
        }
        AuditLog.record(context, action: "invite.join", resource: invite.role)
        try context.save()
    }

    @MainActor
    static func exportPackage(context: ModelContext) throws -> String {
        let circle = try oneCircle(context)
        let events = (try? context.fetch(FetchDescriptor<CareEvent>())) ?? []
        let doses = (try? context.fetch(FetchDescriptor<Dose>())) ?? []
        let errands = (try? context.fetch(FetchDescriptor<Errand>())) ?? []
        let notes = (try? context.fetch(FetchDescriptor<CircleNote>())) ?? []
        let grants = (try? context.fetch(FetchDescriptor<Grant>())) ?? []
        let members = (try? context.fetch(FetchDescriptor<Member>())) ?? []
        let body = PackageBody(
            events: events.map { EventDTO(uid: $0.uid, title: $0.title, kind: $0.kind, startsAt: $0.startsAt, repeatRule: $0.repeatRule, notes: $0.notes, updatedAt: $0.updatedAt) },
            doses: doses.map { DoseDTO(uid: $0.uid, name: $0.name, dosage: $0.dosage, timeMinutes: $0.timeMinutes, refillOn: $0.refillOn, takenLog: $0.takenLog, updatedAt: $0.updatedAt, instructions: $0.instructions, rxNumber: $0.rxNumber, quantity: $0.quantityText, refills: $0.refillsText, pharmacy: $0.pharmacy) },
            errands: errands.map { ErrandDTO(uid: $0.uid, title: $0.title, notes: $0.notes, assignee: $0.assignee, dueOn: $0.dueOn, isDone: $0.isDone, completedAt: $0.completedAt, updatedAt: $0.updatedAt) },
            notes: notes.map { NoteDTO(uid: $0.uid, author: $0.author, body: $0.body, sentAt: $0.sentAt, updatedAt: $0.updatedAt) },
            grants: grants.map { GrantDTO(role: $0.role, area: $0.area, access: $0.access) },
            members: members.map { MemberDTO(uid: $0.uid, name: $0.name, role: $0.role, publicKey: $0.publicKey.base64EncodedString(), isThisPhone: false) },
            circleName: circle.name,
            circleID: circle.uid
        )
        let plain = try encoder.encode(body)
        let sealed = try AES.GCM.seal(plain, using: Vault.circleKey()).combined ?? Data()
        let signature = try Vault.signingKey().signature(for: sealed)
        let me = try thisPhone(context)
        let package = CarePackage(
            author: me.publicKey.base64EncodedString(),
            sealed: sealed.base64EncodedString(),
            signature: signature.rawRepresentation.base64EncodedString()
        )
        AuditLog.record(context, action: "package.export", resource: "circle")
        try context.save()
        return String(decoding: try encoder.encode(package), as: UTF8.self)
    }

    @MainActor
    static func applyPackage(json: String, context: ModelContext) throws {
        guard let data = json.data(using: .utf8), let package = try? decoder.decode(CarePackage.self, from: data) else {
            throw CircleError.message("That update could not be read.")
        }
        guard let author = Data(base64Encoded: package.author),
              let sealed = Data(base64Encoded: package.sealed),
              let signatureRaw = Data(base64Encoded: package.signature) else {
            throw CircleError.message("That update is incomplete.")
        }
        let members = (try? context.fetch(FetchDescriptor<Member>())) ?? []
        guard members.contains(where: { $0.publicKey == author }) || author == Vault.signingKey().publicKey.x963Representation else {
            throw CircleError.message("That update is not from a paired phone.")
        }
        let publicKey = try P256.Signing.PublicKey(x963Representation: author)
        let signature = try P256.Signing.ECDSASignature(rawRepresentation: signatureRaw)
        guard publicKey.isValidSignature(signature, for: sealed) else {
            throw CircleError.message("That update signature does not match.")
        }
        let box = try AES.GCM.SealedBox(combined: sealed)
        let plain = try AES.GCM.open(box, using: Vault.circleKey())
        let body = try decoder.decode(PackageBody.self, from: plain)
        merge(body, context: context)
        AuditLog.record(context, action: "package.apply", resource: "circle")
        try context.save()
    }

    @MainActor
    private static func merge(_ body: PackageBody, context: ModelContext) {
        if let circle = (try? context.fetch(FetchDescriptor<CareCircle>()))?.first {
            circle.name = body.circleName
        }
        let events = (try? context.fetch(FetchDescriptor<CareEvent>())) ?? []
        for item in body.events {
            if let found = events.first(where: { $0.uid == item.uid }) {
                guard item.updatedAt >= found.updatedAt else { continue }
                found.title = item.title
                found.kind = item.kind
                found.startsAt = item.startsAt
                found.repeatRule = item.repeatRule
                found.notes = item.notes
                found.updatedAt = item.updatedAt
            } else {
                let created = CareEvent(title: item.title, kind: item.kind, startsAt: item.startsAt, repeatRule: item.repeatRule, notes: item.notes)
                created.uid = item.uid
                created.updatedAt = item.updatedAt
                context.insert(created)
            }
        }
        let doses = (try? context.fetch(FetchDescriptor<Dose>())) ?? []
        for item in body.doses {
            if let found = doses.first(where: { $0.uid == item.uid }) {
                guard item.updatedAt >= found.updatedAt else { continue }
                found.name = item.name
                found.dosage = item.dosage
                found.timeMinutes = item.timeMinutes
                found.refillOn = item.refillOn
                found.takenLog = item.takenLog
                found.instructions = item.instructions ?? found.instructions
                found.rxNumber = item.rxNumber ?? found.rxNumber
                found.quantityText = item.quantity ?? found.quantityText
                found.refillsText = item.refills ?? found.refillsText
                found.pharmacy = item.pharmacy ?? found.pharmacy
                found.updatedAt = item.updatedAt
            } else {
                let created = Dose(
                    name: item.name,
                    dosage: item.dosage,
                    timeMinutes: item.timeMinutes,
                    refillOn: item.refillOn,
                    instructions: item.instructions ?? "",
                    rxNumber: item.rxNumber ?? "",
                    quantity: item.quantity ?? "",
                    refills: item.refills ?? "",
                    pharmacy: item.pharmacy ?? ""
                )
                created.uid = item.uid
                created.takenLog = item.takenLog
                created.updatedAt = item.updatedAt
                context.insert(created)
            }
        }
        let errands = (try? context.fetch(FetchDescriptor<Errand>())) ?? []
        for item in body.errands {
            if let found = errands.first(where: { $0.uid == item.uid }) {
                guard item.updatedAt >= found.updatedAt else { continue }
                found.title = item.title
                found.notes = item.notes
                found.assignee = item.assignee
                found.dueOn = item.dueOn
                found.isDone = item.isDone
                found.completedAt = item.completedAt
                found.updatedAt = item.updatedAt
            } else {
                let created = Errand(title: item.title, notes: item.notes, assignee: item.assignee, dueOn: item.dueOn)
                created.uid = item.uid
                created.isDone = item.isDone
                created.completedAt = item.completedAt
                created.updatedAt = item.updatedAt
                context.insert(created)
            }
        }
        let notes = (try? context.fetch(FetchDescriptor<CircleNote>())) ?? []
        for item in body.notes {
            if notes.contains(where: { $0.uid == item.uid }) { continue }
            let created = CircleNote(author: item.author, body: item.body, sentAt: item.sentAt)
            created.uid = item.uid
            created.updatedAt = item.updatedAt
            context.insert(created)
        }
        let grants = (try? context.fetch(FetchDescriptor<Grant>())) ?? []
        for item in body.grants {
            if let found = grants.first(where: { $0.role == item.role && $0.area == item.area }) {
                found.access = item.access
            } else {
                context.insert(Grant(role: item.role, area: item.area, access: item.access))
            }
        }
        let members = (try? context.fetch(FetchDescriptor<Member>())) ?? []
        for item in body.members {
            guard let key = Data(base64Encoded: item.publicKey), !key.isEmpty else { continue }
            if members.contains(where: { $0.publicKey == key || $0.uid == item.uid }) { continue }
            if key == Vault.signingKey().publicKey.x963Representation { continue }
            context.insert(Member(name: item.name, role: item.role, publicKey: key, isThisPhone: false))
        }
    }

    @MainActor
    private static func oneCircle(_ context: ModelContext) throws -> CareCircle {
        if let circle = (try? context.fetch(FetchDescriptor<CareCircle>()))?.first { return circle }
        throw CircleError.message("The circle is not on this phone yet.")
    }

    @MainActor
    private static func thisPhone(_ context: ModelContext) throws -> Member {
        if let me = ((try? context.fetch(FetchDescriptor<Member>())) ?? []).first(where: \.isThisPhone) { return me }
        throw CircleError.message("This phone has no identity yet.")
    }
}

enum CircleError: LocalizedError {
    case message(String)
    var errorDescription: String? {
        switch self {
        case .message(let text): return text
        }
    }
}

enum QRCode {
    static func image(for text: String) -> UIImage? {
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(text.utf8)
        filter.correctionLevel = "M"
        guard let output = filter.outputImage else { return nil }
        let scaled = output.transformed(by: CGAffineTransform(scaleX: 8, y: 8))
        guard let cg = CIContext().createCGImage(scaled, from: scaled.extent) else { return nil }
        return UIImage(cgImage: cg)
    }
}
