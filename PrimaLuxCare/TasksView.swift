import SwiftUI
import SwiftData

struct TasksView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.colorScheme) private var scheme
    @Query(sort: \Errand.updatedAt) private var errands: [Errand]
    @AppStorage("parentMode") private var parentMode = false
    @State private var adding = false
    @State private var editing: Errand?

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
                                taskRow(item, palette: palette, last: item.uid == openItems.last?.uid, canEdit: canEdit)
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
                                doneRow(item, palette: palette, last: item.uid == doneItems.last?.uid, canEdit: canEdit)
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
            .sheet(isPresented: $adding) { TaskEditor(errand: nil) }
            .sheet(item: $editing) { item in TaskEditor(errand: item) }
        }
    }

    private func taskRow(_ item: Errand, palette: Palette, last: Bool, canEdit: Bool) -> some View {
        HStack(spacing: 12) {
            Button {
                guard canEdit else { return }
                editing = item
            } label: {
                VStack(alignment: .leading, spacing: 2) {
                    Text(item.title).font(.headline).foregroundStyle(palette.ink)
                    Text(meta(item)).font(.caption).foregroundStyle(palette.muted)
                    if !item.notes.isEmpty {
                        Text(item.notes).font(.subheadline).foregroundStyle(palette.muted)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .buttonStyle(.plain)
            .accessibilityLabel(canEdit ? "Edit \(item.title)" : item.title)
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

    private func doneRow(_ item: Errand, palette: Palette, last: Bool, canEdit: Bool) -> some View {
        HStack(spacing: 12) {
            DoseMark(done: true) {}
                .accessibilityLabel("Done")
                .disabled(true)
            Button {
                guard canEdit else { return }
                editing = item
            } label: {
                VStack(alignment: .leading, spacing: 2) {
                    Text(item.title).font(.headline).foregroundStyle(palette.ink)
                    Text(doneMeta(item)).font(.caption).foregroundStyle(palette.muted)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .buttonStyle(.plain)
            .accessibilityLabel(canEdit ? "Edit \(item.title)" : item.title)
            if canEdit {
                Button("Reopen") {
                    item.isDone = false
                    item.completedAt = nil
                    item.updatedAt = .now
                    try? context.save()
                }
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(palette.sage)
            }
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
    var errand: Errand?
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var context
    @Environment(\.colorScheme) private var scheme
    @State private var title = ""
    @State private var notes = ""
    @State private var assignee = "You"
    @State private var hasDue = false
    @State private var due = Date()
    @State private var loaded = false

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
                MetalButton(title: "Save") { save() }
                    .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty)
                MetalButton(title: "Close", filled: false) { dismiss() }
            }
            .navigationTitle(errand == nil ? "New task" : "Edit task")
            .navigationBarTitleDisplayMode(.inline)
        }
        .presentationDetents([.large])
        .tint(palette.sage)
        .onAppear {
            guard !loaded else { return }
            loaded = true
            guard let errand else { return }
            title = errand.title
            notes = errand.notes
            assignee = errand.assignee.isEmpty ? "You" : errand.assignee
            if let dueOn = errand.dueOn {
                hasDue = true
                due = dueOn
            }
        }
    }

    private func save() {
        let cleanedTitle = title.trimmingCharacters(in: .whitespaces)
        guard !cleanedTitle.isEmpty else { return }
        let cleanedNotes = notes.trimmingCharacters(in: .whitespaces)
        let cleanedAssignee = assignee.trimmingCharacters(in: .whitespaces)
        let dueOn = hasDue ? due : nil
        let saved: Errand
        if let errand {
            errand.title = cleanedTitle
            errand.notes = cleanedNotes
            errand.assignee = cleanedAssignee
            errand.dueOn = dueOn
            errand.updatedAt = .now
            saved = errand
        } else {
            let created = Errand(title: cleanedTitle, notes: cleanedNotes, assignee: cleanedAssignee, dueOn: dueOn)
            context.insert(created)
            saved = created
        }
        AuditLog.record(context, action: "task.save", resource: saved.uid.uuidString)
        try? context.save()
        CareReminders.schedule(errand: saved)
        dismiss()
    }
}
