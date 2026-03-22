# Neo N3 Explorer Enhancement Design

## 1. Executive Summary

Enhance the Neo N3 Explorer to match Etherscan/Blockscout quality with:

- Ultra-fast (<1s) load times
- Aggressive caching with smart prefetching
- Rich transaction flow visualization
- Real-time pending transactions
- Advanced token analytics
- Smart search with suggestions
- Interactive network charts
- Data export capabilities

## 2. Caching Strategy Enhancement

### 2.1 Current State

- LRU cache (500 items)
- Per-type TTL (15s - 5min)
- Request deduplication via pendingRequests
- Stale-While-Revalidate pattern

### 2.2 Proposed Improvements

#### Smart Prefetching

```javascript
// On hover, prefetch likely next pages
const prefetchNextPage = (currentPage, totalPages) => {
  if (currentPage < totalPages - 1) {
    prefetch(`page=${currentPage + 1}`); // 2 seconds hover
  }
};
```

#### Cache Warming (Critical)

```javascript
// Warm cache on app load
async function warmCriticalCache() {
  // Pre-fetch latest block, stats, gas price
  Promise.all([
    blockService.getLatestBlock(),
    statsService.getDashboardStats(),
    gasService.getGasPrice(),
  ]);
}
```

#### IndexedDB for Large Data

```javascript
// For charts, historical data - use IndexedDB
import { openDB } from "idb";

const db = await openDB("neo-explorer-cache", 1, {
  upgrade(db) {
    db.createObjectStore("chartData", { keyPath: "id" });
    db.createObjectStore("historicalPrices");
  },
});
```

### 2.3 Cache Configuration

| Data Type      | TTL  | Stale Time | Prefetch            |
| -------------- | ---- | ---------- | ------------------- |
| Latest Block   | 5s   | 2s         | On app load         |
| Block Detail   | 30s  | 10s        | Scroll near bottom  |
| Tx Detail      | 60s  | 15s        | From search         |
| Token Price    | 15s  | 5s         | Every 10s refresh   |
| Gas Price      | 10s  | 3s         | Real-time WebSocket |
| Chart Data     | 5min | 1min       | On view             |
| Search Results | N/A  | N/A        | No cache            |

## 3. Transaction Flow Visualization

### 3.1 Current State

- TokenTransferFlow.vue shows token movements
- Basic internal operations display
- Contract call map for execution trace

### 3.2 Proposed Enhancements

#### Multi-Hop Transaction Flow

```vue
<!-- New component: TransactionFlowDiagram.vue -->
<template>
  <div class="transaction-flow">
    <FlowGraph :transactions="trace.calls" :tokenTransfers="transfers" />
  </div>
</template>
```

Features:

- Visual graph of fund flow (address → address with amounts)
- NFT ownership transfers visualization
- Contract interaction timeline
- Gas consumption breakdown per call

#### Interactive Trace Viewer

- Click on any call to see input/output
- Step-through debug-like experience
- Copy values to clipboard

## 4. Real-Time Pending Transactions

### 4.1 Implementation

```javascript
// WebSocket for real-time pending txs
class PendingTxMonitor {
  constructor() {
    this.ws = new WebSocket(this.getWsUrl());
    this.listeners = new Set();
  }

  subscribe(callback) {
    this.listeners.add(callback);
    this.ws.send(
      JSON.stringify({
        method: "subscribe_pendingTransactions",
      })
    );
  }
}
```

### 4.2 UI Components

- Pending transactions panel (collapsible sidebar)
- Real-time gas suggestions based on pending tx count
- "Arriving in ~X blocks" indicator
- Flash highlight for new pending txs

### 4.3 Gas Price Oracle

```javascript
// Calculate suggested gas from pending tx pool
function calculateSuggestedGas(pendingTxs) {
  const sorted = pendingTxs.sort((a, b) => b.fee - a.fee);
  return {
    slow: sorted[Math.floor(sorted.length * 0.5)]?.fee, // 50th percentile
    average: sorted[Math.floor(sorted.length * 0.75)]?.fee, // 75th
    fast: sorted[Math.floor(sorted.length * 0.9)]?.fee, // 90th
  };
}
```

## 5. Token Analytics Enhancement

### 5.1 Price & Market Data

- Fetch from CoinGecko API (free tier)
- Historical price chart (7d, 30d, 90d, 1y)
- Price change indicators (24h, 7d)
- Market cap, volume (if available)

### 5.2 Enhanced Holder View

- Top 100 holders with pie chart
- Holder distribution histogram
- Whale alert (large transfers > $10k)

### 5.3 Token Comparison

- Compare up to 3 tokens side-by-side
- Price, volume, holders comparison

## 6. Smart Search

### 6.1 Search Suggestions

```javascript
// As-you-type suggestions
async function getSearchSuggestions(query) {
  const results = await Promise.all([
    searchBlocks(query, 3),
    searchTransactions(query, 3),
    searchAddresses(query, 2),
    searchTokens(query, 5),
  ]);
  return {
    blocks: results[0],
    transactions: results[1],
    addresses: results[2],
    tokens: results[3],
  };
}
```

### 6.2 Search Features

- Fuzzy matching for typos
- Recent searches (localStorage)
- Popular searches suggestions
- Search filters (by type, date range)
- QR code scan for address input

### 6.3 URL-based Deep Linking

- `/search?q=0x123...` - full page results
- Auto-redirect for valid hashes (no search page flicker)

## 7. Network Stats Charts

### 7.1 Chart Types (using ECharts)

- TPS (Transactions Per Second) - real-time line chart
- Daily Active Users (unique addresses)
- Gas utilized over time
- Token transfer volume
- New contract deployments
- Block size distribution

### 7.2 Time Range Selector

- 24h, 7d, 30d, 90d, 1y, All
- Custom date range picker
- Compare periods (e.g., this week vs last week)

### 7.3 Export Chart Data

- Download as PNG (chart image)
- Download as CSV (raw data)

## 8. Data Export

### 8.1 Export Formats

- CSV for tables (transactions, transfers, holders)
- JSON for API-like data dumps
- PDF for reports (optional)

### 8.2 Export Locations

- Transaction list → "Export CSV"
- Token transfers → "Export CSV"
- Block transactions → "Export CSV"
- Token holders → "Export CSV"
- Search results → "Export All"

### 8.3 Implementation

```javascript
function exportToCSV(data, filename) {
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(","),
    ...data.map((row) => headers.map((h) => row[h]).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}
```

## 9. Performance Optimization

### 9.1 Bundle Optimization

- Code splitting by route (already done)
- Lazy load heavy components (charts)
- Tree shake unused utilities

### 9.2 Request Optimization

- Batch RPC calls where possible
- Request prioritization (visible first)
- Abort in-flight requests on navigation
- Prefetch on scroll/hover

### 9.3 Render Optimization

- Virtual scrolling for large lists (1000+ items)
- Debounce search input
- Memoize computed properties
- Use v-memo for stable lists

### 9.4 Target Metrics

| Metric                   | Target  |
| ------------------------ | ------- |
| First Contentful Paint   | < 1s    |
| Time to Interactive      | < 2s    |
| Largest Contentful Paint | < 2.5s  |
| API Response (cached)    | < 200ms |
| API Response (fresh)     | < 500ms |
| Navigation               | < 100ms |

## 10. Implementation Priority

### Phase 1: Performance Foundation

1. Fix duplicate data fetching (blocking issue)
2. Implement cache warming
3. Add smart prefetching
4. Optimize bundle size

### Phase 2: User Experience

5. Enhanced search with suggestions
6. Real-time pending transactions
7. Gas price oracle

### Phase 3: Rich Features

8. Transaction flow visualization
9. Network stats charts
10. Token analytics enhancement

### Phase 4: Export & Polish

11. Data export functionality
12. UI/UX polish
13. Mobile optimizations

## 11. Technical Considerations

### API Rate Limiting

- Implement request queuing
- Exponential backoff on 429 errors
- Queue management UI for users

### Error Handling

- Graceful degradation (cache fallback)
- Retry with backoff
- User-friendly error messages

### Accessibility

- Keyboard navigation
- Screen reader support
- High contrast mode
