<template>
  <div class="bgView">
    <div :class="['json-view', length ? 'closeable' : '']" :style="'font-size:' + fontSize + 'px'">
      <span @click="toggleClose" :class="['angle', innerclosed ? 'closed' : '']" v-if="length"> </span>
      <div class="content-wrap">
        <p class="first-line">
          <span v-if="jsonKey" class="json-key">"{{ jsonKey }}": </span>
          <span v-if="length">
            {{ prefix }}
            {{ innerclosed ? "..." + subfix : "" }}
            <span class="json-note">
              {{ innerclosed ? " // count: " + length : "" }}
            </span>
          </span>
          <span v-if="!length">{{ isArray ? "[]" : "{}" }}</span>
        </p>
        <div v-if="!innerclosed && length" class="json-body">
          <template v-for="(item, index) in items" :key="index">
            <contract-json-view
              :closed="closed"
              v-if="item.isJSON"
              :json="item.value"
              :jsonKey="item.key"
              :isLast="index === items.length - 1"
            ></contract-json-view>
            <p class="json-item" v-else>
              <span class="json-key">
                {{ isArray ? "" : '"' + item.key + '"' }}
              </span>
              :
              <span class="json-value">
                {{ item.value + (index === items.length - 1 ? "" : ",") }}
              </span>
            </p>
          </template>
          <span v-show="!innerclosed" class="body-line"></span>
        </div>
        <p v-if="!innerclosed && length" class="last-line">
          <span>{{ subfix }}</span>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";

const props = defineProps({
  json: [Object, Array],
  jsonKey: {
    type: String,
    default: "",
  },
  closed: {
    type: Boolean,
    default: false,
  },
  isLast: {
    type: Boolean,
    default: true,
  },
  fontSize: {
    type: Number,
    default: 13,
  },
});

const innerclosed = ref(props.closed);

watch(
  () => props.closed,
  (val) => {
    innerclosed.value = val;
  }
);

function isObjectOrArray(source) {
  const type = Object.prototype.toString.call(source);
  return type === "[object Array]" || type === "[object Object]";
}

function toggleClose() {
  innerclosed.value = !innerclosed.value;
}

const isArray = computed(() => {
  return Object.prototype.toString.call(props.json) === "[object Array]";
});

const length = computed(() => {
  return isArray.value ? props.json.length : Object.keys(props.json).length;
});

const subfix = computed(() => {
  return (isArray.value ? "]" : "}") + (props.isLast ? "" : ",");
});

const prefix = computed(() => {
  return isArray.value ? "[" : "{";
});

const items = computed(() => {
  if (isArray.value) {
    return props.json.map((item) => {
      const isJSON = isObjectOrArray(item);
      return {
        value: isJSON ? item : JSON.stringify(item),
        isJSON,
        key: "",
      };
    });
  }
  const json = props.json;
  return Object.keys(json).map((key) => {
    const item = json[key];
    const isJSON = isObjectOrArray(item);
    return {
      value: isJSON ? item : JSON.stringify(item),
      isJSON,
      key,
    };
  });
});
</script>

<style>
.bgView {
  background-color: #ffffff;
}

:is(.dark) .bgView {
  background-color: rgb(17 24 39);
}

.json-view {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  white-space: nowrap;
  padding-left: 20px;
  box-sizing: border-box;
}

.json-note {
  color: #6a7469;
}

:is(.dark) .json-note {
  color: #9ca3af;
}

.json-key {
  color: rgb(94, 114, 228);
}

:is(.dark) .json-key {
  color: rgb(147, 163, 255);
}

.json-value {
  color: rgb(81, 88, 81);
}

:is(.dark) .json-value {
  color: rgb(209, 213, 209);
}

.json-item {
  margin: 0;
  padding-left: 20px;
}

.first-line {
  padding: 0;
  margin: 0;
}

.json-body {
  position: relative;
  padding: 0;
  margin: 0;
}

.json-body .body-line {
  position: absolute;
  height: 100%;
  width: 0;
  border-left: dashed 1px #bbb;
  top: 0;
  left: 2px;
}

:is(.dark) .json-body .body-line {
  border-left-color: #4b5563;
}

.last-line {
  padding: 0;
  margin: 0;
}

.angle {
  position: absolute;
  display: block;
  cursor: pointer;
  float: left;
  width: 20px;
  text-align: center;
  left: 0;
}

.angle::after {
  content: "";
  display: inline-block;
  width: 0;
  height: 0;
  vertical-align: middle;
  border-top: solid 4px #333;
  border-left: solid 6px transparent;
  border-right: solid 6px transparent;
}

:is(.dark) .angle::after {
  border-top-color: #d1d5db;
}

.angle.closed::after {
  border-left: solid 4px #333;
  border-top: solid 6px transparent;
  border-bottom: solid 6px transparent;
}

:is(.dark) .angle.closed::after {
  border-left-color: #d1d5db;
}
</style>
