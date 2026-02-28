const fs = require('fs');

let file = fs.readFileSync('src/views/Block/components/BlockOverview.vue', 'utf8');

file = file.replace(
  'const { getPrimaryNodeName, getPrimaryNodeAddress } = useCommittee();',
  'const { resolvePrimaryIndex, getPrimaryNodeName, getPrimaryNodeAddress } = useCommittee();'
);

const oldAddr = `const validatorAddress = computed(() => {
  if (props.block?.primary !== undefined) {
    const directAddr = getPrimaryNodeAddress(props.block.primary);
    if (directAddr) return scriptHashToAddress(directAddr);
  }
  return props.block?.nextconsensus ? scriptHashToAddress(props.block.nextconsensus) : null;
});`;

const newAddr = `const validatorAddress = computed(() => {
  const resolvedPrimary = resolvePrimaryIndex(props.block);
  if (resolvedPrimary !== undefined) {
    const directAddr = getPrimaryNodeAddress(resolvedPrimary);
    if (directAddr) return scriptHashToAddress(directAddr);
  }
  return props.block?.nextconsensus ? scriptHashToAddress(props.block.nextconsensus) : null;
});`;

file = file.replace(oldAddr, newAddr);

const oldTop = `<div class="flex flex-wrap items-center gap-2" v-if="validatorAddress">
          <span class="text-sm font-semibold text-high" v-if="block.primary !== undefined">
            {{ getPrimaryNodeName(block.primary) }}
          </span>
          <span class="text-mid" v-if="block.primary !== undefined">-</span>
          <HashLink :hash="validatorAddress" type="address" />
        </div>`;

const newTop = `<div class="flex flex-wrap items-center gap-2" v-if="validatorAddress">
          <span class="text-sm font-semibold text-high" v-if="resolvePrimaryIndex(block) !== undefined">
            {{ getPrimaryNodeName(resolvePrimaryIndex(block)) }}
          </span>
          <span class="text-mid" v-if="resolvePrimaryIndex(block) !== undefined">-</span>
          <HashLink :hash="validatorAddress" type="address" />
        </div>`;

file = file.replace(oldTop, newTop);


const oldBottom = `<InfoRow label="Validator" v-if="block.primary !== undefined && block.primary !== null">
        <div class="flex items-center gap-2">
          <span class="text-sm font-semibold text-high">
            {{ getPrimaryNodeName(block.primary) || "Unknown Validator" }}
          </span>
          <span class="text-mid mx-1">-</span>
          <HashLink v-if="validatorAddress" :hash="validatorAddress" type="address" :truncated="false" />
        </div>
      </InfoRow>`;
      
const newBottom = `<InfoRow label="Validator" v-if="resolvePrimaryIndex(block) !== undefined">
        <div class="flex items-center gap-2">
          <span class="text-sm font-semibold text-high">
            {{ getPrimaryNodeName(resolvePrimaryIndex(block)) || "Unknown Validator" }}
          </span>
          <span class="text-mid mx-1">-</span>
          <HashLink v-if="validatorAddress" :hash="validatorAddress" type="address" :truncated="false" />
        </div>
      </InfoRow>`;

file = file.replace(oldBottom, newBottom);

fs.writeFileSync('src/views/Block/components/BlockOverview.vue', file);
