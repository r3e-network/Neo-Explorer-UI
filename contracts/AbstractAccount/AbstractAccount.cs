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
    [ManifestExtra("Author", "Neo Explorer")]
    [ManifestExtra("Email", "dev@neo.org")]
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

        public delegate void OnExecuteEvent(UInt160 accountId, UInt160 target, string method, object[] args);
        [DisplayName("Execute")]
        public static event OnExecuteEvent OnExecute = default!; // fixed nullable warning

        public static void _deploy(object data, bool update)
        {
            if (update) return;
            var tx = (Transaction)Runtime.ScriptContainer;
            Storage.Put(Storage.CurrentContext, DeployerKey, tx.Sender);
        }

        public static BigInteger GetNonce(UInt160 signer)
        {
            byte[] key = Helper.Concat(NoncePrefix, signer);
            ByteString data = Storage.Get(Storage.CurrentContext, key);
            return data == null ? 0 : (BigInteger)data;
        }

        private static void IncrementNonce(UInt160 signer)
        {
            byte[] key = Helper.Concat(NoncePrefix, signer);
            BigInteger current = GetNonce(signer);
            Storage.Put(Storage.CurrentContext, key, current + 1);
        }

        public static object ExecuteMetaTx(
            UInt160 accountId,
            ByteString uncompressedPubKey,
            UInt160 targetContract,
            string method,
            object[] args,
            BigInteger nonce,
            ByteString signature)
        {
            UInt160 signerHash = DeriveEthAddress(uncompressedPubKey);

            if (accountId == UInt160.Zero || accountId == null) {
                accountId = signerHash;
            }

            BigInteger currentNonce = GetNonce(signerHash);
            ExecutionEngine.Assert(nonce == currentNonce, "Invalid Nonce");

            ByteString payload = StdLib.Serialize(new object[] { accountId, targetContract, method, args, nonce });
            byte[] messageHash = (byte[])CryptoLib.Sha256(payload);

            bool isValid = CryptoLib.VerifyWithECDsa(
                (ByteString)messageHash,
                (Neo.Cryptography.ECC.ECPoint)uncompressedPubKey,
                signature,
                NamedCurve.secp256k1
            );
            ExecutionEngine.Assert(isValid, "Invalid EIP-712 Signature");

            IncrementNonce(signerHash);
            CheckPermissionsAndExecute(accountId, new UInt160[] { signerHash }, targetContract, method, args);
            OnExecute(accountId, targetContract, method, args);
            return Contract.Call(targetContract, method, CallFlags.All, args);
        }

        public static object Execute(UInt160 accountId, UInt160 targetContract, string method, object[] args)
        {
            CheckPermissionsAndExecuteNative(accountId, targetContract, method, args);
            OnExecute(accountId, targetContract, method, args);
            return Contract.Call(targetContract, method, CallFlags.All, args);
        }

        private static void CheckPermissionsAndExecuteNative(UInt160 accountId, UInt160 targetContract, string method, object[] args)
        {
            bool isSelfSigned = Runtime.CheckWitness(accountId);

            if (!isSelfSigned) {
                bool isAdmin = CheckNativeSignatures(GetAdmins(accountId), GetAdminThreshold(accountId));
                bool isManager = CheckNativeSignatures(GetManagers(accountId), GetManagerThreshold(accountId));
                ExecutionEngine.Assert(isAdmin || isManager, "Unauthorized");
            }
            EnforceRestrictions(accountId, targetContract, method, args);
        }

        private static void CheckPermissionsAndExecute(UInt160 accountId, UInt160[] verifiedSigners, UInt160 targetContract, string method, object[] args)
        {
            bool isSelfSigned = false;
            foreach (var signer in verifiedSigners) {
                if (signer == accountId) isSelfSigned = true;
            }

            if (!isSelfSigned) {
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
                foreach (var signer in verifiedSigners) {
                    if (roles[i] == signer) {
                        count++;
                        break;
                    }
                }
            }
            return count >= threshold;
        }

        private static void AssertIsAdmin(UInt160 accountId)
        {
            if (Runtime.CheckWitness(accountId)) return;
            ExecutionEngine.Assert(CheckNativeSignatures(GetAdmins(accountId), GetAdminThreshold(accountId)), "Unauthorized admin");
        }

        public static void SetAdmins(UInt160 accountId, Neo.SmartContract.Framework.List<UInt160> admins, int threshold)
        {
            AssertIsAdmin(accountId);
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
            ExecutionEngine.Assert(managers.Count == 0 || (threshold <= managers.Count && threshold > 0), "Invalid threshold");
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

        private static UInt160 DeriveEthAddress(ByteString pkString)
        {
            byte[] pk = (byte[])pkString;
            if (pk.Length == 65 && pk[0] == 0x04)
            {
                byte[] temp = new byte[64];
                for (int i=0; i<64; i++) temp[i] = pk[i+1];
                pk = temp;
            }
            ExecutionEngine.Assert(pk.Length == 64, "Invalid pubkey length");

            byte[] hash = (byte[])CryptoLib.Sha256((ByteString)pk);
            byte[] ethAddrBytes = Helper.Range(hash, 12, 20);
            return (UInt160)ethAddrBytes;
        }

        public static void Update(ByteString nefFile, string manifest)
        {
            UInt160 deployer = (UInt160)Storage.Get(Storage.CurrentContext, DeployerKey);
            ExecutionEngine.Assert(Runtime.CheckWitness(deployer), "Not Deployer");
            ContractManagement.Update(nefFile, manifest, null);
        }
    }
}
