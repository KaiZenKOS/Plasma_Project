// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Test } from "forge-std/Test.sol";
import { MockUSDT } from "../src/MockUSDT.sol";
import { NexusRegistry } from "../src/NexusRegistry.sol";
import { TontineService } from "../src/TontineService.sol";

contract TontineServiceTest is Test {
    MockUSDT public usdt;
    NexusRegistry public registry;
    TontineService public tontine;

    address owner = address(1);
    address alice = address(2);
    address bob = address(3);

    uint256 constant CONTRIBUTION = 100e6;   // 100 USDT (6 decimals)
    uint256 constant FREQUENCY = 7 days;
    uint256 constant COLLATERAL = 50e6;

    function setUp() public {
        vm.prank(owner);
        usdt = new MockUSDT();
        vm.prank(owner);
        registry = new NexusRegistry();
        vm.prank(owner);
        tontine = new TontineService(address(registry), address(usdt));
        vm.prank(owner);
        registry.registerService(address(tontine), "TontineService");

        usdt.mint(alice, 1000e6);
        usdt.mint(bob, 1000e6);
    }

    function test_CreateAndJoin() public {
        vm.startPrank(owner);
        uint256 id = tontine.createTontine(CONTRIBUTION, FREQUENCY, COLLATERAL);
        assertEq(id, 0);
        (uint256 amt,, uint256 coll,,,, bool active) = tontine.tontineGroups(0);
        assertEq(amt, CONTRIBUTION);
        assertEq(coll, COLLATERAL);
        assertTrue(active);
        vm.stopPrank();

        vm.prank(alice);
        tontine.joinTontine(0);
        vm.prank(bob);
        tontine.joinTontine(0);
        assertTrue(tontine.isMember(0, alice));
        assertTrue(tontine.isMember(0, bob));
    }

    function test_PayContribution_PullOverPush() public {
        vm.prank(owner);
        tontine.createTontine(CONTRIBUTION, FREQUENCY, COLLATERAL);
        vm.prank(alice);
        tontine.joinTontine(0);
        vm.prank(bob);
        tontine.joinTontine(0);

        vm.prank(alice);
        usdt.approve(address(tontine), CONTRIBUTION);
        vm.prank(alice);
        tontine.payContribution(0);
        // Tour 0 : bénéficiaire = alice (index 0)
        assertEq(tontine.pendingWithdrawals(alice), CONTRIBUTION);
        assertEq(tontine.pendingWithdrawals(bob), 0);

        vm.prank(alice);
        tontine.withdraw();
        assertEq(usdt.balanceOf(alice), 1000e6 + CONTRIBUTION);
        assertEq(tontine.pendingWithdrawals(bob), 0);
    }
}
