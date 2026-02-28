<template>
  <div class="network-alerts-tool max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-high">Network Alerts</h1>
      <p class="mt-2 text-mid">Register for Neo network alerts such as consensus delays or missed blocks.</p>
    </div>

    <div class="etherscan-card p-6 mb-6">
      <h2 class="text-lg font-semibold text-high mb-4">Create a New Alert</h2>
      
      <form @submit.prevent="submitAlert" class="space-y-6 max-w-lg">
        <div>
          <label class="block text-sm font-medium text-high mb-2">Network</label>
          <select v-model="form.network" class="w-full form-input">
            <option value="mainnet">Mainnet</option>
            <option value="testnet">Testnet</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-high mb-2">Alert Type</label>
          <select v-model="form.alertType" class="w-full form-input">
            <option value="consensus_stuck">Consensus Stuck (No blocks generated)</option>
            <option value="consensus_missed">Consensus Node Missed Blocks</option>
            <option value="account_event">Watch Account Events</option>
          </select>
        </div>

        <div v-if="form.alertType === 'consensus_stuck'">
          <label class="block text-sm font-medium text-high mb-2">Alert me if no blocks for over:</label>
          <select v-model="form.threshold" class="w-full form-input">
            <option value="30">30 seconds</option>
            <option value="60">1 minute</option>
            <option value="120">2 minutes</option>
            <option value="300">5 minutes</option>
          </select>
        </div>

        <div v-if="form.alertType === 'consensus_missed'">
          <label class="block text-sm font-medium text-high mb-2">Consensus Node Public Key:</label>
          <input v-model="form.target" type="text" placeholder="03..." class="w-full form-input" required />
          <p class="text-xs text-mid mt-1">Alerts if this node misses 3 or more consecutive rounds.</p>
        </div>

        <div v-if="form.alertType === 'account_event'">
          <label class="block text-sm font-medium text-high mb-2">Account Address:</label>
          <input v-model="form.target" type="text" placeholder="N..." class="w-full form-input" required />
          <p class="text-xs text-mid mt-1">Alerts on any incoming/outgoing transfer or contract invocation.</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-high mb-2">Email Address:</label>
          <input v-model="form.contact" type="email" placeholder="your.email@example.com" class="w-full form-input" required />
          <p class="text-xs text-mid mt-1">We will send an email to this address when the alert condition is met.</p>
        </div>

        <button type="submit" class="btn-primary w-full py-2" :disabled="loading">
          {{ loading ? 'Saving...' : 'Register Alert' }}
        </button>

        <div v-if="successMsg" class="p-3 bg-success/10 border border-success/20 text-success rounded text-sm mt-4">
          {{ successMsg }}
        </div>
        <div v-if="errorMsg" class="p-3 bg-error/10 border border-error/20 text-error rounded text-sm mt-4">
          {{ errorMsg }}
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { supabaseService } from '@/services/supabaseService';
import { getCurrentEnv } from '@/utils/env';

const loading = ref(false);
const successMsg = ref('');
const errorMsg = ref('');

const currentEnv = getCurrentEnv()?.toLowerCase() || 'mainnet';
const initialNetwork = currentEnv.includes('test') || currentEnv.includes('t5') ? 'testnet' : 'mainnet';

const form = ref({
  network: initialNetwork,
  alertType: 'consensus_stuck',
  threshold: 30,
  target: '',
  contact: ''
});

const submitAlert = async () => {
  loading.value = true;
  successMsg.value = '';
  errorMsg.value = '';

  const alertData = {
    network: form.value.network,
    alert_type: form.value.alertType,
    threshold: form.value.alertType === 'consensus_stuck' ? parseInt(form.value.threshold) : null,
    target: (form.value.alertType === 'consensus_missed' || form.value.alertType === 'account_event') ? form.value.target : null,
    contact: form.value.contact,
    is_active: true
  };

  try {
    const res = await supabaseService.saveNetworkAlert(alertData);
    if (res.success) {
      successMsg.value = 'Alert registered successfully! We will notify you when conditions are met.';
      form.value.target = '';
      form.value.contact = '';
    } else {
      errorMsg.value = res.error || 'Failed to register alert.';
    }
  } catch (err) {
    errorMsg.value = err.message || 'An unexpected error occurred.';
  } finally {
    loading.value = false;
  }
};
</script>
