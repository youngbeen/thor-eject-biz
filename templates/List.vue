<template>
  <section class="page-*param:{bizName}-list">
    <div class="cs-content-block">
      <div class="cs-page-title" v-if="page.foreignKey || page.name">{{ page.foreignKey ? t(page.foreignKey) : page.name }}{{ t('label.listPage') }}</div>
      <!-- 筛选栏 -->
      <div class="box-filters"
        v-if="listPage.filters.length || listPage.filterActions.length || listPage.batchActions.length">
        <el-form
          :inline="true"
          :size="page.size || 'small'">
          <el-form-item
            :class="[item.required && 'is-required']"
            v-show="!item.when || item.when(form, listPage.filters, this)"
            v-for="item in listPage.filters"
            :key="item.parameter"
            :label="item.foreignKey ? t(item.foreignKey) : item.label">
            <!-- input类型 -->
            <el-input v-if="item.type === 'input'"
              v-model="item.value"
              :clearable="!item.required"
              :maxlength="item.maxlength || ''"
              placeholder=""></el-input>
            <!-- select | inputselect类型 -->
            <el-select v-else-if="item.type === 'select' || item.type === 'inputselect'"
              v-model="item.value"
              :multiple="item.multiple"
              filterable
              reserve-keyword
              :allow-create="item.type === 'inputselect'"
              :clearable="!item.required"
              :remote="Boolean(item.lazyOptions)"
              :remote-method="Boolean(item.lazyOptions) ? (keyword) => triggerLazyOptionLoad(item, keyword) : undefined"
              placeholder="">
              <el-option
                v-for="o in item.options"
                :key="o.value"
                :label="o.label"
                :value="o.value"
                :disabled="o.disabled">
              </el-option>
            </el-select>
            <!-- date | datetime | month | daterange类型 -->
            <el-date-picker
              v-else-if="['date', 'datetime', 'month', 'daterange'].includes(item.type)"
              v-model="item.value"
              :type="item.type"
              :value-format="dateFormatMap.get(item.type)"
              :clearable="!item.required"
              placeholder="">
            </el-date-picker>
            <!-- time类型 -->
            <el-time-picker
              v-else-if="item.type === 'time'"
              v-model="item.value"
              value-format="HH:mm:ss"
              :clearable="!item.required"
              placeholder="">
            </el-time-picker>
            <!-- cascader类型 -->
            <el-cascader v-else-if="item.type === 'cascader'"
              v-model="item.value"
              :options="item.options"
              :props="{
                checkStrictly: item.nodeSelectable,
                lazy: Boolean(item.lazyOptions),
                lazyLoad: item.lazyOptions,
                multiple: item.multiple
              }"
              filterable
              :clearable="!item.required"
              placeholder="">
            </el-cascader>
            <!-- 支持其他种类 -->
          </el-form-item>
          <el-form-item v-if="listPage.filters.length && (listPage.hasSearch === undefined || listPage.hasSearch)">
            <el-button type="primary" @click="search()">
              <font-awesome-icon :icon="['fas', 'search']" />&nbsp;{{ t('button.query') }}
            </el-button>
          </el-form-item>
          <el-form-item v-if="listPage.filters.length && (listPage.hasSearch === undefined || listPage.hasSearch)">
            <el-button type="default" @click="reset()">
              {{ t('button.reset') }}
            </el-button>
          </el-form-item>
          <!-- 筛选栏操作 -->
          <el-form-item v-show="hasPermission(action.permissionKey) && (!action.when || action.when(form, this))"
            v-for="(action, index) in listPage.filterActions" :key="'fa-' + index">
            <el-button :type="action.style" @click="handleActionConfirm($event, 'filterAction', action, form)">
              {{ action.foreignKey ? t(action.foreignKey) : action.label }}
            </el-button>
          </el-form-item>
          <!-- 表格批量操作 -->
          <el-form-item v-show="hasPermission(action.permissionKey) && (!action.when || action.when(selections, this))"
            v-for="(action, index) in listPage.batchActions" :key="'ba-' + index">
            <el-button
              :type="action.style || 'primary'"
              :disabled="action.disabled && action.disabled(selections, this)"
              @click="handleActionConfirm($event, 'batchAction', action, selections)">
              {{ action.foreignKey ? t(action.foreignKey) : action.label }}
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 列表栏 -->
      <div class="box-list" v-if="page.foreignKey || page.name">
        <el-table
          :size="page.size === 'mini' ? 'small' : 'medium'"
          :data="list"
          v-loading="loading"
          :row-key="getRowKey"
          :default-expand-all="listPage.treeExpendMode === 'all'"
          :expand-row-keys="defaultExpands"
          @selection-change="handleSelectionChange"
          style="width: 100%">
          <el-table-column
            type="selection"
            v-if="listPage.batchActions.length"
            :key="page.bizPageId + '-pageselection'"
            width="55">
          </el-table-column>
          <el-table-column
            v-if="listPage.hasIndex === undefined || listPage.hasIndex"
            type="index"
            :key="page.bizPageId + '-pageindex'"
            :label="t('label.indexName')"
            width="60">
          </el-table-column>
          <el-table-column
            v-for="item in displayedTableFields"
            :key="page.bizPageId + '-' + item.parameter"
            :prop="item.parameter"
            :label="item.foreignKey ? t(item.foreignKey) : item.label"
            :align="item.align || 'left'"
            :width="item.width || ''"
            :sortable="Boolean(item.sortable)"
            :show-overflow-tooltip="true">
            <template slot-scope="scope">
              <span v-if="!item.type || item.type === 'text'">
                {{ item.handler ? item.handler(scope.row[item.parameter], scope.row, this) : scope.row[item.parameter] }}
              </span>
              <el-image v-else-if="item.type === 'image' && scope.row[item.parameter]"
                style="width: 26px; height: 26px"
                :src="scope.row[item.parameter]"
                :preview-src-list="[scope.row[item.parameter]]"
                fit="contain">
              </el-image>
              <span v-else-if="item.type === 'tag'">
                <el-tag type="success" size="mini" hit v-if="item.successStatus && item.successStatus.includes(scope.row[item.parameter])">{{ item.handler ? item.handler(scope.row[item.parameter], scope.row, this) : scope.row[item.parameter] }}</el-tag>
                <el-tag type="danger" size="mini" hit v-else-if="item.failStatus && item.failStatus.includes(scope.row[item.parameter])">{{ item.handler ? item.handler(scope.row[item.parameter], scope.row, this) : scope.row[item.parameter] }}</el-tag>
                <el-tag type="info" size="mini" hit v-else>{{ item.handler ? item.handler(scope.row[item.parameter], scope.row, this) : scope.row[item.parameter] }}</el-tag>
              </span>
              <el-link v-else-if="item.type === 'link'"
                type="primary"
                :href="scope.row[item.parameter]"
                target="_blank">
                {{ scope.row[item.parameter] }}
              </el-link>
            </template>
          </el-table-column>
          <el-table-column
            :key="page.bizPageId + '-pageaction'"
            fixed="right"
            :label="t('label.operation')"
            v-if="listPage.tableActions.length"
            :min-width="listPage.tableActionWidth || listPage.tableActions.length * 80">
            <template slot-scope="scope">
              <span v-for="(action, index) in listPage.tableActions" :key="'ta-' + index">
                <el-button v-if="hasPermission(action.permissionKey) && (!action.when || action.when(scope.row, this))"
                  :type="action.style || 'primary'"
                  :size="listPage.tableActionSize || 'mini'"
                  @click="handleActionConfirm($event, 'tableAction', action, scope.row)"
                  style="margin-right: 6px;">{{ action.foreignKey ? t(action.foreignKey) : action.label }}</el-button>
              </span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页栏 -->
      <div class="box-footer" v-if="listPage.pager" style="margin-top: 12px;" :style="{ textAlign: listPage.pager.align || 'left' }">
        <el-pagination
          class="box-pager"
          :layout="listPage.pager.pagerLayout"
          background
          :current-page.sync="filter.pageNo"
          :total="total"
          :page-sizes="[10, 20, 50]"
          :page-size.sync="filter.pageSize"
          @size-change="handleSizeChange()"
          @current-change="handlePageChange()">
        </el-pagination>
      </div>

      <!-- 内嵌编辑弹框组件 -->
      <embed-common-biz-edit></embed-common-biz-edit>
    </div>
  </section>
</template>

<script>
import eventBus from '@/EventBus'
import { customQuery } from '@/api/common'
import system from '@/models/system'
import user from '@/models/user'
import bizUtil from '@/utils/CommonBizUtil'
import { t } from '@/utils/i18nUtil'
import EmbedCommonBizEdit from '@/components/EmbedCommonBizEdit'
*import:{import}

export default {
  components: {
    EmbedCommonBizEdit
  },

  data () {
    return {
      loading: false,
      filter: {
        pageNo: 1,
        pageSize: 10
      },
      selections: [],
      total: 0,
      list: [],
      page: {
        // bizPageId: '',
        // keyParameter: '',
        // name: '', // 业务名称，必选
        // foreignKey: '',
        // size: ''
      },
      listPage: {
        filters: [],
        filterActions: [],
        tableFields: [],
        tableActions: [],
        batchActions: []
      },
      defaultExpands: null,
      dateFormatMap: new Map([
        ['date', 'yyyy-MM-dd'],
        ['datetime', 'yyyy-MM-dd HH:mm:ss'],
        ['month', 'yyyy-MM'],
        ['daterange', 'yyyy-MM-dd HH:mm:ss']
      ]),
      user,
      t,
      $message: this.$message, // 因为注册问题，这里手动注册用于handler回调
      $alert: this.$alert,
      $confirm: this.$confirm,
      $prompt: this.$prompt,
      $notify: this.$notify
    }
  },
  computed: {
    form () {
      if (this.listPage.filters) {
        const result = {}
        this.listPage.filters.forEach(f => {
          result[f.parameter] = f.value
        })
        return result
      } else {
        return {}
      }
    },
    displayedTableFields () {
      return this.listPage.tableFields.filter(item => !item.when || item.when(this.form, this.listPage.filters, this))
    }
  },
  // watch: {
  //   '$route' (to, from) {
  //     this.initData()
  //     if (this.listPage.listTarget) {
  //       this.getList()
  //     }
  //   }
  // },

  created () {
    this.initData()
  },

  mounted () {
    if (this.listPage.listTarget) {
      this.getList()
    }
  },

  methods: {
    initData () {
      this.filter = {
        pageNo: 1,
        pageSize: 10
      }
      this.total = 0
      this.selections = []
      this.list = []
      this.defaultExpands = null
      const query = this.$route.query || {}
      // if (!query.bizPageId) {
      //   this.$message({
      //     message: t('msg.missingKeyParameter'),
      //     type: 'error'
      //   })
      //   return false
      // }
      let page = *page:{page}
      // if (query.bizPageId[0].toUpperCase() === 'S') {
      //   // 本地业务
      //   page = systemConfig.bizPages.find(p => p.bizPageId === query.bizPageId)
      // } else if (query.bizPageId[0].toUpperCase() === 'D') {
      //   // 远程业务
      //   page = systemConfig.remotePages.find(p => p.bizPageId === query.bizPageId)
      // }
      // if (!page) {
      //   this.$message({
      //     message: t('msg.invalidBizpageid'),
      //     type: 'error'
      //   })
      //   return false
      // }
      const { bizPageId, keyParameter = 'id', name, foreignKey, size, listPage } = page
      this.page = {
        bizPageId,
        keyParameter,
        name,
        foreignKey,
        size
      }
      // 处理初始值
      listPage.filters = listPage.filters || []
      listPage.filterActions = listPage.filterActions || []
      listPage.tableFields = listPage.tableFields || []
      listPage.tableActions = listPage.tableActions || []
      listPage.batchActions = listPage.batchActions || []
      const queryOptions = async (item) => {
        item.options = await item.defaultOptions(query, this)
        // NOTE 因为数据层级太深的原因，异步获取后手动update确保视图更新
        this.$forceUpdate()
      }
      listPage.filters.forEach(item => {
        // 先始终清理脏数据
        item.value = bizUtil.getTypeValue(item)
        // 处理filter初始值
        if (item.defaultValue) {
          item.value = item.defaultValue(this)
        }
        // 处理filter选项数据
        if (item.defaultOptions) {
          if (item.async) {
            // 异步获取默认数据
            queryOptions(item)
          } else {
            // 正常获取
            item.options = item.defaultOptions(query, this)
          }
        }
        // 处理透传的筛选值
        if (item.parameter !== 'bizPageId' && query[item.parameter]) {
          // query参数中存在带入参数
          item.value = query[item.parameter]
        }
      })
      this.listPage = listPage
    },
    async triggerLazyOptionLoad (item, keyword) {
      if (item.lazyOptions) {
        item.options = await item.lazyOptions(this, keyword)
        this.$forceUpdate()
      }
    },
    search () {
      this.filter.pageNo = 1
      this.getList()
    },
    reset () {
      const query = this.$route.query || {}
      this.listPage.filters.forEach(item => {
        if (item.parameter !== 'bizPageId' && query[item.parameter]) {
          item.value = query[item.parameter]
        } else if (item.defaultValue) {
          item.value = item.defaultValue(this)
        } else {
          item.value = bizUtil.getTypeValue(item)
        }
      })
    },
    handleSelectionChange (selections) {
      this.selections = selections
    },
    handlePageChange () {
      this.getList()
    },
    handleSizeChange () {
      this.filter.pageNo = 1
      this.getList()
    },
    handleActionConfirm (e, type, action, data) {
      if (action.confirm) {
        // 需要确认弹框
        eventBus.$emit('notifyShowPopover', {
          x: e.clientX || 0,
          y: e.clientY || 0,
          popMsg: action.confirm.confirmMsg(data, this),
          confirmType: action.confirm.confirmType || 'primary',
          callback: () => {
            this.proceedAction(type, action, data)
          }
        })
      } else {
        // 无需弹框确认
        this.proceedAction(type, action, data)
      }
    },
    proceedAction (type, action, data) {
      if (!type || !action) {
        return
      }
      if (['api', 'custom'].includes(action?.type) && this.loading) {
        // api请求与自定义操作在loading时不允许重新触发
        return
      }
      if (type === 'batchAction' && (!action.data || !action.target)) {
        // 批量操作项缺失关键配置
        return
      }
      // 处理参数
      let params = {}
      if (type === 'filterAction') {
        if (action.type === 'custom' || (action.type === 'router' && ['commonBiz', 'commonBizEdit'].includes(action.target.name))) {
          params = {
            bizPageId: this.page.bizPageId
          }
        }
        if (action.attachParams === undefined || action.attachParams) {
          this.listPage.filters.forEach(item => {
            let value = item.value
            item.trim && typeof (value) === 'string' && (value = value.trim()) // 左右去空
            if (item.handler) {
              params[item.parameter] = item.handler(value, this)
            } else {
              params[item.parameter] = value
            }
          })
        }
      } else if (type === 'tableAction') {
        if (action.type === 'custom' || (action.type === 'router' && ['commonBiz', 'commonBizEdit'].includes(action.target.name))) {
          params = {
            bizPageId: this.page.bizPageId
          }
        }
        if (action.paramsFields?.length) {
          // 指定参数
          action.paramsFields.forEach(item => {
            if (typeof (item) === 'string') {
              // 直接指定的是字段名
              params[item] = data[item]
            } else {
              // 对象类型的配置
              const value = item.handler ? item.handler(data[item.parameter], this) : data[item.parameter]
              params[item.as || item.parameter] = value
            }
          })
        } else {
          // 全量参数
          params = Object.assign({}, params, data)
        }
      } else if (type === 'batchAction') {
        params = action.data(data, this)
      }
      // 执行操作
      if (action.type === 'router' && type !== 'batchAction') {
        // 非批量操作router类型操作
        const routerObj = {
          query: {},
          params: {}
        }
        if (action.useQuery) {
          // 使用query方式传递参数
          routerObj.query = params
        } else {
          // 使用params方式传递参数
          routerObj.params = params
        }
        const keyObject = {}
        if (['commonBiz', 'commonBizEdit'].includes(action.target.name)) {
          keyObject.bizPageId = this.page.bizPageId
        }
        keyObject[this.page.keyParameter] = params[this.page.keyParameter]
        if (action.target.visit?.mode === 'embed' && action.target.name === 'commonBizEdit') {
          // 内嵌方式访问
          eventBus.$emit('showEmbededCommonBizEdit', {
            mode: action.target.visit.mode,
            popWidth: action.target.visit.popWidth || '',
            popMaxHeight: action.target.visit.popMaxHeight,
            data: Object.assign({}, action.target, {
              query: Object.assign(keyObject, routerObj.query, action.target.query),
              params: Object.assign({}, routerObj.params, action.target.params)
            })
          })
        } else {
          // 正常方式访问
          this.$router.push(Object.assign({}, action.target, {
            query: Object.assign(keyObject, routerObj.query, action.target.query),
            params: Object.assign({}, routerObj.params, action.target.params)
          }))
        }
      } else if (action.type === 'api') {
        // api调用操作
        if (type === 'filterAction' && !this.verifyFilters()) {
          return
        }
        this.loading = true
        const option = {
          method: action.apiParams?.method || 'post',
          responseType: action.apiParams?.responseType || 'json'
        }
        const finalTarget = bizUtil.fixApiTarget(action.target, params)
        customQuery(finalTarget, params, option).then(res => {
          this.loading = false
          if (res && (res[system.codeParam] === system.okCode || Object.prototype.toString.call(res) === '[object Blob]')) {
            // 成功
            if (action.successCallback) {
              action.successCallback(res, this)
            }
          } else {
            // 业务码错误
            this.$message({
              message: `${res && res[system.msgParam]}[${res && res[system.codeParam]}]`,
              type: 'error'
            })
          }
        }).catch(error => {
          // 失败
          console.error(error)
          this.loading = false
          this.$message({
            message: `${t('msg.ajaxError')} (${error})`,
            type: 'error'
          })
        })
      } else if (action.type === 'custom' && action.action) {
        // 自定义操作
        action.action(params, this)
      }
    },
    verifyFilters () {
      let result = true
      for (let i = 0; i < this.listPage.filters.length; i++) {
        const item = this.listPage.filters[i]
        if (!item.when || item.when(this.form, this.listPage.filters, this)) {
          // NOTE 检验仅针对显示的筛选项。因为不显示的筛选项即使检验不通过，用户也没法修改其值
          const value = item.trim && typeof (item.value) === 'string' ? item.value.trim() : item.value
          if (item.required && !value) {
            this.$message({
              message: `${t('msg.shouldFinish')}${item.foreignKey ? t(item.foreignKey) : item.label}`,
              type: 'warning'
            })
            result = false
            break
          }
          if (item.validate) {
            const validateResult = item.validate(value, this.form, this)
            if (validateResult) {
              // 校验通过
            } else {
              // 校验不通过
              result = false
              break
            }
          }
        }
      }
      return result
    },
    getList () {
      if (this.loading) {
        return
      }
      if (!this.verifyFilters()) {
        return
      }
      const params = {
        pageNo: this.filter.pageNo,
        pageSize: this.listPage.isTreeTable ? 0 : this.filter.pageSize
      }
      this.listPage.filters.forEach(item => {
        let value = item.value
        item.trim && typeof (value) === 'string' && (value = value.trim()) // 左右去空
        if (item.handler) {
          params[item.parameter] = item.handler(value, this)
        } else {
          params[item.parameter] = value
        }
      })
      this.loading = true
      const option = {
        method: this.listPage.listApiParams?.method || 'post',
        responseType: this.listPage.listApiParams?.responseType || 'json'
      }
      customQuery(this.listPage.listTarget, params, option).then(data => {
        this.loading = false
        if (data && data[system.codeParam] === system.okCode) {
          // 成功
          const raw = data.data || {}
          const detail = bizUtil.digData(raw, system.dataWrapper) || {}
          const listParamName = this.listPage.listApiParams?.listParam || 'list'
          const list = detail[listParamName] || []
          if (this.listPage.isTreeTable) {
            list.forEach(item => {
              item.children = []
            })
            const rootNode = {
              children: []
            }
            rootNode[this.page.keyParameter] = system.rootNodeKeyValue
            const originalList = bizUtil.createTree(rootNode, list, this.page.keyParameter)
            this.list = originalList.children || []
            if (['all', 'no'].includes(this.listPage.treeExpendMode)) {
              this.defaultExpands = []
            } else {
              this.defaultExpands = this.list.map(item => item[this.page.keyParameter]?.toString())
            }
          } else {
            this.list = list
          }
          const totalParamName = this.listPage.listApiParams?.totalParam || system.totalParam
          this.total = parseInt(detail[totalParamName]) || 0
        } else {
          // 业务码错误
          this.$message({
            message: `${data && data[system.msgParam]}[${data && data[system.codeParam]}]`,
            type: 'error'
          })
        }
      }).catch(error => {
        // 失败
        console.error(error)
        this.loading = false
        this.$message({
          message: `${t('msg.ajaxError')} (${error})`,
          type: 'error'
        })
      })
    },
    // 判断是否拥有权限
    hasPermission (key) {
      let result = true
      if (key) {
        if (Array.isArray(key)) {
          // 多权限或
          result = key.some(k => user.permissions.includes(k))
        } else {
          // 单权限
          result = user.permissions.includes(key)
        }
      }
      return result
    },
    getRowKey (row) {
      // console.log(row, this.listPage.isTreeTable, this.page.keyParameter)
      return (this.listPage.isTreeTable ? row[this.page.keyParameter] : null)
    }
  }
}
</script>

<style scoped>
</style>
