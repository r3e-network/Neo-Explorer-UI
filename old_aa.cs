using System;
using System.ComponentModel;
using System.Numerics;
using Neo;
using Neo.SmartContract;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Native;
using Neo.SmartContract.Framework.Services;

namespace AbstractAccount
{
    [DisplayName("UnifiedSmartWallet")]
    [ManifestExtra("Author", "R3E Neo Explorer")]
    [ManifestExtra("Email", "jimmy@r3e.network")]
    [ManifestExtra("Description", "A global, unified permission-controlling abstract account gateway")]
    [ContractPermission("*", "*")]
    public class UnifiedSmartWallet : SmartContract
    {
        private static readonly byte[] DeployerKey = new byte[] { 0x00 };

        // Maps Prefixes
        private static readonly byte[] AdminsPrefix = new byte[] { 0x01 };
        private static readonly byte[] AdminThresholdPrefix = new byte[] { 0x02 };
        private static readonly byte[] ManagersPrefix = new byte[] { 0x03 };
        private static readonly byte[] ManagerThresholdPrefix = new byte[] { 0x04 };
        private static readonly byte[] WhitelistEnabledPrefix = new byte[] { 0x05 };
        private static readonly byte[] WhitelistPrefix = new byte[] { 0x06 };
        private static readonly byte[] BlacklistPrefix = new byte[] { 0x07 };
        private static readonly byte[] MaxTransferPrefix = new byte[] { 0x08 };
        private static readonly byte[] NoncePrefix = new byte[] { 0x09 };
        private static readonly byte[] MetaTxContextPrefix = new byte[] { 0xFF };

        // keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")
        private static readonly byte[] Eip712DomainTypeHash = new byte[]
        {
            0x8b, 0x73, 0xc3, 0xc6, 0x9b, 0xb8, 0xfe, 0x3d,
            0x51, 0x2e, 0xcc, 0x4c, 0xf7, 0x59, 0xcc, 0x79,
            0x23, 0x9f, 0x7b, 0x17, 0x9b, 0x0f, 0xfa, 0xca,
            0xa9, 0xa7, 0x5d, 0x52, 0x2b, 0x39, 0x40, 0x0f
        };

        // keccak256("Neo N3 Abstract Account")
        private static readonly byte[] Eip712NameHash = new byte[]
        {
            0x2e, 0x3d, 0x38, 0xea, 0x00, 0x55, 0xad, 0x99,
            0xb5, 0x57, 0x2e, 0x06, 0x66, 0x58, 0x43, 0x1f,
            0xf4, 0xc4, 0x0d, 0xba, 0xf3, 0xe1, 0x6e, 0x21,
            0x54, 0x63, 0x9d, 0xc6, 0xe2, 0x63, 0x48, 0x03
        };

        // keccak256("1")
        private static readonly byte[] Eip712VersionHash = new byte[]
        {
            0xc8, 0x9e, 0xfd, 0xaa, 0x54, 0xc0, 0xf2, 0x0c,
            0x7a, 0xdf, 0x61, 0x28, 0x82, 0xdf, 0x09, 0x50,
            0xf5, 0xa9, 0x51, 0x63, 0x7e, 0x03, 0x07, 0xcd,
            0xcb, 0x4c, 0x67, 0x2f, 0x29, 0x8b, 0x8b, 0xc6
        };

        // keccak256("MetaTransaction(address accountId,address targetContract,bytes32 methodHash,bytes32 argsHash,uint256 nonce,uint256 deadline)")
        private static readonly byte[] MetaTxTypeHash = new byte[]
        {
            0x49, 0x1e, 0xbf, 0x6d, 0x69, 0xd2, 0x65, 0xf4,
            0xc0, 0x29, 0xb7, 0xab, 0xdf, 0xbc, 0x37, 0x8b,
            0x45, 0x23, 0xf5, 0xb6, 0x98, 0x6d, 0xdd, 0xc2,
            0xe7, 0x58, 0x26, 0xdb, 0x76, 0x94, 0xb9, 0x36
        };

        public delegate void OnExecuteEvent(UInt160 accountId, UInt160 target, string method, object[] args);
        [DisplayName("Execute")]
        public static event OnExecuteEvent OnExecute = default!;

        public static void _deploy(object data, bool update)
        {
            if (update) return;
            var tx = (Transaction)Runtime.Transaction;
            Storage.Put(Storage.CurrentContext, DeployerKey, tx.Sender);
        }

        private static byte[] GetNonceKey(UInt160 accountId, UInt160 signer)
        {
            return Helper.Concat(Helper.Concat(NoncePrefix, accountId), signer);
        }

        public static BigInteger GetNonce(UInt160 signer)
        {
            return GetNonceForAccount(signer, signer);
        }

        public static BigInteger GetNonceForAccount(UInt160 accountId, UInt160 signer)
        {
            byte[] key = GetNonceKey(accountId, signer);
            ByteString data = Storage.Get(Storage.CurrentContext, key);
            return data == null ? 0 : (BigInteger)data;
        }

        private static void IncrementNonce(UInt160 accountId, UInt160 signer)
        {
            byte[] key = GetNonceKey(accountId, signer);
            BigInteger current = GetNonceForAccount(accountId, signer);
            Storage.Put(Storage.CurrentContext, key, current + 1);
        }

        [Safe]
        public static ByteString ComputeArgsHash(object[] args)
        {
            byte[] argsSerialized = (byte[])StdLib.Serialize(args);
            return CryptoLib.Keccak256((ByteString)argsSerialized);
        }

        public static object ExecuteMetaTx(
            UInt160 accountId,
            ByteString uncompressedPubKey,
            UInt160 targetContract,
            string method,
            object[] args,
            ByteString argsHash,
            BigInteger nonce,
            BigInteger deadline,
            ByteString signature)
        {
            UInt160 signerHash = DeriveEthAddress(uncompressedPubKey);
            if (accountId == UInt160.Zero || accountId == null)
            {
                accountId = signerHash;
            }
            AssertValidAccountId(accountId);

            ExecutionEngine.Assert(nonce >= 0, "Invalid nonce");
            ExecutionEngine.Assert(deadline > 0, "Invalid deadline");
            ExecutionEngine.Assert(Runtime.Time <= (ulong)deadline, "Signature expired");

            BigInteger currentNonce = GetNonceForAccount(accountId, signerHash);
            ExecutionEngine.Assert(nonce == currentNonce, "Invalid Nonce");

            byte[] providedArgsHash = ToBytes32(argsHash, "Invalid args hash length");
            byte[] expectedArgsHash = (byte[])ComputeArgsHash(args);
            ExecutionEngine.Assert(ByteArrayEquals(expectedArgsHash, providedArgsHash), "Invalid args hash");

            byte[] sigBytes = (byte[])signature;
            ExecutionEngine.Assert(sigBytes.Length == 64, "Invalid signature length");

            byte[] domainSeparator = BuildDomainSeparator(Runtime.GetNetwork(), Runtime.ExecutingScriptHash);
            byte[] structHash = BuildMetaTxStructHash(accountId, targetContract, method, providedArgsHash, nonce, deadline);
            byte[] typedDataPayload = ConcatBytes(new byte[] { 0x19, 0x01 }, domainSeparator, structHash);

            ECPoint compressedPubKey = CompressPubKey(uncompressedPubKey);

            bool isValid = CryptoLib.VerifyWithECDsa(
                (ByteString)typedDataPayload,
                compressedPubKey,
                signature,
                NamedCurveHash.secp256k1Keccak256
            );
            ExecutionEngine.Assert(isValid, "Invalid EIP-712 signature");

            IncrementNonce(accountId, signerHash);
            CheckPermissionsAndExecute(accountId, new UInt160[] { signerHash }, targetContract, method, args);
            OnExecute(accountId, targetContract, method, args);

            // Scope authenticated signer by account for this execution path.
            SetMetaTxContext(accountId, signerHash);
            object result = Contract.Call(targetContract, method, CallFlags.All, args);
            ClearMetaTxContext(accountId);

            return result;
        }

        public static object Execute(UInt160 accountId, UInt160 targetContract, string method, object[] args)
        {
            AssertValidAccountId(accountId);
            CheckPermissionsAndExecuteNative(accountId, targetContract, method, args);
            OnExecute(accountId, targetContract, method, args);
            return Contract.Call(targetContract, method, CallFlags.All, args);
        }

        private static byte[] BuildDomainSeparator(uint network, UInt160 verifyingContract)
        {
            byte[] encoded = ConcatBytes(
                Eip712DomainTypeHash,
                Eip712NameHash,
                Eip712VersionHash,
                ToUint256Word((BigInteger)network),
                ToAddressWord(verifyingContract)
            );
            return (byte[])CryptoLib.Keccak256((ByteString)encoded);
        }

        private static byte[] BuildMetaTxStructHash(
            UInt160 accountId,
            UInt160 targetContract,
            string method,
            byte[] argsHash,
            BigInteger nonce,
            BigInteger deadline)
        {
            byte[] methodHash = (byte[])CryptoLib.Keccak256((ByteString)method);
            byte[] encoded = ConcatBytes(
                MetaTxTypeHash,
                ToAddressWord(accountId),
                ToAddressWord(targetContract),
                methodHash,
                argsHash,
                ToUint256Word(nonce),
                ToUint256Word(deadline)
            );
            return (byte[])CryptoLib.Keccak256((ByteString)encoded);
        }

        private static byte[] ToAddressWord(UInt160 value)
        {
            byte[] address = (byte[])value;
            ExecutionEngine.Assert(address.Length == 20, "Invalid address length");
            byte[] result = new byte[32];
            for (int i = 0; i < 20; i++)
            {
                result[12 + i] = address[19 - i];
            }
            return result;
        }

        private static byte[] ToUint256Word(BigInteger value)
        {
            ExecutionEngine.Assert(value >= 0, "Invalid uint256");
            byte[] little = value.ToByteArray();
            int length = little.Length;
            if (length > 0 && little[length - 1] == 0)
            {
                length--;
            }
            ExecutionEngine.Assert(length <= 32, "uint256 overflow");

            byte[] result = new byte[32];
            for (int i = 0; i < length; i++)
            {
                result[31 - i] = little[i];
            }
            return result;
        }

        private static byte[] ToBytes32(ByteString value, string error)
        {
            byte[] raw = (byte[])value;
            ExecutionEngine.Assert(raw.Length == 32, error);
            return raw;
        }

        private static bool ByteArrayEquals(byte[] left, byte[] right)
        {
            if (left.Length != right.Length) return false;
            for (int i = 0; i < left.Length; i++)
            {
                if (left[i] != right[i]) return false;
            }
            return true;
        }

        private static byte[] ConcatBytes(params byte[][] chunks)
        {
            int total = 0;
            for (int i = 0; i < chunks.Length; i++)
            {
                total += chunks[i].Length;
            }

            byte[] result = new byte[total];
            int offset = 0;
            for (int i = 0; i < chunks.Length; i++)
            {
                byte[] chunk = chunks[i];
                for (int j = 0; j < chunk.Length; j++)
                {
                    result[offset + j] = chunk[j];
                }
                offset += chunk.Length;
            }
            return result;
        }

        private static void CheckPermissionsAndExecuteNative(UInt160 accountId, UInt160 targetContract, string method, object[] args)
        {
            bool isSelfSigned = Runtime.CheckWitness(accountId);
            if (!isSelfSigned)
            {
                bool isAdmin = CheckNativeSignatures(GetAdmins(accountId), GetAdminThreshold(accountId));
                bool isManager = CheckNativeSignatures(GetManagers(accountId), GetManagerThreshold(accountId));
                ExecutionEngine.Assert(isAdmin || isManager, "Unauthorized");
            }
            EnforceRestrictions(accountId, targetContract, method, args);
        }

        private static void CheckPermissionsAndExecute(UInt160 accountId, UInt160[] verifiedSigners, UInt160 targetContract, string method, object[] args)
        {
            bool isSelfSigned = false;
            foreach (var signer in verifiedSigners)
            {
                if (signer == accountId) isSelfSigned = true;
            }

            if (!isSelfSigned)
            {
                bool isAdmin = CheckExplicitSignatures(GetAdmins(accountId), GetAdminThreshold(accountId), verifiedSigners);
                bool isManager = CheckExplicitSignatures(GetManagers(accountId), GetManagerThreshold(accountId), verifiedSigners);
                ExecutionEngine.Assert(isAdmin || isManager, "Unauthorized");
            }
            EnforceRestrictions(accountId, targetContract, method, args);
        }

        private static void EnforceRestrictions(UInt160 accountId, UInt160 targetContract, string method, object[] args)
        {
            StorageMap blacklistMap = new StorageMap(Storage.CurrentContext, Helper.Concat(BlacklistPrefix, accountId));
            ByteString isBlacklisted = blacklistMap.Get(targetContract);
            ExecutionEngine.Assert(isBlacklisted == null || isBlacklisted != (ByteString)new byte[] { 1 }, "Target is blacklisted");

            StorageMap whitelistEnabledMap = new StorageMap(Storage.CurrentContext, WhitelistEnabledPrefix);
            ByteString whitelistOnly = whitelistEnabledMap.Get(accountId);
            if (whitelistOnly != null && whitelistOnly == (ByteString)new byte[] { 1 })
            {
                StorageMap whitelistMap = new StorageMap(Storage.CurrentContext, Helper.Concat(WhitelistPrefix, accountId));
                ByteString isWhitelisted = whitelistMap.Get(targetContract);
                ExecutionEngine.Assert(isWhitelisted != null && isWhitelisted == (ByteString)new byte[] { 1 }, "Target is not in whitelist");
            }

            if (method == "transfer" && args.Length >= 3)
            {
                BigInteger amount = (BigInteger)args[2];
                StorageMap maxMap = new StorageMap(Storage.CurrentContext, Helper.Concat(MaxTransferPrefix, accountId));
                ByteString maxValBytes = maxMap.Get(targetContract);
                if (maxValBytes != null)
                {
                    BigInteger maxVal = (BigInteger)maxValBytes;
                    ExecutionEngine.Assert(maxVal <= 0 || amount <= maxVal, "Amount exceeds max limit");
                }
            }
        }

        private static bool CheckNativeSignatures(Neo.SmartContract.Framework.List<UInt160> roles, int threshold)
        {
            if (threshold <= 0 || roles == null || roles.Count == 0) return false;
            int count = 0;
            for (int i = 0; i < roles.Count; i++)
            {
                if (Runtime.CheckWitness(roles[i])) count++;
            }
            return count >= threshold;
        }

        private static bool CheckExplicitSignatures(Neo.SmartContract.Framework.List<UInt160> roles, int threshold, UInt160[] verifiedSigners)
        {
            if (threshold <= 0 || roles == null || roles.Count == 0) return false;
            int count = 0;
            for (int i = 0; i < roles.Count; i++)
            {
                foreach (var signer in verifiedSigners)
                {
                    if (roles[i] == signer)
                    {
                        count++;
                        break;
                    }
                }
            }
            return count >= threshold;
        }

        private static void AssertIsAdmin(UInt160 accountId)
        {
            AssertValidAccountId(accountId);
            if (Runtime.CheckWitness(accountId)) return;
            if (CheckNativeSignatures(GetAdmins(accountId), GetAdminThreshold(accountId))) return;

            // MetaTx admin context is only valid for internal self-calls from ExecuteMetaTx.
            ByteString metaSignerBytes = GetMetaTxContext(accountId);
            if (metaSignerBytes != null && Runtime.CallingScriptHash == Runtime.ExecutingScriptHash)
            {
                UInt160 metaSigner = (UInt160)metaSignerBytes;
                if (metaSigner == accountId) return;
                if (CheckExplicitSignatures(GetAdmins(accountId), GetAdminThreshold(accountId), new UInt160[] { metaSigner })) return;
            }

            ExecutionEngine.Assert(false, "Unauthorized admin");
        }

        public static void SetAdmins(UInt160 accountId, Neo.SmartContract.Framework.List<UInt160> admins, int threshold)
        {
            AssertIsAdmin(accountId);
            AssertUniqueAccounts(admins);
            ExecutionEngine.Assert(threshold <= admins.Count && threshold > 0, "Invalid threshold");
            StorageMap adminsMap = new StorageMap(Storage.CurrentContext, AdminsPrefix);
            StorageMap tMap = new StorageMap(Storage.CurrentContext, AdminThresholdPrefix);
            adminsMap.Put(accountId, StdLib.Serialize(admins));
            tMap.Put(accountId, threshold);
        }

        public static Neo.SmartContract.Framework.List<UInt160> GetAdmins(UInt160 accountId)
        {
            StorageMap adminsMap = new StorageMap(Storage.CurrentContext, AdminsPrefix);
            ByteString data = adminsMap.Get(accountId);
            if (data == null) return new Neo.SmartContract.Framework.List<UInt160>();
            return (Neo.SmartContract.Framework.List<UInt160>)StdLib.Deserialize(data);
        }

        public static int GetAdminThreshold(UInt160 accountId)
        {
            StorageMap tMap = new StorageMap(Storage.CurrentContext, AdminThresholdPrefix);
            ByteString data = tMap.Get(accountId);
            if (data == null) return 1;
            return (int)(BigInteger)data;
        }

        public static void SetManagers(UInt160 accountId, Neo.SmartContract.Framework.List<UInt160> managers, int threshold)
        {
            AssertIsAdmin(accountId);
            AssertUniqueAccounts(managers);
            if (managers.Count == 0)
            {
                ExecutionEngine.Assert(threshold == 0, "Invalid threshold");
            }
            else
            {
                ExecutionEngine.Assert(threshold <= managers.Count && threshold > 0, "Invalid threshold");
            }
            StorageMap mMap = new StorageMap(Storage.CurrentContext, ManagersPrefix);
            StorageMap tMap = new StorageMap(Storage.CurrentContext, ManagerThresholdPrefix);
            mMap.Put(accountId, StdLib.Serialize(managers));
            tMap.Put(accountId, threshold);
        }

        public static Neo.SmartContract.Framework.List<UInt160> GetManagers(UInt160 accountId)
        {
            StorageMap mMap = new StorageMap(Storage.CurrentContext, ManagersPrefix);
            ByteString data = mMap.Get(accountId);
            if (data == null) return new Neo.SmartContract.Framework.List<UInt160>();
            return (Neo.SmartContract.Framework.List<UInt160>)StdLib.Deserialize(data);
        }

        public static int GetManagerThreshold(UInt160 accountId)
        {
            StorageMap tMap = new StorageMap(Storage.CurrentContext, ManagerThresholdPrefix);
            ByteString data = tMap.Get(accountId);
            if (data == null) return 1;
            return (int)(BigInteger)data;
        }

        public static void SetBlacklist(UInt160 accountId, UInt160 target, bool isBlacklisted)
        {
            AssertIsAdmin(accountId);
            StorageMap map = new StorageMap(Storage.CurrentContext, Helper.Concat(BlacklistPrefix, accountId));
            if (isBlacklisted) map.Put(target, (ByteString)new byte[] { 1 });
            else map.Delete(target);
        }

        public static void SetWhitelistMode(UInt160 accountId, bool enabled)
        {
            AssertIsAdmin(accountId);
            StorageMap map = new StorageMap(Storage.CurrentContext, WhitelistEnabledPrefix);
            if (enabled) map.Put(accountId, (ByteString)new byte[] { 1 });
            else map.Delete(accountId);
        }

        public static void SetWhitelist(UInt160 accountId, UInt160 target, bool isWhitelisted)
        {
            AssertIsAdmin(accountId);
            StorageMap map = new StorageMap(Storage.CurrentContext, Helper.Concat(WhitelistPrefix, accountId));
            if (isWhitelisted) map.Put(target, (ByteString)new byte[] { 1 });
            else map.Delete(target);
        }

        public static void SetMaxTransfer(UInt160 accountId, UInt160 token, BigInteger maxAmount)
        {
            AssertIsAdmin(accountId);
            StorageMap map = new StorageMap(Storage.CurrentContext, Helper.Concat(MaxTransferPrefix, accountId));
            if (maxAmount > 0) map.Put(token, (ByteString)maxAmount);
            else map.Delete(token);
        }

        private static void AssertValidAccountId(UInt160 accountId)
        {
            ExecutionEngine.Assert(accountId != null && accountId != UInt160.Zero, "Invalid accountId");
        }

        private static void AssertUniqueAccounts(Neo.SmartContract.Framework.List<UInt160> accounts)
        {
            for (int i = 0; i < accounts.Count; i++)
            {
                UInt160 current = accounts[i];
                ExecutionEngine.Assert(current != null && current != UInt160.Zero, "Invalid role account");
                for (int j = i + 1; j < accounts.Count; j++)
                {
                    ExecutionEngine.Assert(current != accounts[j], "Duplicate role member");
                }
            }
        }

        private static void SetMetaTxContext(UInt160 accountId, UInt160 signerHash)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, MetaTxContextPrefix);
            map.Put(accountId, signerHash);
        }

        private static ByteString GetMetaTxContext(UInt160 accountId)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, MetaTxContextPrefix);
            return map.Get(accountId);
        }

        private static void ClearMetaTxContext(UInt160 accountId)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, MetaTxContextPrefix);
            map.Delete(accountId);
        }

        private static UInt160 DeriveEthAddress(ByteString pkString)
        {
            byte[] pk = (byte[])pkString;
            if (pk.Length == 65 && pk[0] == 0x04)
            {
                byte[] temp = new byte[64];
                for (int i = 0; i < 64; i++) temp[i] = pk[i + 1];
                pk = temp;
            }
            ExecutionEngine.Assert(pk.Length == 64, "Invalid pubkey length");

            byte[] hash = (byte[])CryptoLib.Keccak256((ByteString)pk);
            byte[] ethAddrBytes = new byte[20];
            for (int i = 0; i < 20; i++)
            {
                ethAddrBytes[i] = hash[31 - i];
            }
            return (UInt160)ethAddrBytes;
        }

        private static ECPoint CompressPubKey(ByteString pkString)
        {
            byte[] pk = (byte[])pkString;
            if (pk.Length == 64)
            {
                byte[] temp = new byte[65];
                temp[0] = 0x04;
                for (int i = 0; i < 64; i++) temp[i + 1] = pk[i];
                pk = temp;
            }
            ExecutionEngine.Assert(pk.Length == 65 && pk[0] == 0x04, "Invalid pubkey length for compression");

            byte[] compressed = new byte[33];
            compressed[0] = (pk[64] % 2 == 0) ? (byte)0x02 : (byte)0x03;
            for (int i = 0; i < 32; i++) compressed[i + 1] = pk[i + 1];

            return (ECPoint)(ByteString)compressed;
        }

        public static void Update(ByteString nefFile, string manifest)
        {
            UInt160 deployer = (UInt160)Storage.Get(Storage.CurrentContext, DeployerKey);
            ExecutionEngine.Assert(Runtime.CheckWitness(deployer), "Not Deployer");
            ContractManagement.Update(nefFile, manifest, null);
        }
    }
}
