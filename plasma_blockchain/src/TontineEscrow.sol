// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Ownable } from "./Ownable.sol";
import { INexusRegistry } from "./interfaces/INexusRegistry.sol";
import { IMockUSDT } from "./interfaces/IMockUSDT.sol";

/**
 * @title TontineEscrow
 * @dev Tontine with optional Escrow payout: when a round ends, payout can go to
 *      a locked escrow (winner confirms service → funds released to provider).
 */
contract TontineEscrow is Ownable {
    INexusRegistry public immutable NEXUS_REGISTRY;
    IMockUSDT public immutable STABLECOIN;

    struct TontineGroup {
        uint256 contributionAmount;
        uint256 frequencySeconds;
        uint256 collateralAmount;
        address serviceProvider;   // address(0) = STANDARD (payout to winner); else ESCROW_LINKED
        uint256 currentTurnIndex;
        uint256 createdAt;
        uint256 nextDueAt;
        bool active;
    }

    struct Escrow {
        uint256 tontineId;
        address winner;
        address provider;
        uint256 amount;
        bool released;
    }

    mapping(uint256 => TontineGroup) public tontineGroups;
    mapping(uint256 => address[]) public tontineMembers;
    mapping(uint256 => mapping(address => bool)) public isMember;
    mapping(uint256 => mapping(address => uint256)) public lastPaidAt;

    mapping(address => uint256) public pendingWithdrawals; // STANDARD only

    uint256 public nextTontineId;
    uint256 public nextEscrowId;
    mapping(uint256 => Escrow) public escrows;

    uint256 private _status;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    event TontineCreated(uint256 indexed tontineId, uint256 contributionAmount, uint256 frequencySeconds, uint256 collateralAmount, address serviceProvider);
    event MemberJoined(uint256 indexed tontineId, address indexed member, uint256 turnPosition);
    event ContributionPaid(uint256 indexed tontineId, address indexed member, uint256 amount, uint256 turnIndex);
    event PayoutSent(uint256 indexed tontineId, address indexed beneficiary, uint256 amount);
    event EscrowCreated(uint256 indexed escrowId, uint256 indexed tontineId, address indexed winner, address provider, uint256 amount);
    event FundsReleased(uint256 indexed escrowId, address indexed provider, uint256 amount);
    event CollateralSlashed(uint256 indexed tontineId, address indexed member, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);
    event EmergencyRefund(uint256 indexed escrowId, address indexed to, uint256 amount);

    error NotRegisteredService();
    error InvalidTontine();
    error NotMember();
    error AlreadyMember();
    error InsufficientAllowance();
    error NotYourTurn();
    error TooEarly();
    error TontineNotActive();
    error TransferFailed();
    error ReentrancyGuardReentrantCall();
    error EscrowNotFound();
    error NotWinner();
    error AlreadyReleased();

    constructor(address _nexusRegistry, address _stablecoin) Ownable() {
        NEXUS_REGISTRY = INexusRegistry(_nexusRegistry);
        STABLECOIN = IMockUSDT(_stablecoin);
        _status = _NOT_ENTERED;
    }

    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    function _nonReentrantBefore() internal {
        if (_status == _ENTERED) revert ReentrancyGuardReentrantCall();
        _status = _ENTERED;
    }

    function _nonReentrantAfter() internal {
        _status = _NOT_ENTERED;
    }

    modifier onlyRegistered() {
        _onlyRegistered();
        _;
    }

    function _onlyRegistered() internal view {
        if (!NEXUS_REGISTRY.isRegistered(address(this))) revert NotRegisteredService();
    }

    /**
     * @param serviceProvider address(0) = STANDARD (winner withdraws); else ESCROW_LINKED (payout locked for provider).
     */
    function createTontine(
        uint256 contributionAmount,
        uint256 frequencySeconds,
        uint256 collateralAmount,
        address serviceProvider
    ) external onlyOwner onlyRegistered returns (uint256 tontineId) {
        tontineId = nextTontineId++;
        tontineGroups[tontineId] = TontineGroup({
            contributionAmount: contributionAmount,
            frequencySeconds: frequencySeconds,
            collateralAmount: collateralAmount,
            serviceProvider: serviceProvider,
            currentTurnIndex: 0,
            createdAt: block.timestamp,
            nextDueAt: block.timestamp + frequencySeconds,
            active: true
        });
        emit TontineCreated(tontineId, contributionAmount, frequencySeconds, collateralAmount, serviceProvider);
        return tontineId;
    }

    function joinTontine(uint256 tontineId) external onlyRegistered {
        TontineGroup storage g = tontineGroups[tontineId];
        if (tontineId >= nextTontineId || !g.active) revert InvalidTontine();
        if (isMember[tontineId][msg.sender]) revert AlreadyMember();
        uint256 turnPosition = tontineMembers[tontineId].length;
        tontineMembers[tontineId].push(msg.sender);
        isMember[tontineId][msg.sender] = true;
        emit MemberJoined(tontineId, msg.sender, turnPosition);
    }

    function contribute(uint256 tontineId) external onlyRegistered nonReentrant {
        TontineGroup storage g = tontineGroups[tontineId];
        if (tontineId >= nextTontineId || !g.active) revert InvalidTontine();
        if (!isMember[tontineId][msg.sender]) revert NotMember();

        uint256 amount = g.contributionAmount;
        if (STABLECOIN.allowance(msg.sender, address(this)) < amount) revert InsufficientAllowance();

        lastPaidAt[tontineId][msg.sender] = block.timestamp;
        bool ok = STABLECOIN.transferFrom(msg.sender, address(this), amount);
        if (!ok) revert TransferFailed();

        uint256 turn = g.currentTurnIndex;
        emit ContributionPaid(tontineId, msg.sender, amount, turn);

        _assignPayoutAndAdvanceTurn(tontineId, amount);
    }

    function _assignPayoutAndAdvanceTurn(uint256 tontineId, uint256 amount) internal {
        TontineGroup storage g = tontineGroups[tontineId];
        address[] storage members = tontineMembers[tontineId];
        if (members.length == 0) return;

        address beneficiary = members[g.currentTurnIndex];

        if (g.serviceProvider == address(0)) {
            // STANDARD: winner pulls via withdraw()
            pendingWithdrawals[beneficiary] += amount;
            emit PayoutSent(tontineId, beneficiary, amount);
        } else {
            // ESCROW_LINKED: lock for winner → provider
            uint256 escrowId = nextEscrowId++;
            escrows[escrowId] = Escrow({
                tontineId: tontineId,
                winner: beneficiary,
                provider: g.serviceProvider,
                amount: amount,
                released: false
            });
            emit EscrowCreated(escrowId, tontineId, beneficiary, g.serviceProvider, amount);
            emit PayoutSent(tontineId, beneficiary, amount);
        }

        g.currentTurnIndex = (g.currentTurnIndex + 1) % members.length;
        g.nextDueAt = block.timestamp + g.frequencySeconds;
    }

    /// @dev Winner confirms service received; funds go to provider.
    function releaseFunds(uint256 escrowId) external nonReentrant {
        Escrow storage e = escrows[escrowId];
        if (e.amount == 0) revert EscrowNotFound();
        if (e.released) revert AlreadyReleased();
        if (msg.sender != e.winner) revert NotWinner();

        e.released = true;
        bool ok = STABLECOIN.transfer(e.provider, e.amount);
        require(ok, "TontineEscrow: transfer failed");
        emit FundsReleased(escrowId, e.provider, e.amount);
    }

    /// @dev STANDARD tontine: winner pulls their payout.
    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "TontineEscrow: nothing to withdraw");
        pendingWithdrawals[msg.sender] = 0;
        bool ok = STABLECOIN.transfer(msg.sender, amount);
        require(ok, "TontineEscrow: transfer failed");
        emit Withdrawal(msg.sender, amount);
    }

    function slashCollateral(uint256 tontineId, address member) external onlyOwner onlyRegistered {
        TontineGroup storage g = tontineGroups[tontineId];
        if (tontineId >= nextTontineId || !g.active) revert InvalidTontine();
        if (!isMember[tontineId][member]) revert NotMember();
        if (lastPaidAt[tontineId][member] >= g.nextDueAt) return;
        emit CollateralSlashed(tontineId, member, g.collateralAmount);
    }

    /// @dev Admin: refund escrow to winner in case of dispute / emergency.
    function emergencyRefund(uint256 escrowId) external onlyOwner nonReentrant {
        Escrow storage e = escrows[escrowId];
        if (e.amount == 0) revert EscrowNotFound();
        if (e.released) revert AlreadyReleased();

        e.released = true;
        bool ok = STABLECOIN.transfer(e.winner, e.amount);
        require(ok, "TontineEscrow: transfer failed");
        emit EmergencyRefund(escrowId, e.winner, e.amount);
    }

    // ---------- views ----------
    function getEscrow(uint256 escrowId) external view returns (uint256 tontineId, address winner, address provider, uint256 amount, bool released) {
        Escrow storage e = escrows[escrowId];
        return (e.tontineId, e.winner, e.provider, e.amount, e.released);
    }
}
