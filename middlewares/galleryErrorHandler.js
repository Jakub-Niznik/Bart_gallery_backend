const GalleryError = require("./GalleryError");

module.exports = function galleryErrorHandler(err, req, res, next) {
  if (err instanceof GalleryError) {
    res.status(err.status).send({
      error: {
        status: err.status,
        message: err.message,
      },
    });
  } else {
    res.status(500).send({
      error: {
        status: 500,
        message: 'Internal Server Error',
      },
    });
  }
}