import SwiftUI
import SwiftData

struct TasksView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.colorScheme) private var scheme
    @Query(sort: \Errand.updatedAt) private var errands: [Errand]
    @AppStorage("parentMode") private var parentMode = false
    @State private var adding = false

    private var openItems: [Errand] { errands.filter { !$0.isDone } }
    private var doneItems: [Errand] { errands.filter(\.isDone) }

    var body: some View {
        let palette = Palette.current(scheme)
        let canEdit = CareAccess.allows("tasks", edit: true, context: context)
        let canView = CareAccess.allows("tasks", edit: false, context: context)
        NavigationStack {
            CareScreen {
                Text(parentMode ? "What needs doing." : "Errands, rides, and follow-ups.")
                    .font(.subheadline)
                    .foregroundStyle(palette.muted)
                if !canView {
                    EmptyCare(title: "Not shared", bodyText: "Tasks are not on this phone for your role.")
                } else if openItems.isEmpty {
                    EmptyCare(title: "Nothing to do", bodyText: "Errands and follow-ups will appear here.")
                } else {
                    MetalCard {
                        VStack(spacing: 0) {
                            ForEach(openItems) { item in
                                taskRow(item, palette: palette, last: item.uid == openItems.last?.uid)
                            }
                        }
                    }
                }
                if canView && !doneItems.isEmpty {
                    Text("DONE")
                        .font(.caption.weight(.semibold))
                        .tracking(1.6)
                        .foregroundStyle(palette.metal)
                    MetalCard {
                        VStack(spacing: 0) {
                            ForEach(doneItems) { item in
                                doneRow(item, palette: palette, last: item.uid == doneItems.last?.uid)
                            }
                        }
                    }
                }
                if parentMode {
                    MetalButton(title: "Read aloud", filled: false) {
                        let text = errands.map { $0.isDone ? "\($0.title), done." : $0.title }.joined(separator: ". ")
                        Speaker.say(text.isEmpty ? "There are no tasks." : text)
                    }
                }
            }
            .navigationTitle("Tasks")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                if canEdit {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { adding = true } label: {
                        Image(systemName: "plus")
                            .font(.body.weight(.semibold))
                            .foregroundStyle(palette.onSage)
                            .frame(width: 36, height: 36)
                            .background(palette.sage)
                            .clipShape(Circle())
                            .overlay { Circle().strokeBorder(palette.metalLight.opacity(0.8), lineWidth: 1) }
                    }
                    .accessibilityLabel("Add a task")
                }
                }
            }
            .sheet(isPresented: $adding) { TaskEditor() }
        }
    }

    private func taskRow(_ item: Errand, palette: Palette, last: Bool) -> some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(item.title).font(.headline).foregroundStyle(palette.ink)
                Text(meta(item)).font(.caption).foregroundStyle(palette.muted)
                if !item.notes.isEmpty {
                    Text(item.notes).font(.subheadline).foregroundStyle(palette.muted)
                }
            }
            Spacer(minLength: 0)
            DoseMark(done: false) {
                guard CareAccess.allows("tasks", edit: true, context: context) || item.assignee == "You" else { return }
                item.isDone = true
                item.completedAt = .now
                item.updatedAt = .now
                AuditLog.record(context, action: "task.done", resource: item.uid.uuidString)
                try? context.save()
            }
            .accessibilityLabel("Mark \(item.title) done")
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .overlay(alignment: .bottom) {
            if !last { Rectangle().fill(palette.line).frame(height: 1).padding(.leading, 16) }
        }
    }

    private func doneRow(_ item: Errand, palette: Palette, last: Bool) -> some View {
        HStack(spacing: 12) {
            DoseMark(done: true) {}
                .accessibilityLabel("Done")
                .disabled(true)
            VStack(alignment: .leading, spacing: 2) {
                Text(item.title).font(.headline).foregroundStyle(palette.ink)
                Text(doneMeta(item)).font(.caption).foregroundStyle(palette.muted)
                Button("Reopen") {
                    item.isDone = false
                    item.completedAt = nil
                }
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(palette.sage)
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .overlay(alignment: .bottom) {
            if !last { Rectangle().fill(palette.line).frame(height: 1).padding(.leading, 16) }
        }
    }

    private func meta(_ item: Errand) -> String {
        var parts = [item.assignee.isEmpty ? "Open" : item.assignee]
        if let dueOn = item.dueOn {
            parts.append("Due \(dueOn.formatted(.dateTime.month(.wide).day()))")
        }
        return parts.joined(separator: " · ")
    }

    private func doneMeta(_ item: Errand) -> String {
        let when = item.completedAt?.formatted(.dateTime.month(.wide).day()) ?? "Done"
        if item.assignee.isEmpty { return "Done \(when)" }
        return "Done \(when) · \(item.assignee)"
    }
}

struct TaskEditor: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var context
    @Environment(\.colorScheme) private var scheme
    @State private var title = ""
    @State private var notes = ""
    @State private var assignee = "You"
    @State private var hasDue = false
    @State private var due = Date()

    var body: some View {
        let palette = Palette.current(scheme)
        NavigationStack {
            CareScreen {
                CareField(label: "Title", text: $title, prompt: "Pick up the prescription")
                CareField(label: "Notes", text: $notes, prompt: "Optional")
                CareField(label: "Assign to", text: $assignee, prompt: "You")
                Toggle("Due date", isOn: $hasDue)
                if hasDue {
                    DatePicker("Due", selection: $due, displayedComponents: .date)
                }
                MetalButton(title: "Save") {
                    let created = Errand(
                        title: title.trimmingCharacters(in: .whitespaces),
                        notes: notes.trimmingCharacters(in: .whitespaces),
                        assignee: assignee.trimmingCharacters(in: .whitespaces),
                        dueOn: hasDue ? due : nil
                    )
                    context.insert(created)
                    AuditLog.record(context, action: "task.save", resource: created.uid.uuidString)
                    try? context.save()
                    CareReminders.schedule(errand: created)
                    dismiss()
                }
                .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty)
                MetalButton(title: "Close", filled: false) { dismiss() }
            }
            .navigationTitle("New task")
            .navigationBarTitleDisplayMode(.inline)
        }
        .presentationDetents([.large])
        .tint(palette.sage)
    }
}
