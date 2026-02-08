/**
 * EscrowService (EaS) on-chain - config et ABI pour le frontend.
 */

const escrowAddr =
  typeof import.meta.env.VITE_EAS_ESCROW_SERVICE_ADDRESS === "string" &&
  import.meta.env.VITE_EAS_ESCROW_SERVICE_ADDRESS
    ? import.meta.env.VITE_EAS_ESCROW_SERVICE_ADDRESS
    : "";

const usdtAddr =
  typeof import.meta.env.VITE_USDT_ADDRESS === "string" && import.meta.env.VITE_USDT_ADDRESS
    ? import.meta.env.VITE_USDT_ADDRESS
    : "";

export const ESCROW_SERVICE_ADDRESS = escrowAddr ? (escrowAddr as `0x${string}`) : null;
export const ESCROW_USDT_ADDRESS = usdtAddr ? (usdtAddr as `0x${string}`) : null;
export const USDT_DECIMALS = 6;

export const ESCROW_SERVICE_ABI = [
  {
    inputs: [
      { name: "beneficiary", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "createEscrow",
    outputs: [{ name: "escrowId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "escrowId", type: "uint256" }],
    name: "release",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "escrowId", type: "uint256" }],
    name: "getEscrow",
    outputs: [
      { name: "depositor", type: "address" },
      { name: "beneficiary", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "released", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "nextEscrowId",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    type: "event",
    name: "EscrowCreated",
    inputs: [
      { name: "escrowId", type: "uint256", indexed: true },
      { name: "depositor", type: "address", indexed: true },
      { name: "beneficiary", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "EscrowReleased",
    inputs: [
      { name: "escrowId", type: "uint256", indexed: true },
      { name: "beneficiary", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;

export const ERC20_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
