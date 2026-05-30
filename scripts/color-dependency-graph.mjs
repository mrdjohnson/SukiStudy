const sourceFolderColors = {
  components: 'DarkRed',
  pages: 'Goldenrod',
  hooks: 'Blue',
  services: 'OrangeRed',
  utils: 'MediumVioletRed',
  contexts: 'DarkKhaki',
  serviceWorker: 'MediumAquamarine',
}

function getSourceFolder(sourcePath) {
  if (sourcePath.startsWith('src/')) {
    return sourcePath.split('/')[1]
  }

  return sourcePath.split('/')[0]
}

function getEdgeColor(sourcePath) {
  return sourceFolderColors[getSourceFolder(sourcePath)] ?? '#6b7280'
}

function colorEdge(line) {
  const edgeMatch = line.match(/^(\s*)"([^"]+)"\s*->\s*"([^"]+)"/)

  if (!edgeMatch) {
    return line
  }

  const sourcePath = edgeMatch[2]
  const color = getEdgeColor(sourcePath)

  if (line.includes('color=')) {
    return line
  }

  if (line.includes('[')) {
    return line.replace(/\]$/, ` color="${color}" fontcolor="${color}"]`)
  }

  return `${line} [color="${color}" fontcolor="${color}"]`
}

let input = ''

process.stdin.setEncoding('utf8')
process.stdin.on('data', chunk => {
  input += chunk
})
process.stdin.on('end', () => {
  process.stdout.write(input.split('\n').map(colorEdge).join('\n'))
})
