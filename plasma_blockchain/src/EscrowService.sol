// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { INexusRegistry } from "./interfaces/INexusRegistry.sol";
import { IMockUSDT } from "./interfaces/IMockUSDT.sol";

/**
 * @title EscrowService (EaS)
 * @dev Escrow as a Service on-chain : déposant lock des USDT, seul lui peut release vers le bénéficiaire.
 */
contract EscrowService {
    INexusRegistry public immutable NEXUS_REGISTRY;
    IMockUSDT public immutable STABLECOIN;

    struct Escrow {
        address depositor;
        address beneficiary;
        uint256 amount;
        bool released;
    }

    mapping(uint256 => Escrow) public escrows;
    uint256 public nextEscrowId;

    event EscrowCreated(uint256 indexed escrowId, address indexed depositor, address indexed beneficiary, uint256 amount);
    event EscrowReleased(uint256 indexed escrowId, address indexed beneficiary, uint256 amount);

    error NotRegistered();
    error InvalidEscrow();
    error NotDepositor();
    error AlreadyReleased();
    error InsufficientAllowance();
    error TransferFailed();

    modifier onlyRegistered() {
        _onlyRegistered();
        _;
    }

    function _onlyRegistered() internal view {
        if (!NEXUS_REGISTRY.isRegistered(address(this))) revert NotRegistered();
    }

    constructor(address _nexusRegistry, address _stablecoin) {
        NEXUS_REGISTRY = INexusRegistry(_nexusRegistry);
        STABLECOIN = IMockUSDT(_stablecoin);
    }

    /**
     * @dev Crée un escrow : le déposant envoie amount USDT au contrat.
     * Il faut avoir approuvé ce contrat (approve) avant d'appeler.
     */
    function createEscrow(address beneficiary, uint256 amount) external onlyRegistered returns (uint256 escrowId) {
        if (beneficiary == address(0)) revert InvalidEscrow();
        if (amount == 0) revert InvalidEscrow();
        if (STABLECOIN.allowance(msg.sender, address(this)) < amount) revert InsufficientAllowance();

        escrowId = nextEscrowId++;
        escrows[escrowId] = Escrow({
            depositor: msg.sender,
            beneficiary: beneficiary,
            amount: amount,
            released: false
        });

        bool ok = STABLECOIN.transferFrom(msg.sender, address(this), amount);
        if (!ok) revert TransferFailed();

        emit EscrowCreated(escrowId, msg.sender, beneficiary, amount);
        return escrowId;
    }

    /**
     * @dev Libère les fonds vers le bénéficiaire. Appelable uniquement par le déposant.
     */
    function release(uint256 escrowId) external onlyRegistered {
        Escrow storage e = escrows[escrowId];
        if (escrowId >= nextEscrowId) revert InvalidEscrow();
        if (e.depositor == address(0)) revert InvalidEscrow();
        if (e.released) revert AlreadyReleased();
        if (msg.sender != e.depositor) revert NotDepositor();

        e.released = true;
        uint256 amount = e.amount;
        bool ok = STABLECOIN.transfer(e.beneficiary, amount);
        if (!ok) revert TransferFailed();

        emit EscrowReleased(escrowId, e.beneficiary, amount);
    }

    /**
     * @dev Vue : infos d'un escrow (pour frontend/backend).
     */
    function getEscrow(uint256 escrowId) external view returns (address depositor, address beneficiary, uint256 amount, bool released) {
        Escrow storage e = escrows[escrowId];
        return (e.depositor, e.beneficiary, e.amount, e.released);
    }
}
