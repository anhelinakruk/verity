import SwiftUI

struct ContentView: View {
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            ProposalsListView()
                .tabItem {
                    Label("Głosowania", systemImage: "list.bullet.rectangle")
                }
                .tag(0)

            ProfileView()
                .tabItem {
                    Label("Konto", systemImage: "person.circle")
                }
                .tag(1)
        }
    }
}

struct ProposalsListView: View {
    @State private var proposals = Proposal.mockProposals
    @State private var showActiveOnly = true

    var filteredProposals: [Proposal] {
        if showActiveOnly {
            return proposals.filter { $0.isActive }
        }
        return proposals
    }

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Filter toggle
                HStack {
                    Text("Pokaz aktywne")
                        .font(.subheadline)
                        .foregroundColor(.secondary)

                    Spacer()

                    Toggle("", isOn: $showActiveOnly)
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
                .background(Color(.systemGroupedBackground))

                // Proposals list
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(filteredProposals) { proposal in
                            NavigationLink(destination: ProposalDetailView(proposal: proposal)) {
                                ProposalCard(proposal: proposal)
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                    }
                    .padding()
                }
            }
            .navigationTitle("Verity")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {}) {
                        Image(systemName: "plus.circle.fill")
                            .font(.title2)
                            .foregroundColor(.blue)
                    }
                }
            }
        }
    }
}

struct ProposalCard: View {
    let proposal: Proposal

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(proposal.title)
                        .font(.headline)
                        .foregroundColor(.primary)

                    Text("by \(proposal.creator)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                // Status badge
                Text(proposal.isActive ? "Active" : "Ended")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(proposal.isActive ? Color.green.opacity(0.2) : Color.gray.opacity(0.2))
                    .foregroundColor(proposal.isActive ? .green : .gray)
                    .cornerRadius(8)
            }

            // Description
            Text(proposal.description)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .lineLimit(2)

            // Stats
            HStack(spacing: 16) {
                HStack(spacing: 4) {
                    Image(systemName: "person.2.fill")
                        .font(.caption)
                    Text("\(proposal.totalVotes) votes")
                        .font(.caption)
                }
                .foregroundColor(.blue)

                HStack(spacing: 4) {
                    Image(systemName: "clock.fill")
                        .font(.caption)
                    Text(proposal.timeRemaining)
                        .font(.caption)
                }
                .foregroundColor(.orange)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.1), radius: 5, x: 0, y: 2)
    }
}

struct ProposalDetailView: View {
    let proposal: Proposal
    @State private var selectedOption: Int? = nil
    @State private var showVoteConfirmation = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Status badge
                HStack {
                    Spacer()
                    Text(proposal.isActive ? "Active" : "Ended")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(proposal.isActive ? Color.green.opacity(0.2) : Color.gray.opacity(0.2))
                        .foregroundColor(proposal.isActive ? .green : .gray)
                        .cornerRadius(10)
                }

                // Title
                Text(proposal.title)
                    .font(.title)
                    .fontWeight(.bold)

                // Creator & Time
                HStack {
                    Label(proposal.creator, systemImage: "person.circle")
                        .font(.subheadline)
                        .foregroundColor(.secondary)

                    Spacer()

                    Label(proposal.timeRemaining, systemImage: "clock")
                        .font(.subheadline)
                        .foregroundColor(.orange)
                }

                Divider()

                // Description
                Text("Description")
                    .font(.headline)

                Text(proposal.description)
                    .font(.body)
                    .foregroundColor(.secondary)

                Divider()

                // Voting options
                Text("Options")
                    .font(.headline)

                VStack(spacing: 12) {
                    ForEach(Array(proposal.options.enumerated()), id: \.offset) { index, option in
                        VotingOptionView(
                            option: option,
                            votes: proposal.votesCount[index],
                            totalVotes: proposal.totalVotes,
                            isSelected: selectedOption == index,
                            isWinning: proposal.winningOptionIndex == index
                        ) {
                            selectedOption = index
                        }
                    }
                }

                // Vote button
                if proposal.isActive {
                    Button(action: {
                        showVoteConfirmation = true
                    }) {
                        Text("Cast Vote")
                            .font(.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(selectedOption != nil ? Color.blue : Color.gray)
                            .cornerRadius(12)
                    }
                    .disabled(selectedOption == nil)
                    .padding(.top)
                }
            }
            .padding()
        }
        .navigationBarTitleDisplayMode(.inline)
        .alert("Vote Submitted", isPresented: $showVoteConfirmation) {
            Button("OK", role: .cancel) {
                selectedOption = nil
            }
        } message: {
            if let option = selectedOption {
                Text("Your vote for '\(proposal.options[option])' has been recorded on the blockchain.")
            }
        }
    }
}

struct VotingOptionView: View {
    let option: String
    let votes: Int
    let totalVotes: Int
    let isSelected: Bool
    let isWinning: Bool
    let action: () -> Void

    var percentage: Double {
        guard totalVotes > 0 else { return 0 }
        return Double(votes) / Double(totalVotes) * 100
    }

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text(option)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)

                    Spacer()

                    if isWinning {
                        Image(systemName: "crown.fill")
                            .foregroundColor(.yellow)
                            .font(.caption)
                    }

                    Text("\(votes) votes")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                // Progress bar
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        Rectangle()
                            .fill(Color.gray.opacity(0.2))

                        Rectangle()
                            .fill(isSelected ? Color.blue : Color.blue.opacity(0.6))
                            .frame(width: geometry.size.width * CGFloat(percentage / 100))
                    }
                }
                .frame(height: 8)
                .cornerRadius(4)

                Text(String(format: "%.1f%%", percentage))
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            .padding()
            .background(isSelected ? Color.blue.opacity(0.1) : Color(.systemGray6))
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? Color.blue : Color.clear, lineWidth: 2)
            )
        }
    }
}

struct ProfileView: View {
    var body: some View {
        NavigationView {
            List {
                Section {
                    HStack {
                        Image(systemName: "person.circle.fill")
                            .font(.system(size: 60))
                            .foregroundColor(.blue)

                        VStack(alignment: .leading, spacing: 4) {
                            Text("0xf39Fd6e51aad88F6...")
                                .font(.headline)
                            Text("Connected")
                                .font(.caption)
                                .foregroundColor(.green)
                        }
                        .padding(.leading, 8)
                    }
                    .padding(.vertical, 8)
                }

                Section("Statistics") {
                    HStack {
                        Text("Proposals Created")
                        Spacer()
                        Text("2")
                            .foregroundColor(.secondary)
                    }

                    HStack {
                        Text("Votes Cast")
                        Spacer()
                        Text("12")
                            .foregroundColor(.secondary)
                    }

                    HStack {
                        Text("Active Proposals")
                        Spacer()
                        Text("3")
                            .foregroundColor(.secondary)
                    }
                }

                Section {
                    Button(action: {}) {
                        HStack {
                            Image(systemName: "arrow.clockwise")
                            Text("Refresh")
                        }
                    }

                    Button(action: {}) {
                        HStack {
                            Image(systemName: "gear")
                            Text("Settings")
                        }
                    }
                }

                Section {
                    Button(action: {}) {
                        HStack {
                            Image(systemName: "rectangle.portrait.and.arrow.right")
                                .foregroundColor(.red)
                            Text("Disconnect Wallet")
                                .foregroundColor(.red)
                        }
                    }
                }
            }
            .navigationTitle("Profile")
        }
    }
}

#Preview {
    ContentView()
}
