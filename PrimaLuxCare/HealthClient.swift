import Foundation
import HealthKit

@MainActor
final class HealthClient: ObservableObject {
    @Published var steps: String = "—"
    @Published var heart: String = "—"
    @Published var sleep: String = "—"
    @Published var pressure: String = "—"
    @Published var message = "Apple Health stays on this iPhone. Nothing is shared until you allow it."
    @Published var allowed = false

    private let store = HKHealthStore()

    func allow() async {
        guard HKHealthStore.isHealthDataAvailable() else {
            message = "Apple Health is not available here."
            return
        }
        guard let steps = HKQuantityType.quantityType(forIdentifier: .stepCount),
              let heart = HKQuantityType.quantityType(forIdentifier: .heartRate),
              let sleep = HKCategoryType.categoryType(forIdentifier: .sleepAnalysis),
              let systolic = HKQuantityType.quantityType(forIdentifier: .bloodPressureSystolic),
              let diastolic = HKQuantityType.quantityType(forIdentifier: .bloodPressureDiastolic) else {
            message = "Those readings are not available."
            return
        }
        do {
            try await store.requestAuthorization(toShare: [], read: [steps, heart, sleep, systolic, diastolic])
            allowed = true
            message = "Allowed on this iPhone. Readings stay here."
            await refresh()
        } catch {
            message = "Apple Health could not be opened."
        }
    }

    func refresh() async {
        guard HKHealthStore.isHealthDataAvailable() else { return }
        await readSteps()
        await readLatest(identifier: .heartRate, unit: HKUnit.count().unitDivided(by: .minute()), into: \.heart, suffix: " bpm")
        await readPressure()
        await readSleep()
    }

    private func readSteps() async {
        guard let type = HKQuantityType.quantityType(forIdentifier: .stepCount) else { return }
        let start = Calendar.current.startOfDay(for: .now)
        let predicate = HKQuery.predicateForSamples(withStart: start, end: .now)
        let value: Double? = await withCheckedContinuation { continuation in
            let query = HKStatisticsQuery(quantityType: type, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, stats, _ in
                continuation.resume(returning: stats?.sumQuantity()?.doubleValue(for: .count()))
            }
            store.execute(query)
        }
        if let value {
            steps = "\(Int(value))"
        }
    }

    private func readLatest(identifier: HKQuantityTypeIdentifier, unit: HKUnit, into key: ReferenceWritableKeyPath<HealthClient, String>, suffix: String) async {
        guard let type = HKQuantityType.quantityType(forIdentifier: identifier) else { return }
        let value: Double? = await withCheckedContinuation { continuation in
            let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
            let query = HKSampleQuery(sampleType: type, predicate: nil, limit: 1, sortDescriptors: [sort]) { _, samples, _ in
                let sample = samples?.first as? HKQuantitySample
                continuation.resume(returning: sample?.quantity.doubleValue(for: unit))
            }
            store.execute(query)
        }
        if let value {
            self[keyPath: key] = "\(Int(value.rounded()))\(suffix)"
        }
    }

    private func readPressure() async {
        guard let systolic = HKQuantityType.quantityType(forIdentifier: .bloodPressureSystolic),
              let diastolic = HKQuantityType.quantityType(forIdentifier: .bloodPressureDiastolic) else { return }
        let unit = HKUnit.millimeterOfMercury()
        async let sys = latest(systolic, unit)
        async let dia = latest(diastolic, unit)
        let pair = await (sys, dia)
        if let sys = pair.0, let dia = pair.1 {
            pressure = "\(Int(sys.rounded()))/\(Int(dia.rounded()))"
        }
    }

    private func latest(_ type: HKQuantityType, _ unit: HKUnit) async -> Double? {
        await withCheckedContinuation { continuation in
            let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
            let query = HKSampleQuery(sampleType: type, predicate: nil, limit: 1, sortDescriptors: [sort]) { _, samples, _ in
                let sample = samples?.first as? HKQuantitySample
                continuation.resume(returning: sample?.quantity.doubleValue(for: unit))
            }
            store.execute(query)
        }
    }

    private func readSleep() async {
        guard let type = HKCategoryType.categoryType(forIdentifier: .sleepAnalysis) else { return }
        let start = Calendar.current.date(byAdding: .day, value: -1, to: .now) ?? .now
        let predicate = HKQuery.predicateForSamples(withStart: start, end: .now)
        let minutes: Int = await withCheckedContinuation { continuation in
            let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, _ in
                let asleep: Set<Int> = [
                    HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue,
                    HKCategoryValueSleepAnalysis.asleepCore.rawValue,
                    HKCategoryValueSleepAnalysis.asleepDeep.rawValue,
                    HKCategoryValueSleepAnalysis.asleepREM.rawValue,
                ]
                let total = (samples as? [HKCategorySample] ?? []).reduce(0.0) { partial, sample in
                    guard asleep.contains(sample.value) else { return partial }
                    return partial + sample.endDate.timeIntervalSince(sample.startDate)
                }
                continuation.resume(returning: Int(total / 60))
            }
            store.execute(query)
        }
        if minutes > 0 {
            sleep = "\(minutes / 60)h \(minutes % 60)m"
        }
    }
}
