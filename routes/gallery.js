const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer  = require('multer');
const zipper = require('zip-local');
const tmp = require('tmp');
const Validator = require('jsonschema').Validator;


router.get('/', function(req, res, next) {
  const response = JSON.stringify(getGalleries(req.app.get('galleryPath')));
  console.info('Sending galleries');
  res.send(response);
});

router.post('/', function(req, res, next) {
  const name = req.body.name;
  const newGalleryPath = path.join(req.app.get('galleryPath'), name);

  const validator = new Validator();
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
  console.log(validator.validate(req.body, galleryScheme).errors);

  if (!name) {
    console.error('Request does not contain object \'name\'.');
    res.status(400);
    res.send(JSON.stringify({
      "code": 400,
      "payload": {
        "paths": ["name"],
        "validator": "required",
        "example": null
      },
      "name": "INVALID_SCHEMA",
      "description": "Bad JSON object: u'name' is a required property"
    }));
  } else if (fs.existsSync(newGalleryPath)) {
    console.error(`Gallery with requested name (${name}) already exists!`);
    res.status(409);
    res.send('Gallery with this name already exists');
  } else {
    console.log(newGalleryPath);
    const response = JSON.stringify(createGallery(name, newGalleryPath))
    console.info('Sending response.');
    res.status(201);
    res.send(response);
  }
});

router.get('/:gallery', function(req, res, next) {
  const gallery = req.params.gallery;
  const galleryPath = path.join(req.app.get('galleryPath'), gallery);

  if (!fs.existsSync(galleryPath)) {
    console.error(`Gallery with requested name (${gallery}) does not exists!`);
    res.status(404);
    res.send('Gallery does not exists');
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
    res.status(404);
    res.send('Gallery not found');
  } else {
    const upload = multer({ dest: galleryPath });
    upload.single('image')(req, res, function(err) {
      if (err) {
        console.error('File missing in request!');
        res.status(400);
        res.send('Invalid request - file not found.');
      } else {
        let finalPath = path.join(galleryPath, req.file.originalname);
        if (fs.existsSync(finalPath)) {
          console.error(`File ${finalPath} already exists!`);
          res.status(409);
          res.send('File with this name already exists');
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
          res.send(JSON.stringify(response));
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
    res.status(404);
    res.send('Gallery/photo does not exists');
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
  res.set('Content-Type', 'application/zip')
  res.set('Content-Disposition', `attachment; filename=${req.params.gallery}`);
  const zippedGallery = tmp.fileSync();
  zipper.sync.zip(galleryPath).compress().save(zippedGallery.name);
  res.sendFile(zippedGallery.name, err => {
    if (err) {
      console.error(err);
    }
    zippedGallery.removeCallback();
  });
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


module.exports = router;