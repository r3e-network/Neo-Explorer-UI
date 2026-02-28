const fs = require('fs');

let itemCode = fs.readFileSync('src/components/common/TxListItem.vue', 'utf8');

itemCode = itemCode.replace(/isComplex: \{ type: Boolean, default: false \},/, `isComplex: { type: Boolean, default: false },\n  transferSummary: { type: String, default: "" },`);

itemCode = itemCode.replace(/<span v-else-if="methodName" class="text-sm text-high font-medium">{{ methodName }}<\/span>/, `<div v-else-if="transferSummary && transferSummary !== '\u2014'" class="flex items-center gap-1.5 min-w-0">
            <span class="text-sm text-high font-medium truncate" :title="transferSummary">
              {{ transferSummary }}
            </span>
            <img v-if="transferSummary.includes('NEO')" src="/img/brand/neo.png" alt="NEO" class="w-3.5 h-3.5 rounded-full flex-shrink-0" />
            <img v-if="transferSummary.includes('GAS')" src="/img/brand/gas.png" alt="GAS" class="w-3.5 h-3.5 rounded-full flex-shrink-0" />
          </div>
          <span v-else-if="methodName" class="text-sm text-high font-medium">{{ methodName }}</span>`);
          
fs.writeFileSync('src/components/common/TxListItem.vue', itemCode);
