const images = require("images");

function render (viewPort, element) {
  if (element.style) {
    const img = images(element.style.width, element.style.height)
    if (element.style['background-color']) {
      const color = element.style['background-color'] || 'rgb(0, 0, 0)';
      color.match(/rgb\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)/)
      img.fill(Number(RegExp.$1),Number(RegExp.$2),Number(RegExp.$3), 1)
      viewPort.draw(img, element.style.left || 0, element.style.top || 0)
    }
  }

  if (element.children) {
    for(let child of element.children) {
      render(viewPort, child)
    }
  }
}

module.exports = render;