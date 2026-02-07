// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/**
 * @title NexusRegistry
 * @dev Registry "Plug & Play" : whitelist des adresses de services autorisés (Tontine, Escrow, etc.)
 */
contract NexusRegistry {
    address public owner;
    mapping(address => bool) public isRegistered;
    address[] public registeredAddresses;

    event ServiceRegistered(address indexed service, string name);
    event ServiceRemoved(address indexed service);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "NexusRegistry: not owner");
        _;
    }

    function registerService(address service, string calldata name) external onlyOwner {
        require(service != address(0), "NexusRegistry: zero address");
        require(!isRegistered[service], "NexusRegistry: already registered");
        isRegistered[service] = true;
        registeredAddresses.push(service);
        emit ServiceRegistered(service, name);
    }

    function removeService(address service) external onlyOwner {
        require(isRegistered[service], "NexusRegistry: not registered");
        isRegistered[service] = false;
        emit ServiceRemoved(service);
    }

    function getRegisteredCount() external view returns (uint256) {
        return registeredAddresses.length;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "NexusRegistry: zero address");
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}
