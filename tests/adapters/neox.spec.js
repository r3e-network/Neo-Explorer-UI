import { describe, it, expect } from "vitest";
import {
  toXBlock,
  toXTransaction,
  toXAddress,
  toXToken,
  toXPage,
  toXAddressInfo,
  toXLog,
  toXInternalTx,
  toXStateChange,
  toXTokenInstance,
  toXHolder,
  toXCounters,
} from "../../src/adapters/neox/index.js";

// Representative Blockscout v2 payloads (shapes verified against
// xexplorer.neo.org/api/v2 during design).

describe("adapters/neox toXBlock", () => {
  const raw = {
    height: 7146105,
    hash: "0xabc123",
    timestamp: "2026-07-19T06:50:42.000000Z",
    transactions_count: 3,
    gas_used: "187147781",
    gas_limit: "30000000",
    base_fee_per_gas: "42940000000",
    parent_hash: "0xparent",
    miner: { hash: "0xminer" },
    size: 1234,
  };

  it("maps Blockscout block fields to the canonical Block + EVM extensions", () => {
    const block = toXBlock(raw);
    expect(block.index).toBe(7146105);
    expect(block.hash).toBe("0xabc123");
    expect(block.timestampMs).toBe(Date.parse("2026-07-19T06:50:42.000000Z"));
    expect(block.txCount).toBe(3);
    expect(block.prevHash).toBe("0xparent");
    expect(block.gasUsed).toBe("187147781");
    expect(block.gasLimit).toBe("30000000");
    expect(block.baseFeePerGas).toBe("42940000000");
    expect(block.miner).toBe("0xminer");
    expect(block.size).toBe(1234);
    expect(block.raw).toBe(raw);
  });

  it("returns null for non-object input", () => {
    expect(toXBlock(null)).toBeNull();
    expect(toXBlock(undefined)).toBeNull();
  });
});

describe("adapters/neox toXTransaction", () => {
  it("handles object-shaped from/to and fee wrappers", () => {
    const tx = toXTransaction({
      hash: "0xdef",
      block: 7146100,
      timestamp: "2026-07-19T06:48:44.000000Z",
      from: { hash: "0xfrom" },
      to: { hash: "0xto" },
      value: "0",
      fee: { type: "actual", value: "5570332160000000" },
      method: "transmit",
      status: "ok",
    });
    expect(tx.hash).toBe("0xdef");
    expect(tx.blockIndex).toBe(7146100);
    expect(tx.sender).toBe("0xfrom");
    expect(tx.to).toBe("0xto");
    expect(tx.value).toBe("0");
    expect(tx.fee).toBe("5570332160000000");
    expect(tx.method).toBe("transmit");
    expect(tx.status).toBe("ok");
  });

  it("handles string-shaped from/to and scalar fee (main-page shape)", () => {
    const tx = toXTransaction({
      hash: "0xghi",
      from: "0xfrom2",
      to: "0xto2",
      value: "0",
      fee: 5570332160000000,
      status: "ok",
    });
    expect(tx.sender).toBe("0xfrom2");
    expect(tx.to).toBe("0xto2");
    expect(tx.fee).toBe("5570332160000000");
  });
});

describe("adapters/neox toXAddress", () => {
  it("maps address fields and falls back to the requested address", () => {
    const account = toXAddress(
      {
        hash: "0xcontract",
        coin_balance: "0",
        is_contract: true,
        is_verified: true,
        name: "CommitStore",
        creation_transaction_hash: "0xcreate",
      },
      "0xrequested",
    );
    expect(account.address).toBe("0xcontract");
    expect(account.isContract).toBe(true);
    expect(account.isVerified).toBe(true);
    expect(account.name).toBe("CommitStore");
    expect(account.creationTxHash).toBe("0xcreate");

    const fallback = toXAddress({ coin_balance: "1" }, "0xrequested");
    expect(fallback.address).toBe("0xrequested");
  });
});

describe("adapters/neox toXToken", () => {
  it("normalizes the ERC standard and holder count", () => {
    const token = toXToken({
      address: "0xtoken",
      symbol: "CAP",
      name: "Cap Token",
      decimals: "18",
      type: "ERC-20",
      total_supply: "1000000",
      holders: "42",
    });
    expect(token.contractHash).toBe("0xtoken");
    expect(token.symbol).toBe("CAP");
    expect(token.decimals).toBe(18);
    expect(token.standard).toBe("ERC20");
    expect(token.totalSupply).toBe("1000000");
    expect(token.holders).toBe(42);
  });
});

describe("adapters/neox toXPage", () => {
  it("adapts a Blockscout list envelope into a cursor page", () => {
    const page = toXPage(
      {
        items: [{ height: 2, hash: "0x2" }, { height: 1, hash: "0x1" }],
        next_page_params: { block_number: 0, items_count: 50 },
      },
      toXBlock,
    );
    expect(page.items).toHaveLength(2);
    expect(page.items[0].index).toBe(2);
    expect(page.nextPageParams).toEqual({ block_number: 0, items_count: 50 });
  });

  it("returns an empty page with null cursor when items are absent", () => {
    const page = toXPage(null, toXBlock);
    expect(page.items).toEqual([]);
    expect(page.nextPageParams).toBeNull();
  });
});

describe("adapters/neox toXAddressInfo", () => {
  it("normalizes a rich Blockscout address object", () => {
    const raw = {
      hash: "0x1212000000000000000000000000000000000003",
      name: "ERC1967Proxy",
      is_contract: true,
      is_verified: true,
      is_scam: false,
      proxy_type: "eip1967",
      implementations: [{ address: "0xImpl" }],
    };
    const info = toXAddressInfo(raw);
    expect(info.hash).toBe("0x1212000000000000000000000000000000000003");
    expect(info.name).toBe("ERC1967Proxy");
    expect(info.isContract).toBe(true);
    expect(info.isVerified).toBe(true);
    expect(info.isScam).toBe(false);
    expect(info.proxyType).toBe("eip1967");
    expect(info.implementations).toHaveLength(1);
    expect(info.raw).toBe(raw);
  });

  it("wraps a bare hash string with default flags", () => {
    const info = toXAddressInfo("0xabc");
    expect(info.hash).toBe("0xabc");
    expect(info.name).toBeNull();
    expect(info.isContract).toBe(false);
    expect(info.isScam).toBe(false);
  });

  it("returns null for empty input or an object without a hash", () => {
    expect(toXAddressInfo(null)).toBeNull();
    expect(toXAddressInfo(undefined)).toBeNull();
    expect(toXAddressInfo({ name: "no-hash" })).toBeNull();
  });
});

describe("adapters/neox toXBlock extensions", () => {
  it("exposes gas/burn percentages, fee aggregates, counts, nonce and difficulty", () => {
    const raw = {
      height: 7147912,
      hash: "0xblock",
      timestamp: "2026-07-19T06:50:42.000000Z",
      transactions_count: 1,
      gas_used: "119204",
      gas_limit: "60000000",
      gas_used_percentage: 0.198,
      base_fee_per_gas: "20000000000",
      burnt_fees: "2384080000000000",
      burnt_fees_percentage: 39.03,
      priority_fee: "3723605502576",
      transaction_fees: "6108542755502576",
      internal_transactions_count: 9,
      withdrawals_count: 0,
      nonce: "0x0000000000000003",
      difficulty: "2",
      miner: { hash: "0x1212000000000000000000000000000000000003", name: "ERC1967Proxy", is_verified: true },
    };
    const block = toXBlock(raw);
    expect(block.gasUsedPercentage).toBe(0.198);
    expect(block.burntFees).toBe("2384080000000000");
    expect(block.burntFeesPercentage).toBe(39.03);
    expect(block.priorityFee).toBe("3723605502576");
    expect(block.transactionFees).toBe("6108542755502576");
    expect(block.internalTransactionsCount).toBe(9);
    expect(block.withdrawalsCount).toBe(0);
    expect(block.nonce).toBe("0x0000000000000003");
    expect(block.primaryIndex).toBe(3);
    expect(block.difficulty).toBe("2");
    expect(block.miner).toBe("0x1212000000000000000000000000000000000003");
    expect(block.minerInfo.name).toBe("ERC1967Proxy");
    expect(block.minerInfo.isVerified).toBe(true);
  });

  it("defaults the new numeric extensions when fields are absent", () => {
    const block = toXBlock({ height: 1, hash: "0x1" });
    expect(block.gasUsedPercentage).toBeNull();
    expect(block.burntFeesPercentage).toBeNull();
    expect(block.internalTransactionsCount).toBe(0);
    expect(block.withdrawalsCount).toBe(0);
    expect(block.primaryIndex).toBeNull();
    expect(block.minerInfo).toBeNull();
  });

  it("rejects malformed or unsafe primary-index nonces", () => {
    expect(toXBlock({ height: 1, nonce: "not-hex" }).primaryIndex).toBeNull();
    expect(toXBlock({ height: 1, nonce: "0x20000000000000" }).primaryIndex).toBeNull();
  });
});

describe("adapters/neox toXTransaction extensions", () => {
  const raw = {
    hash: "0xe694",
    block_number: 7147912,
    timestamp: "2026-07-19T06:50:42.000000Z",
    from: { hash: "0xfrom", name: "Transmitter", is_contract: false, is_verified: false, is_scam: false },
    to: { hash: "0xto", name: "CommitStore", is_contract: true, is_verified: true, proxy_type: "eip1967" },
    value: "0",
    fee: { type: "actual", value: "6108542755502576" },
    type: 2,
    nonce: 7504,
    position: 0,
    gas_limit: "500000",
    gas_used: "119204",
    gas_price: "51244000000",
    max_fee_per_gas: "60000000000",
    max_priority_fee_per_gas: "31244000000",
    priority_fee: "3723605502576",
    transaction_burnt_fee: "2384080000000000",
    base_fee_per_gas: "20000000000",
    confirmations: 7,
    confirmation_duration: [0, 8758.0],
    revert_reason: null,
    transaction_types: ["contract_call"],
    has_error_in_internal_transactions: false,
    decoded_input: { method_call: "transmit(bytes32[3] reportContext)", method_id: "b1dc65a4", parameters: [] },
    raw_input: "0xb1dc65a4",
    token_transfers: [{ token: { symbol: "WGAS10" } }],
    method: "transmit",
    status: "ok",
  };

  it("exposes EIP-1559 gas fields, decoded input and confirmation metadata", () => {
    const tx = toXTransaction(raw);
    expect(tx.txType).toBe(2);
    expect(tx.nonce).toBe(7504);
    expect(tx.position).toBe(0);
    expect(tx.gasLimit).toBe("500000");
    expect(tx.maxFeePerGas).toBe("60000000000");
    expect(tx.maxPriorityFeePerGas).toBe("31244000000");
    expect(tx.priorityFee).toBe("3723605502576");
    expect(tx.burntFee).toBe("2384080000000000");
    expect(tx.baseFeePerGas).toBe("20000000000");
    expect(tx.confirmations).toBe(7);
    expect(tx.confirmationDuration).toEqual([0, 8758.0]);
    expect(tx.revertReason).toBeNull();
    expect(tx.transactionTypes).toEqual(["contract_call"]);
    expect(tx.hasErrorInInternalTransactions).toBe(false);
    expect(tx.decodedInput.method_id).toBe("b1dc65a4");
    expect(tx.rawInput).toBe("0xb1dc65a4");
    expect(tx.tokenTransfers).toHaveLength(1);
  });

  it("exposes rich from/to info objects for name tags and badges", () => {
    const tx = toXTransaction(raw);
    expect(tx.fromInfo.hash).toBe("0xfrom");
    expect(tx.fromInfo.name).toBe("Transmitter");
    expect(tx.toInfo.name).toBe("CommitStore");
    expect(tx.toInfo.isContract).toBe(true);
    expect(tx.toInfo.isVerified).toBe(true);
    expect(tx.toInfo.proxyType).toBe("eip1967");
  });

  it("defaults the new extensions for the lean main-page tx shape", () => {
    const tx = toXTransaction({ hash: "0xlean", from: "0xf", to: "0xt", value: "0" });
    expect(tx.txType).toBeNull();
    expect(tx.nonce).toBeNull();
    expect(tx.decodedInput).toBeNull();
    expect(tx.rawInput).toBeNull();
    expect(tx.confirmations).toBe(0);
    expect(tx.confirmationDuration).toBeNull();
    expect(tx.tokenTransfers).toEqual([]);
    expect(tx.hasErrorInInternalTransactions).toBe(false);
    expect(tx.fromInfo.hash).toBe("0xf");
    expect(tx.toInfo.hash).toBe("0xt");
    expect(tx.createdContract).toBeNull();
  });
});

describe("adapters/neox toXAddress extensions", () => {
  it("exposes scam/reputation/proxy metadata and has_* tab flags", () => {
    const account = toXAddress({
      hash: "0xaddr",
      coin_balance: "86839121325244284939",
      is_contract: true,
      is_verified: true,
      is_scam: false,
      reputation: "ok",
      proxy_type: "eip1967",
      has_logs: true,
      has_token_transfers: true,
      has_tokens: false,
      has_validated_blocks: false,
    });
    expect(account.isScam).toBe(false);
    expect(account.reputation).toBe("ok");
    expect(account.proxyType).toBe("eip1967");
    expect(account.hasLogs).toBe(true);
    expect(account.hasTokenTransfers).toBe(true);
    expect(account.hasTokens).toBe(false);
    expect(account.hasValidatedBlocks).toBe(false);
  });
});

describe("adapters/neox toXLog", () => {
  it("maps index, address info, topics, data and decoded event", () => {
    const raw = {
      index: 477,
      address: { hash: "0xwgas", name: "WGAS10", is_verified: true },
      topics: ["0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925", "0x00000000000000000000000000c67f", null],
      data: "0xffff",
      decoded: { method_call: "Approval(address indexed owner, address indexed spender, uint256 value)", method_id: "8c5be1e5", parameters: [] },
      block_number: 7147912,
      block_timestamp: "2026-07-19T06:50:42.000000Z",
    };
    const log = toXLog(raw);
    expect(log.index).toBe(477);
    expect(log.address.name).toBe("WGAS10");
    expect(log.address.isVerified).toBe(true);
    expect(log.topics).toHaveLength(2); // trailing null slot dropped
    expect(log.data).toBe("0xffff");
    expect(log.decoded.method_id).toBe("8c5be1e5");
    expect(log.blockNumber).toBe(7147912);
    expect(log.blockTimestampMs).toBe(Date.parse("2026-07-19T06:50:42.000000Z"));
    expect(log.raw).toBe(raw);
  });

  it("returns null for non-object input", () => {
    expect(toXLog(null)).toBeNull();
  });
});

describe("adapters/neox toXInternalTx", () => {
  it("maps call type, rich endpoints, value and outcome", () => {
    const raw = {
      type: "delegatecall",
      from: { hash: "0xproxy", name: "ERC1967Proxy", is_contract: true },
      to: { hash: "0ximpl", is_contract: true },
      value: "15345247109282497960",
      gas_limit: "253968",
      success: true,
      error: null,
      index: 3,
      block_number: 7147912,
      transaction_hash: "0xfa2f",
      created_contract: null,
    };
    const itx = toXInternalTx(raw);
    expect(itx.type).toBe("delegatecall");
    expect(itx.from.name).toBe("ERC1967Proxy");
    expect(itx.to.hash).toBe("0ximpl");
    expect(itx.value).toBe("15345247109282497960");
    expect(itx.gasLimit).toBe("253968");
    expect(itx.success).toBe(true);
    expect(itx.error).toBeNull();
    expect(itx.index).toBe(3);
    expect(itx.blockNumber).toBe(7147912);
    expect(itx.transactionHash).toBe("0xfa2f");
    expect(itx.createdContract).toBeNull();
  });

  it("captures a create call's deployed contract and failure error", () => {
    const itx = toXInternalTx({
      type: "create",
      from: "0xdeployer",
      to: null,
      value: "0",
      success: false,
      error: "out of gas",
      created_contract: { hash: "0xnew", is_contract: true },
      index: 0,
    });
    expect(itx.type).toBe("create");
    expect(itx.to).toBeNull();
    expect(itx.success).toBe(false);
    expect(itx.error).toBe("out of gas");
    expect(itx.createdContract.hash).toBe("0xnew");
  });
});

describe("adapters/neox toXStateChange", () => {
  it("maps coin balance diffs with signed change strings", () => {
    const change = toXStateChange({
      address: { hash: "0xacct" },
      type: "coin",
      balance_before: "2327273824421272377772",
      balance_after: "2311928577311989879812",
      change: "-15345247109282497960",
      is_miner: false,
      token: null,
      token_id: null,
    });
    expect(change.address.hash).toBe("0xacct");
    expect(change.type).toBe("coin");
    expect(change.balanceBefore).toBe("2327273824421272377772");
    expect(change.balanceAfter).toBe("2311928577311989879812");
    expect(change.change).toBe("-15345247109282497960");
    expect(change.isMiner).toBe(false);
    expect(change.token).toBeNull();
  });

  it("keeps token rows and structured NFT change arrays intact", () => {
    const nftChange = [{ direction: "from", total: { token_id: "6" } }];
    const change = toXStateChange({
      address: { hash: "0xacct" },
      type: "token",
      token: { symbol: "WGAS10", type: "ERC-20" },
      change: nftChange,
      is_miner: true,
      token_id: "6",
    });
    expect(change.type).toBe("token");
    expect(change.token.symbol).toBe("WGAS10");
    expect(change.change).toBe(nftChange);
    expect(change.isMiner).toBe(true);
    expect(change.tokenId).toBe("6");
  });
});

describe("adapters/neox toXTokenInstance", () => {
  it("maps NFT id, media, metadata and owner", () => {
    const raw = {
      id: 6,
      image_url: "https://ipfs.io/ipfs/QmdXxi",
      metadata: { name: "Ghost #6", description: "desc", image: "ipfs://img", attributes: [{ trait_type: "bg", value: "red" }] },
      animation_url: null,
      media_url: "https://ipfs.io/ipfs/QmdXxi",
      media_type: "image/png",
      thumbnails: null,
      owner: { hash: "0xowner", is_contract: false },
      is_unique: true,
    };
    const instance = toXTokenInstance(raw);
    expect(instance.id).toBe("6");
    expect(instance.imageUrl).toBe("https://ipfs.io/ipfs/QmdXxi");
    expect(instance.metadata.name).toBe("Ghost #6");
    expect(instance.mediaType).toBe("image/png");
    expect(instance.owner.hash).toBe("0xowner");
    expect(instance.isUnique).toBe(true);
  });

  it("tolerates metadata-less instances (common on Neo X)", () => {
    const instance = toXTokenInstance({ id: "42", metadata: null, image_url: null, owner: null });
    expect(instance.id).toBe("42");
    expect(instance.metadata).toBeNull();
    expect(instance.imageUrl).toBeNull();
    expect(instance.owner).toBeNull();
  });
});

describe("adapters/neox toXHolder", () => {
  it("maps holder address info, balance and optional token id", () => {
    const holder = toXHolder({
      address: { hash: "0xwhale", name: null, is_contract: false },
      value: "1000000000000000000000",
      token_id: null,
    });
    expect(holder.address.hash).toBe("0xwhale");
    expect(holder.value).toBe("1000000000000000000000");
    expect(holder.tokenId).toBeNull();
  });
});

describe("adapters/neox toXCounters", () => {
  it("normalizes address counters (numeric strings) to numbers", () => {
    const counters = toXCounters({
      transactions_count: "7506",
      token_transfers_count: "0",
      gas_usage_count: "807406251",
      validations_count: "0",
    });
    expect(counters.transactionsCount).toBe(7506);
    expect(counters.tokenTransfersCount).toBe(0);
    expect(counters.gasUsageCount).toBe(807406251);
    expect(counters.validationsCount).toBe(0);
  });

  it("normalizes token counters", () => {
    const counters = toXCounters({ token_holders_count: "202", transfers_count: "15986" });
    expect(counters.tokenHoldersCount).toBe(202);
    expect(counters.transfersCount).toBe(15986);
  });

  it("returns null for non-object input", () => {
    expect(toXCounters(null)).toBeNull();
  });
});
