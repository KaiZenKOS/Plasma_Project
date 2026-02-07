import { useCallback, useState } from "react";
import { getContract, type WalletClient } from "viem";
import { publicClient } from "../../../blockchain/viem";
import { TONTINE_ABI } from "../abi";
import { TONTINE_CONTRACT_ADDRESS, USDT_DECIMALS } from "../config";

type WriteResult = { hash: `0x${string}` } | null;
type TxState = "idle" | "confirming" | "success" | "error";

type UseTontineWriteState = {
  createTontine: (
    contributionAmount: string,
    frequencySeconds: number,
    collateralAmount: string,
  ) => Promise<WriteResult>;
  joinTontine: (tontineId: number) => Promise<WriteResult>;
  payContribution: (tontineId: number) => Promise<WriteResult>;
  withdraw: () => Promise<WriteResult>;
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
    async (fn: "createTontine" | "joinTontine" | "payContribution" | "withdraw", args: unknown[]): Promise<WriteResult> => {
      if (!TONTINE_CONTRACT_ADDRESS || !walletClient) {
        setTxError("Connect your wallet");
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
          address: TONTINE_CONTRACT_ADDRESS,
          abi: TONTINE_ABI,
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
    ): Promise<WriteResult> =>
      write("createTontine", [
        parseUsdt(contributionAmount),
        BigInt(frequencySeconds),
        parseUsdt(collateralAmount),
      ]),
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

  return {
    createTontine,
    joinTontine,
    payContribution,
    withdraw,
    txState,
    txError,
    resetTx,
  };
}
