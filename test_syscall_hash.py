def reverseHexStr(hex_str):
    out = ""
    for i in range(len(hex_str) - 2, -1, -2):
        out += hex_str[i:i+2]
    return out

# Let's see what a typical syscall looks like in raw bytes
# 0x9bf667ce is System.Contract.Call in neoOpcodes.js
print("reverse(9bf667ce) =", reverseHexStr("9bf667ce"))
print("reverse(ce67f69b) =", reverseHexStr("ce67f69b"))
