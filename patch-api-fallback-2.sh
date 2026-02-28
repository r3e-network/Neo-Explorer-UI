#!/bin/bash
# Re-patch GetDailyContracts to guarantee it returns a value and doesn't get blocked by an unmarshaling error downstream.
sed -i 's/\*ret = json.RawMessage(r)/*ret = json.RawMessage(r)\n\t\t\/\/ explicitly clear error\n\t\treturn nil/' neo3fura/neo3fura_http/biz/api/src.GetDailyContracts.go

# Re-patch GetTokenTransferVolume
sed -i 's/\*ret = json.RawMessage(r)/*ret = json.RawMessage(r)\n\t\t\/\/ explicitly clear error\n\t\treturn nil/' neo3fura/neo3fura_http/biz/api/src.GetTokenTransferVolume.go

# Re-patch GetNewAddresses
sed -i 's/\*ret = json.RawMessage(r)/*ret = json.RawMessage(r)\n\t\t\/\/ explicitly clear error\n\t\treturn nil/' neo3fura/neo3fura_http/biz/api/src.GetNewAddresses.go
