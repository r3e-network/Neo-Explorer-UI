using Neo.Cryptography.ECC;
using Neo.Extensions;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Numerics;

#pragma warning disable CS0067

namespace Neo.SmartContract.Testing;

public abstract class MockNeoTokenLab(Neo.SmartContract.Testing.SmartContractInitialize initialize) : Neo.SmartContract.Testing.SmartContract(initialize), IContractInfo
{
    #region Compiled data

    public static Neo.SmartContract.Manifest.ContractManifest Manifest => Neo.SmartContract.Manifest.ContractManifest.Parse(@"{""name"":""MockNeoTokenLab"",""groups"":[],""features"":{},""supportedstandards"":[],""abi"":{""methods"":[{""name"":""_deploy"",""parameters"":[{""name"":""data"",""type"":""Any""},{""name"":""update"",""type"":""Boolean""}],""returntype"":""Void"",""offset"":0,""safe"":false},{""name"":""getOwner"",""parameters"":[],""returntype"":""Hash160"",""offset"":255,""safe"":true},{""name"":""setGasPerBlock"",""parameters"":[{""name"":""gasPerBlock"",""type"":""Integer""}],""returntype"":""Void"",""offset"":258,""safe"":false},{""name"":""getGasPerBlock"",""parameters"":[],""returntype"":""Integer"",""offset"":276,""safe"":true},{""name"":""_initialize"",""parameters"":[],""returntype"":""Void"",""offset"":308,""safe"":false}],""events"":[]},""permissions"":[{""contract"":""*"",""methods"":""*""}],""trusts"":[],""extra"":{""Author"":""Neo Explorer"",""Description"":""Testnet-only mock NeoToken contract for governance multisig validation."",""nef"":{""optimization"":""All""}}}");

    /// <summary>
    /// Optimization: "All"
    /// </summary>
    public static Neo.SmartContract.NefFile Nef => Convert.FromBase64String(@"TkVGM05lby5Db21waWxlci5DU2hhcnAgMy45LjErNWZhOTU2NmU1MTY1ZWRlMjE2NWE5YmUxZjRhMDEyMGMxNzYuLi4AAAAAAP1DAVcCAnkmA0B42CYcDBdPd25lciBtdXN0IGJlIHByb3ZpZGVkLuB4cGjYJgUJIgdoygAUlyQdDBhPd25lciBtdXN0IGJlIGEgVUludDE2MC7gaErYJAlKygAUKAM6cWkMFAAAAAAAAAAAAAAAAAAAAAAAAAAAmCQcDBdPd25lciBtdXN0IG5vdCBiZSB6ZXJvLuBpWEGb9mfOQeY/GIRAVwEAWEGb9mfOQZJd6DFwaNgmBQkiB2jKABSXJBsMFk93bmVyIG5vdCBpbml0aWFsaXplZC7gaErYJAlKygAUKAM6QFcBADS6cGhB+CfsjCQRDAxVbmF1dGhvcml6ZWTgQDSfQFcAATTceFlBm/ZnzkHmPxiEQFcBAFlBm/ZnzkGSXegxcGjYJgQQQGhK2CYFRRBA2yFAVgIMAQHbMGAMAQLbMGFApy+WMA==").AsSerializable<Neo.SmartContract.NefFile>();

    #endregion

    #region Properties

    /// <summary>
    /// Safe property
    /// </summary>
    public abstract BigInteger? GasPerBlock { [DisplayName("getGasPerBlock")] get; [DisplayName("setGasPerBlock")] set; }

    /// <summary>
    /// Safe property
    /// </summary>
    public abstract UInt160? Owner { [DisplayName("getOwner")] get; }

    #endregion

    #region Unsafe methods

    #endregion
}
