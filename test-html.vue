<template>
      <div v-if="abiMethods.length" class="overflow-x-auto">
        <table class="etherscan-table">
          <thead>
            <tr>
              <th class="w-1/4">Name</th>
              <th class="w-1/2">Parameters</th>
              <th class="w-1/6">Return Type</th>
              <th class="w-1/12 text-center">Safe</th>
            </tr>
          </thead>
          <tbody class="divide-y soft-divider">
            <tr v-for="method in abiMethods" :key="'abi-m-' + method.name" class="hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <td class="font-mono text-sm text-high font-medium">{{ method.name }}</td>
              <td class="font-mono text-xs text-mid">
                <div v-if="!method.parameters || method.parameters.length === 0" class="text-low italic">None</div>
                <div v-else class="flex flex-col gap-1">
                  <span v-for="(p, i) in method.parameters" :key="i">
                    {{ p.name }}: <span class="text-primary">{{ p.type }}</span>{{ i < method.parameters.length - 1 ? ',' : '' }}
                  </span>
                </div>
              </td>
              <td class="font-mono text-xs text-primary">{{ method.returntype || 'Void' }}</td>
              <td class="text-center">
                <span
                  class="rounded px-2 py-1 text-[10px] font-semibold uppercase"
                  :class="method.safe ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'"
                >
                  {{ method.safe ? "Yes" : "No" }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
</template>
