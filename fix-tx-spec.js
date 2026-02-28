const fs = require('fs');

let code = fs.readFileSync('tests/services/transactionService.spec.js', 'utf8');

code = code.replace(/    it\("calls rpc with pagination", async \(\) => \{[\s\S]*?    \}\);/, `    it("calls rpc with pagination and backfills vmstate", async () => {
      const mockData = { result: [{ hash: "0x1" }, { hash: "0x2", vmstate: "HALT" }], totalCount: 2 };
      api.safeRpcList.mockResolvedValueOnce(mockData);
      
      // Mock the getByHash internal call
      api.safeRpc.mockResolvedValueOnce({ hash: "0x1", vmstate: "FAULT" });
      
      const result = await transactionService.getList(10, 5);
      expect(api.safeRpcList).toHaveBeenCalled();
      
      // Check if it backfilled the missing vmstate for 0x1
      expect(result.result[0].vmstate).toBe("FAULT");
      // Check if it preserved the existing vmstate for 0x2
      expect(result.result[1].vmstate).toBe("HALT");
    });`);

code = code.replace(/    it\("calls rpc with address and pagination", async \(\) => \{[\s\S]*?    \}\);/, `    it("calls rpc with address and pagination and backfills vmstate", async () => {
      const mockData = { result: [{ hash: "0x1" }], totalCount: 1 };
      api.safeRpcList.mockResolvedValueOnce(mockData);
      api.safeRpc.mockResolvedValueOnce({ hash: "0x1", vmstate: "HALT" });
      
      const result = await transactionService.getByAddress("0xNAddr", 15, 10);
      expect(api.safeRpcList).toHaveBeenCalledWith(
        "GetRawTransactionByAddress",
        { Address: "0xNAddr", Limit: 15, Skip: 10 },
        "get transactions by address"
      );
      
      expect(result.result[0].vmstate).toBe("HALT");
    });`);

fs.writeFileSync('tests/services/transactionService.spec.js', code);
