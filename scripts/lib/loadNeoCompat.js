let neonCompatPromise = null;

function hexToBytes(value) {
  const normalized = String(value || "").replace(/^0x/i, "");
  return Uint8Array.from(Buffer.from(normalized, "hex"));
}

function toSignedTransactionHex(value) {
  if (typeof value === "string") return value;
  if (value && typeof value.serialize === "function") {
    return value.serialize(true);
  }
  if (value && typeof value.tx === "string") {
    return value.tx;
  }
  return value;
}

async function loadNeoCompat() {
  if (!neonCompatPromise) {
    neonCompatPromise = import("@r3e/neo-js-sdk/browser").then((sdk) => {
      class Query {
        constructor({ method, params = [] } = {}) {
          this.method = method;
          this.params = Array.isArray(params) ? params : [];
        }
      }

      class CompatRPCClient extends sdk.rpc.RPCClient {
        async execute(query) {
          return this.send(query?.method, query?.params || []);
        }

        async invokeScript(scriptOrInput, signers = []) {
          if (
            scriptOrInput &&
            typeof scriptOrInput === "object" &&
            Object.prototype.hasOwnProperty.call(scriptOrInput, "script")
          ) {
            return super.invokeScript(scriptOrInput);
          }
          return super.invokeScript({ script: scriptOrInput, signers });
        }

        async calculateNetworkFee(txOrInput) {
          return super.calculateNetworkFee({ tx: toSignedTransactionHex(txOrInput) });
        }

        async sendRawTransaction(txOrInput) {
          return super.sendRawTransaction({ tx: toSignedTransactionHex(txOrInput) });
        }

        async getApplicationLog(hashOrInput) {
          if (typeof hashOrInput === "string") {
            return super.getApplicationLog({ hash: hashOrInput });
          }
          return super.getApplicationLog(hashOrInput);
        }

        async getNep17Balances(accountOrInput) {
          if (typeof accountOrInput === "string") {
            return super.getNep17Balances({ account: accountOrInput });
          }
          return super.getNep17Balances(accountOrInput);
        }

        async getStorage(scriptHashOrInput, key) {
          if (arguments.length >= 2) {
            return super.getStorage({ scriptHash: scriptHashOrInput, key });
          }
          return super.getStorage(scriptHashOrInput);
        }

        async getBlockHeader(locatorOrInput, verbose) {
          if (
            arguments.length >= 2 ||
            typeof locatorOrInput === "string" ||
            typeof locatorOrInput === "number"
          ) {
            return super.getBlockHeader({ indexOrHash: locatorOrInput, verbose });
          }
          return super.getBlockHeader(locatorOrInput);
        }
      }

      class CompatAccount extends sdk.wallet.Account {
        get publicKey() {
          return super.publicKey.toString();
        }
      }

      class CompatTransaction extends sdk.tx.Transaction {
        addWitness(witness) {
          this.witnesses.push(witness);
          return this;
        }
      }

      class CompatWitness extends sdk.tx.Witness {
        static buildMultiSig(_signPayload, signatures, multisigAccount) {
          const builder = new sdk.sc.ScriptBuilder();
          for (const signature of signatures) {
            builder.emitPush(sdk.u.HexString.fromHex(signature));
          }

          return new CompatWitness({
            invocationScript: builder.build(),
            verificationScript: sdk.u.HexString.fromBase64(multisigAccount.contract.script).toBigEndian(),
          });
        }
      }

      class CompatScriptBuilder extends sdk.sc.ScriptBuilder {
        emitAppCall(contractHash, operation, args = [], callFlags = sdk.sc.CallFlags.All) {
          return this.emitContractCall(contractHash, operation, callFlags, args);
        }
      }

      const BigInteger = {
        fromNumber(value) {
          return BigInt(value);
        },
        fromString(value) {
          return BigInt(String(value));
        },
      };

      const wallet = {
        ...sdk.wallet,
        Account: CompatAccount,
        sign(messageHex, privateKeyLike) {
          return new CompatAccount(privateKeyLike).sign(messageHex);
        },
        verify(messageHex, signatureHex, publicKey) {
          return new sdk.PublicKey(String(publicKey)).verify(
            hexToBytes(messageHex),
            hexToBytes(signatureHex),
          );
        },
      };

      const tx = {
        ...sdk.tx,
        Transaction: CompatTransaction,
        Witness: CompatWitness,
      };

      const sc = {
        ...sdk.sc,
        ScriptBuilder: CompatScriptBuilder,
      };

      const u = {
        ...sdk.u,
        BigInteger,
        base642hex(value) {
          return sdk.u.HexString.fromBase64(value).toBigEndian();
        },
        num2hexstring(value, bytes = 1, littleEndian = false) {
          const hex = BigInt(value).toString(16).padStart(bytes * 2, "0");
          return littleEndian ? sdk.u.reverseHex(hex) : hex;
        },
      };

      return {
        ...sdk,
        rpc: {
          ...sdk.rpc,
          Query,
          RPCClient: CompatRPCClient,
        },
        wallet,
        tx,
        sc,
        u,
      };
    });
  }

  return neonCompatPromise;
}

module.exports = {
  loadNeoCompat,
};
