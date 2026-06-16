<template>
  <div id="app">
    <a href="#main-content" class="skip-to-content">{{ $t("a11y.skipToContent") }}</a>
    <main id="main-content">
      <router-view />
    </main>
  </div>
</template>
