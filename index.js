const express = require('express')
const app = express()
const port = 3000

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
app.get('/', (req, res) => {
  res.send('Hello World!')
})
pp.post('/', (req, res) => {
  res.send('Got a POST request')
})
app.put('/users', (req, res) => {
  res.send('Got a PUT request at /users')
})
app.delete('/users', (req, res) => {
  res.send('Got a DELETE request at /users')
})
pp.get('/users/:id', (req, res) => {
  res.send(req.params)
})
 