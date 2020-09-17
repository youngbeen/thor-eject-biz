// const fs = require('fs-extra')

const pairMap = {
  '(': ')',
  '{': '}',
  '[': ']'
}

const getValueString = (string, fromIndex) => {
  // ' " (
  const tag = string[fromIndex]
  let stack = [tag === '(' ? ')' : tag]
  for (let i = fromIndex + 1; i < string.length; i++) {
    const char = string[i]
    if (['(', '{', '['].includes(char)) {
      // 需要继续入栈
      stack.push(pairMap[char])
    } else {
      if (stack.length) {
        // 栈中有数据
        if (char === stack[stack.length - 1]) {
          stack.pop()
          if (!stack.length) {
            // 已无数据
            if ([',', '}', ']'].includes(getNextValidChar(string, i).value)) {
              // 结束
              return {
                value: string.substring(fromIndex, i + 1),
                endIndex: i
              }
            }
          }
        }
      } else {
        // 栈中无数据
        if ([',', '}', ']'].includes(getNextValidChar(string, i).value)) {
          // 结束
          return {
            value: string.substring(fromIndex, i + 1),
            endIndex: i
          }
        }
      }
    }
  }
  return {
    value: string.substring(fromIndex),
    endIndex: string.length - 1
  }
}

const getNextValidChar = (string, fromIndex) => {
  for (let i = fromIndex + 1; i < string.length; i++) {
    const char = string[i]
    if (char !== ' ') {
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

const wrapValue = (raw) => {
  if (raw.length >= 2 && raw[0] === "'") {
    let content = raw.substring(1, raw.length - 1)
    content = content.replace(/(")/g, '\\$1')
    return `"${content}"`
  } else if (raw[0] === '"') {
    return raw
  } else {
    // 方法类型，手动包装"
    raw = raw.replace(/(")/g, '\\$1')
    return `"${raw}"`
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

module.exports = {
  getValueString,
  getNextValidChar,
  wrapValue,
  getValueType,
  getValidBeginIndex,
  digData
}