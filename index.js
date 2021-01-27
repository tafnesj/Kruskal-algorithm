const express = require('express')
const app = express()
const PORT = process.env.PORT || 5000
var path = require('path');

app.use(express.static(__dirname + '/public/'));
app.set('views', path.join(__dirname, 'views'))
app.engine('html', require('ejs').renderFile)
   .get('/', (req, res) => res.render('index.html'))

app.listen(PORT, () => {
  console.log(`app listening at http://localhost:${PORT}`)
})