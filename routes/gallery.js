const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer  = require('multer');
const zipper = require('zip-local');
const tmp = require('tmp');
const Ajv = require('ajv');

const GalleryError = require('../middlewares/GalleryError.js');
const galleryErrorHandler = require('../middlewares/galleryErrorHandler');
const gallerySuccessHandler = require('../middlewares/gallerySuccessHandler');

const ajv = new Ajv();
const galleryScheme = {
  "title": "New gallery insert schema",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1
    }
  },
  "required": ["name"],
  "additionalProperties": false
};
const validate = ajv.compile(galleryScheme);
const upload = (req, res, next) => multer({ dest: path.join(req.app.get("galleryPath"), req.params.gallery)}).single("image")(req, res, next);
const checkContentLength = (req, res, next) => {
  if (Number(req.headers['content-length']) === 0) {
    throw new GalleryError('Invalid request - file not found.', 400);
  } else {
    console.log('Checked!');
    next();
  }
}

router.get('/', function(req, res, next) {
  const response = getGalleries(req.app.get('galleryPath'));
  res.send(response);
});

router.post('/', function(req, res, next) {
  const valid = validate(req.body);

  if (!valid) {
    res.status(400);
    res.send(validate.errors);
  } else {
    const name = req.body.name;
    const newGalleryPath = path.join(req.app.get('galleryPath'), name);
    if (fs.existsSync(newGalleryPath)) {
      throw new GalleryError('Gallery with this name already exists', 409);
    } else {
      const response = createGallery(name, newGalleryPath);
      res.status(201);
      res.send(response);
    }
  }
});

router.get('/:gallery', function(req, res, next) {
  const gallery = req.params.gallery;
  const galleryPath = path.join(req.app.get('galleryPath'), gallery);

  if (!fs.existsSync(galleryPath)) {
    throw new GalleryError('Gallery does not exists', 404);
  } else {
    const response = getPhotos(gallery, galleryPath);
    res.send(response);
  }
});

router.post('/:gallery', checkContentLength, upload, function(req, res, next) {
  const gallery = req.params.gallery;
  const galleryPath = path.join(req.app.get('galleryPath'), gallery);

  if (!fs.existsSync(galleryPath)) {
    throw new GalleryError('Gallery not found', 404);
  } else {
    const finalPath = path.join(galleryPath, req.file.originalname);
    if (fs.existsSync(finalPath)) {
      fs.rmSync(req.file.path);
      throw new GalleryError('Photo with this name already exists', 409);
    } else {
      fs.renameSync(req.file.path, finalPath);
      const stats = fs.statSync(finalPath);
      let response = {
        uploaded: [{
          path: req.file.originalname,
          fullPath: path.join(gallery, req.file.originalname),
          name: path.parse(req.file.originalname).name,
          modified: stats.mtime.toISOString()
        }]
      };
      res.status(201);
      res.send(response);
    }
  }
});

router.delete('/:galleryPath/:imagePath?', function(req, res, next) {
  const gallery = req.params.galleryPath;
  const image = req.params.imagePath;
  const galleryPath = path.join(req.app.get('galleryPath'), gallery);

  if (!fs.existsSync(galleryPath) || (image && !fs.existsSync(`${galleryPath}/${image}`))) {
    throw new GalleryError('Gallery/photo does not exists', 404);
  } else if (image) {
    const imagePath = `${galleryPath}/${image}`;
    fs.rmSync(imagePath);
    gallerySuccessHandler('Photo was deleted', 200, req, res, next);
  } else {
    fs.rmdirSync(galleryPath);
    gallerySuccessHandler('Gallery was deleted', 200, req, res, next);
  }
});

router.get('/download/:gallery', function(req, res, next) {
  const galleryPath =  path.join(req.app.get('galleryPath'), req.params.gallery);

  if (!fs.existsSync(galleryPath)) {
    throw new GalleryError('Gallery not found', 404);
  } else {
    res.set('Content-Type', 'application/zip')
    res.set('Content-Disposition', `attachment; filename=${req.params.gallery}.zip`);
    const zippedGallery = tmp.fileSync();
    zipper.sync.zip(galleryPath).compress().save(zippedGallery.name);
    res.sendFile(zippedGallery.name, err => {
      if (err) {
        throw new Error(err);
      }
      zippedGallery.removeCallback();
    });
  }
});


function getGalleries(galleryPath) {
  let response = {galleries: []};
  const dirs = fs.readdirSync(galleryPath);

  for (const gallery of dirs) {
    response.galleries.push({path: encodeURI(gallery), name: gallery});
  }

  return response;
}

function createGallery(name, newGalleryPath) {
  fs.mkdirSync(newGalleryPath);

  return {path: name, name: name};
}

function getPhotos(gallery, galleryPath) {
  let response = {
    gallery: {path: gallery, name: gallery},
    images: []
  };
  const photos = fs.readdirSync(galleryPath);

  for (const photo of photos) {
    const stats = fs.statSync(`${galleryPath}/${photo}`);
    response.images.push({
      path: encodeURI(gallery),
      fullpath: `${gallery}/${photo}`,
      name: photo.split('.')[0],
      modified: stats.mtime.toISOString()
    });
  }

  return response;
}

router.use(galleryErrorHandler);

module.exports = router;