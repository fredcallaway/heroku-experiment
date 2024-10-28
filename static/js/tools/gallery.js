// TODO: extend Component
class Gallery {
  constructor(div, items, onShow) {
    this.items = items
    this.onShow = onShow.bind(this)

    this.div = $("<div>")
      .css({
        position: "relative",
        margin: "auto",
        width: "1200px",
        "text-align": "center",
      })
      .appendTo(div)

    this.top = $("<div>").css("margin-bottom", 20).appendTo(this.div)

    this.btnPrev = $("<button>")
      .addClass("btn")
      .text("<<")
      .css({
        display: "inline-block",
      })
      .appendTo(this.top)

    this.title = $("<h2>")
      .css({
        "margin-left": 30,
        "margin-right": 30,
        display: "inline-block",
        "min-width": 200,
      })
      .appendTo(this.top)

    this.btnNext = $("<button>")
      .addClass("btn")
      .text(">>")
      .css({
        display: "inline-block",
      })
      .appendTo(this.top)

    this.content = $("<div>")
      .css({
        width: "1200px",
        // border: 'thick black solid'
      })
      .appendTo(this.div)
    this.listener = new EventListeners()
  }

  setTitle(txt) {
    this.title.text(txt)
  }

  showItem(i) {
    this.onShow(this.items[i])
    this.btnPrev.unbind("click")
    this.btnPrev.click(() => {
      this.showItem(mod(i - 1, this.items.length))
    })
    this.btnNext.unbind("click")
    this.btnNext.click(() => {
      this.showItem(mod(i + 1, this.items.length))
    })
    this.listener.on("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        this.listener.clear()
        this.showItem(mod(i - 1, this.items.length))
      } else if (event.key === "ArrowRight") {
        this.listener.clear()
        this.showItem(mod(i + 1, this.items.length))
      }
    })
  }
}

// This should be merged into Component
class EventListeners {
  constructor() {
    this.listeners = []
  }
  on(type, handler, options) {
    this.listeners.push([type, handler, options])
    document.addEventListener(type, handler, options)
  }
  clear() {
    for (let [ltype, handler, options] of this.listeners) {
      document.removeEventListener(ltype, handler, options)
    }
    this.listeners.length = 0 // weird way to clear an array
  }
}
const globalListeners = new EventListeners()

