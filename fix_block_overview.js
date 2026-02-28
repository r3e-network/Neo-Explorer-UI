const fs = require('fs');

let file = fs.readFileSync('src/views/Block/components/BlockOverview.vue', 'utf8');

const oldDbft = `<div class="flex items-center gap-2">
          <span class="font-mono text-mid">#{{ block.primary }}</span>
          <span class="text-sm font-semibold text-high">
            {{ getPrimaryNodeName(block.primary) || "Unknown Validator" }}
          </span>
          <span class="text-mid mx-1">-</span>
          <HashLink v-if="validatorAddress" :hash="validatorAddress" type="address" :truncated="false" />
        </div>`;

const newDbft = `<div class="flex items-center gap-2">
          <span class="text-sm font-semibold text-high">
            {{ getPrimaryNodeName(block.primary) || "Unknown Validator" }}
          </span>
          <span class="text-mid mx-1">-</span>
          <HashLink v-if="validatorAddress" :hash="validatorAddress" type="address" :truncated="false" />
        </div>`;

file = file.replace(oldDbft, newDbft);

// Also top Validated By:
// Wait, top Validated by already shows `validatorAddress` as a HashLink. Should we show the name there too?
// Currently:
// <InfoRow label="Validated By" tooltip="The consensus node that proposed this block">
//  <HashLink v-if="validatorAddress" :hash="validatorAddress" type="address" />
//  <span v-else class="text-mid">--</span>
// </InfoRow>
//
// The user's prompt specifically mentioned: "make the validator show the validator name, not the id, and the address to show the validator address instead of the consensus address".
// If I change the top to just be the exact same block?
const oldTop = `<InfoRow label="Validated By" tooltip="The consensus node that proposed this block">
        <HashLink v-if="validatorAddress" :hash="validatorAddress" type="address" />
        <span v-else class="text-mid">--</span>
      </InfoRow>`;

const newTop = `<InfoRow label="Validated By" tooltip="The consensus node that proposed this block">
        <div class="flex flex-wrap items-center gap-2" v-if="validatorAddress">
          <span class="text-sm font-semibold text-high" v-if="block.primary !== undefined">
            {{ getPrimaryNodeName(block.primary) }}
          </span>
          <span class="text-mid" v-if="block.primary !== undefined">-</span>
          <HashLink :hash="validatorAddress" type="address" />
        </div>
        <span v-else class="text-mid">--</span>
      </InfoRow>`;

file = file.replace(oldTop, newTop);

fs.writeFileSync('src/views/Block/components/BlockOverview.vue', file);
