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
    [ManifestExtra("Author", "Neo Explorer")]
    [ManifestExtra("Email", "dev@neo.org")]
    [ManifestExtra("Description", "A professional permission-controlling abstract account contract")]
    [ContractPermission("*", "transfer")]
    public class AbstractAccount : SmartContract
    {
        // State Keys
        private static readonly byte[] AdminsKey = new byte[] { 0x01 };
        private static readonly byte[] AdminThresholdKey = new byte[] { 0x02 };
        private static readonly byte[] ManagersKey = new byte[] { 0x03 };
        private static readonly byte[] ManagerThresholdKey = new byte[] { 0x04 };
        
        // Maps Prefixes
        private static readonly byte[] WhitelistPrefix = new byte[] { 0x10 };
        private static readonly byte[] BlacklistPrefix = new byte[] { 0x11 };
        private static readonly byte[] MaxTransferPrefix = new byte[] { 0x12 };

        // Events
        public delegate void OnExecuteEvent(UInt160 target, string method, object[] args);
        [DisplayName("Execute")]
        public static event OnExecuteEvent OnExecute;

        public delegate void OnAdminChangedEvent(string action, UInt160 admin);
        [DisplayName("AdminChanged")]
        public static event OnAdminChangedEvent OnAdminChanged;

        public delegate void OnManagerChangedEvent(string action, UInt160 manager);
        [DisplayName("ManagerChanged")]
        public static event OnManagerChangedEvent OnManagerChanged;

        public static void _deploy(object data, bool update)
        {
            if (update) return;

            if (data != null)
            {
                object[] args = (object[])data;
                if (args.Length >= 2)
                {
                    List<UInt160> admins = (List<UInt160>)args[0];
                    int adminThreshold = (int)(BigInteger)args[1];
                    SetAdmins(admins, adminThreshold);
                }
                if (args.Length >= 4)
                {
                    List<UInt160> managers = (List<UInt160>)args[2];
                    int managerThreshold = (int)(BigInteger)args[3];
                    SetManagers(managers, managerThreshold);
                }
            }
        }

        public static void OnNEP11Payment(UInt160 from, BigInteger amount, ByteString tokenId, object data) { }
        public static void OnNEP17Payment(UInt160 from, BigInteger amount, object data) { }

        // Core Verify: allows Admins to bypass and control the contract natively
        public static bool Verify()
        {
            return CheckAdminSignatures();
        }

        private static bool CheckAdminSignatures()
        {
            List<UInt160> admins = GetAdmins();
            int threshold = GetAdminThreshold();
            int count = 0;
            for (int i = 0; i < admins.Count; i++)
            {
                if (Runtime.CheckWitness(admins[i]))
                {
                    count++;
                }
            }
            return count >= threshold;
        }

        private static bool CheckManagerSignatures()
        {
            List<UInt160> managers = GetManagers();
            int threshold = GetManagerThreshold();
            if (threshold == 0) return true; // if no managers configured, maybe restrict? 
            int count = 0;
            for (int i = 0; i < managers.Count; i++)
            {
                if (Runtime.CheckWitness(managers[i]))
                {
                    count++;
                }
            }
            return count >= threshold;
        }

        // The core method for managers to execute transactions safely
        public static object Execute(UInt160 target, string method, object[] args)
        {
            // Only managers (or admins) can execute
            if (!CheckManagerSignatures() && !CheckAdminSignatures())
            {
                throw new Exception("Unauthorized");
            }

            // 1. Check Blacklist
            StorageMap blacklistMap = new StorageMap(Storage.CurrentContext, BlacklistPrefix);
            ByteString isBlacklisted = blacklistMap.Get(target);
            if (isBlacklisted != null && isBlacklisted == (ByteString)new byte[] { 1 })
            {
                throw new Exception("Target is blacklisted");
            }

            // 2. Check Whitelist (if whitelist has ANY entries, target must be in it)
            // For simplicity, we just check if it's explicitly allowed if whitelist is used.
            // A more complex design would have a toggle for "Whitelist Only Mode".
            // Let's implement WhitelistOnly flag
            StorageMap whitelistMap = new StorageMap(Storage.CurrentContext, WhitelistPrefix);
            ByteString whitelistOnly = whitelistMap.Get(new byte[] { 0x00 });
            if (whitelistOnly != null && whitelistOnly == (ByteString)new byte[] { 1 })
            {
                ByteString isWhitelisted = whitelistMap.Get(target);
                if (isWhitelisted == null || isWhitelisted != (ByteString)new byte[] { 1 })
                {
                    throw new Exception("Target is not in whitelist");
                }
            }

            // 3. Limit transfers
            if (method == "transfer" && args.Length >= 3)
            {
                // transfer(from, to, amount, data)
                // args[2] is amount
                BigInteger amount = (BigInteger)args[2];
                StorageMap maxMap = new StorageMap(Storage.CurrentContext, MaxTransferPrefix);
                ByteString maxValBytes = maxMap.Get(target); // target is the token contract
                if (maxValBytes != null)
                {
                    BigInteger maxVal = (BigInteger)maxValBytes;
                    if (maxVal > 0 && amount > maxVal)
                    {
                        throw new Exception("Amount exceeds maximum transfer limit");
                    }
                }
            }

            OnExecute(target, method, args);
            return Contract.Call(target, method, CallFlags.All, args);
        }

        // --- Admin Management ---
        public static void SetAdmins(List<UInt160> admins, int threshold)
        {
            if (!Runtime.CheckWitness(Runtime.ExecutingScriptHash) && !CheckAdminSignatures())
                throw new Exception("Unauthorized");

            if (threshold > admins.Count || threshold <= 0) throw new Exception("Invalid threshold");
            Storage.Put(Storage.CurrentContext, AdminsKey, StdLib.Serialize(admins));
            Storage.Put(Storage.CurrentContext, AdminThresholdKey, threshold);
        }

        public static List<UInt160> GetAdmins()
        {
            ByteString data = Storage.Get(Storage.CurrentContext, AdminsKey);
            if (data == null) return new List<UInt160>();
            return (List<UInt160>)StdLib.Deserialize(data);
        }

        public static int GetAdminThreshold()
        {
            ByteString data = Storage.Get(Storage.CurrentContext, AdminThresholdKey);
            if (data == null) return 1;
            return (int)(BigInteger)data;
        }

        // --- Manager Management ---
        public static void SetManagers(List<UInt160> managers, int threshold)
        {
            if (!CheckAdminSignatures()) throw new Exception("Unauthorized");

            if (managers.Count > 0 && (threshold > managers.Count || threshold <= 0)) throw new Exception("Invalid threshold");
            Storage.Put(Storage.CurrentContext, ManagersKey, StdLib.Serialize(managers));
            Storage.Put(Storage.CurrentContext, ManagerThresholdKey, threshold);
        }

        public static List<UInt160> GetManagers()
        {
            ByteString data = Storage.Get(Storage.CurrentContext, ManagersKey);
            if (data == null) return new List<UInt160>();
            return (List<UInt160>)StdLib.Deserialize(data);
        }

        public static int GetManagerThreshold()
        {
            ByteString data = Storage.Get(Storage.CurrentContext, ManagerThresholdKey);
            if (data == null) return 1;
            return (int)(BigInteger)data;
        }

        // --- Permissions Management ---
        public static void SetBlacklist(UInt160 account, bool isBlacklisted)
        {
            if (!CheckAdminSignatures()) throw new Exception("Unauthorized");
            StorageMap map = new StorageMap(Storage.CurrentContext, BlacklistPrefix);
            if (isBlacklisted) map.Put(account, new byte[] { 1 });
            else map.Delete(account);
        }

        public static void SetWhitelistMode(bool enabled)
        {
            if (!CheckAdminSignatures()) throw new Exception("Unauthorized");
            StorageMap map = new StorageMap(Storage.CurrentContext, WhitelistPrefix);
            if (enabled) map.Put(new byte[] { 0x00 }, new byte[] { 1 });
            else map.Delete(new byte[] { 0x00 });
        }

        public static void SetWhitelist(UInt160 account, bool isWhitelisted)
        {
            if (!CheckAdminSignatures()) throw new Exception("Unauthorized");
            StorageMap map = new StorageMap(Storage.CurrentContext, WhitelistPrefix);
            if (isWhitelisted) map.Put(account, new byte[] { 1 });
            else map.Delete(account);
        }

        public static void SetMaxTransfer(UInt160 token, BigInteger maxAmount)
        {
            if (!CheckAdminSignatures()) throw new Exception("Unauthorized");
            StorageMap map = new StorageMap(Storage.CurrentContext, MaxTransferPrefix);
            if (maxAmount > 0) map.Put(token, (ByteString)maxAmount);
            else map.Delete(token);
        }

        // Contract Upgradability
        public static void Update(ByteString nefFile, string manifest)
        {
            if (!CheckAdminSignatures()) throw new Exception("Unauthorized");
            ContractManagement.Update(nefFile, manifest, null);
        }
    }
}
