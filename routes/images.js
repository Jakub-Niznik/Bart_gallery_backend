const express = require('express');
const router = express.Router();
const path = require('path');
const sharp = require('sharp');

router.get('/:widthxheight/:galleryPath/:imagePath', function(req, res, next) {
  console.info('Preparing to send preview photo.');
  console.log(req.app.get('galleryPath'));
  let [width, height] = req.params.widthxheight.split('x').map(Number);
  if (width === 0) width = null;
  if (height === 0) height = null;

  const fullPath = `${req.app.get('galleryPath')}/${req.params.galleryPath}/${req.params.imagePath}`;

  console.log(width, height, fullPath)
  sharp(fullPath)
    .resize(width, height)
    .toBuffer()
    .then(data => {
      res.type(path.parse(req.params.imagePath).ext);
      res.send(data);
    })
    .catch(err => {
      console.error(err);
      res.status(500).send('Something went wrong');
    });
});


module.exports = router;