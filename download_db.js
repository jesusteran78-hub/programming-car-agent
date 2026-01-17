const fs = require('fs');
const https = require('https');

const file = fs.createWriteStream('fcc_db.csv');
const request = https
  .get(
    'https://raw.githubusercontent.com/gusgorman402/keyfobDB/main/car_fcc_info_DB.csv',
    function (response) {
      response.pipe(file);
      file.on('finish', function () {
        file.close(() => console.log('Download completed.'));
      });
    }
  )
  .on('error', function (err) {
    fs.unlink('fcc_db.csv');
    console.error('Error downloading file:', err.message);
  });
