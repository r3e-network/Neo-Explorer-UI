using System.Numerics;
using Neo;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Services;
using System.ComponentModel;

namespace MockNeoTokenLab;

[DisplayName("MockNeoTokenLab")]
[ManifestExtra("Author", "Neo Explorer")]
[ManifestExtra("Description", "Testnet-only mock NeoToken contract for governance multisig validation.")]
[ContractPermission("*", "*")]
public class MockNeoTokenLab : SmartContract
{
    private static readonly byte[] OwnerKey = new byte[] { 0x01 };
    private static readonly byte[] GasPerBlockKey = new byte[] { 0x02 };

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

    public static void SetGasPerBlock(BigInteger gasPerBlock)
    {
        AssertOwnerWitness();
        Storage.Put(Storage.CurrentContext, GasPerBlockKey, gasPerBlock);
    }

    [Safe]
    public static BigInteger GetGasPerBlock()
    {
        ByteString value = Storage.Get(Storage.CurrentContext, GasPerBlockKey);
        return value == null ? 0 : (BigInteger)value;
    }
}
