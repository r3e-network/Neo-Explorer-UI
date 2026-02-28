const fs = require('fs');

const path = 'src/views/Transaction/components/TxTransfersTab.vue';
let content = fs.readFileSync(path, 'utf8');

// Add EtherscanPagination import
content = content.replace(
  'import { ref, watch } from "vue";',
  'import { ref, computed, watch } from "vue";\nimport EtherscanPagination from "@/components/common/EtherscanPagination.vue";'
);

// Add Pagination state
const scriptSetupEnd = `const tokenDecimalsMap = ref({});`;
const paginatedLogic = `const tokenDecimalsMap = ref({});

const currentPage = ref(1);
const pageSize = ref(10);

const paginatedTransfers = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return props.allTransfers.slice(start, end);
});

watch(() => props.allTransfers, () => {
  currentPage.value = 1;
});
`;

content = content.replace(scriptSetupEnd, paginatedLogic);

// Replace loop array
content = content.replace(
  '<tr v-for="(t, tIdx) in allTransfers"',
  '<tr v-for="(t, tIdx) in paginatedTransfers"'
);

// Replace tIdx + 1 with correct global index
content = content.replace(
  '<td class="table-cell-secondary text-xs">{{ tIdx + 1 }}</td>',
  '<td class="table-cell-secondary text-xs">{{ (currentPage - 1) * pageSize + tIdx + 1 }}</td>'
);

// Add Pagination Component at the bottom of the table container
const tableEnd = '</table>\n    </div>\n  </div>';
const tableEndWithPagination = `</table>
      <div v-if="allTransfers.length > pageSize" class="p-4 border-t soft-divider bg-slate-50/50 dark:bg-slate-800/20">
        <EtherscanPagination
          :current-page="currentPage"
          :total-pages="Math.ceil(allTransfers.length / pageSize)"
          :page-size="pageSize"
          :total-count="allTransfers.length"
          @go-to-page="currentPage = $event"
          @change-page-size="pageSize = $event; currentPage = 1"
        />
      </div>
    </div>
  </div>`;
content = content.replace(tableEnd, tableEndWithPagination);

fs.writeFileSync(path, content);
console.log('Added pagination');
