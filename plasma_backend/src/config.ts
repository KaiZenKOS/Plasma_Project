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
    rpcUrl: process.env.RPC_URL ?? "https://rpc.plasma.chain",
    tontineServiceAddress: (process.env.TONTINE_SERVICE_ADDRESS ?? "") as `0x${string}`,
    fromBlock: BigInt(process.env.FROM_BLOCK ?? "0"),
  },
  insurance: {
    openWeatherApiKey: process.env.OPENWEATHER_API_KEY ?? "",
    cronSchedule: process.env.INSURANCE_CRON ?? "0 */6 * * *", // toutes les 6h
  },
};
