import { ref } from "vue";

export function useSearch() {
  const query = ref("");
  const results = ref([]);

  const search = async (q) => {
    query.value = q;
    // Search logic here
  };

  return { query, results, search };
}
