import Foundation

struct Proposal: Identifiable {
    let id: Int
    let title: String
    let description: String
    let creator: String
    let options: [String]
    let votesCount: [Int]
    let deadline: Date
    let isActive: Bool
    let createdAt: Date

    var totalVotes: Int {
        votesCount.reduce(0, +)
    }

    var winningOptionIndex: Int? {
        guard let maxVotes = votesCount.max(),
              let index = votesCount.firstIndex(of: maxVotes) else {
            return nil
        }
        return index
    }

    var timeRemaining: String {
        let now = Date()
        let components = Calendar.current.dateComponents([.day, .hour], from: now, to: deadline)

        if let days = components.day, days > 0 {
            return "\(days)d remaining"
        } else if let hours = components.hour, hours > 0 {
            return "\(hours)h remaining"
        } else {
            return "Ended"
        }
    }
}

// Mock data
extension Proposal {
    static let mockProposals: [Proposal] = [
        Proposal(
            id: 0,
            title: "Głosowanie 1",
            description: "Zagłosuj",
            creator: "0xf39F...2266",
            options: ["Niebieski", "Zielony", "Czerwony"],
            votesCount: [45, 32, 18],
            deadline: Date().addingTimeInterval(86400 * 5),
            isActive: true,
            createdAt: Date().addingTimeInterval(-86400 * 2)
        ),
        Proposal(
            id: 1,
            title: "Głosowanie 2",
            description: "zagłosuj",
            creator: "0x7099...dc79",
            options: ["60%", "50%", "70%"],
            votesCount: [28, 41, 15],
            deadline: Date().addingTimeInterval(86400 * 3),
            isActive: true,
            createdAt: Date().addingTimeInterval(-86400)
        ),
    ]
}
