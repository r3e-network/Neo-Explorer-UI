using Neo.Cryptography.ECC;
using Neo.Extensions;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Numerics;

#pragma warning disable CS0067

namespace Neo.SmartContract.Testing;

public abstract class UnifiedSmartWalletV2(Neo.SmartContract.Testing.SmartContractInitialize initialize) : Neo.SmartContract.Testing.SmartContract(initialize), IContractInfo
{
    #region Compiled data

    public static Neo.SmartContract.Manifest.ContractManifest Manifest => Neo.SmartContract.Manifest.ContractManifest.Parse(@"{""name"":""UnifiedSmartWalletV2"",""groups"":[],""features"":{},""supportedstandards"":[],""abi"":{""methods"":[{""name"":""createAccount"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""admins"",""type"":""Array""},{""name"":""adminThreshold"",""type"":""Integer""},{""name"":""managers"",""type"":""Array""},{""name"":""managerThreshold"",""type"":""Integer""}],""returntype"":""Void"",""offset"":0,""safe"":false},{""name"":""createAccountWithAddress"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""admins"",""type"":""Array""},{""name"":""adminThreshold"",""type"":""Integer""},{""name"":""managers"",""type"":""Array""},{""name"":""managerThreshold"",""type"":""Integer""}],""returntype"":""Void"",""offset"":642,""safe"":false},{""name"":""verify"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Boolean"",""offset"":973,""safe"":true},{""name"":""setAdmins"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""admins"",""type"":""Array""},{""name"":""threshold"",""type"":""Integer""}],""returntype"":""Void"",""offset"":1860,""safe"":false},{""name"":""setAdminsByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""admins"",""type"":""Array""},{""name"":""threshold"",""type"":""Integer""}],""returntype"":""Void"",""offset"":1875,""safe"":false},{""name"":""getAdmins"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Array"",""offset"":1404,""safe"":true},{""name"":""getAdminsByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Array"",""offset"":1973,""safe"":true},{""name"":""getAdminThreshold"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Integer"",""offset"":1342,""safe"":true},{""name"":""getAdminThresholdByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Integer"",""offset"":1987,""safe"":true},{""name"":""setManagers"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""managers"",""type"":""Array""},{""name"":""threshold"",""type"":""Integer""}],""returntype"":""Void"",""offset"":2001,""safe"":false},{""name"":""setManagersByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""managers"",""type"":""Array""},{""name"":""threshold"",""type"":""Integer""}],""returntype"":""Void"",""offset"":2019,""safe"":false},{""name"":""getManagers"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Array"",""offset"":1502,""safe"":true},{""name"":""getManagersByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Array"",""offset"":2035,""safe"":true},{""name"":""getManagerThreshold"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Integer"",""offset"":1440,""safe"":true},{""name"":""getManagerThresholdByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Integer"",""offset"":2052,""safe"":true},{""name"":""setBlacklist"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""target"",""type"":""Hash160""},{""name"":""isBlacklisted"",""type"":""Boolean""}],""returntype"":""Void"",""offset"":2069,""safe"":false},{""name"":""setBlacklistByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""target"",""type"":""Hash160""},{""name"":""isBlacklisted"",""type"":""Boolean""}],""returntype"":""Void"",""offset"":2126,""safe"":false},{""name"":""setWhitelistMode"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""enabled"",""type"":""Boolean""}],""returntype"":""Void"",""offset"":2142,""safe"":false},{""name"":""setWhitelistModeByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""enabled"",""type"":""Boolean""}],""returntype"":""Void"",""offset"":2197,""safe"":false},{""name"":""setWhitelist"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""target"",""type"":""Hash160""},{""name"":""isWhitelisted"",""type"":""Boolean""}],""returntype"":""Void"",""offset"":2212,""safe"":false},{""name"":""setWhitelistByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""target"",""type"":""Hash160""},{""name"":""isWhitelisted"",""type"":""Boolean""}],""returntype"":""Void"",""offset"":2269,""safe"":false},{""name"":""setMaxTransfer"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""token"",""type"":""Hash160""},{""name"":""maxAmount"",""type"":""Integer""}],""returntype"":""Void"",""offset"":2285,""safe"":false},{""name"":""setMaxTransferByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""token"",""type"":""Hash160""},{""name"":""maxAmount"",""type"":""Integer""}],""returntype"":""Void"",""offset"":2340,""safe"":false},{""name"":""bindAccountAddress"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""Void"",""offset"":2356,""safe"":false},{""name"":""getAccountIdByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""}],""returntype"":""ByteArray"",""offset"":2373,""safe"":true},{""name"":""getAccountAddress"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""}],""returntype"":""Hash160"",""offset"":2404,""safe"":true},{""name"":""_deploy"",""parameters"":[{""name"":""data"",""type"":""Any""},{""name"":""update"",""type"":""Boolean""}],""returntype"":""Void"",""offset"":2475,""safe"":false},{""name"":""execute"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""targetContract"",""type"":""Hash160""},{""name"":""method"",""type"":""String""},{""name"":""args"",""type"":""Array""}],""returntype"":""Any"",""offset"":2504,""safe"":false},{""name"":""executeByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""targetContract"",""type"":""Hash160""},{""name"":""method"",""type"":""String""},{""name"":""args"",""type"":""Array""}],""returntype"":""Any"",""offset"":2980,""safe"":false},{""name"":""getNonce"",""parameters"":[{""name"":""signer"",""type"":""Hash160""}],""returntype"":""Integer"",""offset"":3091,""safe"":true},{""name"":""getNonceForAccount"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""signer"",""type"":""Hash160""}],""returntype"":""Integer"",""offset"":3099,""safe"":true},{""name"":""getNonceForAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""signer"",""type"":""Hash160""}],""returntype"":""Integer"",""offset"":3136,""safe"":true},{""name"":""computeArgsHash"",""parameters"":[{""name"":""args"",""type"":""Array""}],""returntype"":""ByteArray"",""offset"":3178,""safe"":true},{""name"":""computeArgsHashForMetaTx"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""uncompressedPubKey"",""type"":""ByteArray""},{""name"":""targetContract"",""type"":""Hash160""},{""name"":""method"",""type"":""String""},{""name"":""args"",""type"":""Array""},{""name"":""argsHash"",""type"":""ByteArray""},{""name"":""nonce"",""type"":""Integer""},{""name"":""deadline"",""type"":""Integer""},{""name"":""signature"",""type"":""ByteArray""}],""returntype"":""ByteArray"",""offset"":3195,""safe"":true},{""name"":""computeArgsHashForMetaTxByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""uncompressedPubKey"",""type"":""ByteArray""},{""name"":""targetContract"",""type"":""Hash160""},{""name"":""method"",""type"":""String""},{""name"":""args"",""type"":""Array""},{""name"":""argsHash"",""type"":""ByteArray""},{""name"":""nonce"",""type"":""Integer""},{""name"":""deadline"",""type"":""Integer""},{""name"":""signature"",""type"":""ByteArray""}],""returntype"":""ByteArray"",""offset"":3202,""safe"":true},{""name"":""executeMetaTx"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""uncompressedPubKey"",""type"":""ByteArray""},{""name"":""targetContract"",""type"":""Hash160""},{""name"":""method"",""type"":""String""},{""name"":""args"",""type"":""Array""},{""name"":""argsHash"",""type"":""ByteArray""},{""name"":""nonce"",""type"":""Integer""},{""name"":""deadline"",""type"":""Integer""},{""name"":""signature"",""type"":""ByteArray""}],""returntype"":""Any"",""offset"":3209,""safe"":false},{""name"":""executeMetaTxByAddress"",""parameters"":[{""name"":""accountAddress"",""type"":""Hash160""},{""name"":""uncompressedPubKey"",""type"":""ByteArray""},{""name"":""targetContract"",""type"":""Hash160""},{""name"":""method"",""type"":""String""},{""name"":""args"",""type"":""Array""},{""name"":""argsHash"",""type"":""ByteArray""},{""name"":""nonce"",""type"":""Integer""},{""name"":""deadline"",""type"":""Integer""},{""name"":""signature"",""type"":""ByteArray""}],""returntype"":""Any"",""offset"":5418,""safe"":false},{""name"":""update"",""parameters"":[{""name"":""nefFile"",""type"":""ByteArray""},{""name"":""manifest"",""type"":""String""}],""returntype"":""Void"",""offset"":5445,""safe"":false},{""name"":""_initialize"",""parameters"":[],""returntype"":""Void"",""offset"":5502,""safe"":false}],""events"":[{""name"":""Execute"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""target"",""type"":""Hash160""},{""name"":""method"",""type"":""String""},{""name"":""args"",""type"":""Array""}]},{""name"":""AccountCreated"",""parameters"":[{""name"":""accountId"",""type"":""ByteArray""},{""name"":""creator"",""type"":""Hash160""}]}]},""permissions"":[{""contract"":""*"",""methods"":""*""}],""trusts"":[],""extra"":{""Author"":""R3E Neo Explorer"",""Email"":""dev@neo.org"",""Description"":""A global, unified permission-controlling abstract account gateway."",""nef"":{""optimization"":""All""}}}");

    /// <summary>
    /// Optimization: "All"
    /// </summary>
    public static Neo.SmartContract.NefFile Nef => Convert.FromBase64String(@"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bGVuZ3RofTVfAgAARXw1R////9swc38I2zB0bMoAQJckHQwYSW52YWxpZCBzaWduYXR1cmUgbGVuZ3Ro4EHb/qh0QcX7oOA1MQIAAHV/B35re3p4NbYFAAB2bm0MAhkB2zATwDU3AgAAdwd5NdcFAAB3CAB6fwhvCG8H2yg3AwB3CW8JJB4MGUludmFsaWQgRUlQLTcxMiBzaWduYXR1cmXgaHg1lv7//3x7emgRwHg18/3//2h4NSkHAAB6eDWe/f//fHt6eBTADAdFeGVjdXRlQZUBb2F8H3t6QWJ9W1J3Cng1k/3//3g1EgcAAG8KQFcEAXjbMHBoygBBlyQFCSIHaBDOFJcmfQBAiHEQciJtaGqcSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn85KaWpR0EVqSpxKAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfckVqAEC1JJFpcGjKAECXJBoMFUludmFsaWQgcHVia2V5IGxlbmd0aOBo2yg3AgDbMHEAFIhyEHMib2kAH2ufSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn85KamtR0EVrSpxKAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfc0VrABS1JI9q2yhK2CQJSsoAFCgDOkBXAAF4ELckFQwQSW52YWxpZCBkZWFkbGluZeB4AwAQpdToAAAAtSYIeAHoA6BAeEBXAQJ42zBwaMoAIJckBHngaEBXAQJ5NY0BAAB4NWECAABfDl8PXxAVwDQMcGjbKDcCANswQFcGARBwEHEiamh4ac7KnkoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ9waUqcSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn3FFaXjKtSSUaIhxEHIQcyPlAAAAeGvOdBB1Im5sbc5KaWptnkoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ9R0EVtSpxKAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfdUVtbMq1JJBqbMqeSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn3JrSpxKAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfc0VreMq1JRz///9pQFcDAXjbMHBoygAUlyQbDBZJbnZhbGlkIGFkZHJlc3MgbGVuZ3Ro4AAgiHEQciOiAAAAaAATap9KAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfzkppHGqeSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn1HQRWpKnEoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ9yRWoAFLUlX////2lAVwQBeBC4JBQMD0ludmFsaWQgdWludDI1NuB42zBwaMpxaRC3JAUJIjZoaZ1KAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfzhCXJjVpSp1KAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfcUVpACC2JBUMEHVpbnQyNTYgb3ZlcmZsb3fgACCIchBzIm9oa85KagAfa59KAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfUdBFa0qcSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn3NFa2m1JJBqQFcDBno3AgDbMHB4NwIA2zBxfTXH/v//fDXB/v//e2h5Nd/9//9pXxEXwDVn/P//cmrbKDcCANswQFcDAXjbMHBoygBAlyeHAAAAAEGIcRRKaRBR0EUQciJtaGrOSmlqnEoCAAAAgC4EIgpKAv///38yHgP/////AAAAAJFKAv///38yDAMAAAAAAQAAAJ9R0EVqSpxKAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfckVqAEC1JJFpcGjKAEGXJAUJIgdoEM4UlyQqDCVJbnZhbGlkIHB1YmtleSBsZW5ndGggZm9yIGNvbXByZXNzaW9u4AAhiHFoAEDOEqIQlyYFEiIDE0ppEFHQRRByI58AAABoapxKAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfzkppapxKAgAAAIAuBCIKSgL///9/Mh4D/////wAAAACRSgL///9/MgwDAAAAAAEAAACfUdBFakqcSgIAAACALgQiCkoC////fzIeA/////8AAAAAkUoC////fzIMAwAAAAABAAAAn3JFagAgtSVi////adsoStgkCUrKACEoAzpAVwECXwdBm/ZnzhLAcHl4aMFFU4tQQeY/GIRAVwEBXwdBm/ZnzhLAcHhowUVTi1BBL1jF7UBXAQl4NTLy//9wfwh/B359fHt6eWg1W/f//0BXAQJfDEGb9mfOQZJd6DFK2CQJSsoAFCgDOnBoQfgn7IwkEQwMTm90IERlcGxveWVy4At5eDcEAEBWEgwBANswZwwMAQHbMGAMAQLbMGEMAQPbMGIMAQTbMGMMAQXbMGcJDAEG2zBnCgwBB9swZwgMAQjbMGcLDAEJ2zBnDQwBCtswZgwBC9swZAwBDNswZQwB/9swZwcMIItzw8abuP49US7MTPdZzHkjn3sXmw/6yqmnXVIrOUAP2zBnEAwgLj046gBVrZm1Vy4GZlhDH/TEDbrz4W4hVGOdxuJjSAPbMGcPDCDInv2qVMDyDHrfYSiC3wlQ9alRY34DB83LTGcvKYuLxtswZw4MIBC46b1LVvkiM8Yl30ek6IpO7vSQoB08Gr0iGs/fUZC42zBnEUB0noD9").AsSerializable<Neo.SmartContract.NefFile>();

    #endregion

    #region Events

    public delegate void delAccountCreated(byte[]? accountId, UInt160? creator);

    [DisplayName("AccountCreated")]
    public event delAccountCreated? OnAccountCreated;

    public delegate void delExecute(byte[]? accountId, UInt160? target, string? method, IList<object>? args);

    [DisplayName("Execute")]
    public event delExecute? OnExecute;

    #endregion

    #region Safe methods

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("computeArgsHash")]
    public abstract byte[]? ComputeArgsHash(IList<object>? args);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("computeArgsHashForMetaTx")]
    public abstract byte[]? ComputeArgsHashForMetaTx(byte[]? accountId, byte[]? uncompressedPubKey, UInt160? targetContract, string? method, IList<object>? args, byte[]? argsHash, BigInteger? nonce, BigInteger? deadline, byte[]? signature);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("computeArgsHashForMetaTxByAddress")]
    public abstract byte[]? ComputeArgsHashForMetaTxByAddress(UInt160? accountAddress, byte[]? uncompressedPubKey, UInt160? targetContract, string? method, IList<object>? args, byte[]? argsHash, BigInteger? nonce, BigInteger? deadline, byte[]? signature);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("getAccountAddress")]
    public abstract UInt160? GetAccountAddress(byte[]? accountId);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("getAccountIdByAddress")]
    public abstract byte[]? GetAccountIdByAddress(UInt160? accountAddress);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("getAdmins")]
    public abstract IList<object>? GetAdmins(byte[]? accountId);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("getAdminsByAddress")]
    public abstract IList<object>? GetAdminsByAddress(UInt160? accountAddress);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("getAdminThreshold")]
    public abstract BigInteger? GetAdminThreshold(byte[]? accountId);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("getAdminThresholdByAddress")]
    public abstract BigInteger? GetAdminThresholdByAddress(UInt160? accountAddress);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("getManagers")]
    public abstract IList<object>? GetManagers(byte[]? accountId);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("getManagersByAddress")]
    public abstract IList<object>? GetManagersByAddress(UInt160? accountAddress);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("getManagerThreshold")]
    public abstract BigInteger? GetManagerThreshold(byte[]? accountId);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("getManagerThresholdByAddress")]
    public abstract BigInteger? GetManagerThresholdByAddress(UInt160? accountAddress);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("getNonce")]
    public abstract BigInteger? GetNonce(UInt160? signer);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("getNonceForAccount")]
    public abstract BigInteger? GetNonceForAccount(byte[]? accountId, UInt160? signer);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("getNonceForAddress")]
    public abstract BigInteger? GetNonceForAddress(UInt160? accountAddress, UInt160? signer);

    /// <summary>
    /// Safe method
    /// </summary>
    [DisplayName("verify")]
    public abstract bool? Verify(byte[]? accountId);

    #endregion

    #region Unsafe methods

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("bindAccountAddress")]
    public abstract void BindAccountAddress(byte[]? accountId, UInt160? accountAddress);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("createAccount")]
    public abstract void CreateAccount(byte[]? accountId, IList<object>? admins, BigInteger? adminThreshold, IList<object>? managers, BigInteger? managerThreshold);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("createAccountWithAddress")]
    public abstract void CreateAccountWithAddress(byte[]? accountId, UInt160? accountAddress, IList<object>? admins, BigInteger? adminThreshold, IList<object>? managers, BigInteger? managerThreshold);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("execute")]
    public abstract object? Execute(byte[]? accountId, UInt160? targetContract, string? method, IList<object>? args);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("executeByAddress")]
    public abstract object? ExecuteByAddress(UInt160? accountAddress, UInt160? targetContract, string? method, IList<object>? args);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("executeMetaTx")]
    public abstract object? ExecuteMetaTx(byte[]? accountId, byte[]? uncompressedPubKey, UInt160? targetContract, string? method, IList<object>? args, byte[]? argsHash, BigInteger? nonce, BigInteger? deadline, byte[]? signature);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("executeMetaTxByAddress")]
    public abstract object? ExecuteMetaTxByAddress(UInt160? accountAddress, byte[]? uncompressedPubKey, UInt160? targetContract, string? method, IList<object>? args, byte[]? argsHash, BigInteger? nonce, BigInteger? deadline, byte[]? signature);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("setAdmins")]
    public abstract void SetAdmins(byte[]? accountId, IList<object>? admins, BigInteger? threshold);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("setAdminsByAddress")]
    public abstract void SetAdminsByAddress(UInt160? accountAddress, IList<object>? admins, BigInteger? threshold);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("setBlacklist")]
    public abstract void SetBlacklist(byte[]? accountId, UInt160? target, bool? isBlacklisted);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("setBlacklistByAddress")]
    public abstract void SetBlacklistByAddress(UInt160? accountAddress, UInt160? target, bool? isBlacklisted);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("setManagers")]
    public abstract void SetManagers(byte[]? accountId, IList<object>? managers, BigInteger? threshold);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("setManagersByAddress")]
    public abstract void SetManagersByAddress(UInt160? accountAddress, IList<object>? managers, BigInteger? threshold);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("setMaxTransfer")]
    public abstract void SetMaxTransfer(byte[]? accountId, UInt160? token, BigInteger? maxAmount);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("setMaxTransferByAddress")]
    public abstract void SetMaxTransferByAddress(UInt160? accountAddress, UInt160? token, BigInteger? maxAmount);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("setWhitelist")]
    public abstract void SetWhitelist(byte[]? accountId, UInt160? target, bool? isWhitelisted);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("setWhitelistByAddress")]
    public abstract void SetWhitelistByAddress(UInt160? accountAddress, UInt160? target, bool? isWhitelisted);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("setWhitelistMode")]
    public abstract void SetWhitelistMode(byte[]? accountId, bool? enabled);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("setWhitelistModeByAddress")]
    public abstract void SetWhitelistModeByAddress(UInt160? accountAddress, bool? enabled);

    /// <summary>
    /// Unsafe method
    /// </summary>
    [DisplayName("update")]
    public abstract void Update(byte[]? nefFile, string? manifest);

    #endregion
}
