module.exports = function gallerySuccessHandler(message, status, req, res, next) {
  res.status(status).send({
    "status": "success",
    "message": message
  });
};