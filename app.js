const express = require('express')
const { search } = require('./search-service')
const app = express()
const port = process.env.PORT || 3000

module.exports = app

app.use(express.json());

app.post('/', search)

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})