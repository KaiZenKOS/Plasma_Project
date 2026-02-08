const addr =
  typeof import.meta.env.VITE_TONTINE_CONTRACT_ADDRESS === "string" &&
  import.meta.env.VITE_TONTINE_CONTRACT_ADDRESS
    ? import.meta.env.VITE_TONTINE_CONTRACT_ADDRESS
    : "";

const escrowAddr =
  typeof import.meta.env.VITE_TONTINE_ESCROW_CONTRACT_ADDRESS === "string" &&
  import.meta.env.VITE_TONTINE_ESCROW_CONTRACT_ADDRESS
    ? import.meta.env.VITE_TONTINE_ESCROW_CONTRACT_ADDRESS
    : "";

export const TONTINE_CONTRACT_ADDRESS = addr ? (addr as `0x${string}`) : null;
export const TONTINE_ESCROW_CONTRACT_ADDRESS = escrowAddr ? (escrowAddr as `0x${string}`) : null;
export const USDT_DECIMALS = 6;
