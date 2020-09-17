#!/usr/bin/env node

const fs = require('fs-extra')
const path = require('path')
const { prompt } = require('enquirer')
const style = require('chalk')
const { readFileContent, changeFileContent } = require('./fileUtil.js')
const { getValueString, getNextValidChar, wrapValue, digData } = require('./dataUtil.js')

const info = style.cyan.bold
const success = style.green.bold
const important = style.yellow.bold
const error = style.red.bold
const tip = style.gray

const currentPath = path.resolve('./')
let pathInfo = path.parse(currentPath)
const pkgRoot = 'node_modules/thor-eject-biz/'

const analyseTier = (row) => {
  let tier = 0
  for (let i = 0; i < row.length; i++) {
    const char = row[i]
    if (char === '{') {
      tier++
    } else if (char === '}') {
      tier--
    }
  }
  return tier
}

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

const analyseKeyValue = (row) => {
  // console.log(row)
  const colonIndex = row.indexOf(':')
  let rawKey = row.substring(0, colonIndex)
  let rawValue = row.substring(colonIndex + 1)
  let key = rawKey.trim()
  let value = rawValue.trim()
  // console.log(key, value)
  // NOTE 值情况分几种，一种是'或者"包裹的字符串，此时统一处理为"包裹；第二种是{或者[开始的子层，此时不处理；第三种是(开头的函数内容，此时也不处理；其他情况全部不处理
  let hasComma = value[value.length - 1] === ','
  hasComma && (value = value.substring(0, value.length - 1))
  if (value.length >= 2 && value[0] === "'") {
    let content = value.substring(1, value.length - 1)
    content = content.replace(/(")/g, '\\$1')
    value = `"${content}"`
  }
  
  hasComma && (value += ',')
  return {
    key,
    value,
    string: `"${key}": ${value}`
  }
}

const generate = (props) => {
  fs.ensureDir(`src/views/${props.bizName}`).then(() => {
    // 拷贝模板List
    return fs.copy(`${pkgRoot}templates/List.vue`, `src/views/${props.bizName}/List.vue`)
  }).then(() => {
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
    if (props.bizData.editPage.detailTarget) {
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
  }).catch(err => {
    console.error(error(err))
  })
}

// #1 读取当前工程的配置文件内容
let rawContent = readFileContent('src/models/SystemConfig.js')
let configBody = rawContent.match(/(?<=export default )[\s\S]*/)
configBody.length && (configBody = configBody[0])
// 去除所有注释
configBody = configBody.replace(/(?<!:)\/\/.*[\r\n]/g, '')

// 分解为行，并对每行进行JSON化处理
let rows = configBody.split('\n')
let tier = 0
let fnOpen = 0
rows = rows.map((row, index) => {
  // 替换\t为2空格
  row = row.replace(/\t/g, '  ')
  if (fnOpen <= 0) {
    // 当前不是函数块内
    let colonIndex = row.indexOf(':')
    if (colonIndex > -1) {
      // console.log(index, row)
      if (getNextValidChar(row, colonIndex).value === '(') {
        // 函数行
        fnOpen += analyseFnOpen(row)
        let obj = analyseKeyValue(row)
        row = obj.string
      } else {
        // 普通行
        let obj = analyseKeyValue(row)
        row = obj.string
      }
    } else {
      // 纯内容行
      // console.log('纯内容行', row)
      row = row.replace(/(\s*)(?:')([^']+)(?:')([\s\S]*)/g, '$1"$2"$3')
    }
  } else {
    // 处于函数块内
    fnOpen += analyseFnOpen(row)
  }
  
  // 规范缩进
  row = row.trim()
  let tierChange = analyseTier(row)
  if (tierChange < 0) {
    tier += analyseTier(row)
  }
  row = ' '.repeat(tier * 2) + row
  if (tierChange >= 0) {
    tier += analyseTier(row)
  }
  return row
})
// 处理普通key，value格式后
configBody = rows.join('\n')

// 处理特殊的函数类型，将其转化为字符串形式
let jsonString = ''
let tempContent = ''
for (let i = 0; i < configBody.length; i++) {
  const char = configBody[i]
  tempContent += char
  if (char === ':' && ['('].includes(getNextValidChar(configBody, i).value)) {
    // 函数类型的值
    let rawValue = getValueString(configBody, getNextValidChar(configBody, i).index)
    i = rawValue.endIndex
    let value = rawValue.value.replace(/[\n\r]/g, '')
    value = value.replace(/\s{2,}/g, ' ')
    // console.log('value', value)
    jsonString += `${tempContent} ${wrapValue(value)}`
    tempContent = ''
  }
}
if (tempContent) {
  jsonString += tempContent
  tempContent = ''
}
console.log('结果', jsonString)

// #2 得到转化的js数据后，开始进行交互询问
const config = JSON.parse(jsonString)
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
