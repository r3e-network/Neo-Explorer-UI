using System.Numerics;
using Neo;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Native;
using Neo.SmartContract.Framework.Services;

namespace AbstractAccount
{
    public partial class UnifiedSmartWallet
    {
        private static readonly byte[] DomeOracleUrlPrefix = new byte[] { 0x12 };
        private static readonly byte[] DomeOracleUnlockPrefix = new byte[] { 0x13 };

        public static void SetDomeOracle(ByteString accountId, string url)
        {
            AssertIsAdmin(accountId);
            StorageMap urlMap = new StorageMap(Storage.CurrentContext, DomeOracleUrlPrefix);
            if (url == null || url == "") urlMap.Delete(GetStorageKey(accountId));
            else urlMap.Put(GetStorageKey(accountId), url);
        }

        public static void SetDomeOracleByAddress(UInt160 accountAddress, string url)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            SetDomeOracle(accountId, url);
        }

        public static void RequestDomeActivation(ByteString accountId)
        {
            AssertAccountExists(accountId);
            
            BigInteger timeout = GetDomeTimeout(accountId);
            ExecutionEngine.Assert(timeout > 0, "Dome account not configured");
            
            BigInteger lastActive = GetLastActiveTimestamp(accountId);
            ExecutionEngine.Assert(Runtime.Time >= lastActive + timeout, "Dome account not active yet");

            StorageMap urlMap = new StorageMap(Storage.CurrentContext, DomeOracleUrlPrefix);
            string url = urlMap.Get(GetStorageKey(accountId));
            ExecutionEngine.Assert(url != null && url != "", "Oracle URL not configured");

            Oracle.Request(url, "", "DomeActivationCallback", accountId, 10000000);
        }

        public static void RequestDomeActivationByAddress(UInt160 accountAddress)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            RequestDomeActivation(accountId);
        }

        public static void DomeActivationCallback(string url, object userData, int responseCode, byte[] result)
        {
            ExecutionEngine.Assert(Runtime.CallingScriptHash == Oracle.Hash, "Unauthorized");
            if (responseCode == (int)OracleResponseCode.Success)
            {
                ByteString accountId = (ByteString)userData;
                // If the external Oracle confirms the dead-man switch is active, it will return "true"
                if ((ByteString)result == (ByteString)"true")
                {
                    StorageMap unlockMap = new StorageMap(Storage.CurrentContext, DomeOracleUnlockPrefix);
                    unlockMap.Put(GetStorageKey(accountId), (ByteString)new byte[] { 1 });
                }
            }
        }
        
        [Safe]
        public static bool IsDomeOracleUnlocked(ByteString accountId)
        {
            StorageMap urlMap = new StorageMap(Storage.CurrentContext, DomeOracleUrlPrefix);
            string url = urlMap.Get(GetStorageKey(accountId));
            if (url == null || url == "") return true; // If no oracle configured, it's implicitly unlocked
            
            StorageMap unlockMap = new StorageMap(Storage.CurrentContext, DomeOracleUnlockPrefix);
            ByteString unlocked = unlockMap.Get(GetStorageKey(accountId));
            return unlocked != null && unlocked == (ByteString)new byte[] { 1 };
        }
    }
}