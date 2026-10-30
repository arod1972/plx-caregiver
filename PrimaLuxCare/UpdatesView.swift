import SwiftUI
import SwiftData

struct UpdatesView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.colorScheme) private var scheme
    @Query(sort: \CircleNote.sentAt) private var notes: [CircleNote]
    @AppStorage("parentMode") private var parentMode = false
    @AppStorage("deviceName") private var deviceName = "You"
    @State private var draft = ""

    var body: some View {
        let palette = Palette.current(scheme)
        NavigationStack {
            CareScreen {
                Text(parentMode ? "A note for the family." : "A short note for the people in this circle.")
                    .font(.subheadline)
                    .foregroundStyle(palette.muted)
                MetalCard(padding: 16) {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("UPDATE")
                            .font(.caption.weight(.semibold))
                            .tracking(1.6)
                            .foregroundStyle(palette.metal)
                        TextField("What should the circle know?", text: $draft, axis: .vertical)
                            .lineLimit(3...6)
                            .font(.body)
                        MetalButton(title: "Post") {
                            let body = draft.trimmingCharacters(in: .whitespacesAndNewlines)
                            guard !body.isEmpty else { return }
                            context.insert(CircleNote(author: deviceName.isEmpty ? "You" : deviceName, body: body))
                            draft = ""
                        }
                        .disabled(draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    }
                }
                if notes.isEmpty {
                    EmptyCare(title: "No notes yet", bodyText: "The first update will show up here.")
                } else {
                    MetalCard {
                        VStack(spacing: 0) {
                            ForEach(notes) { note in
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("\(note.author) · \(note.sentAt.formatted(.dateTime.month(.abbreviated).day().hour().minute()))")
                                        .font(.caption)
                                        .foregroundStyle(palette.muted)
                                    Text(note.body)
                                        .font(.body)
                                        .foregroundStyle(palette.ink)
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 14)
                                .overlay(alignment: .bottom) {
                                    if note.uid != notes.last?.uid {
                                        Rectangle().fill(palette.line).frame(height: 1)
                                    }
                                }
                            }
                        }
                    }
                }
                if parentMode {
                    MetalButton(title: "Read aloud", filled: false) {
                        let text = notes.map { "\($0.author) said \($0.body)" }.joined(separator: ". ")
                        Speaker.say(text.isEmpty ? "There are no updates yet." : text)
                    }
                }
            }
            .navigationTitle("Updates")
            .navigationBarTitleDisplayMode(.large)
        }
    }
}
