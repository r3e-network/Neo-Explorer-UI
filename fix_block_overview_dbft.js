const fs = require('fs');
let file = fs.readFileSync('src/views/Block/components/BlockOverview.vue', 'utf8');

const oldDbftValidator = `<InfoRow label="Validator" v-if="block.primary !== undefined && block.primary !== null">
        <span class="font-mono">{{ getPrimaryNodeName(block.primary) || \`#\${block.primary}\` }}</span>
      </InfoRow>`;

const newDbftValidator = `<InfoRow label="Validator" v-if="block.primary !== undefined && block.primary !== null">
        <div class="flex items-center gap-2">
          <span class="font-mono text-mid">#{{ block.primary }}</span>
          <span class="text-sm font-semibold text-high">
            {{ getPrimaryNodeName(block.primary) || "Unknown Validator" }}
          </span>
          <span class="text-mid mx-1">-</span>
          <HashLink v-if="validatorAddress" :hash="validatorAddress" type="address" :truncated="false" />
        </div>
      </InfoRow>`;

file = file.replace(oldDbftValidator, newDbftValidator);

// We should also perhaps remove or simplify the "Validated By" at the top since we are showing it in detail at the bottom? Let's leave "Validated By" but ensure the DBFT section also has it.
fs.writeFileSync('src/views/Block/components/BlockOverview.vue', file);
