<template>
  <section class="page-*param:{bizName}-list">
    <div class="cs-content-block">
      <div class="cs-page-title" v-if="page.name">{{ page.name }}列表</div>
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
            :label="item.label">
            <!-- input类型 -->
            <el-input v-if="item.type === 'input'"
              v-model="item.value"
              :clearable="!item.required"
              placeholder="请输入"></el-input>
            <!-- select类型 -->
            <el-select v-else-if="item.type === 'select'"
              v-model="item.value"
              :multiple="item.multiple"
              filterable
              :clearable="!item.required"
              placeholder="请选择">
              <el-option
                v-for="o in item.options"
                :key="o.value"
                :label="o.label"
                :value="o.value"
                :disabled="o.disabled">
              </el-option>
            </el-select>
            <!-- date类型 | datetime类型 -->
            <el-date-picker
              v-else-if="item.type === 'date' || item.type === 'datetime'"
              v-model="item.value"
              :type="item.type"
              :value-format="item.type === 'date'? 'yyyy-MM-dd' : 'yyyy-MM-dd HH:mm:ss'"
              :clearable="!item.required"
              placeholder="请选择">
            </el-date-picker>
            <!-- cascader类型 -->
            <el-cascader v-else-if="item.type === 'cascader'"
              v-model="item.value"
              :options="item.options"
              :props="{ checkStrictly: item.nodeSelectable, lazy: Boolean(item.lazyOptions), lazyLoad: item.lazyOptions }"
              filterable
              :clearable="!item.required"
              placeholder="请选择">
            </el-cascader>
            <!-- TODO 支持其他种类 -->
          </el-form-item>
          <el-form-item v-if="listPage.filters.length && (listPage.hasSearch === undefined || listPage.hasSearch)">
            <el-button type="primary" @click="search()">
              <font-awesome-icon :icon="['fas', 'search']" />&nbsp;查询
            </el-button>
          </el-form-item>
          <el-form-item v-if="listPage.filters.length && (listPage.hasSearch === undefined || listPage.hasSearch)">
            <el-button type="default" @click="reset()">
              重置
            </el-button>
          </el-form-item>
          <!-- 筛选栏操作 -->
          <el-form-item v-show="hasPermission(action.permissionKey) && (!action.when || action.when(form, this))"
            v-for="(action, index) in listPage.filterActions" :key="'fa-' + index">
            <el-button :type="action.style" @click="handleActionConfirm($event, 'filterAction', action, form)">
              {{ action.label }}
            </el-button>
          </el-form-item>
          <!-- 表格批量操作 -->
          <el-form-item v-show="hasPermission(action.permissionKey) && (!action.when || action.when(selections, this))"
            v-for="(action, index) in listPage.batchActions" :key="'ba-' + index">
            <el-button
              :type="action.style || 'primary'"
              :disabled="action.disabled && action.disabled(selections, this)"
              @click="handleActionConfirm($event, 'batchAction', action, selections)">
              {{ action.label }}
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 列表栏 -->
      <div class="box-list" v-if="page.name">
        <el-table
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
            width="55"
            :key="Math.random()">
          </el-table-column>
          <el-table-column
            v-if="listPage.hasIndex === undefined || listPage.hasIndex"
            type="index"
            label="序号"
            width="50"
            :key="Math.random()">
          </el-table-column>
          <el-table-column
            v-for="item in listPage.tableFields"
            :key="item.parameter"
            :prop="item.parameter"
            :label="item.label"
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
            fixed="right"
            label="操作"
            v-if="listPage.tableActions.length"
            :min-width="listPage.tableActionWidth || listPage.tableActions.length * 80">
            <template slot-scope="scope">
              <span v-for="(action, index) in listPage.tableActions" :key="'ta-' + index">
                <el-button v-if="hasPermission(action.permissionKey) && (!action.when || action.when(scope.row, this))"
                  :type="action.style || 'primary'"
                  :size="listPage.tableActionSize || 'mini'"
                  @click="handleActionConfirm($event, 'tableAction', action, scope.row)"
                  style="margin-right: 6px;">{{ action.label }}</el-button>
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
    </div>
  </section>
</template>

<script>
import eventBus from '@/EventBus'
import { customQuery } from '@/api/common'
import system from '@/models/system'
import user from '@/models/user'
import bizUtil from '@/utils/CommonBizUtil'
*import:{import}

export default {
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
      user,
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
        let result = {}
        this.listPage.filters.forEach(f => {
          result[f.parameter] = f.value
        })
        return result
      } else {
        return {}
      }
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
      const _this = this
      const query = this.$route.query || {}
      // if (!query.bizPageId) {
      //   this.$message({
      //     message: '非法访问，请退出重试',
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
      //     message: '不存在的业务，请确认业务id并退出重试',
      //     type: 'error'
      //   })
      //   return false
      // }
      let { bizPageId, keyParameter = 'id', name, size, listPage } = page
      this.page = {
        bizPageId,
        keyParameter,
        name,
        size
      }
      // 处理初始值
      listPage.filters = listPage.filters || []
      listPage.filterActions = listPage.filterActions || []
      listPage.tableFields = listPage.tableFields || []
      listPage.tableActions = listPage.tableActions || []
      listPage.batchActions = listPage.batchActions || []
      async function queryOptions (item) {
        item.options = await item.defaultOptions(query, _this)
        // NOTE 因为数据层级太深的原因，异步获取后手动update确保视图更新
        _this.$forceUpdate()
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
              let value = item.handler ? item.handler(data[item.parameter], this) : data[item.parameter]
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
        let routerObj = {
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
        let keyObject = {}
        if (['commonBiz', 'commonBizEdit'].includes(action.target.name)) {
          keyObject.bizPageId = this.page.bizPageId
        }
        keyObject[this.page.keyParameter] = params[this.page.keyParameter]
        this.$router.push(Object.assign({}, action.target, {
          query: Object.assign(keyObject, routerObj.query, action.target.query),
          params: Object.assign({}, routerObj.params, action.target.params)
        }))
      } else if (action.type === 'api') {
        // api调用操作
        if (type === 'filterAction' && !this.verifyFilters()) {
          return
        }
        this.loading = true
        let option = {
          method: action.apiParams?.method || 'post'
        }
        let finalTarget = bizUtil.fixApiTarget(action.target, params)
        customQuery(finalTarget, params, option).then(res => {
          this.loading = false
          if (res && res[system.codeParam] === system.okCode) {
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
            message: `请求失败，请稍后重试(${error})`,
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
          let value = item.trim && typeof (item.value) === 'string' ? item.value.trim() : item.value
          if (item.required && !value) {
            this.$message({
              message: `请完善${item.label}`,
              type: 'warning'
            })
            result = false
            break
          }
          if (item.validate) {
            let validateResult = item.validate(value, this.form, this)
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
      let params = {
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
      let option = {
        method: this.listPage.listApiParams?.method || 'post'
      }
      customQuery(this.listPage.listTarget, params, option).then(data => {
        this.loading = false
        if (data && data[system.codeParam] === system.okCode) {
          // 成功
          const raw = data.data || {}
          const detail = bizUtil.digData(raw, system.dataWrapper) || {}
          let list = detail.list || []
          if (this.listPage.isTreeTable) {
            list.forEach(item => {
              item.children = []
            })
            let rootNode = {
              children: []
            }
            rootNode[this.page.keyParameter] = 0
            let originalList = bizUtil.createTree(rootNode, list, this.page.keyParameter)
            this.list = originalList.children || []
            if (['all', 'no'].includes(this.listPage.treeExpendMode)) {
              this.defaultExpands = []
            } else {
              this.defaultExpands = this.list.map(item => item[this.page.keyParameter]?.toString())
            }
          } else {
            this.list = list
          }
          this.total = parseInt(detail[system.totalParam]) || 0
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
          message: `请求失败，请稍后重试(${error})`,
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