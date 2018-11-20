const StringToBuffer = (str) => {
  return Buffer.from(str).toString('base64')
}

const writeText = (fragment, index) => {
  if (fragment.type === 'text' && fragment.contents.length > 0) {
    let text = fragment.contents.replace(/(\\{\\{)/g, '{{')
    text = text.replace(/(\\}\\})/g, '}}')
    return `text[${index}] = Buffer.from('${StringToBuffer(text)}', 'base64')`
  } else if (fragment.type === 'parameter') {
    return `text[${index}] = '${fragment.contents}'`
  }
}

const template = (content) => {
  const fragments = []
  const regex = /(.*?){{\s*(\S*?)\s*}}([^\\{]*)/gm
  let lastIndex = 0
  while ((results = regex.exec(content)) !== null) {
    fragments.push({ type: 'text', contents: results[1] })
    fragments.push({ type: 'parameter', contents: results[2] })
    fragments.push({ type: 'text', contents: results[3] })
    lastIndex = regex.lastIndex
  }
  const rest = content.substring(lastIndex)
  const text = fragments.map((fragment, index) => {
    return writeText(fragment, index)
  })

  const code = `const text = []
${text.filter((item) => item).join('\n')}
text[${text.length}] = Buffer.from('${StringToBuffer(rest)}', 'base64')

const renderToStream = (out, data) => {
  text.forEach((item) => {
    if(typeof item === 'string' ) {
      out.write(data[item])
    } else {
      out.write(item)
    }
  })
}

const renderToBuffer = (data) => {
  const arr = []
  text.forEach((item) => {
    if(typeof item === 'string') {
      arr.push(Buffer.from(data[item]))
    } else {
      arr.push(item)
    }
  })
  return Buffer.concat(arr)
}

module.exports = { renderToStream, renderToBuffer }`

  return code
}

module.exports = template
