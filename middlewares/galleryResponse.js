exports.galleryErrorHandler = function(err, req, res, next) {
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

exports.gallerySuccessHandler = function(message, status, req, res, next) {
  res.status(status).send({
    "status": "success",
    "message": message
  });
};

class GalleryError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

module.exports.GalleryError = GalleryError;