const GalleryError = require("./GalleryError");
const {MulterError} = require("multer");

module.exports = function galleryErrorHandler(err, req, res, next) {
  if (err instanceof GalleryError) {
    console.error(err);
    res.status(err.status).send({
      error: {
        status: err.status,
        message: err.message,
      },
    });
  } else if (err instanceof MulterError) {
    console.error(err);
    res.status(400).send({
      error: {
        status: 400,
        message: 'Invalid request - file not found.',
      },
    });
  } else {
    console.error(err);
    res.status(500).send({
      error: {
        status: 500,
        message: 'Internal Server Error',
      },
    });
  }
};