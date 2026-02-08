import "dotenv/config";

export const config = {
  port: Number(process.env.PORT) || 3000,
  database: {
    // Avec Docker : postgres exposé sur localhost:5432 → postgresql://plasma:plasma@localhost:5432/plasma
    connectionString:
      process.env.DATABASE_URL ??
      "postgresql://plasma:plasma@localhost:5432/plasma",
  },
  blockchain: {
    rpcUrl: process.env.RPC_URL ?? "https://testnet-rpc.plasma.to",
    chainId: Number(process.env.CHAIN_ID ?? "9746"),
    tontineServiceAddress: (process.env.TONTINE_SERVICE_ADDRESS ?? "") as `0x${string}`,
    usdtAddress: (process.env.USDT_ADDRESS ?? "0x502012b361aebce43b26ec812b74d9a51db4d412") as `0x${string}`,
    fromBlock: BigInt(process.env.FROM_BLOCK ?? "0"),
  },
};
