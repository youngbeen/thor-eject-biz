// const fs = require('fs-extra')

const pairMap = {
  '(': ')',
  '{': '}',
  '[': ']'
}

const getNextValidChar = (string, fromIndex) => {
  for (let i = fromIndex; i < string.length; i++) {
    const char = string[i]
    if (!['\n', '\r', ' ', '\t'].includes(char)) {
      return {
        value: char,
        index: i
      }
    }
  }
  return {
    value: null,
    index: -1
  }
}

const getValueType = (char) => {
  // :后面进行类型推断，碰到'或者"开头的 = 字符串；数字开头的 = 数字；(开头的认定为是一个函数，以字符串形式展示，此时需要记录其层级关系，找到最后一个结束标记符之后的] } ,作为结束，整体包裹前面的内容；字母开头的再判断是true, false, 或者null, undefined, NaN等，直接进行展示；{或者[开头的 = 新层级
  if (["'", '"'].includes(char)) {
    return 'string'
  } else if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '-'].includes(char)) {
    return 'number'
  } else if (char === '(') {
    return 'function'
  } else if (char === '{') {
    return 'object'
  } else if (char === '[') {
    return 'array'
  } else {
    return 'preserve'
  }
}

const getValidBeginIndex = (indexs) => {
  return indexs.reduce((soFar, item) => {
    if (item > -1) {
      if (soFar === -1 || item < soFar) {
        return item
      }
    }
    return soFar
  }, -1)
}

const digData = (data, fields = []) => {
  if (fields.length) {
    // 有剩余参数，继续深入
    if (Object.keys(data).includes(fields[0])) {
      // 存在该字段
      return digData(data[fields[0]], fields.slice(1))
    } else {
      // 不存在的字段
      return undefined
    }
  } else {
    // 无参数，返回
    return data
  }
}

const findTargetIndex = (string, target, from = 0) => {
  let targets = []
  if (typeof (target) === 'string') {
    targets.push(target)
  } else {
    targets = [...target]
  }
  for (let i = from; i < string.length; i++) {
    const char = string[i]
    if (targets.includes(char)) {
      return i
    }
  }
  return -1
}

const findFunctionCloseIndex = (string, from = 0) => {
  // NOTE 方法内容必须先经过一个(和一个)，之后开始计算tier层级，每个({[增加1，每个]})减少1，当层级为0时，碰到英文逗号或者]})则认为结束
  let foundOpenParenthese = false
  let foundCloseParenthese = false
  let tier = 0
  let possibleEndIndex = 0
  for (let i = from; i < string.length; i++) {
    const char = string[i]
    if (foundOpenParenthese) {
      if (foundCloseParenthese) {
        if (tier <= 0 && [',', '}', ']', ')'].includes(char)) {
          // 找到结束
          // return i - 1
          return possibleEndIndex
        } else {
          if (['{', '[', '('].includes(char)) {
            tier++
          } else if (['}', ']', ')'].includes(char)) {
            tier--
          }
        }
        if (!['\n', '\r', ' ', '\t'].includes(char)) {
          possibleEndIndex = i
        }
      } else if (char === ')') {
        foundCloseParenthese = true
      }
    } else if (char === '(') {
      foundOpenParenthese = true
    }
  }
  return -1
}

module.exports = {
  getNextValidChar,
  getValueType,
  getValidBeginIndex,
  findTargetIndex,
  findFunctionCloseIndex,
  digData
}