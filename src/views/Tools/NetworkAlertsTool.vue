<template>
  <div class="tool-page">
    <section class="page-container py-6 md:py-8">
      <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'Tools', to: '/tools' }, { label: 'Network Alerts' }]" />

      <div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-start gap-3">
          <div class="page-header-icon bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
          </div>
          <div>
            <h1 class="page-title">Network Alerts</h1>
            <p class="page-subtitle">Register for Neo network email alerts such as consensus delays or missed blocks.</p>
          </div>
        </div>
      </div>

      <div class="etherscan-card p-6 mb-6">
        <div class="max-w-2xl">
          <h2 class="text-lg font-semibold text-high mb-6 pb-2 border-b border-line-soft">Create a New Alert</h2>
          
          <form @submit.prevent="submitAlert" class="space-y-6">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-high mb-2">Network</label>
                <div class="relative">
                  <select v-model="form.network" class="form-input w-full appearance-none pr-10">
                    <option value="mainnet">N3 Mainnet</option>
                    <option value="testnet">N3 Testnet</option>
                  </select>
                  <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-low">
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-high mb-2">Alert Type</label>
                <div class="relative">
                  <select v-model="form.alertType" class="form-input w-full appearance-none pr-10">
                    <option value="consensus_stuck">Consensus Stuck (No blocks generated)</option>
                    <option value="consensus_missed">Consensus Node Missed Blocks</option>
                    <option value="account_event">Watch Account Events</option>
                  </select>
                  <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-low">
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="form.alertType === 'consensus_stuck'" class="p-4 bg-surface-muted rounded-xl border border-line-soft">
              <label class="block text-sm font-medium text-high mb-2">Alert me if no blocks are generated for over:</label>
              <div class="relative max-w-xs">
                <select v-model="form.threshold" class="form-input w-full appearance-none pr-10 bg-surface">
                  <option value="30">30 seconds</option>
                  <option value="60">1 minute</option>
                  <option value="120">2 minutes</option>
                  <option value="300">5 minutes</option>
                </select>
                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-low">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
              <p class="text-xs text-mid mt-3 flex items-start gap-1.5">
                <svg class="w-4 h-4 text-primary-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span>Useful for monitoring testnet health or running your own local consensus nodes.</span>
              </p>
            </div>

            <div v-if="form.alertType === 'consensus_missed'" class="p-4 bg-surface-muted rounded-xl border border-line-soft">
              <label class="block text-sm font-medium text-high mb-2">Consensus Node Public Key:</label>
              <input v-model="form.target" type="text" placeholder="e.g. 03b209fd4f53a7170ea4444e0cb0a6bb6a53c2bd016926989cf85f9b0fba17a70c" class="form-input w-full font-mono text-sm bg-surface" required />
              <p class="text-xs text-mid mt-3 flex items-start gap-1.5">
                <svg class="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                <span>Alerts if this specific node misses 3 or more consecutive consensus rounds.</span>
              </p>
            </div>

            <div v-if="form.alertType === 'account_event'" class="p-4 bg-surface-muted rounded-xl border border-line-soft">
              <label class="block text-sm font-medium text-high mb-2">Account Address:</label>
              <input v-model="form.target" type="text" placeholder="e.g. N..." class="form-input w-full font-mono text-sm bg-surface" required />
              <p class="text-xs text-mid mt-3 flex items-start gap-1.5">
                <svg class="w-4 h-4 text-primary-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                <span>Alerts on any incoming/outgoing transfer or contract invocation for this account.</span>
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-high mb-2">Delivery Email Address:</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-low" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                </div>
                <input v-model="form.contact" type="email" placeholder="your.email@example.com" class="form-input w-full pl-10" required />
              </div>
              <p class="text-xs text-mid mt-2">We will send an immediate email to this address when the alert condition is met. Alerts auto-deactivate after firing to prevent spam.</p>
            </div>

            <div class="pt-4">
              <button type="submit" class="btn-primary w-full sm:w-auto px-8 py-2.5 h-11 flex justify-center items-center gap-2" :disabled="loading">
                <svg v-if="loading" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span>{{ loading ? 'Registering...' : 'Register Alert' }}</span>
              </button>
            </div>

            <!-- Feedback Messages -->
            <transition name="fade">
              <div v-if="successMsg" class="p-4 bg-success/10 border border-success/20 rounded-xl flex items-start gap-3 mt-6">
                <svg class="w-5 h-5 text-success shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <div>
                  <h4 class="text-sm font-semibold text-success">Alert Registered Successfully</h4>
                  <p class="text-sm text-success/80 mt-1">{{ successMsg }}</p>
                </div>
              </div>
            </transition>

            <transition name="fade">
              <div v-if="errorMsg" class="p-4 bg-error/10 border border-error/20 rounded-xl flex items-start gap-3 mt-6">
                <svg class="w-5 h-5 text-error shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <div>
                  <h4 class="text-sm font-semibold text-error">Registration Failed</h4>
                  <p class="text-sm text-error/80 mt-1">{{ errorMsg }}</p>
                </div>
              </div>
            </transition>
          </form>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import Breadcrumb from "@/components/common/Breadcrumb.vue";
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
