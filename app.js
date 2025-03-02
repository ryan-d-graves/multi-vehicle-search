const express = require('express')
const { search } = require('./search-service')
const app = express()
const port = 3000

module.exports = app

app.use(express.json());

app.post('/', search)

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})