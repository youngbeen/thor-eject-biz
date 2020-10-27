<template>
  <section class="page-*param:{bizName}-edit">
    <div class="cs-content-block">
      <div class="cs-page-title">{{ pageTitle }}</div>

      <el-form
        :size="page.size || 'small'"
        :label-width="(editPage.labelWidth || '100') + 'px'"
        :label-position="editPage.align || 'right'"
        :inline="false"
        ref="addEditCommonBizForm">
        <div class="box-wrapper"
          :class="columnClass"
          v-show="(!item.displays || item.displays.includes(mode)) && (!item.when || item.when(form, editPage.fields, this))"
          v-for="(item, index) in editPage.fields"
          :key="index">
          <el-form-item
            :class="[mode !== 'detail' && item.required && 'is-required']"
            :label="item.label">
            <!-- input类型 -->
            <el-input v-if="item.type === 'input'"
              v-model="item.value"
              :clearable="!item.required"
              :disabled="mode === 'detail' || (item.edits && !item.edits.includes(mode)) || (item.disabled && Boolean(item.disabled(form, editPage.fields, this)))"
              placeholder="请输入"></el-input>
            <!-- select类型 -->
            <el-select v-else-if="item.type === 'select'"
              v-model="item.value"
              :multiple="item.multiple"
              :clearable="!item.required"
              filterable
              :disabled="mode === 'detail' || (item.edits && !item.edits.includes(mode)) || (item.disabled && Boolean(item.disabled(form, editPage.fields, this)))"
              placeholder="请选择"
              style="display: block;">
              <el-option
                v-for="o in item.options"
                :key="o.value"
                :label="o.label"
                :value="o.value"
                :disabled="o.disabled">
              </el-option>
            </el-select>
            <!-- radio类型 -->
            <el-radio-group v-else-if="item.type === 'radio'"
              v-model="item.value"
              :disabled="mode === 'detail' || (item.edits && !item.edits.includes(mode)) || (item.disabled && Boolean(item.disabled(form, editPage.fields, this)))">
              <el-radio
                v-for="o in item.options"
                :key="o.value"
                :label="o.value"
                :disabled="o.disabled"
                border>{{ o.label }}</el-radio>
            </el-radio-group>
            <!-- date类型 | datetime类型 -->
            <el-date-picker v-else-if="item.type === 'date' || item.type === 'datetime'"
              v-model="item.value"
              :type="item.type"
              :value-format="item.type === 'date'? 'yyyy-MM-dd' : 'yyyy-MM-dd HH:mm:ss'"
              :clearable="!item.required"
              :disabled="mode === 'detail' || (item.edits && !item.edits.includes(mode)) || (item.disabled && Boolean(item.disabled(form, editPage.fields, this)))"
              placeholder="请选择"
              style="display: block; width: 100%;">
            </el-date-picker>
            <!-- cascader类型 -->
            <el-cascader v-else-if="item.type === 'cascader'"
              v-model="item.value"
              :options="item.options"
              :props="{ checkStrictly: item.nodeSelectable, lazy: Boolean(item.lazyOptions), lazyLoad: item.lazyOptions }"
              :clearable="!item.required"
              :disabled="mode === 'detail' || (item.edits && !item.edits.includes(mode)) || (item.disabled && Boolean(item.disabled(form, editPage.fields, this)))"
              filterable
              placeholder="请选择"
              style="display: block;">
            </el-cascader>
            <!-- switch类型 -->
            <el-switch v-else-if="item.type === 'switch'"
              v-model="item.value"
              :active-value="item.options[1].value"
              :active-text="item.options[1].label"
              :inactive-value="item.options[0].value"
              :inactive-text="item.options[0].label"
              :disabled="mode === 'detail' || (item.edits && !item.edits.includes(mode)) || (item.disabled && Boolean(item.disabled(form, editPage.fields, this)))">
            </el-switch>
            <!-- label类型 -->
            <span v-else-if="item.type === 'label'">
              {{ item.value }}
            </span>
            <!-- inputNumber类型 -->
            <el-input-number v-if="item.type === 'inputNumber'"
              v-model="item.value"
              :clearable="!item.required"
              :disabled="mode === 'detail' || (item.edits && !item.edits.includes(mode)) || (item.disabled && Boolean(item.disabled(form, editPage.fields, this)))"
              :min="(item.inputNumberProps && item.inputNumberProps.min) || Number.NEGATIVE_INFINITY"
              :max="(item.inputNumberProps && item.inputNumberProps.max) || Number.POSITIVE_INFINITY"
              :step="(item.inputNumberProps && item.inputNumberProps.step) || 1"
              :precision="(item.inputNumberProps && item.inputNumberProps.precision) || 0"
              placeholder="请输入"></el-input-number>
            <!-- TODO 支持其他类型 -->
          </el-form-item>
        </div>
        <el-form-item>
          <el-button type="primary"
            v-if="['add', 'edit'].includes(mode) && editPage.submit"
            :disabled="loading"
            @click="handleSave()">确定</el-button>
          <el-button v-if="['add', 'edit'].includes(mode) && editPage.submit"
            @click="handleCancel()">取消</el-button>
          <el-button type="primary" v-else
            @click="handleCancel()">返回</el-button>
        </el-form-item>
      </el-form>
    </div>
  </section>
</template>

<script>
// import eventBus from '@/EventBus'
import { customQuery } from '@/api/common'
import system from '@/models/system'
import bizUtil from '@/utils/CommonBizUtil'
*import:{import}

export default {
  data () {
    return {
      loading: false,
      mode: 'detail', // 'detail' - 显示，'add' - 添加，'edit' - 编辑
      id: '',
      page: {
        // bizPageId: '',
        // keyParameter: '',
        // name: '', // 业务名称，必选
        // size: ''
      },
      editPage: {
        fields: []
      },
      $message: this.$message, // 因为注册问题，这里手动注册用于handler回调
      $alert: this.$alert,
      $confirm: this.$confirm,
      $prompt: this.$prompt,
      $notify: this.$notify
    }
  },
  computed: {
    form () {
      if (this.editPage.fields) {
        let result = {}
        this.editPage.fields.forEach(f => {
          result[f.parameter] = f.value
        })
        return result
      } else {
        return {}
      }
    },
    pageTitle () {
      if (this.mode === 'detail') {
        return `${this.page.name}详情`
      } else if (this.mode === 'add') {
        return `新增${this.page.name}`
      } else if (this.mode === 'edit') {
        return `编辑${this.page.name}`
      } else {
        return ''
      }
    },
    columnClass () {
      switch (this.editPage.columns) {
        case 1:
          return ''
        case 3:
          return 'box-tri'
        case 4:
          return 'box-quarter'
        default:
          return 'box-half'
      }
    }
  },
  // watch: {
  //   '$route' (to, from) {
  //     this.initData()
  //     const keyParameter = this.page.keyParameter
  //     const query = this.$route.query || {}
  //     const params = this.$route.params || {}
  //     const bizParams = { ...query, ...params }
  //     if (!query.mode || (query.mode === 'edit' && !bizParams[keyParameter])) {
  //       this.$message('非法访问，请退出重试')
  //       return false
  //     }
  //     this.mode = query.mode
  //     this.id = bizParams[keyParameter] || ''
  //     if (this.mode === 'edit' || this.mode === 'detail') {
  //       this.getData(bizParams)
  //     }
  //   }
  // },

  created () {
    this.initData()
  },

  mounted () {
    const keyParameter = this.page.keyParameter
    const query = this.$route.query || {}
    const params = this.$route.params || {}
    const bizParams = { ...query, ...params }
    if (!query.mode || (query.mode === 'edit' && !bizParams[keyParameter])) {
      this.$message('非法访问，请退出重试')
      return false
    }
    this.mode = query.mode
    this.id = bizParams[keyParameter] || ''
    if (this.mode === 'edit' || this.mode === 'detail') {
      this.getData(bizParams)
    }
  },

  methods: {
    initData () {
      const _this = this
      const query = this.$route.query || {}
      const params = this.$route.params || {}
      const bizParams = { ...query, ...params }
      // if (!bizParams.bizPageId) {
      //   this.$message({
      //     message: '非法访问，请退出重试',
      //     type: 'error'
      //   })
      //   return false
      // }
      let page = *page:{page}
      // if (bizParams.bizPageId[0].toUpperCase() === 'S') {
      //   // 本地业务
      //   page = systemConfig.bizPages.find(p => p.bizPageId === bizParams.bizPageId)
      // } else if (bizParams.bizPageId[0].toUpperCase() === 'D') {
      //   // 远程业务
      //   page = systemConfig.remotePages.find(p => p.bizPageId === bizParams.bizPageId)
      // }
      // if (!page) {
      //   this.$message({
      //     message: '不存在的业务，请确认业务id并退出重试',
      //     type: 'error'
      //   })
      //   return false
      // }
      let { bizPageId, keyParameter = 'id', name, size, editPage } = page
      this.page = {
        bizPageId,
        keyParameter,
        name,
        size
      }
      // 处理初始值
      async function queryOptions (item) {
        item.options = await item.defaultOptions(bizParams, _this)
        // NOTE 因为数据层级太深的原因，异步获取后手动update确保视图更新
        _this.$forceUpdate()
      }
      editPage.fields.forEach(item => {
        // NOTE 新增/编辑/详情共用同一页面，先始终清理脏数据
        item.value = bizUtil.getTypeValue(item)
        // 处理字段初始值
        if (item.defaultValue) {
          item.value = item.defaultValue(this)
        }
        // 处理字段选项数据
        if (item.defaultOptions) {
          if (item.async) {
            // 异步获取默认数据
            queryOptions(item)
          } else {
            // 正常获取
            item.options = item.defaultOptions(bizParams, this)
          }
        }
        // 补充未完善的数据
        if (item.type === 'switch' && item.options?.length < 2) {
          // 开关的选项不合法，配置为默认
          item.options = [
            { label: '', value: false },
            { label: '开启', value: true }
          ]
        }
        // 处理透传的筛选值
        if (item.parameter !== 'bizPageId' && query[item.parameter]) {
          // query参数中存在带入参数
          item.value = query[item.parameter]
        }
      })
      this.editPage = editPage
    },
    handleCancel () {
      this.$router.go(-1)
    },
    handleSave () {
      if (this.loading) {
        return
      }
      if (!this.verify()) {
        return
      }
      let params = {}
      this.editPage.fields.forEach(f => {
        if (f.parameter !== this.page.keyParameter) {
          if (f.send === 'always' || ((!f.send || f.send === 'display') && (!f.displays || f.displays.includes(this.mode)) && (!f.when || f.when(this.form, this.editPage.fields, this)))) {
            // 始终上送或者在显示时上送的字段
            let value = f.value
            f.trim && typeof (value) === 'string' && (value = value.trim())
            if (f.sendHandler) {
              params[f.parameter] = f.sendHandler(value, this)
            } else {
              params[f.parameter] = value
            }
          }
        }
      })
      if (this.mode === 'edit') {
        // 编辑
        params[this.page.keyParameter] = this.id
      }
      this.loading = true
      let option = {
        method: this.editPage.submit[`${this.mode}ApiParams`] && this.editPage.submit[`${this.mode}ApiParams`].method ? this.editPage.submit[`${this.mode}ApiParams`].method : 'post'
      }
      let finalTarget = bizUtil.fixApiTarget(this.editPage.submit[`${this.mode}Target`], params)
      customQuery(finalTarget, params, option).then(data => {
        // 成功
        this.loading = false
        if (data && data[system.codeParam] === system.okCode) {
          if (this.editPage.submit[`${this.mode}SuccessCallback`]) {
            // 自定义回调
            this.editPage.submit[`${this.mode}SuccessCallback`](data, this)
          } else {
            // 内置回调处理
            this.$message({
              message: `${this.mode === 'edit' ? '编辑' : '添加'}成功`,
              type: 'success'
            })
            this.$router.go(-1)
          }
        } else {
          this.$message({
            message: `${data && data[system.msgParam]} [${data && data[system.codeParam]}]`,
            type: 'error'
          })
        }
      }).catch(error => {
        console.error(error)
        this.loading = false
        this.$message({
          message: `请求失败！请稍后重试 (${error})`,
          type: 'error'
        })
      })
    },
    verify () {
      let result = true
      for (let i = 0; i < this.editPage.fields.length; i++) {
        const item = this.editPage.fields[i]
        if ((!item.displays || item.displays.includes(this.mode)) && (!item.when || item.when(this.form, this.editPage.fields, this))) {
          // NOTE 检验仅针对显示的字段。因为不显示的字段即使检验不通过，用户也没法修改其值
          let value = item.trim && typeof (item.value) === 'string' ? item.value.trim() : item.value
          if (item.required && typeof (item.value) !== 'boolean' && value !== 0 && !value) {
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
    getData (passParams) {
      if (this.loading) {
        return
      }
      let params = {}
      params[this.page.keyParameter] = this.id
      this.loading = true
      let option = {
        method: this.editPage.detailApiParams?.method || 'post'
      }
      let finalTarget = bizUtil.fixApiTarget(this.editPage.detailTarget, passParams)
      customQuery(finalTarget, params, option).then(data => {
        this.loading = false
        if (data && data[system.codeParam] === system.okCode) {
          // 成功
          const raw = data.data || {}
          let detail = bizUtil.digData(raw, system.dataWrapper) || {}
          // 按照字段填充值
          this.editPage.fields.forEach(item => {
            let value = detail[item.parameter] ?? ''
            if (item.fetchHandler) {
              item.value = item.fetchHandler(value, this)
            } else {
              item.value = value
            }
          })
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
    }
  }
}
</script>

<style scoped>
.box-wrapper {
  padding: 0 6px;
  vertical-align: top;
}
.box-half {
  display: inline-block;
  width: 49.5%;
}
.box-tri {
  display: inline-block;
  width: 33.3%
}
.box-quarter {
  display: inline-block;
  width: 24.5%;
}
</style>
