export function checkPermission(permission) {
  return function (req, res, next) {
    if (req.user.permissions.includes(permission)) {
      return next();
    }
    console.log(`${req.user.name} tried to ${permission} something, but does't have permission to do it`);
    if (req.xhr || req.headers.accept.indexOf("json") > -1) {
      return res.status(403).json({ error: "You don't have permission." });
    } else {
      return res.status(403).render("error", { error: "You dont have permission to do it, Bunu etməyə icazəniz yoxdur." });
    }
  };
}
