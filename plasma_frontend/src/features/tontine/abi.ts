/**
 * ABI for TontineService.sol (Plasma) — uint256-based, Pull pattern.
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
] as const;
