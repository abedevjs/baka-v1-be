exports.getHome = (req, res, next) => {
  const isAuthenticated = req.isAuthenticated();

  const data = "abe is awesomeness";

  res.status(200).json({
    status: "done",
    isAuthenticated,
    requestedAt: req.time,
    message: "This is the home page",
    data,
  });
};
