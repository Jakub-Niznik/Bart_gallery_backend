const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer  = require('multer');
const zipper = require('zip-local');


router.get('/', function(req, res, next) {
  const response = JSON.stringify(getGalleries());
  console.info('Sending galleries');
  res.send(response);
});

router.post('/', function(req, res, next) {
  const name = req.body.name;

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
  } else if (fs.existsSync(path.resolve(`../gallery/${name}`))) {
    console.error(`Gallery with requested name (${name}) already exists!`);
    res.status(409);
    res.send('Gallery with this name already exists');
  } else {
    const response = JSON.stringify(createGallery(name))
    console.info('Sending response.');
    res.status(201);
    res.send(response);
  }
});

router.get('/:gallery', function(req, res, next) {
  const gallery = req.params.gallery;

  if (!fs.existsSync(path.resolve(`../gallery/${gallery}`))) {
    console.error(`Gallery with requested name (${gallery}) does not exists!`);
    res.status(404);
    res.send('Gallery does not exists');
  } else {
    const response = getPhotos(req.params.gallery);
    console.info('Sending response.');
    res.send(response);
  }
});

router.post('/:gallery', function(req, res, next) {
  const gallery = req.params.gallery;

  if (!fs.existsSync(path.resolve(`../gallery/${gallery}`))) {
    console.error(`Gallery with requested name (${gallery}) does not exists!`);
    res.status(404);
    res.send('Gallery not found');
  } else {
    const upload = multer({ dest: `../files/upload_image/` });
    upload.single('image')(req, res, function(err) {
      if (err) {
        console.error('File missing in request!');
        res.status(400);
        res.send('Invalid request - file not found.');
      } else {
        let finalPath = `../gallery/${gallery}/${req.file.originalname}`;
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
              fullPath: `${gallery}/${req.file.originalname}`,
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

  if (!fs.existsSync(`../gallery/${gallery}`) || (image && !fs.existsSync(`../gallery/${gallery}/${image}`))) {
    console.error(`Gallery/photo with requested name does not exists!`);
    res.status(404);
    res.send('Gallery/photo does not exists');
  } else if (image) {
    const imagePath = path.resolve(`../gallery/${gallery}/${image}`);
    deleteImage(imagePath);
    console.info('Sending response.');
    res.send('Photo was deleted');
  } else {
    const galleryPath = path.resolve(`../gallery/${gallery}`);
    deleteGallery(galleryPath);
    console.info('Sending response.');
    res.send('Gallery was deleted');
  }
});

router.get('/download/:gallery', function(req, res, next) {
  res.sendFile(zipGallery(req.params.gallery));
});


function getGalleries() {
  console.info('Preparing galleries info.');
  let response = {galleries: []};
  const dirs = fs.readdirSync(path.resolve('../gallery/'));

  for (const gallery of dirs) {
    response.galleries.push({path: encodeURI(gallery), name: gallery});
  }

  return response;
}

function createGallery(name) {
  console.info('Creating gallery.');
  const galleryPath = path.resolve(`../gallery/${name}`);
  fs.mkdirSync(galleryPath);

  return {path: name, name: name};
}

function getPhotos(gallery) {
  console.info('Preparing photos info.');
  let response = {
    gallery: {path: gallery, name: gallery},
    images: []
  };
  var galleryPath = path.resolve(`../gallery/${gallery}`);
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
  console.info(`Deleting gallery: ${imagePath}`);
  fs.rmdirSync(galleryPath);
}

function deleteImage(imagePath) {
  console.info(`Deleting image: ${imagePath}`);
  fs.rmSync(imagePath);
}

function zipGallery(gallery) {
  console.info('Compressing gallery.');
  const zippedPath = path.resolve(`../files/gallery_zip/${gallery}.zip`);

  if (fs.existsSync(zippedPath)) {
    fs.rmSync(zippedPath);
  }

  zipper.sync.zip(path.resolve(`../gallery/${gallery}`)).compress().save(path.resolve(zippedPath));

  return zippedPath;
}


module.exports = router;