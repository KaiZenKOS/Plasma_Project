/**
 * ABI for TontineService.sol on Plasma Testnet (RPC testnet-rpc.plasma.to).
 * Do not use Foundry/Anvil-generated ABI — this matches the deployed contract on Plasma.
 */
export const TONTINE_ABI = [
  {
    inputs: [
      { name: "contributionAmount", type: "uint256" },
      { name: "frequencySeconds", type: "uint256" },
      { name: "collateralAmount", type: "uint256" },
    ],
    name: "createTontine",
    outputs: [{ name: "tontineId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "tontineId", type: "uint256" }],
    name: "joinTontine",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "tontineId", type: "uint256" }],
    name: "payContribution",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "", type: "uint256" }],
    name: "tontineGroups",
    outputs: [
      { name: "contributionAmount", type: "uint256" },
      { name: "frequencySeconds", type: "uint256" },
      { name: "collateralAmount", type: "uint256" },
      { name: "currentTurnIndex", type: "uint256" },
      { name: "createdAt", type: "uint256" },
      { name: "nextDueAt", type: "uint256" },
      { name: "active", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "", type: "uint256" },
      { name: "", type: "uint256" },
    ],
    name: "tontineMembers",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "", type: "uint256" },
      { name: "", type: "address" },
    ],
    name: "isMember",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "", type: "uint256" },
      { name: "", type: "address" },
    ],
    name: "lastPaidAt",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "", type: "address" }],
    name: "pendingWithdrawals",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "nextTontineId",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    type: "event",
    name: "TontineCreated",
    inputs: [
      { name: "tontineId", type: "uint256", indexed: true },
      { name: "contributionAmount", type: "uint256", indexed: false },
      { name: "frequencySeconds", type: "uint256", indexed: false },
      { name: "collateralAmount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "MemberJoined",
    inputs: [
      { name: "tontineId", type: "uint256", indexed: true },
      { name: "member", type: "address", indexed: true },
      { name: "turnPosition", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ContributionPaid",
    inputs: [
      { name: "tontineId", type: "uint256", indexed: true },
      { name: "member", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "turnIndex", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "PayoutSent",
    inputs: [
      { name: "tontineId", type: "uint256", indexed: true },
      { name: "beneficiary", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Withdrawal",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;

/**
 * Minimal ABI for TontineEscrow.sol (createTontine with serviceProvider, releaseFunds).
 */
export const TONTINE_ESCROW_ABI = [
  {
    inputs: [
      { name: "contributionAmount", type: "uint256" },
      { name: "frequencySeconds", type: "uint256" },
      { name: "collateralAmount", type: "uint256" },
      { name: "serviceProvider", type: "address" },
    ],
    name: "createTontine",
    outputs: [{ name: "tontineId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "tontineId", type: "uint256" }],
    name: "payContribution",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "escrowId", type: "uint256" }],
    name: "releaseFunds",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "nextTontineId",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    type: "event",
    name: "TontineCreated",
    inputs: [
      { name: "tontineId", type: "uint256", indexed: true },
      { name: "contributionAmount", type: "uint256", indexed: false },
      { name: "frequencySeconds", type: "uint256", indexed: false },
      { name: "collateralAmount", type: "uint256", indexed: false },
      { name: "serviceProvider", type: "address", indexed: false },
    ],
  },
] as const;
