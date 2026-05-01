<template>
  <div class="tool-page">
    <section class="page-container py-6 md:py-8">
      <Breadcrumb :items="[{ label: $t('breadcrumb.home'), to: '/homepage' }, { label: $t('breadcrumb.tools'), to: '/tools' }, { label: $t('breadcrumb.networkAlerts') }]" />

      <div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-start gap-3">
          <div class="page-header-icon bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
          </div>
          <div>
            <h1 class="page-title">{{ $t('tools.networkAlerts.pageTitle') }}</h1>
            <p class="page-subtitle">{{ $t('tools.networkAlerts.pageSubtitle') }}</p>
          </div>
        </div>
      </div>

      <div class="etherscan-card p-6 md:p-8 mb-6">
        <div class="max-w-2xl">
          <h2 class="text-lg font-semibold text-high mb-6 pb-2 border-b border-line-soft">{{ $t('tools.networkAlerts.createNew') }}</h2>
          
          <form @submit.prevent="submitAlert" class="space-y-6">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label for="alert-network" class="block text-sm font-medium text-high mb-2">{{ $t('tools.networkAlerts.labelNetwork') }}</label>
                <div class="relative">
                  <select id="alert-network" v-model="form.network" class="form-input w-full appearance-none pr-10 rounded-xl shadow-inner focus:ring-2 focus:ring-rose-500/20 hover:border-rose-400 focus:border-rose-400 transition-all outline-none">
                    <option value="mainnet">{{ $t('tools.networkAlerts.networkMainnet') }}</option>
                    <option value="testnet">{{ $t('tools.networkAlerts.networkTestnet') }}</option>
                  </select>
                  <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-low">
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              <div>
                <label for="alert-type" class="block text-sm font-medium text-high mb-2">{{ $t('tools.networkAlerts.labelAlertType') }}</label>
                <div class="relative">
                  <select id="alert-type" v-model="form.alertType" class="form-input w-full appearance-none pr-10 rounded-xl shadow-inner focus:ring-2 focus:ring-rose-500/20 hover:border-rose-400 focus:border-rose-400 transition-all outline-none">
                    <option value="consensus_stuck">{{ $t('tools.networkAlerts.typeConsensusStuck') }}</option>
                    <option value="consensus_missed">{{ $t('tools.networkAlerts.typeConsensusMissed') }}</option>
                    <option value="account_event">{{ $t('tools.networkAlerts.typeAccountEvent') }}</option>
                  </select>
                  <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-low">
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="form.alertType === 'consensus_stuck'" class="p-4 bg-surface-muted rounded-xl border border-line-soft">
              <label for="alert-threshold" class="block text-sm font-medium text-high mb-2">{{ $t('tools.networkAlerts.thresholdLabel') }}</label>
              <div class="relative max-w-xs">
                <select id="alert-threshold" v-model="form.threshold" class="form-input w-full appearance-none pr-10 bg-surface rounded-xl shadow-inner focus:ring-2 focus:ring-rose-500/20 hover:border-rose-400 focus:border-rose-400 transition-all outline-none">
                  <option value="30">{{ $t('tools.networkAlerts.threshold30') }}</option>
                  <option value="60">{{ $t('tools.networkAlerts.threshold60') }}</option>
                  <option value="120">{{ $t('tools.networkAlerts.threshold120') }}</option>
                  <option value="300">{{ $t('tools.networkAlerts.threshold300') }}</option>
                </select>
                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-low">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
              <p class="text-xs text-mid mt-3 flex items-start gap-1.5">
                <svg class="w-4 h-4 text-primary-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span>{{ $t('tools.networkAlerts.thresholdHelp') }}</span>
              </p>
            </div>

            <div v-if="form.alertType === 'consensus_missed'" class="p-4 bg-surface-muted rounded-xl border border-line-soft">
              <label for="alert-consensus-key" class="block text-sm font-medium text-high mb-2">{{ $t('tools.networkAlerts.consensusKeyLabel') }}</label>
              <input id="alert-consensus-key" v-model="form.target" type="text" :placeholder="$t('tools.networkAlerts.consensusKeyPlaceholder')" class="form-input w-full font-mono text-sm bg-surface rounded-xl shadow-inner focus:ring-2 focus:ring-rose-500/20 hover:border-rose-400 focus:border-rose-400 transition-all outline-none" required />
              <p class="text-xs text-mid mt-3 flex items-start gap-1.5">
                <svg class="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                <span>{{ $t('tools.networkAlerts.consensusKeyHelp') }}</span>
              </p>
            </div>

            <div v-if="form.alertType === 'account_event'" class="p-4 bg-surface-muted rounded-xl border border-line-soft">
              <label for="alert-account-address" class="block text-sm font-medium text-high mb-2">{{ $t('tools.networkAlerts.accountAddressLabel') }}</label>
              <input id="alert-account-address" v-model="form.target" type="text" :placeholder="$t('tools.networkAlerts.accountAddressPlaceholder')" class="form-input w-full font-mono text-sm bg-surface rounded-xl shadow-inner focus:ring-2 focus:ring-rose-500/20 hover:border-rose-400 focus:border-rose-400 transition-all outline-none" required />
              <p class="text-xs text-mid mt-3 flex items-start gap-1.5">
                <svg class="w-4 h-4 text-primary-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                <span>{{ $t('tools.networkAlerts.accountAddressHelp') }}</span>
              </p>
            </div>

            <div>
              <label for="alert-email" class="block text-sm font-medium text-high mb-2">{{ $t('tools.networkAlerts.emailLabel') }}</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-low" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                </div>
                <input id="alert-email" v-model="form.contact" type="email" :placeholder="$t('tools.networkAlerts.emailPlaceholder')" class="form-input w-full pl-10 rounded-xl shadow-inner focus:ring-2 focus:ring-rose-500/20 hover:border-rose-400 focus:border-rose-400 transition-all outline-none" required />
              </div>
              <p class="text-xs text-mid mt-2">{{ $t('tools.networkAlerts.emailHelp') }}</p>
            </div>

            <div class="pt-4">
              <button type="submit" class="w-full sm:w-auto px-8 py-2.5 h-11 flex justify-center items-center gap-2 inline-flex rounded-xl bg-rose-500 px-6 text-sm font-bold text-white hover:bg-rose-600 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none shadow-md active:scale-95" :disabled="loading">
                <svg v-if="loading" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span>{{ loading ? $t('tools.networkAlerts.submitting') : $t('tools.networkAlerts.submit') }}</span>
              </button>
            </div>

            <!-- Feedback Messages -->
            <transition name="fade">
              <div v-if="successMsg" class="p-4 bg-success/10 border border-success/20 rounded-xl flex items-start gap-3 mt-6">
                <svg class="w-5 h-5 text-success shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <div>
                  <h4 class="text-sm font-semibold text-success">{{ $t('tools.networkAlerts.successTitle') }}</h4>
                  <p class="text-sm text-success/80 mt-1">{{ successMsg }}</p>
                </div>
              </div>
            </transition>

            <transition name="fade">
              <div v-if="errorMsg" class="p-4 bg-error/10 border border-error/20 rounded-xl flex items-start gap-3 mt-6">
                <svg class="w-5 h-5 text-error shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <div>
                  <h4 class="text-sm font-semibold text-error">{{ $t('tools.networkAlerts.errorTitle') }}</h4>
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
import { useI18n } from 'vue-i18n';
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import { supabaseService } from '@/services/supabaseService';
import { getCurrentEnv } from '@/utils/env';
import { useNetworkChange } from '@/composables/useNetworkChange';

const { t } = useI18n();

const loading = ref(false);
const successMsg = ref('');
const errorMsg = ref('');

const resolveActiveNetwork = () => {
  const currentEnv = getCurrentEnv()?.toLowerCase() || 'mainnet';
  return currentEnv.includes('test') || currentEnv.includes('t5') ? 'testnet' : 'mainnet';
};

const form = ref({
  network: resolveActiveNetwork(),
  alertType: 'consensus_stuck',
  threshold: 30,
  target: '',
  contact: ''
});

function handleNetworkChange() {
  form.value.network = resolveActiveNetwork();
}

useNetworkChange(handleNetworkChange);

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
      successMsg.value = t('tools.networkAlerts.successMessage');
      form.value.alertType = 'consensus_stuck';
      form.value.threshold = 30;
      form.value.target = '';
      form.value.contact = '';
      setTimeout(() => { successMsg.value = ''; }, 8000);
    } else {
      errorMsg.value = res.error || t('tools.networkAlerts.errorFallback');
    }
  } catch (err) {
    errorMsg.value = err.message || t('tools.networkAlerts.errorUnexpected');
  } finally {
    loading.value = false;
  }
};
</script>
