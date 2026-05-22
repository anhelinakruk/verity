// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {VotingSystem} from "../src/VotingSystem.sol";

contract VotingSystemTest is Test {
    VotingSystem public votingSystem;

    address public creator = makeAddr("creator");
    address public voter1 = makeAddr("voter1");
    address public voter2 = makeAddr("voter2");
    address public voter3 = makeAddr("voter3");

    string[] public options;

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

    function setUp() public {
        votingSystem = new VotingSystem();

        // Inicjalizacja opcji do testów
        options.push("Option A");
        options.push("Option B");
        options.push("Option C");
    }

    /*//////////////////////////////////////////////////////////////
                        CREATE PROPOSAL TESTS
    //////////////////////////////////////////////////////////////*/

    function test_CreateProposal() public {
        vm.startPrank(creator);

        uint256 proposalId = votingSystem.createProposal(
            "Test Proposal",
            "This is a test proposal",
            options,
            7 // 7 dni
        );

        assertEq(proposalId, 0, "First proposal should have ID 0");
        assertEq(votingSystem.proposalCount(), 1, "Proposal count should be 1");

        VotingSystem.Proposal memory proposal = votingSystem.getProposal(proposalId);
        assertEq(proposal.title, "Test Proposal");
        assertEq(proposal.description, "This is a test proposal");
        assertEq(proposal.creator, creator);
        assertTrue(proposal.isActive);
        assertEq(proposal.options.length, 3);
        assertEq(proposal.votesCount.length, 3);

        vm.stopPrank();
    }

    function test_CreateProposal_EmitsEvent() public {
        vm.startPrank(creator);

        vm.expectEmit(true, true, false, true);
        emit ProposalCreated(0, creator, "Test Proposal", block.timestamp + 7 days, 3);

        votingSystem.createProposal(
            "Test Proposal",
            "This is a test proposal",
            options,
            7
        );

        vm.stopPrank();
    }

    function test_CreateProposal_RevertInvalidTitle() public {
        vm.startPrank(creator);

        vm.expectRevert(VotingSystem.InvalidTitle.selector);
        votingSystem.createProposal(
            "",
            "This is a test proposal",
            options,
            7
        );

        vm.stopPrank();
    }

    function test_CreateProposal_RevertInvalidDescription() public {
        vm.startPrank(creator);

        vm.expectRevert(VotingSystem.InvalidDescription.selector);
        votingSystem.createProposal(
            "Test Proposal",
            "",
            options,
            7
        );

        vm.stopPrank();
    }

    function test_CreateProposal_RevertTooFewOptions() public {
        vm.startPrank(creator);

        string[] memory fewOptions = new string[](1);
        fewOptions[0] = "Only One";

        vm.expectRevert(VotingSystem.InvalidOptionsCount.selector);
        votingSystem.createProposal(
            "Test Proposal",
            "Description",
            fewOptions,
            7
        );

        vm.stopPrank();
    }

    function test_CreateProposal_RevertTooManyOptions() public {
        vm.startPrank(creator);

        string[] memory manyOptions = new string[](11);
        for (uint256 i = 0; i < 11; i++) {
            manyOptions[i] = string(abi.encodePacked("Option ", vm.toString(i)));
        }

        vm.expectRevert(VotingSystem.InvalidOptionsCount.selector);
        votingSystem.createProposal(
            "Test Proposal",
            "Description",
            manyOptions,
            7
        );

        vm.stopPrank();
    }

    function test_CreateProposal_RevertInvalidDuration() public {
        vm.startPrank(creator);

        // Zbyt krótka
        vm.expectRevert(VotingSystem.InvalidDuration.selector);
        votingSystem.createProposal(
            "Test Proposal",
            "Description",
            options,
            0
        );

        // Zbyt długa
        vm.expectRevert(VotingSystem.InvalidDuration.selector);
        votingSystem.createProposal(
            "Test Proposal",
            "Description",
            options,
            91
        );

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                            VOTE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Vote() public {
        // Tworzenie propozycji
        vm.prank(creator);
        uint256 proposalId = votingSystem.createProposal(
            "Test Proposal",
            "Description",
            options,
            7
        );

        // Głosowanie
        vm.prank(voter1);
        votingSystem.vote(proposalId, 0);

        assertTrue(votingSystem.hasUserVoted(proposalId, voter1));
        assertEq(votingSystem.getUserVote(proposalId, voter1), 0);

        uint256[] memory votesCount = votingSystem.getProposalVotesCount(proposalId);
        assertEq(votesCount[0], 1);
        assertEq(votesCount[1], 0);
        assertEq(votesCount[2], 0);
    }

    function test_Vote_EmitsEvent() public {
        vm.prank(creator);
        uint256 proposalId = votingSystem.createProposal(
            "Test Proposal",
            "Description",
            options,
            7
        );

        vm.startPrank(voter1);

        vm.expectEmit(true, true, false, true);
        emit VoteCast(proposalId, voter1, 0, block.timestamp);

        votingSystem.vote(proposalId, 0);

        vm.stopPrank();
    }

    function test_Vote_MultipleVoters() public {
        vm.prank(creator);
        uint256 proposalId = votingSystem.createProposal(
            "Test Proposal",
            "Description",
            options,
            7
        );

        vm.prank(voter1);
        votingSystem.vote(proposalId, 0);

        vm.prank(voter2);
        votingSystem.vote(proposalId, 1);

        vm.prank(voter3);
        votingSystem.vote(proposalId, 0);

        uint256[] memory votesCount = votingSystem.getProposalVotesCount(proposalId);
        assertEq(votesCount[0], 2);
        assertEq(votesCount[1], 1);
        assertEq(votesCount[2], 0);

        assertEq(votingSystem.getTotalVotes(proposalId), 3);
    }

    function test_Vote_RevertProposalNotFound() public {
        vm.prank(voter1);
        vm.expectRevert(VotingSystem.ProposalNotFound.selector);
        votingSystem.vote(999, 0);
    }

    function test_Vote_RevertAlreadyVoted() public {
        vm.prank(creator);
        uint256 proposalId = votingSystem.createProposal(
            "Test Proposal",
            "Description",
            options,
            7
        );

        vm.startPrank(voter1);
        votingSystem.vote(proposalId, 0);

        vm.expectRevert(VotingSystem.AlreadyVoted.selector);
        votingSystem.vote(proposalId, 1);

        vm.stopPrank();
    }

    function test_Vote_RevertInvalidOption() public {
        vm.prank(creator);
        uint256 proposalId = votingSystem.createProposal(
            "Test Proposal",
            "Description",
            options,
            7
        );

        vm.prank(voter1);
        vm.expectRevert(VotingSystem.InvalidOptionIndex.selector);
        votingSystem.vote(proposalId, 10);
    }

    function test_Vote_RevertProposalEnded() public {
        vm.prank(creator);
        uint256 proposalId = votingSystem.createProposal(
            "Test Proposal",
            "Description",
            options,
            7
        );

        // Przewinięcie czasu o 8 dni
        vm.warp(block.timestamp + 8 days);

        vm.prank(voter1);
        vm.expectRevert(VotingSystem.VotingPeriodEnded.selector);
        votingSystem.vote(proposalId, 0);
    }

    /*//////////////////////////////////////////////////////////////
                        END PROPOSAL TESTS
    //////////////////////////////////////////////////////////////*/

    function test_EndProposal() public {
        vm.prank(creator);
        uint256 proposalId = votingSystem.createProposal(
            "Test Proposal",
            "Description",
            options,
            7
        );

        assertTrue(votingSystem.isProposalActive(proposalId));

        // Przewinięcie czasu
        vm.warp(block.timestamp + 8 days);

        vm.prank(voter1);
        votingSystem.endProposal(proposalId);

        assertFalse(votingSystem.isProposalActive(proposalId));
    }

    function test_EndProposal_EmitsEvent() public {
        vm.prank(creator);
        uint256 proposalId = votingSystem.createProposal(
            "Test Proposal",
            "Description",
            options,
            7
        );

        vm.warp(block.timestamp + 8 days);

        vm.expectEmit(true, false, false, true);
        emit ProposalEnded(proposalId, block.timestamp);

        vm.prank(voter1);
        votingSystem.endProposal(proposalId);
    }

    function test_EndProposal_RevertStillActive() public {
        vm.prank(creator);
        uint256 proposalId = votingSystem.createProposal(
            "Test Proposal",
            "Description",
            options,
            7
        );

        vm.prank(voter1);
        vm.expectRevert(VotingSystem.ProposalStillActive.selector);
        votingSystem.endProposal(proposalId);
    }

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS TESTS
    //////////////////////////////////////////////////////////////*/

    function test_GetWinningOption() public {
        vm.prank(creator);
        uint256 proposalId = votingSystem.createProposal(
            "Test Proposal",
            "Description",
            options,
            7
        );

        vm.prank(voter1);
        votingSystem.vote(proposalId, 0);

        vm.prank(voter2);
        votingSystem.vote(proposalId, 1);

        vm.prank(voter3);
        votingSystem.vote(proposalId, 1);

        (uint256 winningOption, uint256 winningVoteCount) = votingSystem.getWinningOption(proposalId);

        assertEq(winningOption, 1);
        assertEq(winningVoteCount, 2);
    }

    function test_GetProposalOptions() public {
        vm.prank(creator);
        uint256 proposalId = votingSystem.createProposal(
            "Test Proposal",
            "Description",
            options,
            7
        );

        string[] memory retrievedOptions = votingSystem.getProposalOptions(proposalId);

        assertEq(retrievedOptions.length, 3);
        assertEq(retrievedOptions[0], "Option A");
        assertEq(retrievedOptions[1], "Option B");
        assertEq(retrievedOptions[2], "Option C");
    }

    /*//////////////////////////////////////////////////////////////
                            FUZZ TESTS
    //////////////////////////////////////////////////////////////*/

    function testFuzz_CreateProposal(string memory title, string memory description) public {
        vm.assume(bytes(title).length > 0);
        vm.assume(bytes(description).length > 0);

        vm.prank(creator);
        uint256 proposalId = votingSystem.createProposal(title, description, options, 7);

        VotingSystem.Proposal memory proposal = votingSystem.getProposal(proposalId);
        assertEq(proposal.title, title);
        assertEq(proposal.description, description);
    }

    function testFuzz_Vote(uint8 optionIndex) public {
        vm.assume(optionIndex < 3);

        vm.prank(creator);
        uint256 proposalId = votingSystem.createProposal(
            "Test Proposal",
            "Description",
            options,
            7
        );

        vm.prank(voter1);
        votingSystem.vote(proposalId, optionIndex);

        assertEq(votingSystem.getUserVote(proposalId, voter1), optionIndex);
    }
}
