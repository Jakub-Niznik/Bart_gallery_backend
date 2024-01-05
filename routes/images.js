const express = require('express');
const router = express.Router();
const path = require('path');
const sharp = require('sharp');
const GalleryError = require("../middlewares/GalleryError");
const galleryErrorHandler = require("../middlewares/galleryErrorHandler");
const fs = require("fs");

router.get('/:widthxheight/:galleryPath/:imagePath', function(req, res, next) {
  let [width, height] = req.params.widthxheight.split('x').map(Number);
  if (width === 0) width = null;
  if (height === 0) height = null;

  const fullPath = path.join(req.app.get('galleryPath'), req.params.galleryPath, req.params.imagePath);

  if (!fs.existsSync(fullPath)) {
    throw new GalleryError('Photo not found', 404);
  } else {
    sharp(fullPath)
      .resize(width, height)
      .toBuffer()
      .then(data => {
        res.type(path.parse(req.params.imagePath).ext);
        res.send(data);
      })
      .catch(err => {
        throw new Error(err);
      });
  }
});

router.use(galleryErrorHandler);

module.exports = router;