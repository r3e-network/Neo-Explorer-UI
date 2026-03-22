import { beforeEach, describe, expect, it, vi } from "vitest";
import { wallet, u } from "@cityofzion/neon-js";

describe("chatAuth helpers", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv("CHAT_SESSION_SECRET", "test-chat-secret");
  });

  it("canonicalizes peer rooms by sorted address pairs", async () => {
    const { canonicalizeParticipantPair } = await import("../../api/lib/chatAuth.js");
    const pair = canonicalizeParticipantPair(
      "NZgtM6nRnMNe86ce8f2UVHAeUismyG157h",
      "NiYfNbJXhHs9WvuP2PWR5RFR9VCjdGn69w"
    );

    expect(pair).toEqual([
      "NiYfNbJXhHs9WvuP2PWR5RFR9VCjdGn69w",
      "NZgtM6nRnMNe86ce8f2UVHAeUismyG157h",
    ]);
  });

  it("signs and verifies chat session payloads", async () => {
    const { signPayload, verifySignedPayload } = await import("../../api/lib/chatAuth.js");
    const token = signPayload({ address: "NiYfNbJXhHs9WvuP2PWR5RFR9VCjdGn69w", exp: 123 });

    expect(verifySignedPayload(token)).toEqual({
      address: "NiYfNbJXhHs9WvuP2PWR5RFR9VCjdGn69w",
      exp: 123,
    });
  });

  it("verifies a Neo signed login challenge against the claimed address", async () => {
    const privateKey = wallet.generatePrivateKey();
    const wif = wallet.getWIFFromPrivateKey(privateKey);
    const account = new wallet.Account(wif);
    const message = "Neo Explorer Chat Login\nAddress: " + account.address;
    const signature = wallet.sign(u.str2hexstring(message), wif);

    const { verifyChallengeSignature } = await import("../../api/lib/chatAuth.js");

    expect(
      verifyChallengeSignature({
        message,
        signature,
        publicKey: account.publicKey,
        address: account.address,
      })
    ).toBe(true);
  });
});
