class Canvas extends Component {
  constructor(options = {}) {
    super({
      width: 600,
      height: 400,
      border: "3px solid black",
      ...options,
    })
    this.div.css({
      border: this.border,
      display: "inline-block",
      margin: "auto",
      position: "relative",
      textAlign: "center",
    })
    this.canvas = $("<canvas>")
      .attr({ width: this.width, height: this.height })
      .appendTo(this.div)
    this.ctx = this.canvas[0].getContext("2d")
  }

  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height)
    return this
  }

  drawCircle(x, y, radius, color) {
    this.ctx.fillStyle = color
    this.ctx.beginPath()
    this.ctx.arc(x, y, radius, 0, 2 * Math.PI)
    this.ctx.fill()
    return this
  }

  drawCross(x, y, size, color) {
    this.ctx.strokeStyle = color
    this.ctx.lineWidth = 2
    this.ctx.beginPath()
    this.ctx.moveTo(x - size, y - size)
    this.ctx.lineTo(x + size, y + size)
    this.ctx.moveTo(x + size, y - size)
    this.ctx.lineTo(x - size, y + size)
    this.ctx.stroke()
    return this
  }

  getClick() {
    return new Promise((resolve) => {
      this.canvas.one("click", (event) => {
        const rect = this.canvas[0].getBoundingClientRect()
        const x = event.clientX - rect.left
        const y = event.clientY - rect.top
        resolve({ x, y })
      })
    })
  }

  drawRect(x, y, width, height, color, fill = true) {
    this.ctx.beginPath()
    if (fill) {
      this.ctx.fillStyle = color
      this.ctx.fillRect(x, y, width, height)
    } else {
      this.ctx.strokeStyle = color
      this.ctx.strokeRect(x, y, width, height)
    }
    return this
  }

  drawLine(x1, y1, x2, y2, color, lineWidth = 1) {
    this.ctx.beginPath()
    this.ctx.moveTo(x1, y1)
    this.ctx.lineTo(x2, y2)
    this.ctx.strokeStyle = color
    this.ctx.lineWidth = lineWidth
    this.ctx.stroke()
    return this
  }

  drawText(text, x, y, options = {}) {
    const {
      font = "12px Arial",
      color = "black",
      align = "center",
      baseline = "middle",
    } = options
    this.ctx.font = font
    this.ctx.fillStyle = color
    this.ctx.textAlign = align
    this.ctx.textBaseline = baseline
    this.ctx.fillText(text, x, y)
    return this
  }

  drawPolygon(points, color, fill = true) {
    this.ctx.beginPath()
    this.ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y)
    }
    this.ctx.closePath()
    if (fill) {
      this.ctx.fillStyle = color
      this.ctx.fill()
    } else {
      this.ctx.strokeStyle = color
      this.ctx.stroke()
    }
    return this
  }
}
