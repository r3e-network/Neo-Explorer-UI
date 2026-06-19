import { describe, expect, it } from "vitest";

import {
  createSimulationFaultError,
  explainTransactionError,
  explainTransactionSimulation,
  isSimulationFault,
} from "@/utils/transactionSimulation";

describe("transactionSimulation", () => {
  it("identifies FAULT simulation results and explains the exception", () => {
    const result = {
      state: "FAULT",
      gasconsumed: "90210",
      exception: "ABORT: insufficient balance for transfer",
    };

    const explanation = explainTransactionSimulation(result, { operation: "transfer" });

    expect(isSimulationFault(result)).toBe(true);
    expect(explanation).toMatchObject({
      ok: false,
      state: "FAULT",
      category: "balance",
      severity: "error",
      title: "Simulation failed before wallet signing",
      action: "Check the sender balance and transfer amount, then try again.",
      gasConsumed: "90210",
      operation: "transfer",
    });
    expect(explanation.summary).toContain("insufficient balance");
    expect(explanation.details).toContain("ABORT: insufficient balance for transfer");
  });

  it("explains signer and CheckWitness faults with a wallet-focused action", () => {
    const explanation = explainTransactionSimulation({
      vmstate: "FAULT",
      exception: "CheckWitness failed: signer is invalid",
    });

    expect(explanation.category).toBe("signer");
    expect(explanation.action).toBe("Confirm the connected wallet account and signer scope match what this contract expects.");
  });

  it("wraps FAULT simulation results into an error consumable by UI state", () => {
    const err = createSimulationFaultError({
      state: "FAULT",
      exception: "Method not found",
    }, { operation: "mint" });

    expect(err.message).toContain("Method not found");
    expect(err.invokeResult.state).toBe("FAULT");
    expect(err.simulationExplanation.operation).toBe("mint");
  });

  it("normalizes wallet rejection errors into the same explanation model", () => {
    const explanation = explainTransactionError(new Error("User rejected the request"));

    expect(explanation).toMatchObject({
      ok: false,
      category: "user_rejected",
      severity: "warning",
      title: "Wallet request was rejected",
      action: "Open the wallet prompt again when you are ready to sign.",
    });
  });
});
