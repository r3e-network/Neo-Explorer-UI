const fs = require('fs');

let nd = fs.readFileSync('src/components/trace/NotificationDecoder.vue', 'utf8');

// The tokenDecimals in NotificationDecoder.vue is hardcoded to only check NATIVE_CONTRACTS.
// It doesn't check the tokenService or the contractService for dynamic contracts.

// We need to fetch decimals dynamically if it's not a native contract.
const scriptDecimals = `<script setup>
import { ref, computed, watch } from "vue";
import { NATIVE_CONTRACTS } from "@/constants/index";
import { formatTokenAmount } from "@/utils/explorerFormat";
import { tokenService } from "@/services/tokenService";

const props = defineProps({
  notification: {
    type: Object,
    required: true,
  },
  showInlineParams: {
    type: Boolean,
    default: false,
  },
});

const showRawState = ref(false);
const dynamicDecimals = ref(null);

const tokenDecimals = computed(() => {
  if (dynamicDecimals.value !== null) return dynamicDecimals.value;
  const hash = props.notification.contract;
  if (!hash) return 0;
  const native = NATIVE_CONTRACTS[hash.toLowerCase()];
  return native?.decimals ?? 0;
});

watch(
  () => props.notification.contract,
  async (hash) => {
    if (!hash) return;
    const lowerHash = hash.toLowerCase();
    if (!NATIVE_CONTRACTS[lowerHash]) {
      try {
        const token = await tokenService.getByHash(lowerHash);
        if (token && typeof token.decimals !== "undefined") {
          dynamicDecimals.value = Number(token.decimals);
        }
      } catch (e) { /* ignore */ }
    }
  },
  { immediate: true }
);`;

nd = nd.replace(/<script setup>[\s\S]*?return native\?\.decimals \?\? 0;\n\}\);/, scriptDecimals);
fs.writeFileSync('src/components/trace/NotificationDecoder.vue', nd);

let io = fs.readFileSync('src/components/trace/InternalOperations.vue', 'utf8');

const ioDecimals = `const props = defineProps({
  enrichedTrace: {
    type: Object,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const tokenDecimalsMap = ref({});

watch(
  () => props.enrichedTrace,
  async (trace) => {
    if (!trace?.executions) return;
    
    const fetchPromises = [];
    
    for (const exec of trace.executions) {
      if (!exec.operations) continue;
      for (const op of exec.operations) {
        if (!op.contract || NATIVE_CONTRACTS[op.contract.toLowerCase()]) continue;
        
        const hash = op.contract.toLowerCase();
        if (tokenDecimalsMap.value[hash] === undefined) {
           tokenDecimalsMap.value[hash] = 0; // default while fetching
           fetchPromises.push(
             tokenService.getByHash(hash).then(t => {
               if (t && typeof t.decimals !== 'undefined') {
                 tokenDecimalsMap.value[hash] = Number(t.decimals);
               }
             }).catch(e => {})
           );
        }
      }
    }
    
    await Promise.all(fetchPromises);
  },
  { immediate: true, deep: true }
);`;

io = io.replace(/const props = defineProps\(\{[\s\S]*?\}\);/, ioDecimals);
io = io.replace(/import \{ formatTokenAmount \} from "@\/utils\/explorerFormat";/, `import { formatTokenAmount } from "@/utils/explorerFormat";\nimport { tokenService } from "@/services/tokenService";\nimport { NATIVE_CONTRACTS } from "@/constants";`);

io = io.replace(/function getAmount\(op\) \{\n  return formatTokenAmount\(op\.amount, op\.tokenDecimals \?\? 0, 8\);\n\}/, `function getAmount(op) {
  let dec = op.tokenDecimals;
  if (dec === undefined || dec === null) {
     const hash = op.contract?.toLowerCase();
     if (hash && NATIVE_CONTRACTS[hash]) {
       dec = NATIVE_CONTRACTS[hash].decimals;
     } else if (hash && tokenDecimalsMap.value[hash] !== undefined) {
       dec = tokenDecimalsMap.value[hash];
     } else {
       dec = 0;
     }
  }
  return formatTokenAmount(op.amount, dec, 8);
}`);

fs.writeFileSync('src/components/trace/InternalOperations.vue', io);
