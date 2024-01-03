const express = require('express');
const router = express.Router();
const path = require('path');
const sharp = require('sharp');
const fs = require('fs');

router.get('/:widthXheight/:galleryPath/:imagePath', function(req, res, next) {
  console.info('Preparing to send preview photo.');
  let width = Number(req.params.widthXheight.split('X')[0]);
  if (width == 0) width = null;
  let height = Number(req.params.widthXheight.split('X')[1]);
  if (height == 0) height = null;

  const outputPath = '../files/resized_image/output.jpg';
  if (fs.existsSync(path.resolve(outputPath))) deleteOldOutput(path.resolve(outputPath));

  const fullPath = `../gallery/${req.params.galleryPath}/${req.params.imagePath}`;
  if (fs.existsSync(path.resolve(fullPath))) {
    sharp(path.resolve(fullPath))
      .resize(width, height)
      .toFile('../files/resized_image/output.jpg', function(err) {
        if (err) {
          console.error(err);
          res.status(500);
          res.send('The photo preview can\'t be generated.');
        } else {
          console.info('Sending file.');
          res.sendFile(path.resolve('../files/resized_image/output.jpg'));
        }
      });
  } else {
    console.warn('Photo was not found!');
    res.status(404);
    res.send('Photo not found');
  }
});

async function deleteOldOutput(oldPath) {
  fs.unlink(oldPath, function (err) {
    if (err) {
      console.error(err);
    } else {
      console.info("File removed:", oldPath);
    }
  });
}

module.exports = router;