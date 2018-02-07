converter = new showdown.Converter()
markdown = (txt) -> converter.makeHtml(txt)

delay = (time, func) -> setTimeout func, time

sleep = (ms) ->
  new Promise (resolve) ->
    window.setTimeout resolve, ms

zip = (rows...) -> rows[0].map((_,c) -> rows.map((row) -> row[c]))

mapObject =  (obj, fn) ->
  Object.keys(obj).reduce(
    (res, key) ->
      res[key] = fn(obj[key])
      return res
    {}
  )

mean = (xs) ->
  (xs.reduce ((acc, x) -> acc+x)) / xs.length

checkObj = (obj, keys) ->
  if not keys?
    keys = Object.keys(obj)
  for k in keys
    if obj[k] is undefined
      console.log 'Bad Object: ', obj
      throw new Error "#{k} is undefined"
  obj

check = (name, val) ->
  if val is undefined
    throw new Error "#{name}is undefined"
  val

assert = (val) ->
  if not val
    throw new Error 'Assertion Error'
  val

