const fs = require('fs');

let io = fs.readFileSync('src/components/trace/InternalOperations.vue', 'utf8');

const emptyFallback = `<EmptyState
      v-if="!loading && operations.length === 0"
      icon="tx"
      message="No internal operations — this is a simple transfer."
    />`;

const fixedEmptyFallback = `    <!-- Fallback if only internal calls exist but no discrete parsed 'operations' -->
    <div v-if="!loading && operations.length === 0 && internalContractCalls.length > 0" class="space-y-2 mt-4">
      <h3 class="text-sm font-semibold text-high mb-3 px-4">Raw Internal Contract Calls</h3>
      <div v-for="(call, ci) in internalContractCalls" :key="'raw-call-' + ci" class="panel-muted flex items-start gap-3 px-4 py-3 mx-4">
        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-300">
          {{ ci + 1 }}
        </span>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <HashLink :hash="call.contract || call.contractHash || call.callee" type="contract" />
            <span v-if="call.method || call.operation" class="rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
              {{ call.method || call.operation }}
            </span>
          </div>
          <div v-if="call.caller" class="text-mid mt-1 text-xs">
            Called by: <HashLink :hash="call.caller" type="contract" />
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <EmptyState
      v-else-if="!loading && operations.length === 0 && internalContractCalls.length === 0"
      icon="tx"
      message="No internal operations — this is a simple transfer."
    />`;

io = io.replace(emptyFallback, fixedEmptyFallback);

// Add computed for internalContractCalls
io = io.replace(/const hasFault = computed\(\(\) => \{/, `const internalContractCalls = computed(() => {
  if (!props.enrichedTrace?.executions) return [];
  return props.enrichedTrace.executions.flatMap((e) => e.contractCalls ?? []);
});

const hasFault = computed(() => {`);

fs.writeFileSync('src/components/trace/InternalOperations.vue', io);
