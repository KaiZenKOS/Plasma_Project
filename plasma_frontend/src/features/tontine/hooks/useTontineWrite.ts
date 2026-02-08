import { useCallback, useState } from "react";
import type { WalletClient } from "viem";
import { publicClient } from "../../../blockchain/viem";
import { TONTINE_ABI, TONTINE_ESCROW_ABI } from "../abi";
import { TONTINE_CONTRACT_ADDRESS, TONTINE_ESCROW_CONTRACT_ADDRESS, USDT_DECIMALS } from "../config";

type WriteResult = { hash: `0x${string}` } | null;
type CreateTontineResult = { hash: `0x${string}`; tontineId: number; blockNumber?: number } | null;
type TxState = "idle" | "confirming" | "success" | "error";

type UseTontineWriteState = {
  createTontine: (
    contributionAmount: string,
    frequencySeconds: number,
    collateralAmount: string,
  ) => Promise<CreateTontineResult>;
  /** Uses TontineEscrow contract when VITE_TONTINE_ESCROW_CONTRACT_ADDRESS is set. */
  createTontineWithEscrow: (
    contributionAmount: string,
    frequencySeconds: number,
    collateralAmount: string,
    serviceProvider: `0x${string}`,
  ) => Promise<CreateTontineResult>;
  joinTontine: (tontineId: number) => Promise<WriteResult>;
  payContribution: (tontineId: number) => Promise<WriteResult>;
  withdraw: () => Promise<WriteResult>;
  releaseFunds: (escrowId: number) => Promise<WriteResult>;
  txState: TxState;
  txError: string | null;
  resetTx: () => void;
};

function parseUsdt(amount: string): bigint {
  const n = Number(amount);
  if (!Number.isFinite(n) || n < 0) return 0n;
  return BigInt(Math.round(n * 10 ** USDT_DECIMALS));
}

export function useTontineWrite(walletClient: WalletClient | null): UseTontineWriteState {
  const [txState, setTxState] = useState<TxState>("idle");
  const [txError, setTxError] = useState<string | null>(null);

  const resetTx = useCallback(() => {
    setTxState("idle");
    setTxError(null);
  }, []);

  const write = useCallback(
    async (
      fn: "createTontine" | "joinTontine" | "payContribution" | "withdraw" | "releaseFunds",
      args: unknown[],
      useEscrowContract = false,
    ): Promise<WriteResult> => {
      const address = useEscrowContract ? TONTINE_ESCROW_CONTRACT_ADDRESS : TONTINE_CONTRACT_ADDRESS;
      const abi = useEscrowContract ? TONTINE_ESCROW_ABI : TONTINE_ABI;
      if (!address || !walletClient) {
        setTxError(useEscrowContract ? "Escrow contract not configured or wallet not connected" : "Connect your wallet");
        setTxState("error");
        return null;
      }
      const accounts = await walletClient.getAddresses?.();
      const account = walletClient.account ?? accounts?.[0];
      if (!account) {
        setTxError("Connect your wallet");
        setTxState("error");
        return null;
      }
      setTxState("confirming");
      setTxError(null);
      try {
        const hash = await walletClient.writeContract({
          address,
          abi,
          functionName: fn,
          args: args as never[],
          account,
        });
        setTxState("success");
        return { hash };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Transaction failed";
        setTxError(msg);
        setTxState("error");
        return null;
      }
    },
    [walletClient],
  );

  const createTontine = useCallback(
    async (
      contributionAmount: string,
      frequencySeconds: number,
      collateralAmount: string,
    ): Promise<CreateTontineResult> => {
      const hashResult = await write("createTontine", [
        parseUsdt(contributionAmount),
        BigInt(frequencySeconds),
        parseUsdt(collateralAmount),
      ]);
      if (!hashResult?.hash) return null;
      if (!TONTINE_CONTRACT_ADDRESS) return { hash: hashResult.hash, tontineId: -1 };
      const readLatestId = async (): Promise<number> => {
        const nextId = await publicClient.readContract({
          address: TONTINE_CONTRACT_ADDRESS,
          abi: TONTINE_ABI,
          functionName: "nextTontineId",
        });
        return Number(nextId) - 1;
      };
      try {
        await publicClient.waitForTransactionReceipt({ hash: hashResult.hash });
        await new Promise((r) => setTimeout(r, 1000));
        let latestTontineId = await readLatestId();
        if (latestTontineId < 0) {
          await new Promise((r) => setTimeout(r, 1500));
          latestTontineId = await readLatestId();
        }
        const receipt = await publicClient.getTransactionReceipt({ hash: hashResult.hash });
        const blockNumber = receipt?.blockNumber != null ? Number(receipt.blockNumber) : undefined;
        if (latestTontineId >= 0) {
          return { hash: hashResult.hash, tontineId: latestTontineId, blockNumber };
        }
      } catch {
        try {
          await new Promise((r) => setTimeout(r, 2000));
          const latestTontineId = await readLatestId();
          const receipt = await publicClient.getTransactionReceipt({ hash: hashResult.hash });
          const blockNumber = receipt?.blockNumber != null ? Number(receipt.blockNumber) : undefined;
          if (latestTontineId >= 0) return { hash: hashResult.hash, tontineId: latestTontineId, blockNumber };
        } catch {
          // ignore
        }
      }
      return { hash: hashResult.hash, tontineId: -1 };
    },
    [write],
  );

  const createTontineWithEscrow = useCallback(
    async (
      contributionAmount: string,
      frequencySeconds: number,
      collateralAmount: string,
      serviceProvider: `0x${string}`,
    ): Promise<CreateTontineResult> => {
      if (!TONTINE_ESCROW_CONTRACT_ADDRESS) return null;
      const hashResult = await write(
        "createTontine",
        [
          parseUsdt(contributionAmount),
          BigInt(frequencySeconds),
          parseUsdt(collateralAmount),
          serviceProvider,
        ],
        true,
      );
      if (!hashResult?.hash) return null;
      try {
        await publicClient.waitForTransactionReceipt({ hash: hashResult.hash });
        await new Promise((r) => setTimeout(r, 800));
        const nextId = await publicClient.readContract({
          address: TONTINE_ESCROW_CONTRACT_ADDRESS,
          abi: TONTINE_ESCROW_ABI,
          functionName: "nextTontineId",
        });
        const latestTontineId = Number(nextId) - 1;
        const receipt = await publicClient.getTransactionReceipt({ hash: hashResult.hash });
        const blockNumber = receipt?.blockNumber != null ? Number(receipt.blockNumber) : undefined;
        if (latestTontineId >= 0) {
          return { hash: hashResult.hash, tontineId: latestTontineId, blockNumber };
        }
      } catch {
        // ignore
      }
      return { hash: hashResult.hash, tontineId: -1 };
    },
    [write],
  );

  const joinTontine = useCallback(
    async (tontineId: number): Promise<WriteResult> => write("joinTontine", [tontineId]),
    [write],
  );

  const payContribution = useCallback(
    async (tontineId: number): Promise<WriteResult> => write("payContribution", [tontineId]),
    [write],
  );

  const withdraw = useCallback(async (): Promise<WriteResult> => write("withdraw", []), [write]);

  const releaseFunds = useCallback(
    async (escrowId: number): Promise<WriteResult> => write("releaseFunds", [escrowId], true),
    [write],
  );

  return {
    createTontine,
    createTontineWithEscrow,
    joinTontine,
    payContribution,
    withdraw,
    releaseFunds,
    txState,
    txError,
    resetTx,
  };
}
