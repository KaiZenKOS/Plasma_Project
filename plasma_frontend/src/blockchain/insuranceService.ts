/**
 * InsuranceService on-chain - config et ABI pour le frontend.
 */

const insuranceAddr =
  typeof import.meta.env.VITE_INSURANCE_CONTRACT_ADDRESS === "string" &&
  import.meta.env.VITE_INSURANCE_CONTRACT_ADDRESS
    ? import.meta.env.VITE_INSURANCE_CONTRACT_ADDRESS
    : "";

const usdtAddr =
  typeof import.meta.env.VITE_USDT_ADDRESS === "string" && import.meta.env.VITE_USDT_ADDRESS
    ? import.meta.env.VITE_USDT_ADDRESS
    : "";

export const INSURANCE_CONTRACT_ADDRESS = insuranceAddr ? (insuranceAddr as `0x${string}`) : null;
export const INSURANCE_USDT_ADDRESS = usdtAddr ? (usdtAddr as `0x${string}`) : null;
export const USDT_DECIMALS = 6;

export const INSURANCE_SERVICE_ABI = [
  {
    inputs: [],
    name: "getPremiumAmount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tontineId", type: "uint256" }],
    name: "purchasePolicy",
    outputs: [{ name: "policyId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "policyId", type: "uint256" }],
    name: "getPolicy",
    outputs: [
      { name: "policyHolder", type: "address" },
      { name: "tontineId", type: "uint256" },
      { name: "premiumPaid", type: "uint256" },
      { name: "status", type: "uint8" }, // 0=Active, 1=Claimed
      { name: "purchasedAt", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "nextPolicyId",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "", type: "address" },
      { name: "", type: "uint256" },
    ],
    name: "userPolicies",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "", type: "address" }],
    name: "userPolicyCount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
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

