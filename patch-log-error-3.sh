#!/bin/bash
sed -i 's/return nil, stderr.ErrFind/log2.Errorf("QueryAggregate error in %s: %v", args.Index, err)\n\t\t\t\t\treturn nil, stderr.ErrFind/' neo3fura/neo3fura_http/lib/cli/src.go
