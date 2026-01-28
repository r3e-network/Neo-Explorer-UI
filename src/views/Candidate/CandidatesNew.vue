<template>
  <div class="candidates-page min-h-screen bg-gray-50 dark:bg-gray-900">
    <div class="container mx-auto px-4 py-8">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          Candidates
        </h1>
        <p class="text-gray-500">Neo consensus candidates</p>
      </div>

      <div
        class="card bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden"
      >
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th
                  class="px-4 py-3 text-left text-sm font-medium text-gray-500"
                >
                  #
                </th>
                <th
                  class="px-4 py-3 text-left text-sm font-medium text-gray-500"
                >
                  Address
                </th>
                <th
                  class="px-4 py-3 text-right text-sm font-medium text-gray-500"
                >
                  Votes
                </th>
                <th
                  class="px-4 py-3 text-center text-sm font-medium text-gray-500"
                >
                  Status
                </th>
              </tr>
            </thead>
            <tbody class="divide-y dark:divide-gray-700">
              <tr
                v-for="(c, i) in candidates"
                :key="c.candidate"
                class="hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <td class="px-4 py-3 text-gray-500">{{ i + 1 }}</td>
                <td class="px-4 py-3">
                  <router-link
                    :to="`/accountprofile/${c.candidate}`"
                    class="text-primary-500 font-mono text-sm"
                  >
                    {{ truncate(c.candidate) }}
                  </router-link>
                </td>
                <td class="px-4 py-3 text-right">{{ formatVotes(c.votes) }}</td>
                <td class="px-4 py-3 text-center">
                  <span :class="statusClass(c.state)">{{ c.state }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { candidateService } from "@/services";

export default {
  name: "CandidatesPage",
  data: () => ({ candidates: [] }),
  created() {
    this.load();
  },
  methods: {
    async load() {
      const res = await candidateService.getList(50, 0);
      this.candidates = res?.result || [];
    },
    truncate(h) {
      return h ? `${h.slice(0, 8)}...${h.slice(-6)}` : "";
    },
    formatVotes(v) {
      return v ? parseInt(v).toLocaleString() : "0";
    },
    statusClass(s) {
      return s === "Consensus"
        ? "px-2 py-1 bg-green-100 text-green-700 rounded text-sm"
        : "px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm";
    },
  },
};
</script>
