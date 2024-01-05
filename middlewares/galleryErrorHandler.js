const GalleryError = require("./GalleryError");

module.exports = function galleryErrorHandler(err, req, res, next) {
  if (err instanceof GalleryError) {
    console.error(err);
    res.status(err.status).send({
      status: "fail",
      message: err.message
    });
  } else {
    console.error(err);
    res.status(500).send({
      status: "fail",
      message: 'Internal Server Error'
    });
  }
};