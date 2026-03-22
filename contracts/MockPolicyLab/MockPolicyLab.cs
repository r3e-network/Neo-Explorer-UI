using System.Numerics;
using Neo;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Services;
using System.ComponentModel;

namespace MockPolicyLab;

[DisplayName("MockPolicyLab")]
[ManifestExtra("Author", "Neo Explorer")]
[ManifestExtra("Description", "Testnet-only mock policy contract for governance multisig validation.")]
[ContractPermission("*", "*")]
public class MockPolicyLab : SmartContract
{
    private static readonly byte[] OwnerKey = new byte[] { 0x01 };
    private static readonly byte[] FeePerByteKey = new byte[] { 0x02 };
    private static readonly byte[] ExecFeeFactorKey = new byte[] { 0x03 };
    private static readonly byte[] StoragePriceKey = new byte[] { 0x04 };
    private static readonly byte[] MillisecondsPerBlockKey = new byte[] { 0x05 };

    public static void _deploy(object data, bool update)
    {
        if (update) return;
        ExecutionEngine.Assert(data != null, "Owner must be provided.");
        ByteString rawOwner = (ByteString)data;
        ExecutionEngine.Assert(rawOwner != null && rawOwner.Length == 20, "Owner must be a UInt160.");
        UInt160 owner = (UInt160)rawOwner;
        ExecutionEngine.Assert(owner != UInt160.Zero, "Owner must not be zero.");
        Storage.Put(Storage.CurrentContext, OwnerKey, owner);
    }

    private static UInt160 GetStoredOwner()
    {
        ByteString value = Storage.Get(Storage.CurrentContext, OwnerKey);
        ExecutionEngine.Assert(value != null && value.Length == 20, "Owner not initialized.");
        return (UInt160)value;
    }

    private static void AssertOwnerWitness()
    {
        UInt160 owner = GetStoredOwner();
        ExecutionEngine.Assert(Runtime.CheckWitness(owner), "Unauthorized");
    }

    [Safe]
    public static UInt160 GetOwner()
    {
        return GetStoredOwner();
    }

    public static void SetFeePerByte(BigInteger value)
    {
        AssertOwnerWitness();
        Storage.Put(Storage.CurrentContext, FeePerByteKey, value);
    }

    [Safe]
    public static BigInteger GetFeePerByte()
    {
        ByteString value = Storage.Get(Storage.CurrentContext, FeePerByteKey);
        return value == null ? 0 : (BigInteger)value;
    }

    public static void SetExecFeeFactor(BigInteger value)
    {
        AssertOwnerWitness();
        Storage.Put(Storage.CurrentContext, ExecFeeFactorKey, value);
    }

    [Safe]
    public static BigInteger GetExecFeeFactor()
    {
        ByteString value = Storage.Get(Storage.CurrentContext, ExecFeeFactorKey);
        return value == null ? 0 : (BigInteger)value;
    }

    public static void SetStoragePrice(BigInteger value)
    {
        AssertOwnerWitness();
        Storage.Put(Storage.CurrentContext, StoragePriceKey, value);
    }

    [Safe]
    public static BigInteger GetStoragePrice()
    {
        ByteString value = Storage.Get(Storage.CurrentContext, StoragePriceKey);
        return value == null ? 0 : (BigInteger)value;
    }

    public static void SetMillisecondsPerBlock(BigInteger value)
    {
        AssertOwnerWitness();
        Storage.Put(Storage.CurrentContext, MillisecondsPerBlockKey, value);
    }

    [Safe]
    public static BigInteger GetMillisecondsPerBlock()
    {
        ByteString value = Storage.Get(Storage.CurrentContext, MillisecondsPerBlockKey);
        return value == null ? 0 : (BigInteger)value;
    }
}
