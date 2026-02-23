import { disassembleScript } from "./src/utils/scriptDisassembler.js";
import bs58 from "bs58";
import { sha256 } from "js-sha256";

// A typical Neo3 invocation script base64 (e.g., from an actual transaction).
// Let's use a mocked one containing a syscall if possible.
// Wait, I can just fetch a real tx script from test_ngd.py
