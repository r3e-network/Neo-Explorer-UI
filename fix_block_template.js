const fs = require('fs');

let file = fs.readFileSync('src/components/common/BlockListItem.vue', 'utf8');

const oldTemplate = `<p class="text-xs text-mid" v-if="block.primary !== undefined">{{ getPrimaryNodeName(block.primary) || "Validator" }}</p><p class="text-xs text-mid" v-else>Validator</p>`;
// We made it use resolvePrimaryIndex in previous attempt but then overwrote it or something, let's make it robust

const newTemplate = `<p class="text-xs text-mid truncate">
          {{ resolvePrimaryIndex(block) !== undefined ? getPrimaryNodeName(resolvePrimaryIndex(block)) : "Validator" }}
        </p>`;
file = file.replace(oldTemplate, newTemplate);

fs.writeFileSync('src/components/common/BlockListItem.vue', file);
