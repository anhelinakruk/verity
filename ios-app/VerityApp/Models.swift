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
            title: "Logo Color Selection",
            description: "Vote for the new organization logo color. This will be used across all our branding materials.",
            creator: "0xf39F...2266",
            options: ["Blue", "Green", "Red"],
            votesCount: [45, 32, 18],
            deadline: Date().addingTimeInterval(86400 * 5),
            isActive: true,
            createdAt: Date().addingTimeInterval(-86400 * 2)
        ),
        Proposal(
            id: 1,
            title: "Budget Allocation 2025",
            description: "Decide how to allocate the treasury funds for the upcoming year.",
            creator: "0x7099...dc79",
            options: ["Development 60%", "Marketing 60%", "Operations 60%"],
            votesCount: [28, 41, 15],
            deadline: Date().addingTimeInterval(86400 * 3),
            isActive: true,
            createdAt: Date().addingTimeInterval(-86400)
        ),
        Proposal(
            id: 2,
            title: "Community Event Location",
            description: "Choose the venue for our annual community meetup.",
            creator: "0x3C44...93BC",
            options: ["New York", "London", "Tokyo", "Berlin"],
            votesCount: [12, 34, 22, 19],
            deadline: Date().addingTimeInterval(86400 * 7),
            isActive: true,
            createdAt: Date().addingTimeInterval(-3600)
        ),
        Proposal(
            id: 3,
            title: "Partnership Proposal",
            description: "Should we partner with TechCorp for the next quarter?",
            creator: "0x90F7...b906",
            options: ["Yes", "No"],
            votesCount: [67, 23],
            deadline: Date().addingTimeInterval(-86400),
            isActive: false,
            createdAt: Date().addingTimeInterval(-86400 * 8)
        )
    ]
}
