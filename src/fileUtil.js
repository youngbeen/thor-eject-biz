const fs = require('fs-extra')

const readFileContent = (path) => {
  if (!path) {
    return ''
  }
  return fs.readFileSync(path, { encoding: 'utf-8' })
}

const changeFileContent = (path, process) => {
  if (!path || !process) {
    return
  }
  let contentMain = readFileContent(path)
  let newContent = process(contentMain)
  fs.writeFileSync(path, newContent, { encoding: 'utf-8' })
}

module.exports = {
  readFileContent,
  changeFileContent
}