<template>
  <!-- Search -->
  <div
    class="searchNameContent"
    style="width: 100%; margin-top: 10px; margin-bottom: 20px; height: 80px"
  >
    <div style="width: 100%; height: 100%; float: left">
      <div class="searchName" style="height: 80px">
        <button
          class="buttonName searchButtonName"
          @click="search()"
          style="border: white"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M2.2141 2.31429C3.61587 0.771429 5.65481 0 7.56631 0C9.47782 0 11.5168 0.771429 13.1734 2.31429C15.8495 5.01429 16.1044 9.25714 13.938 12.2143L17.761 16.0714C18.0159 16.3286 18.0159 16.7143 17.761 16.9714L16.869 17.8714C16.7415 18 16.6141 18 16.3592 18C16.1044 18 15.9769 18 15.8495 17.8714L12.0265 14.0143C10.6247 14.9143 9.09552 15.4286 7.56631 15.4286C5.65481 15.4286 3.61587 14.6571 2.2141 13.2429C-0.716874 10.1571 -0.716874 5.27143 2.2141 2.31429ZM3.99817 11.3143C4.89021 12.3429 6.16454 12.8571 7.56631 12.8571C8.96808 12.8571 10.2424 12.3429 11.1345 11.3143C12.1539 10.4143 12.6637 9.12857 12.6637 7.71429C12.6637 6.3 12.1539 5.01429 11.1345 4.11429C10.2424 3.08571 8.96808 2.57143 7.56631 2.57143C6.16454 2.57143 4.89021 3.08571 3.99817 4.11429C2.9787 5.01429 2.46897 6.3 2.46897 7.71429C2.46897 9.12857 2.9787 10.4143 3.99817 11.3143Z"
              fill="#1e90ff"
            />
          </svg>
        </button>
        <input
          type="text"
          class="over-ellipsis-input"
          :placeholder="$t('tokensTable.prompt')"
          v-model="searchVal"
          autocomplete="off"
          @keyup.enter="search()"
          style="border-radius: 4px"
        />
      </div>
    </div>
    <!-- <div style="margin-right: 2%; float: right">
      <el-button
        @click="fresh()"
        title="click to fresh the page"
        size="small"
        style="background-color: white"
        ><i class="el-icon-refresh" style="font-size: 20px"></i
      ></el-button>
    </div> -->
  </div>
  <div class="card shadow" :class="type === 'dark' ? 'bg-default' : ''">
    <div class="table-responsive">
      <loading
        :is-full-page="false"
        :opacity="0.9"
        :active="isLoading"
      ></loading>
      <base-table
        class="table align-items-center table-hover"
        :class="type === 'dark' ? 'table-dark' : ''"
        :thead-classes="type === 'dark' ? 'thead-dark' : 'thead-light'"
        tbody-classes="list"
        :data="NEP17TxList"
      >
        <template v-slot:columns>
          <th class="tableHeader">{{ $t("tokenHolder.ranking") }}</th>
          <th class="tableHeader">
            {{ $t("tokenHolder.address") }}
            <el-button
              type="info"
              :plain="true"
              size="small"
              style="height: 21px; margin-left: 4px"
              @click="changeFormat(button)"
            >
              {{ this.button.buttonName }}</el-button
            >
          </th>
          <th class="tableHeader">{{ $t("tokenHolder.balance") }}</th>
          <!--          <th>Last Transferred</th>-->
          <th class="tableHeader" style="text-align: right">
            {{ $t("tokenHolder.percentage") }}
          </th>
        </template>

        <template v-slot:default="row">
          <th scope="row">
            <div class="media align-items-center">
              <div class="media-body">
                <div
                  v-if="
                    row.index + (pagination - 1) * this.resultsPerPage === 0
                  "
                >
                  {{
                    row.index + (this.pagination - 1) * this.resultsPerPage + 1
                  }}
                  &#129351;
                </div>
                <div
                  v-else-if="
                    row.index + (pagination - 1) * this.resultsPerPage === 1
                  "
                >
                  {{
                    row.index + (this.pagination - 1) * this.resultsPerPage + 1
                  }}
                  &#129352;
                </div>
                <div
                  v-else-if="
                    row.index + (pagination - 1) * this.resultsPerPage === 2
                  "
                >
                  {{
                    row.index + (this.pagination - 1) * this.resultsPerPage + 1
                  }}
                  &#129353;
                </div>
                <div v-else>
                  {{ row.index + (pagination - 1) * this.resultsPerPage + 1 }}
                </div>
              </div>
            </div>
          </th>
          <td class="Address">
            <router-link
              v-if="button.state"
              class="mb-0 table-list-item-blue"
              style="cursor: pointer"
              :to="'/accountprofile/' + row.item.address"
              >{{ scriptHashToAddress(row.item.address) }}</router-link
            >
            <router-link
              v-else
              class="mb-0 table-list-item-blue"
              style="cursor: pointer"
              :to="'/accountprofile/' + row.item.address"
              >{{ row.item.address }}
            </router-link>
          </td>
          <td class="table-list-item">
            {{ convertToken(row.item.balance, this.decimal) }}
          </td>
          <!--          <td class="firstused">-->
          <!--            {{ convertTime(row.item.lasttx.timestamp) }}-->
          <!--          </td>-->
          <td class="table-list-item" style="text-align: right">
            {{ toPercentage(row.item.percentage) }}
          </td>
        </template>
      </base-table>
    </div>

    <div
      v-if="totalCount >= 10"
      class="card-footer d-flex justify-content-end"
      :class="type === 'dark' ? 'bg-transparent' : ''"
      style="height: 70px"
    >
      <el-pagination
        v-if="windowWidth > 552"
        @current-change="handleCurrentChange"
        :hide-on-single-page="totalCount <= 10"
        :current-page="parseInt(pagination)"
        :pager-count="5"
        :page-size="10"
        layout="jumper, prev, pager, next"
        :total="totalCount"
      >
      </el-pagination>
      <el-pagination
        v-if="windowWidth < 552"
        small
        @current-change="handleCurrentChange"
        :hide-on-single-page="totalCount <= 10"
        :current-page="parseInt(pagination)"
        :pager-count="5"
        layout="prev,pager,next"
        :total="totalCount"
      >
      </el-pagination>
    </div>
  </div>
</template>
<script>
import { tokenService } from "@/services";
import Loading from "vue-loading-overlay";
import "vue-loading-overlay/dist/vue-loading.css";
import {
  convertToken,
  scriptHashToAddress,
  changeFormat,
} from "../../store/util";
import net from "../../store/store";

export default {
  name: "token-holder",
  props: {
    type: {
      type: String,
    },
    contractHash: String,
    decimal: Number,
  },
  components: {
    Loading,
  },
  data() {
    return {
      network: net.url,
      NEP17TxList: [],
      totalCount: 0,
      resultsPerPage: 10,
      pagination: this.$route.params.page,
      isLoading: true,
      countPage: 0,
      button: { state: true, buttonName: "Hash" },
      windowWidth: window.innerWidth,
    };
  },
  created() {
    this.getTokenList((this.pagination - 1) * this.resultsPerPage);
  },
  watch: {
    contractHash: "watchcontract",
    $route: "watchrouter",
  },
  methods: {
    changeFormat,
    convertToken,
    scriptHashToAddress,
    watchcontract() {
      this.getTokenList(0);
    },
    handleCurrentChange(val) {
      this.isLoading = true;
      this.pagination = val;
      this.$router.push({
        path: `/tokens/Gas/${this.pagination}`,
      });
    },
    toPercentage(num) {
      let s = Number(num * 100).toFixed(2);
      s += "%";
      return s;
    },
    watchrouter() {
      //如果路由有变化，执行的对应的动作
      // console.log(this.$route.name)
      if (this.$route.name === "tokens") {
        // console.log(this.pagination)
        this.pagination = this.$route.params.page;
        this.getTokenList((this.pagination - 1) * this.resultsPerPage);
      }
    },
    getAddress(accountAddress) {
      this.$router.push({
        path: `/accountprofile/${accountAddress}`,
      });
    },
    getTokenListByName(name, skip, type) {
      tokenService.searchNep17ByName(this.name, this.resultsPerPage, skip).then((res) => {
        this.tokenList = res?.result || [];
        this.totalCount = res?.totalCount || 0;
        this.countPage = Math.ceil(this.totalCount / this.resultsPerPage);
        this.isLoading = false;
      }).catch((err) => {
        console.error("Failed to search tokens:", err);
        this.isLoading = false;
      });
    },
    search() {
      this.isLoading = true;
      let value = this.searchVal;
      value = value.trim();
      if (value === "") {
        this.isLoading = false;
        return;
      }
      this.name = value;
      this.searchVal = "";
      this.getTokenListByName(value, 0, "GAS");
    },
    fresh() {
      window.location.replace(window.location.href);
    },
    getTokenList(skip) {
      tokenService.getHolders(this.contractHash, this.resultsPerPage, skip).then((res) => {
        this.NEP17TxList = res?.result || [];
        this.totalCount = res?.totalCount || 0;
        this.countPage = Math.ceil(this.totalCount / this.resultsPerPage);
        this.isLoading = false;
      }).catch((err) => {
        console.error("Failed to load GAS holders:", err);
        this.isLoading = false;
      });
    },
  },
};
</script>
<style>
.searchButtonName {
  cursor: pointer;
  position: absolute;
  left: 1px;
  bottom: 1px;
  top: 1px;
  width: 70px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #ffffff !important;
  border-radius: 4px;
  border: white;
}
.over-ellipsis-input {
  width: 100%;
  height: 100%;
  padding-right: 71px;
  padding-left: 71px;
  font-size: 18px;
  background: white;
  border: 0px !important;
  border-radius: 4px;
  color: black;
  outline: none;
}
</style>
