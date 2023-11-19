exports.getHome = (req, res, next) => {
  const isAuthenticated = req.isAuthenticated();
  console.log(req.user);

  // const data = "abe is awesome";
  const data = req.user;

  res.status(200).json({
    status: "done",
    isAuthenticated,
    requestedAt: req.time,
    message: "This is the home page",
    data,
  });
};
