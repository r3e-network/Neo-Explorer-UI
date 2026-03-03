using System.Numerics;
using Neo;
using Neo.SmartContract;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Services;

namespace AbstractAccount
{
    public partial class UnifiedSmartWallet
    {
        public static object Execute(ByteString accountId, UInt160 targetContract, string method, object[] args)
        {
            CheckPermissionsAndExecuteNative(accountId, targetContract, method, args);
            SetVerifyContext(accountId, targetContract);
            OnExecute(accountId, targetContract, method, args);
            object result = Contract.Call(targetContract, method, CallFlags.All, args);
            ClearVerifyContext(accountId);
            return result;
        }

        public static object ExecuteByAddress(UInt160 accountAddress, UInt160 targetContract, string method, object[] args)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            return Execute(accountId, targetContract, method, args);
        }

        private static void CheckPermissionsAndExecuteNative(ByteString accountId, UInt160 targetContract, string method, object[] args)
        {
            AssertAccountExists(accountId);
            bool isAdmin = CheckNativeSignatures(GetAdmins(accountId), GetAdminThreshold(accountId));
            bool isManager = CheckNativeSignatures(GetManagers(accountId), GetManagerThreshold(accountId));
            ExecutionEngine.Assert(isAdmin || isManager, "Unauthorized");
            EnforceRestrictions(accountId, targetContract, method, args);
        }

        private static void CheckPermissionsAndExecute(ByteString accountId, UInt160[] verifiedSigners, UInt160 targetContract, string method, object[] args)
        {
            AssertAccountExists(accountId);
            bool isAdmin = CheckExplicitSignatures(GetAdmins(accountId), GetAdminThreshold(accountId), verifiedSigners);
            bool isManager = CheckExplicitSignatures(GetManagers(accountId), GetManagerThreshold(accountId), verifiedSigners);
            ExecutionEngine.Assert(isAdmin || isManager, "Unauthorized");
            EnforceRestrictions(accountId, targetContract, method, args);
        }

        private static void EnforceRestrictions(ByteString accountId, UInt160 targetContract, string method, object[] args)
        {
            StorageMap blacklistMap = new StorageMap(Storage.CurrentContext, Helper.Concat(BlacklistPrefix, GetStorageKey(accountId)));
            ByteString isBlacklisted = blacklistMap.Get(targetContract);
            ExecutionEngine.Assert(isBlacklisted == null || isBlacklisted != (ByteString)new byte[] { 1 }, "Target is blacklisted");

            StorageMap whitelistEnabledMap = new StorageMap(Storage.CurrentContext, WhitelistEnabledPrefix);
            ByteString whitelistOnly = whitelistEnabledMap.Get(GetStorageKey(accountId));
            if (whitelistOnly != null && whitelistOnly == (ByteString)new byte[] { 1 })
            {
                StorageMap whitelistMap = new StorageMap(Storage.CurrentContext, Helper.Concat(WhitelistPrefix, GetStorageKey(accountId)));
                ByteString isWhitelisted = whitelistMap.Get(targetContract);
                ExecutionEngine.Assert(isWhitelisted != null && isWhitelisted == (ByteString)new byte[] { 1 }, "Target is not in whitelist");
            }

            if (method == "transfer" && args.Length >= 3)
            {
                BigInteger amount = (BigInteger)args[2];
                StorageMap maxMap = new StorageMap(Storage.CurrentContext, Helper.Concat(MaxTransferPrefix, GetStorageKey(accountId)));
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
    }
}
