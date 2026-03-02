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

        public delegate void OnAccountCreatedEvent(ByteString accountId, ECPoint creator);
        [DisplayName("AccountCreated")]
        public static event OnAccountCreatedEvent OnAccountCreated = default!;

        public static void _deploy(object data, bool update)
        {
            if (update) return;
            var tx = (Transaction)Runtime.Transaction;
            Storage.Put(Storage.CurrentContext, DeployerKey, tx.Sender);
        }

        public static void CreateAccount(ByteString accountId, Neo.SmartContract.Framework.List<ECPoint> admins, int adminThreshold, Neo.SmartContract.Framework.List<ECPoint> managers, int managerThreshold)
        {
            ExecutionEngine.Assert(accountId != null && accountId.Length > 0, "Invalid accountId");
            
            StorageMap adminsMap = new StorageMap(Storage.CurrentContext, AdminsPrefix);
            ByteString existing = adminsMap.Get(accountId);
            ExecutionEngine.Assert(existing == null, "Account already exists");

            SetAdminsInternal(accountId, admins, adminThreshold);
            SetManagersInternal(accountId, managers, managerThreshold);

            var tx = (Transaction)Runtime.Transaction;
            // Depending on the scenario, the creator could be extracted differently, but null is fine for pure event indication.
            OnAccountCreated(accountId, null);
        }

        [Safe]
        public static bool Verify(ByteString accountId)
        {
            if (Runtime.Trigger != TriggerType.Verification) return false;

            bool isAdmin = CheckNativeSignatures(GetAdmins(accountId), GetAdminThreshold(accountId));
            if (isAdmin) return true;

            bool isManager = CheckNativeSignatures(GetManagers(accountId), GetManagerThreshold(accountId));
            if (isManager) return true;

            return false;
        }

        private static bool CheckNativeSignatures(Neo.SmartContract.Framework.List<ECPoint> roles, int threshold)
        {
            if (threshold <= 0 || roles == null || roles.Count == 0) return false;
            int count = 0;
            for (int i = 0; i < roles.Count; i++)
            {
                if (Runtime.CheckWitness(roles[i])) count++;
            }
            return count >= threshold;
        }

        private static void SetAdminsInternal(ByteString accountId, Neo.SmartContract.Framework.List<ECPoint> admins, int threshold)
        {
            AssertUniqueAccounts(admins);
            ExecutionEngine.Assert(threshold <= admins.Count && threshold > 0, "Invalid threshold");
            StorageMap adminsMap = new StorageMap(Storage.CurrentContext, AdminsPrefix);
            StorageMap tMap = new StorageMap(Storage.CurrentContext, AdminThresholdPrefix);
            adminsMap.Put(accountId, StdLib.Serialize(admins));
            tMap.Put(accountId, threshold);
        }

        private static void SetManagersInternal(ByteString accountId, Neo.SmartContract.Framework.List<ECPoint> managers, int threshold)
        {
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

        private static void AssertIsAdmin(ByteString accountId)
        {
            ExecutionEngine.Assert(accountId != null && accountId.Length > 0, "Invalid accountId");
            bool isAdmin = CheckNativeSignatures(GetAdmins(accountId), GetAdminThreshold(accountId));
            ExecutionEngine.Assert(isAdmin, "Unauthorized admin");
        }

        public static void SetAdmins(ByteString accountId, Neo.SmartContract.Framework.List<ECPoint> admins, int threshold)
        {
            AssertIsAdmin(accountId);
            SetAdminsInternal(accountId, admins, threshold);
        }

        [Safe]
        public static Neo.SmartContract.Framework.List<ECPoint> GetAdmins(ByteString accountId)
        {
            StorageMap adminsMap = new StorageMap(Storage.CurrentContext, AdminsPrefix);
            ByteString data = adminsMap.Get(accountId);
            if (data == null) return new Neo.SmartContract.Framework.List<ECPoint>();
            return (Neo.SmartContract.Framework.List<ECPoint>)StdLib.Deserialize(data);
        }

        [Safe]
        public static int GetAdminThreshold(ByteString accountId)
        {
            StorageMap tMap = new StorageMap(Storage.CurrentContext, AdminThresholdPrefix);
            ByteString data = tMap.Get(accountId);
            if (data == null) return 1;
            return (int)(BigInteger)data;
        }

        public static void SetManagers(ByteString accountId, Neo.SmartContract.Framework.List<ECPoint> managers, int threshold)
        {
            AssertIsAdmin(accountId);
            SetManagersInternal(accountId, managers, threshold);
        }

        [Safe]
        public static Neo.SmartContract.Framework.List<ECPoint> GetManagers(ByteString accountId)
        {
            StorageMap mMap = new StorageMap(Storage.CurrentContext, ManagersPrefix);
            ByteString data = mMap.Get(accountId);
            if (data == null) return new Neo.SmartContract.Framework.List<ECPoint>();
            return (Neo.SmartContract.Framework.List<ECPoint>)StdLib.Deserialize(data);
        }

        [Safe]
        public static int GetManagerThreshold(ByteString accountId)
        {
            StorageMap tMap = new StorageMap(Storage.CurrentContext, ManagerThresholdPrefix);
            ByteString data = tMap.Get(accountId);
            if (data == null) return 1;
            return (int)(BigInteger)data;
        }

        private static void AssertUniqueAccounts(Neo.SmartContract.Framework.List<ECPoint> accounts)
        {
            for (int i = 0; i < accounts.Count; i++)
            {
                ECPoint current = accounts[i];
                ExecutionEngine.Assert(current != null, "Invalid role account");
                for (int j = i + 1; j < accounts.Count; j++)
                {
                    ExecutionEngine.Assert(current != accounts[j], "Duplicate role member");
                }
            }
        }

        public static void Update(ByteString nefFile, string manifest)
        {
            UInt160 deployer = (UInt160)Storage.Get(Storage.CurrentContext, DeployerKey);
            ExecutionEngine.Assert(Runtime.CheckWitness(deployer), "Not Deployer");
            ContractManagement.Update(nefFile, manifest, null);
        }
    }
}