using Neo.Cryptography.ECC;
using Neo.Extensions;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Numerics;

#pragma warning disable CS0067

namespace Neo.SmartContract.Testing;

public abstract class MockPolicyLab(Neo.SmartContract.Testing.SmartContractInitialize initialize) : Neo.SmartContract.Testing.SmartContract(initialize), IContractInfo
{
    #region Compiled data

    public static Neo.SmartContract.Manifest.ContractManifest Manifest => Neo.SmartContract.Manifest.ContractManifest.Parse(@"{""name"":""MockPolicyLab"",""groups"":[],""features"":{},""supportedstandards"":[],""abi"":{""methods"":[{""name"":""_deploy"",""parameters"":[{""name"":""data"",""type"":""Any""},{""name"":""update"",""type"":""Boolean""}],""returntype"":""Void"",""offset"":0,""safe"":false},{""name"":""getOwner"",""parameters"":[],""returntype"":""Hash160"",""offset"":255,""safe"":true},{""name"":""setFeePerByte"",""parameters"":[{""name"":""value"",""type"":""Integer""}],""returntype"":""Void"",""offset"":258,""safe"":false},{""name"":""getFeePerByte"",""parameters"":[],""returntype"":""Integer"",""offset"":276,""safe"":true},{""name"":""setExecFeeFactor"",""parameters"":[{""name"":""value"",""type"":""Integer""}],""returntype"":""Void"",""offset"":308,""safe"":false},{""name"":""getExecFeeFactor"",""parameters"":[],""returntype"":""Integer"",""offset"":326,""safe"":true},{""name"":""setStoragePrice"",""parameters"":[{""name"":""value"",""type"":""Integer""}],""returntype"":""Void"",""offset"":358,""safe"":false},{""name"":""getStoragePrice"",""parameters"":[],""returntype"":""Integer"",""offset"":379,""safe"":true},{""name"":""_initialize"",""parameters"":[],""returntype"":""Void"",""offset"":411,""safe"":false}],""events"":[]},""permissions"":[{""contract"":""*"",""methods"":""*""}],""trusts"":[],""extra"":{""Author"":""Neo Explorer"",""Description"":""Testnet-only mock policy contract for governance multisig validation."",""nef"":{""optimization"":""All""}}}");

    /// <summary>
    /// Optimization: "All"
    /// </summary>
    public static Neo.SmartContract.NefFile Nef => Convert.FromBase64String(@"TkVGM05lby5Db21waWxlci5DU2hhcnAgMy45LjErNWZhOTU2NmU1MTY1ZWRlMjE2NWE5YmUxZjRhMDEyMGMxNzYuLi4AAAAAAP22AVcCAnkmA0B42CYcDBdPd25lciBtdXN0IGJlIHByb3ZpZGVkLuB4cGjYJgUJIgdoygAUlyQdDBhPd25lciBtdXN0IGJlIGEgVUludDE2MC7gaErYJAlKygAUKAM6cWkMFAAAAAAAAAAAAAAAAAAAAAAAAAAAmCQcDBdPd25lciBtdXN0IG5vdCBiZSB6ZXJvLuBpWEGb9mfOQeY/GIRAVwEAWEGb9mfOQZJd6DFwaNgmBQkiB2jKABSXJBsMFk93bmVyIG5vdCBpbml0aWFsaXplZC7gaErYJAlKygAUKAM6QFcBADS6cGhB+CfsjCQRDAxVbmF1dGhvcml6ZWTgQDSfQFcAATTceFlBm/ZnzkHmPxiEQFcBAFlBm/ZnzkGSXegxcGjYJgQQQGhK2CYFRRBA2yFAVwABNKp4WkGb9mfOQeY/GIRAVwEAWkGb9mfOQZJd6DFwaNgmBBBAaErYJgVFEEDbIUBXAAE1eP///3hbQZv2Z85B5j8YhEBXAQBbQZv2Z85Bkl3oMXBo2CYEEEBoStgmBUUQQNshQFYEDAEB2zBgDAEC2zBhDAED2zBiDAEE2zBjQHy2Lh0=").AsSerializable<Neo.SmartContract.NefFile>();

    #endregion

    #region Properties

    /// <summary>
    /// Safe property
    /// </summary>
    public abstract BigInteger? ExecFeeFactor { [DisplayName("getExecFeeFactor")] get; [DisplayName("setExecFeeFactor")] set; }

    /// <summary>
    /// Safe property
    /// </summary>
    public abstract BigInteger? FeePerByte { [DisplayName("getFeePerByte")] get; [DisplayName("setFeePerByte")] set; }

    /// <summary>
    /// Safe property
    /// </summary>
    public abstract UInt160? Owner { [DisplayName("getOwner")] get; }

    /// <summary>
    /// Safe property
    /// </summary>
    public abstract BigInteger? StoragePrice { [DisplayName("getStoragePrice")] get; [DisplayName("setStoragePrice")] set; }

    #endregion

    #region Unsafe methods

    #endregion
}
