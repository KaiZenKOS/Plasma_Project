// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { MockUSDT } from "../src/MockUSDT.sol";
import { NexusRegistry } from "../src/NexusRegistry.sol";
import { TontineService } from "../src/TontineService.sol";
import { EscrowService } from "../src/EscrowService.sol";

/**
 * @title Deploy
 * @dev Ordre : 1. MockUSDT -> 2. NexusRegistry -> 3. TontineService -> 4. EscrowService -> 5. Enregistrer les services
 */
contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0));
        if (deployerPrivateKey == 0) {
            deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        }

        vm.startBroadcast(deployerPrivateKey);

        MockUSDT usdt = new MockUSDT();
        NexusRegistry registry = new NexusRegistry();
        TontineService tontine = new TontineService(address(registry), address(usdt));
        EscrowService escrowService = new EscrowService(address(registry), address(usdt));

        registry.registerService(address(tontine), "TontineService");
        registry.registerService(address(escrowService), "EscrowService");

        vm.stopBroadcast();

        // Log pour récupérer les adresses (Foundry broadcast)
        console.log("MockUSDT", address(usdt));
        console.log("NexusRegistry", address(registry));
        console.log("TontineService", address(tontine));
        console.log("EscrowService", address(escrowService));
    }
}
