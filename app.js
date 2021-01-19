const express = require('express');
const { dirname } = require('path');
const app = express()
const port = 3000
var path = require('path');

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/public/index.html'));
});
app.use(express.static(__dirname + '/public/'));

app.listen(port, () => {
  console.log('app listening at http://localhost:${port}')
})