// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VotingSystem {
    struct Proposal {
        uint256 id;
        string title;
        string description;
        address creator;
        string[] options;
        uint256[] votesCount;
        uint256 deadline;
        bool isActive;
        uint256 createdAt;
    }

    struct Vote {
        address voter;
        uint256 proposalId;
        uint256 optionIndex;
        uint256 timestamp;
    }

    uint256 public proposalCount;

    mapping(uint256 => Proposal) public proposals;

    mapping(uint256 => mapping(address => bool)) public hasVoted;

    mapping(uint256 => mapping(address => uint256)) public userVote;

    uint256 public constant MIN_VOTING_DURATION = 1 days;

    uint256 public constant MAX_VOTING_DURATION = 90 days;

    uint256 public constant MIN_OPTIONS = 2;

    uint256 public constant MAX_OPTIONS = 10;

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed creator,
        string title,
        uint256 deadline,
        uint256 optionsCount
    );

    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        uint256 optionIndex,
        uint256 timestamp
    );

    event ProposalEnded(uint256 indexed proposalId, uint256 timestamp);

    error InvalidTitle();
    error InvalidDescription();
    error InvalidOptionsCount();
    error EmptyOption();
    error InvalidDuration();
    error ProposalNotFound();
    error ProposalNotActive();
    error VotingPeriodEnded();
    error AlreadyVoted();
    error InvalidOptionIndex();
    error ProposalStillActive();

    function createProposal(
        string memory title,
        string memory description,
        string[] memory options,
        uint256 durationDays
    ) external returns (uint256 proposalId) {
        if (bytes(title).length == 0) revert InvalidTitle();
        if (bytes(description).length == 0) revert InvalidDescription();
        if (options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) {
            revert InvalidOptionsCount();
        }

        uint256 durationSeconds = durationDays * 1 days;
        if (durationSeconds < MIN_VOTING_DURATION || durationSeconds > MAX_VOTING_DURATION) {
            revert InvalidDuration();
        }

        for (uint256 i = 0; i < options.length; i++) {
            if (bytes(options[i]).length == 0) revert EmptyOption();
        }
        proposalId = proposalCount++;

        Proposal storage proposal = proposals[proposalId];
        proposal.id = proposalId;
        proposal.title = title;
        proposal.description = description;
        proposal.creator = msg.sender;
        proposal.deadline = block.timestamp + durationSeconds;
        proposal.isActive = true;
        proposal.createdAt = block.timestamp;

        // Inicjalizacja opcji i liczników głosów
        for (uint256 i = 0; i < options.length; i++) {
            proposal.options.push(options[i]);
            proposal.votesCount.push(0);
        }

        emit ProposalCreated(
            proposalId,
            msg.sender,
            title,
            proposal.deadline,
            options.length
        );
    }

    function vote(uint256 proposalId, uint256 optionIndex) external {
        Proposal storage proposal = proposals[proposalId];

        // Walidacja
        if (proposal.createdAt == 0) revert ProposalNotFound();
        if (!proposal.isActive) revert ProposalNotActive();
        if (block.timestamp > proposal.deadline) revert VotingPeriodEnded();
        if (hasVoted[proposalId][msg.sender]) revert AlreadyVoted();
        if (optionIndex >= proposal.options.length) revert InvalidOptionIndex();

        // Zapisanie głosu
        hasVoted[proposalId][msg.sender] = true;
        userVote[proposalId][msg.sender] = optionIndex;
        proposal.votesCount[optionIndex]++;

        emit VoteCast(proposalId, msg.sender, optionIndex, block.timestamp);
    }

    /**
     * @notice Kończy głosowanie dla propozycji (może wywołać każdy po upływie deadline)
     * @param proposalId ID propozycji
     */
    function endProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];

        if (proposal.createdAt == 0) revert ProposalNotFound();
        if (!proposal.isActive) revert ProposalNotActive();
        if (block.timestamp <= proposal.deadline) revert ProposalStillActive();

        proposal.isActive = false;

        emit ProposalEnded(proposalId, block.timestamp);
    }

    /*//////////////////////////////////////////////////////////////
                            VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Zwraca szczegóły propozycji
     * @param proposalId ID propozycji
     * @return Struktura Proposal
     */
    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        if (proposals[proposalId].createdAt == 0) revert ProposalNotFound();
        return proposals[proposalId];
    }

    /**
     * @notice Zwraca opcje dla propozycji
     * @param proposalId ID propozycji
     * @return Tablica opcji
     */
    function getProposalOptions(uint256 proposalId) external view returns (string[] memory) {
        if (proposals[proposalId].createdAt == 0) revert ProposalNotFound();
        return proposals[proposalId].options;
    }

    /**
     * @notice Zwraca liczniki głosów dla propozycji
     * @param proposalId ID propozycji
     * @return Tablica liczników głosów
     */
    function getProposalVotesCount(uint256 proposalId) external view returns (uint256[] memory) {
        if (proposals[proposalId].createdAt == 0) revert ProposalNotFound();
        return proposals[proposalId].votesCount;
    }

    /**
     * @notice Zwraca całkowitą liczbę głosów dla propozycji
     * @param proposalId ID propozycji
     * @return Suma wszystkich głosów
     */
    function getTotalVotes(uint256 proposalId) external view returns (uint256) {
        if (proposals[proposalId].createdAt == 0) revert ProposalNotFound();

        uint256 total = 0;
        uint256[] memory votes = proposals[proposalId].votesCount;

        for (uint256 i = 0; i < votes.length; i++) {
            total += votes[i];
        }

        return total;
    }

    /**
     * @notice Zwraca wyniki głosowania (indeks zwycięskiej opcji i liczba głosów)
     * @param proposalId ID propozycji
     * @return winningOption Indeks zwycięskiej opcji
     * @return winningVoteCount Liczba głosów zwycięskiej opcji
     */
    function getWinningOption(uint256 proposalId)
        external
        view
        returns (uint256 winningOption, uint256 winningVoteCount)
    {
        if (proposals[proposalId].createdAt == 0) revert ProposalNotFound();

        uint256[] memory votes = proposals[proposalId].votesCount;
        winningVoteCount = 0;
        winningOption = 0;

        for (uint256 i = 0; i < votes.length; i++) {
            if (votes[i] > winningVoteCount) {
                winningVoteCount = votes[i];
                winningOption = i;
            }
        }
    }

    /**
     * @notice Sprawdza czy użytkownik zagłosował w danej propozycji
     * @param proposalId ID propozycji
     * @param voter Adres użytkownika
     * @return true jeśli zagłosował, false w przeciwnym wypadku
     */
    function hasUserVoted(uint256 proposalId, address voter) external view returns (bool) {
        return hasVoted[proposalId][voter];
    }

    /**
     * @notice Zwraca głos użytkownika dla danej propozycji
     * @param proposalId ID propozycji
     * @param voter Adres użytkownika
     * @return Indeks opcji na którą zagłosował użytkownik
     */
    function getUserVote(uint256 proposalId, address voter) external view returns (uint256) {
        if (!hasVoted[proposalId][voter]) revert AlreadyVoted();
        return userVote[proposalId][voter];
    }

    /**
     * @notice Zwraca czy propozycja jest aktywna
     * @param proposalId ID propozycji
     * @return true jeśli aktywna, false w przeciwnym wypadku
     */
    function isProposalActive(uint256 proposalId) external view returns (bool) {
        if (proposals[proposalId].createdAt == 0) revert ProposalNotFound();

        Proposal memory proposal = proposals[proposalId];
        return proposal.isActive && block.timestamp <= proposal.deadline;
    }
}
