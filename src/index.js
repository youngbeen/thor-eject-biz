#!/usr/bin/env node

const fs = require('fs-extra')
const path = require('path')
const { prompt } = require('enquirer')
const style = require('chalk')
const { readFileContent, changeFileContent } = require('./fileUtil.js')
const {
  getNextValidChar,
  digData,
  getValidBeginIndex,
  findTargetIndex,
  findFunctionCloseIndex
} = require('./dataUtil.js')

const info = style.cyan.bold
const success = style.green.bold
const important = style.yellow.bold
const error = style.red.bold
const tip = style.gray

const currentPath = path.resolve('./')
let pathInfo = path.parse(currentPath)
const pkgRoot = 'node_modules/thor-eject-biz/'

const analyseFnOpen = (row) => {
  let tier = 0
  for (let i = 0; i < row.length; i++) {
    const char = row[i]
    if (['{', '[', '('].includes(char)) {
      tier++
    } else if (['}', ']', ')'].includes(char)) {
      tier--
    }
  }
  return tier
}

const generate = (props) => {
  fs.ensureDir(`src/views/${props.bizName}`).then(() => {
    if (props.bizData.listPage && props.bizData.listPage.listTarget) {
      // 拷贝模板List
      fs.copySync(`${pkgRoot}templates/List.vue`, `src/views/${props.bizName}/List.vue`)
      changeFileContent(`src/views/${props.bizName}/List.vue`, (content) => {
        // // 处理筛选栏
        // if ((props.bizData.listPage.filters && props.bizData.listPage.filters.length) || (props.bizData.listPage.filterActions && props.bizData.listPage.filterActions.length) || (props.bizData.listPage.batchActions && props.bizData.listPage.batchActions.length)) {
        //   // 有筛选栏
        //   content = content.replace(/\*template:{ListFilter}/, readFileContent(`${pkgRoot}templates/ListFilter.tmpl`))
        // } else {
        //   // 无筛选栏
        //   content = content.replace(/\*template:{ListFilter}/, '')
        // }
        // 替换参数
        content = content.replace(/\*param:{\w+.?\w*(=[^}]*)?}/g, (match) => {
          let [params, defaultValue] = match.match(/(?<={)\w+.?\w*(=[^}]*)?(?=})/)[0].split('=')
          let chain = params.split('.')
          return (digData(props, chain) || defaultValue)
        })
        // 替换page内容
        let rawContent = readFileContent('src/models/SystemConfig.js')
        let rows = rawContent.split('\n')
        let newRows = []
        let flag = false
        let wrapperStack = 0
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i]
          if (flag) {
            wrapperStack += analyseFnOpen(row)
            newRows.push(row)
            if (wrapperStack < 0) {
              break
            }
          } else if (row.search(new RegExp("bizPageId:\\s*'" + props.bizPageId + "'")) > -1) {
            flag = true
            newRows.push(rows[i - 1])
            newRows.push(row)
          }
        }
        content = content.replace(/\*page:{page}/, newRows.join('\n'))
        // 加入替换依赖
        newRows = []
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i]
          if (row.search(/\s*export[\s\S]*/) > -1) {
            break
          }
          let slimRow = row.trim()
          if (slimRow && content.indexOf(slimRow) === -1) {
            newRows.push(row)
          }
        }
        content = content.replace(/\*import:{import}/, newRows.join('\n'))
        return content
      })
      console.log(success(`src/views/${props.bizName}/List.vue已导出`))

      // 编辑页面模板
      if (props.bizData.editPage && props.bizData.editPage.detailTarget) {
        fs.copySync(`${pkgRoot}templates/AddEdit.vue`, `src/views/${props.bizName}/AddEdit.vue`)
        changeFileContent(`src/views/${props.bizName}/AddEdit.vue`, (content) => {
          // 替换参数
          content = content.replace(/\*param:{\w+.?\w*(=[^}]*)?}/g, (match) => {
            let [params, defaultValue] = match.match(/(?<={)\w+.?\w*(=[^}]*)?(?=})/)[0].split('=')
            let chain = params.split('.')
            return (digData(props, chain) || defaultValue)
          })
          // 替换page内容
          let rawContent = readFileContent('src/models/SystemConfig.js')
          let rows = rawContent.split('\n')
          let newRows = []
          let flag = false
          let wrapperStack = 0
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i]
            if (flag) {
              wrapperStack += analyseFnOpen(row)
              newRows.push(row)
              if (wrapperStack < 0) {
                break
              }
            } else if (row.search(new RegExp("bizPageId:\\s*'" + props.bizPageId + "'")) > -1) {
              flag = true
              newRows.push(rows[i - 1])
              newRows.push(row)
            }
          }
          content = content.replace(/\*page:{page}/, newRows.join('\n'))
          // 加入替换依赖
          newRows = []
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i]
            if (row.search(/\s*export[\s\S]*/) > -1) {
              break
            }
            let slimRow = row.trim()
            if (slimRow && content.indexOf(slimRow) === -1) {
              newRows.push(row)
            }
          }
          content = content.replace(/\*import:{import}/, newRows.join('\n'))
          return content
        })
        console.log(success(`src/views/${props.bizName}/AddEdit.vue已导出`))
      }

      console.log(success('所有任务完成'))
      console.log(important('请注意：'))
      console.log(important('1. 你需要自行添加导出的业务页面路由'))
      console.log(important(`2. 如果碰到页面存在大量lint错误，一般是因为配置数据不规范。请先自行确保源配置数据符合规范，此外你可以尝试使用 ${info('npm run lint')} 命令自动修复lint错误`))
    }
  }).catch(err => {
    console.error(error(err))
  })
}

// #1 读取当前工程的配置文件内容
let rawContent = readFileContent('src/models/SystemConfig.js')
let configBody = rawContent.match(/(?<=export default )[\s\S]*/)
configBody.length && (configBody = configBody[0])
// 去除所有注释
configBody = configBody.replace(/(?<!:)\/\/[^\r\n]*/g, '')
// 去除连续换行
configBody = configBody.replace(/([\n\r]\s+){2,}/g, '\n')
// 替换所有制表符
configBody = configBody.replace(/\t/g, '  ')
// console.log(111, configBody)
let wrapperStack = [
  // {
  //   identifier: 'object|array|function',
  //   status: 'key|value|end',
  // }
]
let temp = ''
for (let i = 0; i < configBody.length; i++) {
  const c = configBody[i]
  const currentWrapper = wrapperStack.length ? wrapperStack[wrapperStack.length - 1] : {}
  if (['\n', '\r', ' ', '\t'].includes(c)) {
    // 空行等字符
    temp += c
    continue
  }
  if (c === '{') {
    // object入栈
    if (currentWrapper.status === 'value') {
      currentWrapper.status = 'end'
    }
    wrapperStack.push({
      identifier: 'object',
      status: 'key'
    })
    temp += c
  } else if (c === '[') {
    // array入栈
    if (currentWrapper.status === 'value') {
      currentWrapper.status = 'end'
    }
    wrapperStack.push({
      identifier: 'array',
      status: 'value'
    })
    temp += c
  } else if (currentWrapper.identifier === 'object' && c === '}') {
    // object出栈
    wrapperStack.pop()
    temp += c
  } else if (currentWrapper.identifier === 'array' && c === ']') {
    // array出栈
    wrapperStack.pop()
    temp += c
  } else if (c === '(' || /^function\s*\(/.test(configBody.substring(i))) {
    // function内容
    let endIndex = findFunctionCloseIndex(configBody, i)
    let functionBody = configBody.substring(i, endIndex + 1)
    // 去除内容中的换行符
    functionBody = functionBody.replace(/[\n\r]/g, '')
    // 转义"
    functionBody = functionBody.replace(/(")/g, '\\$1')
    temp += `"${functionBody}"`
    i = endIndex
    if (currentWrapper.status === 'value') {
      currentWrapper.status = 'end'
    }
  } else {
    // 其他正常流程
    if (currentWrapper.identifier === 'object') {
      if (currentWrapper.status === 'key') {
        // 寻找object key
        let colonIndex = findTargetIndex(configBody, ':', i)
        let keyName = configBody.substring(i, colonIndex)
        temp += `"${keyName}":`
        i = colonIndex
        currentWrapper.status = 'value'
      } else if (currentWrapper.status === 'value') {
        // 寻找object value
        if (["'", '"'].includes(c)) {
          // 字符串类型值
          let quoteIndex = findTargetIndex(configBody, c, i + 1)
          let valueString = configBody.substring(i + 1, quoteIndex)
          // 转义"
          valueString = valueString.replace(/(")/g, '\\$1')
          temp += `"${valueString}"`
          i = quoteIndex
          currentWrapper.status = 'end'
        } else {
          // 其他类型值
          let endIndex = findTargetIndex(configBody, [' ', '\n', '\t', '\r', ','], i + 1)
          let valueString = configBody.substring(i, endIndex)
          temp += valueString
          i = endIndex - 1
          currentWrapper.status = 'end'
        }
      } else if (currentWrapper.status === 'end' && c === ',') {
        currentWrapper.status = 'key'
        if (['}', ']'].includes(getNextValidChar(configBody, i + 1).value)) {
          // 多余的,
        } else {
          temp += c
        }
      }
    } else if (currentWrapper.identifier === 'array') {
      if (currentWrapper.status === 'value') {
        // 寻找array value
        if (["'", '"'].includes(c)) {
          // 字符串类型值
          let quoteIndex = findTargetIndex(configBody, c, i + 1)
          let valueString = configBody.substring(i + 1, quoteIndex)
          // 转义"
          valueString = valueString.replace(/(")/g, '\\$1')
          temp += `"${valueString}"`
          i = quoteIndex
          currentWrapper.status = 'end'
        } else {
          // 其他类型值
          let endIndex = findTargetIndex(configBody, [' ', '\n', '\t', '\r', ',', ']'], i + 1)
          let valueString = configBody.substring(i, endIndex)
          temp += valueString
          i = endIndex - 1
          currentWrapper.status = 'end'
        }
      } else if (currentWrapper.status === 'end' && c === ',') {
        currentWrapper.status = 'value'
        if (['}', ']'].includes(getNextValidChar(configBody, i + 1).value)) {
          // 多余的,
        } else {
          temp += c
        }
      }
    } else {
      temp += c
    }
  }
}
// console.log('结果', temp)

// #2 得到转化的js数据后，开始进行交互询问
const config = JSON.parse(temp)
let bizPageId = ''
let bizData = {} // 当前导出的业务配置page object
let bizName = '' // 导出的业务英文命名
console.log(`当前工程：${info(pathInfo.name)}  路径：${info(currentPath)}`)
// 准备交互问题
let localBizs = config.bizPages.map(biz => {
  return {
    name: biz.bizPageId,
    message: `${biz.name} - ${biz.bizPageId}`,
    hint: '本地业务'
  }
})
let remoteBizs = config.remotePages.map(biz => {
  return {
    name: biz.bizPageId,
    message: `${biz.name} - ${biz.bizPageId}`,
    hint: '远程业务'
  }
})
if (localBizs.length + remoteBizs.length <= 0) {
  console.log(tip('未找到任何配置业务'))
  return false
}
console.log(`已找到${localBizs.length + remoteBizs.length}项配置业务`)
prompt([
  {
    type: 'select',
    name: 'bizPageId',
    message: '选择需转为静态页面文件的配置业务',
    choices: [...localBizs, ...remoteBizs]
  }
]).then(res => {
  bizPageId = res.bizPageId
  bizData = [...config.bizPages, ...config.remotePages].find(item => item.bizPageId === bizPageId)
  let bizName = res.bizPageId.substring(1)
  return prompt([
    {
      type: 'input',
      name: 'bizName',
      message: '设定输出业务的英文名称（用于相关文件命名）',
      initial: bizName
    }
  ])
}).then(res => {
  bizName = res.bizName
  console.log(`正在将业务 ${info(bizData.name + ' - ' + bizData.bizPageId)} 导出到 ${info(bizName)} ...`)
  generate({
    bizPageId,
    bizName,
    bizData
  })
}).catch(err => {
  console.log(error(err))
})
