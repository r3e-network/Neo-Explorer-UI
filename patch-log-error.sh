#!/bin/bash
sed -i 's/return nil, stderr.ErrFind/log2.Errorf("Error in %s: %v", args.Index, err)\n\t\t\treturn nil, stderr.ErrFind/' neo3fura/neo3fura_http/lib/cli/src.go
