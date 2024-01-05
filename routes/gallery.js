const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer  = require('multer');
const zipper = require('zip-local');
const tmp = require('tmp');
const Ajv = require('ajv');
const GalleryError = require('../middlewares/GalleryError.js');
const galleryErrorHandler = require("../middlewares/galleryErrorHandler");

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


router.get('/', function(req, res, next) {
  const response = getGalleries(req.app.get('galleryPath'));
  console.info('Sending galleries');
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
      console.error(`Gallery with requested name (${name}) already exists!`);
      throw new GalleryError('Gallery with this name already exists', 409);
    } else {
      console.log(newGalleryPath);
      const response = createGallery(name, newGalleryPath);
      console.info('Sending response.');
      res.status(201);
      res.send(response);
    }
  }
});

router.get('/:gallery', function(req, res, next) {
  const gallery = req.params.gallery;
  const galleryPath = path.join(req.app.get('galleryPath'), gallery);

  if (!fs.existsSync(galleryPath)) {
    console.error(`Gallery with requested name (${gallery}) does not exists!`);
    throw new GalleryError('Gallery does not exists', 404);
  } else {
    const response = getPhotos(gallery, galleryPath);
    console.info('Sending response.');
    res.send(response);
  }
});

router.post('/:gallery', function(req, res, next) {
  const gallery = req.params.gallery;
  const galleryPath = path.join(req.app.get('galleryPath'), gallery);

  if (!fs.existsSync(galleryPath)) {
    console.error(`Gallery with requested name (${gallery}) does not exists!`);
    throw new GalleryError('Gallery not found', 404);
  } else {
    const upload = multer({ dest: galleryPath });
    upload.single('image')(req, res, function(err) {
      if (err) {
        console.error('File missing in request!');
        throw new GalleryError('Invalid request - file not found.', 400);
      } else {
        let finalPath = path.join(galleryPath, req.file.originalname);
        if (fs.existsSync(finalPath)) {
          console.error(`File ${finalPath} already exists!`);
          throw new GalleryError('File with this name already exists', 409);
        } else {
          console.info(`Saving file ${finalPath}.`);
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
          console.info('Sending response.');
          res.status(201);
          res.send(response);
        }
      }
    })
  }
});

router.delete('/:galleryPath/:imagePath?', function(req, res, next) {
  const gallery = req.params.galleryPath;
  const image = req.params.imagePath;
  const galleryPath = path.join(req.app.get('galleryPath'), gallery);

  if (!fs.existsSync(galleryPath) || (image && !fs.existsSync(`${galleryPath}/${image}`))) {
    console.error(`Gallery/photo with requested name does not exists!`);
    throw new GalleryError('Gallery/photo does not exists', 404);
  } else if (image) {
    const imagePath = `${galleryPath}/${image}`;
    deleteImage(imagePath);
    console.info('Sending response.');
    res.send('Photo was deleted');
  } else {
    deleteGallery(galleryPath);
    console.info('Sending response.');
    res.send('Gallery was deleted');
  }
});

router.get('/download/:gallery', function(req, res, next) {
  const galleryPath =  path.join(req.app.get('galleryPath'), req.params.gallery);

  if (!fs.existsSync(galleryPath)) {
    console.error(`Gallery with requested name does not exists!`);
    throw new GalleryError('Gallery not found', 404);
  } else {
    res.set('Content-Type', 'application/zip')
    res.set('Content-Disposition', `attachment; filename=${req.params.gallery}`);
    const zippedGallery = tmp.fileSync();
    zipper.sync.zip(galleryPath).compress().save(zippedGallery.name);
    res.sendFile(zippedGallery.name, err => {
      if (err) {
        console.error(err);
        throw new Error(err);
      }
      zippedGallery.removeCallback();
    });
  }
});


function getGalleries(galleryPath) {
  console.info('Preparing galleries info.');
  let response = {galleries: []};

  const dirs = fs.readdirSync(galleryPath);

  for (const gallery of dirs) {
    response.galleries.push({path: encodeURI(gallery), name: gallery});
  }

  return response;
}

function createGallery(name, newGalleryPath) {
  console.info('Creating gallery.');
  fs.mkdirSync(newGalleryPath);

  return {path: name, name: name};
}

function getPhotos(gallery, galleryPath) {
  console.info('Preparing photos info.');
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

function deleteGallery(galleryPath) {
  console.info(`Deleting gallery: ${galleryPath}`);
  fs.rmdirSync(galleryPath);
}

function deleteImage(imagePath) {
  console.info(`Deleting image: ${imagePath}`);
  fs.rmSync(imagePath);
}

router.use(galleryErrorHandler);


module.exports = router;