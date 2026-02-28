const fs = require('fs');

const files = [
    'src/views/Tools/MultiSigTool.vue',
    'src/views/Tools/GovernanceTool.vue',
    'src/views/Tools/CandidateProfileTool.vue',
    'src/views/Tools/NeoFSTool.vue'
];

for (const file of files) {
    let code = fs.readFileSync(file, 'utf8');
    let changed = false;

    if (!code.includes('import { walletService }')) {
        code = code.replace(
            "import { connectedAccount } from '@/utils/wallet';",
            "import { connectedAccount } from '@/utils/wallet';\nimport { walletService } from \"@/services/walletService\";"
        );
        changed = true;
    }

    // Replace the pattern:
    // if (typeof window === "undefined" || !window.NEOLineN3) { ... }
    // const neoline = new window.NEOLineN3.Init();
    // const result = await neoline.signMessage({ message: ... });
    
    code = code.replace(
        /if \(typeof window === "undefined" \|\| !window\.NEOLineN3\) \{[\s\S]*?toast\.error\("NeoLine N3 wallet not found\."\);[\s\S]*?return;\n\s*\}/g,
        'if (!walletService.isConnected) {\n    toast.error("Please connect your wallet first via the header.");\n    return;\n  }'
    );
    
    // For CandidateProfileTool specifically which checks NEOLine without !connectedAccount
    code = code.replace(
        /if \(!connectedAccount\.value \|\| typeof window === "undefined" \|\| !window\.NEOLineN3\) \{[\s\S]*?toast\.error\("NeoLine N3 wallet not found or not connected\."\);[\s\S]*?return;\n\s*\}/g,
        'if (!walletService.isConnected) {\n    toast.error("Please connect your wallet first via the header.");\n    return;\n  }'
    );

    code = code.replace(
        /const neoline = new window\.NEOLineN3\.Init\(\);\n\s*const result = await neoline\.signMessage\(\{/g,
        'const result = await walletService.signMessage('
    );
    
    // Fix the closing bracket of signMessage if it was passing an object
    // neoline.signMessage({ message: "..." }) -> walletService.signMessage("...")
    // Let's do a regex to catch it
    code = code.replace(/await walletService\.signMessage\(\s*message:\s*(.+?)\s*\}\);/g, 'await walletService.signMessage($1);');

    if (changed || code.includes('walletService.signMessage')) {
        fs.writeFileSync(file, code);
        console.log("Patched", file);
    }
}
